// @deno-types="npm:@types/node"

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LoginRequest {
  email: string
  password: string
  accountId: string
  loginType: 'staff' | 'end_user'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request data
    const { email, password, accountId, loginType } = await req.json() as LoginRequest

    // Validate request
    if (!email || !password || !accountId || !loginType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing environment variables')
    }

    // Initialize Supabase clients
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)

    // First attempt to sign in
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Now verify the user profile matches the account and type
    const { data: userProfile, error: profileError } = await adminClient
      .from('UserProfiles')
      .select(`
        userType,
        accountId,
        roleId,
        Roles (roleCategory)
      `)
      .eq('userId', authData.user.id)
      .single()

    if (profileError || !userProfile) {
      // Sign out the user since profile verification failed
      await anonClient.auth.signOut()
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    console.log('userProfile', userProfile)
    console.log(loginType, userProfile.userType, accountId, userProfile.accountId )
    // Verify account and user type match
    if (userProfile.accountId !== accountId || 
        (loginType === 'staff' && userProfile.userType !== 'staff') ||
        (loginType === 'end_user' && userProfile.userType !== 'end_user')) {
      // Sign out the user since verification failed
      await anonClient.auth.signOut()
      return new Response(
        JSON.stringify({ error: `Invalid account or user type ${userProfile.userType} ${loginType}`  }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Set custom claims for the user
    const { data: updatedUser, error: claimsError } = await adminClient.auth.admin.updateUserById(
      authData.user.id,
      {
        app_metadata: {
          accountId: userProfile.accountId,
          roleCategory: userProfile.Roles?.roleCategory,
          userType: userProfile.userType
        }
      }
    )

    if (claimsError) {
      console.error('Error setting custom claims:', claimsError)
      // Continue anyway since this is not critical
    }

    // Return the successful session and user profile data
    return new Response(
      JSON.stringify({
        session: {
          ...authData.session,
          user: {
            ...authData.session.user,
            user_metadata: {
              ...authData.session.user.user_metadata,
              userType: userProfile.userType,
              roleCategory: userProfile.Roles?.roleCategory
            }
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    // Log the full error details
    console.error('Error in login function:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 