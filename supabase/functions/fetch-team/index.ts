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

    // Initialize admin client for bypassing RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header to check if user is authenticated
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
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

    // Get requesting user's profile to get their accountId
    const { data: requestingUser, error: requestingUserError } = await userClient
      .from('UserProfiles')
      .select('accountId')
      .single()

    if (requestingUserError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get all team members for the account using admin client
    const { data: teamMembers, error: teamMembersError } = await adminClient
      .from('UserProfiles')
      .select(`
        userId,
        name,
        email,
        roleId,
        title,
        status,
        isActive,
        avatarUrl,
        isOnline,
        Roles (
          name
        )
      `)
      .eq('accountId', requestingUser.accountId)
      .order('name')

    if (teamMembersError) {
      throw teamMembersError
    }

    // Return the team members
    return new Response(
      JSON.stringify({
        data: teamMembers,
        error: null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in fetch-team function:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return new Response(
      JSON.stringify({
        data: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 