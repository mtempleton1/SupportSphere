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

type RoleCategory = 'end_user' | 'agent' | 'admin' | 'owner'

interface UserProfile {
  userType: 'staff' | 'end_user'
  roleId: string
  Roles: {
    roleCategory: RoleCategory
  }
}

export function AdminPage() {
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

        // Get role information from user metadata
        const userType = session.user.user_metadata?.userType
        const roleCategory = session.user.user_metadata?.roleCategory

        // If metadata is not in user_metadata, try to get it from the login response data
        if (!userType || !roleCategory) {
          const { data, error: userError } = await supabase
            .from('UserProfiles')
            .select('userType, roleId, Roles!inner(roleCategory)')
            .eq('userId', session.user.id)
            .single()
            

          if (userError) throw userError

          // Cast the data to unknown first to handle type mismatch
          const userProfile = data as unknown as UserProfile
          const roleCategory = userProfile.Roles.roleCategory

          if (userProfile.userType !== 'staff' || 
              (roleCategory !== 'admin' && roleCategory !== 'owner')) {
            // If they're an agent, send them to the agent page
            console.log("hello?")
            if (userProfile.userType === 'staff' && roleCategory === 'agent') {
              navigate('/agent')
            } else {
              console.log("ugh")
              navigate('/')
            }
            return
          }
        } else {
          if (userType !== 'staff' || 
              (roleCategory !== 'admin' && roleCategory !== 'owner')) {
            // If they're an agent, send them to the agent page
            if (userType === 'staff' && roleCategory === 'agent') {
              navigate('/agent')
            } else {
              navigate('/')
            }
            return
          }
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
            Admin Dashboard
          </h1>
        </div>
      </main>
      <Footer accountName={account.name} />
    </div>
  )
} 