// @deno-types="npm:@types/node"

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OttoRequest {
  query: string;
  context?: {
    currentPage?: string;
    previousMessages?: Array<{ role: string; content: string }>;
  };
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
    const ottoServiceUrl = Deno.env.get('OTTO_SERVICE_URL')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey || !ottoServiceUrl) {
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

    // Get the user's profile
    const { data: userProfile, error: profileError } = await adminClient
      .from('UserProfiles')
      .select('accountId, userType, roleId, Roles(roleCategory)')
      .eq('userId', user.id)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    // Parse request body
    const requestData: OttoRequest = await req.json()

    // Forward request to Otto service
    const ottoResponse = await fetch(ottoServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-User-Profile': JSON.stringify({
          userId: user.id,
          accountId: userProfile.accountId,
          userType: userProfile.userType,
          roleId: userProfile.roleId
        })
      },
      body: JSON.stringify(requestData)
    })

    const responseData = await ottoResponse.json()

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in otto function:', error)
    return new Response(
      JSON.stringify({
        data: null,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
}) 