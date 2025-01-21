import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { LoginDialog } from "../components/LoginDialog";
import { ChevronDown } from "lucide-react";

interface Account {
  accountId: string
  name: string
  subdomain: string
  endUserAccountCreationType: 'submit_ticket' | 'sign_up'
}

export function TicketCreate() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loginType, setLoginType] = useState<"staff" | "user" | null>(null);
  const handleOpenStaffLogin = () => setLoginType("staff");
  const handleOpenUserLogin = () => setLoginType("user");
  const handleCloseLogin = () => setLoginType(null);

  useEffect(() => {
    async function checkAuthAndAccount() {
      try {
        // Get subdomain from hostname
        const hostname = window.location.hostname
        const subdomain = hostname.split('.')[0]

        const { data: account, error: accountError } = await supabase
          .from('Accounts')
          .select('accountId, name, subdomain, endUserAccountCreationType')
          .eq('subdomain', subdomain)
          .single()

        if (accountError) throw accountError
        setAccount(account)

        // If account type is 'sign_up', check authentication
        if (account.endUserAccountCreationType === 'sign_up') {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            // Redirect if not authenticated
            navigate('/')
            return
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch account')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndAccount()
  }, [navigate])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!account) return <div>Account not found</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onStaffLogin={handleOpenStaffLogin}
        onUserLogin={handleOpenUserLogin}
        accountName={account.name}
        showCreateTicket={false}
        onCreateTicket={() => {}}
        endUserAccountCreationType={account.endUserAccountCreationType}
      />
      <main className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Submit a Support Request
          </h1>
          <form className="space-y-6">
            <div>
              <label htmlFor="ticketType" className="block text-sm font-medium text-gray-700 mb-1">
                What can we help you with?
              </label>
              <div className="relative">
                <select
                  id="ticketType"
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md appearance-none bg-white"
                >
                  <option value="" disabled selected>Select a reason for your request...</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <ChevronDown className="h-5 w-5" />
                </div>
              </div>
            </div>
          </form>
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