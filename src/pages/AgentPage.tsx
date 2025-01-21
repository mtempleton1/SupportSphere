import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Header } from "../components/Header"
import { Footer } from "../components/Footer"

interface Account {
  accountId: string
  name: string
  subdomain: string
  endUserAccountCreationType: 'submit_ticket' | 'sign_up'
}

export function AgentPage() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuthAndAccount() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          navigate('/')
          return
        }

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

        // Verify user is an agent or admin for this account
        const { data: userProfile, error: userError } = await supabase
          .from('UserProfiles')
          .select('userType, roleId, Roles!inner(roleCategory)')
          .eq('userId', session.user.id)
          .eq('accountId', account.accountId)
          .single()

        if (userError) throw userError

        if (userProfile.userType !== 'staff' || 
            (userProfile.Roles.roleCategory !== 'agent' && 
             userProfile.Roles.roleCategory !== 'admin' && 
             userProfile.Roles.roleCategory !== 'owner')) {
          navigate('/')
          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch account')
        navigate('/')
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
        accountName={account.name}
        showCreateTicket={false}
        onCreateTicket={() => {}}
        endUserAccountCreationType={account.endUserAccountCreationType}
        onStaffLogin={() => {}}
        onUserLogin={() => {}}
      />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Agent Dashboard
          </h1>
        </div>
      </main>
      <Footer accountName={account.name} />
    </div>
  )
} 