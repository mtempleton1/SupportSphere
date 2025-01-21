import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AgentHeader } from '../components/AgentHeader'
import {
    Paperclip,
    Smile,
    Link2,
    Maximize2,
} from "lucide-react";

interface Account {
  accountId: string
  name: string
  subdomain: string
  endUserAccountCreationType: 'submit_ticket' | 'sign_up'
}

type RoleCategory = 'agent' | 'admin' | 'owner' | 'end_user'

interface Role {
  roleCategory: RoleCategory
}

interface UserProfile {
  userType: string
  roleId: string
  Roles: Role[]
}

export function AgentConversation() {
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
          .select(`
            userType,
            roleId,
            Roles (
              roleCategory
            )
          `)
          .eq('userId', session.user.id)
          .eq('accountId', account.accountId)
          .single()

        if (userError) throw userError

        const profile = userProfile as UserProfile

        if (profile.userType !== 'staff') {
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
    <div className="flex flex-col w-full h-screen bg-gray-50 min-w-0">
      <AgentHeader />
      <div className="flex flex-1 overflow-hidden min-w-0">
        <div className="w-64 flex-shrink-0 border-r bg-white overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Organization (create)</span>
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <span>Venkat Kumar</span>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-sm">
                Open
              </span>
              <span className="text-gray-500">Ticket #246</span>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Brand
                </label>
                <select className="w-full p-2 border rounded">
                  <option>Obscura</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Requester
                </label>
                <select className="w-full p-2 border rounded">
                  <option>Venkat Kumar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Assignee
                </label>
                <select className="w-full p-2 border rounded">
                  <option>Support/Lisa Kelly</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-white min-w-0">
          <div className="p-4 border-b">
            <h1 className="text-xl font-medium mb-1">
              Conversation with Venkat Kumar
            </h1>
            <div className="text-sm text-red-500">Via messaging</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">Venkat Kumar</span>
                  <span className="text-sm text-gray-500">8 minutes ago</span>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p>
                    Hi there,
                    <br />
                    Can I get some help with my account, please?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">Lisa Kelly</span>
                  <span className="text-sm text-gray-500">5 minutes ago</span>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <p>
                    Hi Venkat,
                    <br />
                    How can I help you? Is it about your recent camera return?
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t p-4">
            <div className="border rounded-lg">
              <div className="p-3">
                <textarea
                  placeholder="Write a message..."
                  className="w-full resize-none focus:outline-none"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50">
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Paperclip size={20} />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Smile size={20} />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Link2 size={20} />
                  </button>
                </div>
                <button className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-80 flex-shrink-0 border-l bg-white overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <span className="font-medium">Venkat Kumar</span>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <Maximize2 size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Email
                </label>
                <div className="text-blue-600">wplus@earth</div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Phone
                </label>
                <div className="text-blue-600">+1 408 294 241</div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Local time
                </label>
                <div>Thu, 16:24 MST</div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Language
                </label>
                <div>English (United States)</div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full p-2 border rounded"
                  defaultValue="Valuable Customer since 2010"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 