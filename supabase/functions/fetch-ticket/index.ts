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

    // Initialize Supabase admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user
    const { data: { user }, error: verifyError } = await adminClient.auth.getUser(token)
    
    if (verifyError || !user) {
      throw new Error('Unauthorized')
    }

    // Get URL parameters
    const url = new URL(req.url)
    const ticketId = url.searchParams.get('ticketId')
    
    if (!ticketId) {
      throw new Error('Missing ticketId parameter')
    }

    // Get the user's profile to get their account ID
    const { data: userProfile, error: profileError } = await adminClient
      .from('UserProfiles')
      .select('accountId, userType, roleId, Roles(roleCategory)')
      .eq('userId', user.id)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    // Verify user is staff
    if (userProfile.userType !== 'staff') {
      throw new Error('Unauthorized - Staff access required')
    }

    // Get account info
    const { data: account, error: accountError } = await adminClient
      .from('Accounts')
      .select('accountId, name, subdomain, endUserAccountCreationType')
      .eq('accountId', userProfile.accountId)
      .single()

    if (accountError) {
      throw accountError
    }

    // Fetch ticket with all related data
    const { data: ticket, error: ticketError } = await adminClient
      .from('Tickets')
      .select(`
        *,
        Brands (
          brandId,
          name
        ),
        Requesters:UserProfiles!Tickets_requesterId_fkey (
          userId,
          name,
          userType
        ),
        Assignees:UserProfiles!Tickets_assigneeId_fkey (
          userId,
          name,
          userType
        ),
        Groups (
          groupId,
          name
        ),
        Channels (
          type,
          name
        )
      `)
      .eq('ticketId', ticketId)
      .single()

    if (ticketError) {
      throw ticketError
    }

    // Fetch comments
    const { data: comments, error: commentsError } = await adminClient
      .from('TicketComments')
      .select(`
        *,
        author:UserProfiles!TicketComments_authorId_fkey (
          userId,
          name,
          userType
        )
      `)
      .eq('ticketId', ticketId)
      .order('createdAt', { ascending: true })

    if (commentsError) {
      throw commentsError
    }

    // Return the data
    return new Response(
      JSON.stringify({
        data: {
          account,
          ticket,
          comments
        },
        error: null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in fetch-ticket function:', error)
    
    return new Response(
      JSON.stringify({
        data: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
}) 