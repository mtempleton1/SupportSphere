import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GetAccountUsersRequest {
  accountId: string
  userType: 'staff' | 'end_user'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request data
    const { accountId, userType } = await req.json() as GetAccountUsersRequest

    // Validate request
    if (!accountId || !userType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (userType !== 'staff' && userType !== 'end_user') {
      return new Response(
        JSON.stringify({ error: 'Invalid userType. Must be either "staff" or "end_user"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
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

    // Query for users matching the account and type
    const { data: users, error: usersError } = await adminClient
      .from('UserProfiles')
      .select(`
        userId,
        name,
        email,
        userType,
        roleId,
        Roles (
          roleCategory
        )
      `)
      .eq('accountId', accountId)
      .eq('userType', userType)
      .order('name')

    if (usersError) {
      throw usersError
    }

    // Return the users
    return new Response(
      JSON.stringify({
        data: users,
        error: null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    // Log the full error details
    console.error('Error in get-account-users function:', {
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