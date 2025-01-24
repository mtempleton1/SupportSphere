// @deno-types="npm:@types/node"

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserData {
  userId: string;
  name: string;
  userType: string;
  email: string;
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

    // Get URL parameters
    const url = new URL(req.url)
    const ticketId = url.searchParams.get('ticketId')
    
    if (!ticketId) {
      throw new Error('Missing ticketId parameter')
    }

    // Get the user's profile to get their account ID and user type
    const { data: userProfile, error: profileError } = await adminClient
      .from('UserProfiles')
      .select('accountId, userType, roleId, Roles(roleCategory)')
      .eq('userId', user.id)
      .single()

    if (profileError || !userProfile) {
      throw new Error('User profile not found')
    }

    // Get account info using user client
    const { data: account, error: accountError } = await userClient
      .from('Accounts')
      .select('accountId, name, subdomain, endUserAccountCreationType')
      .eq('accountId', userProfile.accountId)
      .single()

    if (accountError) {
      throw accountError
    }

    let ticketData;
    let commentsData;
    let requesterData: UserData | null = null;
    let assigneeData: UserData | null = null;

    if (userProfile.userType === 'staff') {
      // Staff user - fetch ticket data without UserProfiles joins
      const { data: ticket, error: ticketError } = await userClient
        .from('Tickets')
        .select(`
          *,
          Brands (
            brandId,
            name
          ),
          Groups (
            groupId,
            name
          ),
          Channels (
            type,
            name
          ),
          TicketTags (
            Tags (
              tagId,
              name
            )
          )
        `)
        .eq('ticketId', ticketId)
        .single()

      if (ticketError) {
        throw ticketError
      }

      ticketData = ticket;
      // Fetch requester data using adminClient
      if (ticket.requesterId) {
        // Get UserProfile data
        const { data: requesterProfile, error: requesterProfileError } = await adminClient
          .from('UserProfiles')
          .select('userId, name, userType, email')
          .eq('userId', ticket.requesterId)
          .single()
        // Get email from auth user if it matches the requester
        // const requesterEmail = ticket.requesterId === user.id ? user.email : (
        //   // Otherwise fetch the auth user
        //   (await adminClient.auth.getUser(ticket.requesterId)).data.user?.email
        // )

        if (!requesterProfileError && requesterProfile) {
          requesterData = {
            userId: requesterProfile.userId,
            name: requesterProfile.name,
            userType: requesterProfile.userType,
            email: requesterProfile.email
          }
        }
        console.log("HERE", requesterData)
      }

      // Fetch assignee data using adminClient if assigned
      if (ticket.assigneeId) {
        // Get UserProfile data
        const { data: assigneeProfile, error: assigneeProfileError } = await adminClient
          .from('UserProfiles')
          .select('userId, name, userType, email')
          .eq('userId', ticket.assigneeId)
          .single()



        if (!assigneeProfileError && assigneeProfile) {
          assigneeData = {
            userId: assigneeProfile.userId,
            name: assigneeProfile.name,
            userType: assigneeProfile.userType,
            email: assigneeProfile.email
          }
        }
      }

      // Fetch comments with author info
      const { data: comments, error: commentsError } = await userClient
        .from('TicketComments')
        .select(`
          *,
          author:UserProfiles!TicketComments_authorId_fkey (
            name
          )
        `)
        .eq('ticketId', ticketId)
        .order('createdAt', { ascending: true })

      if (commentsError) {
        throw commentsError
      }

      commentsData = comments;
    } else {
      // End user - fetch basic ticket data and public comments only
      const { data: ticket, error: ticketError } = await userClient
        .from('Tickets')
        .select(`
          ticketId,
          subject,
          description,
          status,
          createdAt,
          updatedAt,
          TicketTags (
            Tags (
              tagId,
              name
            )
          )
        `)
        .eq('ticketId', ticketId)
        .eq('requesterId', user.id) // Ensure they can only see their own tickets
        .single()

      if (ticketError) {
        throw ticketError
      }

      ticketData = ticket;

      // Fetch only public comments
      const { data: comments, error: commentsError } = await userClient
        .from('TicketComments')
        .select(`
          commentId,
          content,
          isPublic,
          createdAt,
          authorId,
          author:UserProfiles!TicketComments_authorId_fkey (
            name
          )
        `)
        .eq('ticketId', ticketId)
        .eq('isPublic', true)
        .order('createdAt', { ascending: true })

      if (commentsError) {
        throw commentsError
      }

      commentsData = comments;
    }

    // Return response with additional user data for staff
    const responseData = {
      account,
      ticket: ticketData,
      comments: commentsData
    }

    if (userProfile.userType === 'staff') {
      Object.assign(responseData, {
        requester: requesterData,
        assignee: assigneeData
      })
    }

    return new Response(
      JSON.stringify({
        data: responseData,
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