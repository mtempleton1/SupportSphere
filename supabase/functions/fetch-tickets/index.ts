// @deno-types="npm:@types/node"

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing environment variables')
    }

    // Initialize Supabase admin client for UserProfiles access
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Create user client with the token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          authorization: `Bearer ${token}`
        }
      }
    })

    // Verify the token and get user
    const { data: { user }, error: verifyError } = await adminClient.auth.getUser(token)
    if (verifyError || !user) {
      throw new Error('Unauthorized')
    }

    // Get the user's profile using admin client
    const { data: userProfile, error: profileError } = await adminClient
      .from('UserProfiles')
      .select('accountId')
      .eq('userId', user.id)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    // Fetch tickets using user client (this will respect RLS policies)
    const { data: ticketsData, error: ticketsError } = await userClient
      .from('Tickets')
      .select(`
        *,
        readStatus:TicketReadStatus(lastReadAt)
      `)
      .order('updatedAt', { ascending: false })

    if (ticketsError) {
      throw ticketsError
    }

    // Get all unique user IDs from tickets
    const userIds = new Set([
      ...ticketsData.map(t => t.requesterId),
      ...ticketsData.map(t => t.assigneeId).filter(Boolean)
    ])

    // Get all unique group IDs
    const groupIds = new Set(ticketsData.map(t => t.assigneeGroupId).filter(Boolean))

    // Fetch all relevant users using admin client
    const { data: usersData, error: usersError } = await adminClient
      .from('UserProfiles')
      .select('userId, name')
      .in('userId', Array.from(userIds))

    if (usersError) {
      throw usersError
    }

    // Fetch all relevant groups using user client
    const { data: groupsData, error: groupsError } = await userClient
      .from('Groups')
      .select('groupId, name')
      .in('groupId', Array.from(groupIds))

    if (groupsError) {
      throw groupsError
    }

    // Create lookup maps
    const userMap = new Map(usersData?.map(u => [u.userId, { userId: u.userId, name: u.name }]))
    const groupMap = new Map(groupsData?.map(g => [g.groupId, { groupId: g.groupId, name: g.name }]))

    // Transform the tickets data
    const transformedTickets = ticketsData.map(ticket => ({
      ...ticket,
      requester: userMap.get(ticket.requesterId) || null,
      assignee: ticket.assigneeId ? userMap.get(ticket.assigneeId) : null,
      assigneeGroup: ticket.assigneeGroupId ? groupMap.get(ticket.assigneeGroupId) : null,
    }))

    // Return the transformed data
    return new Response(
      JSON.stringify({
        data: transformedTickets,
        error: null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in fetch-tickets function:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return new Response(
      JSON.stringify({
        data: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
}) 