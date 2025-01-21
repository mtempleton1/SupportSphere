import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Header } from "../components/Header";
import { LoginDialog } from "../components/LoginDialog";
import { SearchBar } from "../components/SearchBar";
import { Footer } from "../components/Footer";
import { MessageSquarePlus, UserCircle } from "lucide-react";

interface Account {
  accountId: string
  name: string
  subdomain: string
  endUserAccountCreationType: 'submit_ticket' | 'sign_up'
}

export function AccountHome() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginType, setLoginType] = useState<"staff" | "user" | null>(null);
  const handleOpenStaffLogin = () => setLoginType("staff");
  const handleOpenUserLogin = () => setLoginType("user");
  const handleCloseLogin = () => setLoginType(null);
  const handleCreateTicket = () => {
    navigate('/tickets/new');
  };

  useEffect(() => {
    async function fetchAccount() {
      try {
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

    fetchAccount()
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
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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