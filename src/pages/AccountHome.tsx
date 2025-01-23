import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Header } from "../components/Header";
import { LoginDialog } from "../components/LoginDialog";
import { SearchBar } from "../components/SearchBar";
import { Footer } from "../components/Footer";
import { ChatWidget } from "../components/ChatWidget";
import { MessageSquarePlus, UserCircle } from "lucide-react";

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
  const [loginType, setLoginType] = useState<"staff" | "user" | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  
  const handleOpenStaffLogin = () => setLoginType("staff");
  const handleOpenUserLogin = () => setLoginType("user");
  const handleCloseLogin = () => setLoginType(undefined);
  const handleCreateTicket = () => {
    navigate('/tickets/new');
  };
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
          // Get the most recent open ticket
          const openTicket = response.data.find((t: Ticket) => 
            ['new', 'open', 'pending'].includes(t.status)
          );
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
        isOpen={loginType !== undefined}
        onClose={handleCloseLogin}
        type={loginType || "user"}
        accountType={account.endUserAccountCreationType}
      />
    </div>
  );
} 