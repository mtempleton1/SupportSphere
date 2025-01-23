import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Header } from "../components/Header";
import { LoginDialog } from "../components/LoginDialog";
import { SearchBar } from "../components/SearchBar";
import { Footer } from "../components/Footer";
import { ChatWidget } from "../components/ChatWidget";
import { MessageSquarePlus, UserCircle } from "lucide-react";
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supatypes'

// Determine if we're in Vite or Node environment
const isViteEnvironment = typeof import.meta?.env !== 'undefined'

// Get environment variables based on environment
const supabaseUrl = isViteEnvironment ? 
  import.meta.env.VITE_SUPABASE_PROJECT_URL : 
  process.env.VITE_SUPABASE_PROJECT_URL

const serviceKey = isViteEnvironment ? 
  import.meta.env.VITE_SUPABASE_SERVICE_KEY : 
  process.env.SUPABASE_SERVICE_KEY

interface Account {
  accountId: string
  name: string
  subdomain: string
  endUserAccountCreationType: 'submit_ticket' | 'sign_up'
}

interface Ticket {
  ticketId: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requesterId: string;
}

interface TicketComment {
  commentId: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  authorId: string;
}

export function AccountHome() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginType, setLoginType] = useState<"staff" | "user" | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  
  const handleOpenStaffLogin = () => setLoginType("staff");
  const handleOpenUserLogin = () => setLoginType("user");
  const handleCloseLogin = () => setLoginType(null);
  const handleCreateTicket = () => {
    navigate('/tickets/new');
  };

  // Development auto-login
  useEffect(() => {
    async function autoLogin() {
      if (!account || isAuthenticated) return;

      console.log(supabaseUrl)
      console.log(serviceKey)
      // Create admin client for elevated access
      const adminClient = createClient<Database>(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          fetch: fetch as any
        }
      })

      try {
        console.log(account)
        const { data: plans, error: plansError } = await adminClient
          .from('Plans')
          .select()
        console.log("PLANS")
        console.log(plans)
        // Find a staff user in the account
        const { data: userProfile, error: profileError } = await adminClient
          .from('UserProfiles')
          .select('email')
          .eq('accountId', account.accountId)
          .eq('userType', 'staff')
          .limit(1)
          .single();

        console.log(userProfile)
        console.log(profileError)
        if (profileError || !userProfile) throw new Error('No staff user found');

        // const { data: staffUsers, error: staffError } = await adminClient
        //   .from('UserProfiles')
        //   .select('email')
        //   .eq('id', userProfile.userId);

        // if (staffError || !staffUsers?.length) throw new Error('Staff user auth details not found');

        // Log in as the staff user
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: userProfile.email,
          password: 'Password123!'
        });

        if (loginError) throw loginError;
        navigate('/agent');
      } catch (err) {
        console.error('Auto-login failed:', err);
      }
    }

    // Only run in development
    if (import.meta.env.DEV) {
      autoLogin();
    }
  }, [account, isAuthenticated]);

  // Fetch tickets when authenticated
  useEffect(() => {
    async function fetchTickets() {
      if (!isAuthenticated) return;
      
      try {
        setTicketLoading(true);
        
        // Call the fetch-tickets edge function
        const { data: response, error: fetchError } = await supabase.functions.invoke('fetch-tickets');
        
        if (fetchError) throw fetchError;
        
        if (response?.data?.length > 0) {
          console.log(response.data)
          // Get the most recent open ticket
          const openTicket = response.data.find((t: Ticket) => 
            ['new', 'open', 'pending'].includes(t.status)
          );
          console.log("HERE")
          console.log(openTicket)
          if (openTicket) {
            setTicket(openTicket);
            
            // Fetch comments for this ticket
            const { data: commentsData, error: commentsError } = await supabase
              .from('TicketComments')
              .select('*')
              .eq('ticketId', openTicket.ticketId)
              .eq('isPublic', true)
              .order('createdAt', { ascending: true });

            if (commentsError) throw commentsError;
            setComments(commentsData || []);
          }
        }
      } catch (err) {
        console.error('Error fetching tickets:', err);
      } finally {
        setTicketLoading(false);
      }
    }

    fetchTickets();
  }, [isAuthenticated]);

  useEffect(() => {
    async function checkAuthAndFetchAccount() {
      try {
        // Check authentication status
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)

        // Get subdomain from hostname
        const hostname = window.location.hostname
        const subdomain = hostname.split('.')[0]

        const { data, error } = await supabase
          .from('Accounts')
          .select('accountId, name, subdomain, endUserAccountCreationType')
          .eq('subdomain', subdomain)
          .single()

        if (error) throw error
        setAccount(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch account')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetchAccount()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!account) return <div>Account not found</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onStaffLogin={handleOpenStaffLogin}
        onUserLogin={handleOpenUserLogin}
        accountName={account.name}
        showCreateTicket={account.endUserAccountCreationType === 'submit_ticket'}
        onCreateTicket={handleCreateTicket}
        endUserAccountCreationType={account.endUserAccountCreationType}
      />
      <SearchBar />
      <div className="flex-grow flex flex-col relative">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Welcome to Our Support Center
            </h1>
            <p className="text-gray-600 mb-4">
              Get help from our knowledge base or contact our support team.
            </p>
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="p-6 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Browse Articles</h2>
                <p className="text-gray-600">
                  Find answers in our comprehensive knowledge base.
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Contact Support</h2>
                <p className="text-gray-600">
                  Can't find what you're looking for? Contact our support team.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Can't find what you're looking for?
            </h2>
            {account.endUserAccountCreationType === 'submit_ticket' ? (
              <button
                onClick={handleCreateTicket}
                className="inline-flex items-center px-6 py-3 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <MessageSquarePlus className="w-5 h-5 mr-2" />
                Create a Support Ticket
              </button>
            ) : (
              <button
                onClick={handleOpenUserLogin}
                className="inline-flex items-center px-6 py-3 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserCircle className="w-5 h-5 mr-2" />
                Sign up or Sign in for Support
              </button>
            )}
          </div>
        </main>
        
        {ticket && (
          <ChatWidget 
            ticket={ticket}
            defaultOpen={!!ticket}
          />
        )}
      </div>
      <Footer accountName={account.name} />
      <LoginDialog
        isOpen={loginType !== null}
        onClose={handleCloseLogin}
        type={loginType || "user"}
        accountType={account.endUserAccountCreationType}
      />
    </div>
  );
} 