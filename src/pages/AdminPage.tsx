import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Header } from "../components/Header"
import { Footer } from "../components/Footer"

interface Account {
  accountId: string
  name: string
  subdomain: string
  endUserAccountCreationType: 'submit_ticket' | 'sign_up'
}

// type RoleCategory = 'end_user' | 'agent' | 'admin' | 'owner'

// interface UserProfile {
//   userType: 'staff' | 'end_user'
//   roleId: string
//   Roles: {
//     roleCategory: RoleCategory
//   }
// }

export function AdminPage() {
  const navigate = useNavigate()
  const { subdomain } = useParams<{ subdomain: string }>()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuthAndAccount() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          navigate(`/${subdomain}`)
          return
        }

        if (!subdomain) {
          setError('Invalid subdomain')
          return
        }

        // Get account
        const { data: account, error: accountError } = await supabase
          .from('Accounts')
          .select('accountId, name, subdomain, endUserAccountCreationType')
          .eq('subdomain', subdomain)
          .single()

        if (accountError) throw accountError
        setAccount(account)

        // Verify user is an admin for this account
        const { data: userProfile, error: userError } = await supabase
          .from('UserProfiles')
          .select('userType, roleId, Roles!inner(roleCategory)')
          .eq('userId', session.user.id)
          .eq('accountId', account.accountId)
          .single()

        if (userError) throw userError

        // Redirect all users to the agent workspace
        navigate(`/${subdomain}/agent`)
        return

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch account')
        navigate(`/${subdomain}`)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndAccount()
  }, [navigate, subdomain])

  // Since we're always redirecting, we can simplify the loading states
  if (loading || !account) return <div>Redirecting...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        accountName={account.name}
        showCreateTicket={false}
        onCreateTicket={() => {}}
        endUserAccountCreationType={account.endUserAccountCreationType}
        onStaffLogin={() => {}}
        onUserLogin={() => {}}
        subdomain={account.subdomain}
      />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Redirecting to Agent Workspace...
          </h1>
        </div>
      </main>
      <Footer accountName={account.name} />
    </div>
  )
} 