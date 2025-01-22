// @deno-types="npm:@types/node"

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-subdomain',
}

// Types from the database schema
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

interface Database {
  public: {
    Tables: {
      Tickets: {
        Row: {
          ticketId: string
          accountId: string
          brandId: string
          channelId: string | null
          subject: string
          description: string
          status: 'new' | 'open' | 'pending' | 'on_hold' | 'solved' | 'closed'
          requesterId: string
          submitterId: string
          isPublic: boolean | null
        }
        Insert: {
          ticketId?: string
          accountId: string
          brandId: string
          channelId?: string | null
          subject: string
          description: string
          status?: 'new' | 'open' | 'pending' | 'on_hold' | 'solved' | 'closed'
          requesterId: string
          submitterId: string
          isPublic?: boolean | null
        }
      }
      // Add other tables as needed
    }
  }
}

interface TicketRequest {
  email: string
  reason: string
  content: string
  channelType: 'help_center'
}

interface SupabaseError {
  code: string
  details: string | null
  hint: string | null
  message: string
}

interface SuccessResponse {
  data: string  // ticketId
  error: null
}

interface ErrorResponse {
  data: null
  error: SupabaseError
}

type CreateTicketResponse = SuccessResponse | ErrorResponse

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request data
    const { email, reason, content, channelType } = await req.json() as TicketRequest

    // Validate request
    if (!email || !reason || !content || channelType !== 'help_center') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get subdomain from custom header
    const subdomain = req.headers.get('x-subdomain')
    if (!subdomain) {
      return new Response(
        JSON.stringify({ error: 'Missing subdomain header' }),
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

    // Initialize Supabase clients - one with service role for fetching data
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    // And one with anon role for creating the ticket (will use RLS)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)

    // Use service role to get account and related data
    const { data: account, error: accountError } = await adminClient
      .from('Accounts')
      .select('accountId, endUserAccountCreationType')
      .eq('subdomain', subdomain)
      .single()

    if (accountError || !account) {
      throw new Error('Account not found')
    }

    // Verify account type allows ticket submission
    if (account.endUserAccountCreationType !== 'submit_ticket') {
      throw new Error('Account does not allow ticket submission')
    }

    // Get default brand using service role
    const { data: brand, error: brandError } = await adminClient
      .from('Brands')
      .select('brandId')
      .eq('accountId', account.accountId)
      .eq('isDefault', true)
      .single()

    if (brandError || !brand) {
      throw new Error('Default brand not found')
    }
  
    // Get or create help center channel using service role
    const { data: channel, error: channelError } = await adminClient
      .from('Channels')
      .select('channelId')
      .eq('accountId', account.accountId)
      .eq('type', 'help_center')
      .single()

    let channelId: string
    if (channelError) {
      // Create help center channel
      const { data: newChannel, error: createChannelError } = await adminClient
        .from('Channels')
        .insert({
          accountId: account.accountId,
          name: 'Help Center',
          type: 'help_center',
          brandId: brand.brandId,
          isEnabled: true,
        })
        .select()
        .single()

      if (createChannelError || !newChannel) {
        throw new Error('Failed to create help center channel')
      }
      channelId = newChannel.channelId
    } else {
      channelId = channel.channelId
    }

    // Get or create user profile using service role
    const { data: userProfile, error: userError } = await adminClient
      .from('UserProfiles')
      .select('userId')
      .eq('accountId', account.accountId)
      .eq('userType', 'end_user')
      .eq('email', email)
      .single()

    let userId: string
    if (userError) {
      // Generate a random password for the new user
      const password = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

      // Create auth user first using admin client
      const { data: authUser, error: signUpError } = await adminClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true // Auto-confirm the email
      });

      if (signUpError) {
        // Check if error is due to existing email
        return new Response(
            JSON.stringify({ 
                error: 'Email already registered',
                message: signUpError
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // Now create the user profile with the auth user's ID
      const { data: newUser, error: createUserError } = await adminClient
        .from('UserProfiles')
        .insert({
          userId: authUser.user.id,
          accountId: account.accountId,
          name: email.split('@')[0], // Use part before @ as name
          userType: 'end_user'
        })
        .select()
        .single()

      if (createUserError || !newUser) {
        throw new Error('Failed to create user profile: ' + createUserError?.message);
      }
      userId = authUser.user.id;
    } else {
      userId = userProfile.userId;
    }

    // Create ticket using anon client (will use RLS)
    const { data: ticket, error: ticketError } = await anonClient
      .from('Tickets')
      .insert({
        accountId: account.accountId,
        brandId: brand.brandId,
        channelId: channelId,
        subject: reason,
        description: content,
        status: 'new',
        requesterId: userId,
        submitterId: userId,
        isPublic: true,
      })
      .select()
      .single()

    if (ticketError || !ticket) {
      // Return properly typed error response
      return new Response(
        JSON.stringify({
          data: null,
          error: {
            code: ticketError?.code || 'UNKNOWN',
            details: ticketError?.details || null,
            hint: ticketError?.hint || null,
            message: ticketError?.message || 'Unknown error occurred'
          }
        } as ErrorResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({
        data: ticket.ticketId,
        error: null
      } as SuccessResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    // Log the full error details
    console.error('Error in create-ticket function:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return detailed error response
    return new Response(
      JSON.stringify({
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          details: null,
          hint: null,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      } as ErrorResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    )
  }
}) 