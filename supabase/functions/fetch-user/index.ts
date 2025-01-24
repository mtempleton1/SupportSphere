import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserProfile {
  userId: string
  accountId: string
  name: string
  email: string
  role: string
  avatarUrl?: string
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

    // Get the userId parameter
    const url = new URL(req.url)
    const requestedUserId = url.searchParams.get('userId')
    
    if (!requestedUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
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

    // Get requesting user's profile
    const { data: requestingUser, error: requestingUserError } = await userClient
      .from('UserProfiles')
      .select('userId, accountId')
      .single()

    if (requestingUserError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }
    // Get requested user's profile using admin client
    const { data: requestedUser, error: requestedUserError } = await adminClient
      .from('UserProfiles')
      .select('userId, accountId, name, email, roleId')
      .eq('userId', requestedUserId)
      .single()
      
    if (requestedUserError || !requestedUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Verify both users are in the same account
    if (requestingUser.accountId !== requestedUser.accountId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Return the requested user profile
    return new Response(
      JSON.stringify({
        data: requestedUser,
        error: null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        data: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 