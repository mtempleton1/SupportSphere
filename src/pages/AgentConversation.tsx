import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
type TicketStatus = 'new' | 'open' | 'pending' | 'on_hold' | 'solved' | 'closed'

interface Role {
  roleCategory: RoleCategory
}

interface UserProfile {
  userType: string
  roleId: string
  name: string
  Roles: Role[]
}

interface Brand {
  brandId: string
  name: string
}

interface Ticket {
  ticketId: string
  subject: string
  status: TicketStatus
  brandId: string
  requesterId: string
  assigneeId: string | null
  assigneeGroupId: string | null
  createdAt: string
  updatedAt: string
  Brands: Brand
  Requesters: UserProfile
  Assignees?: UserProfile
  ticketNumber: number
  Groups?: {
    groupId: string
    name: string
  }
}

interface Comment {
  commentId: string
  content: string
  isPublic: boolean
  createdAt: string
  authorId: string
  author: UserProfile
}

export function AgentConversation() {
  const navigate = useNavigate()
  const { ticketId } = useParams()
  const [account, setAccount] = useState<Account | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
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

        // Fetch ticket data
        const { data: ticketData, error: ticketError } = await supabase
          .from('Tickets')
          .select(`
            *,
            Brands (
              brandId,
              name
            ),
            Requesters:UserProfiles!Tickets_requesterId_fkey (
              userId,
              name,
              userType
            ),
            Assignees:UserProfiles!Tickets_assigneeId_fkey (
              userId,
              name,
              userType
            ),
            Groups (
              groupId,
              name
            )
          `)
          .eq('ticketId', ticketId)
          .single()

        if (ticketError) throw ticketError
        setTicket(ticketData)

        // Fetch comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('TicketComments')
          .select(`
            *,
            author:UserProfiles!TicketComments_authorId_fkey (
              userId,
              name,
              userType
            )
          `)
          .eq('ticketId', ticketId)
          .order('createdAt', { ascending: true })

        if (commentsError) throw commentsError
        setComments(commentsData)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndAccount()
  }, [navigate, ticketId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!account || !ticket) return <div>Data not found</div>

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50 min-w-0">
      <AgentHeader />
      <div className="flex flex-1 overflow-hidden min-w-0">
        <div className="w-64 flex-shrink-0 border-r bg-white overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">
                {ticket.Requesters?.name || 'Unknown Requester'}
              </span>
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <span>{ticket.subject}</span>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-sm">
                {ticket.status}
              </span>
              <span className="text-gray-500">Ticket #{ticket.ticketNumber}</span>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Brand
                </label>
                <select className="w-full p-2 border rounded">
                  <option>{ticket.Brands?.name || 'No Brand'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Requester
                </label>
                <select className="w-full p-2 border rounded">
                  <option>{ticket.Requesters?.name || 'Unknown Requester'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Assignee
                </label>
                <select className="w-full p-2 border rounded">
                  <option>
                    {ticket.Groups?.name && ticket.Assignees?.name 
                      ? `${ticket.Groups.name}/${ticket.Assignees.name}`
                      : ticket.Assignees?.name || 'Unassigned'}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-white min-w-0">
          <div className="p-4 border-b">
            <h1 className="text-xl font-medium mb-1">
              Conversation with {ticket.Requesters?.name || 'Unknown Requester'}
            </h1>
            <div className="text-sm text-red-500">Via messaging</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">
                    {ticket.Requesters?.name || 'Unknown Requester'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(ticket.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p>{ticket.subject}</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium">
                    {ticket.Assignees?.name || 'Unassigned'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(ticket.updatedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <p>{ticket.subject}</p>
                </div>
              </div>
            </div>

            {/* Comments */}
            {comments.map((comment) => (
              <div key={comment.commentId} className="flex space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium">{comment.author?.name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                    {!comment.isPublic && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        Internal Note
                      </span>
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${comment.isPublic ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    <p>{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
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
                <span className="font-medium">
                  {ticket.Requesters?.name || 'Unknown Requester'}
                </span>
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
                <div className="text-blue-600">{ticket.Requesters?.name}@example.com</div>
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
                <div>
                  {new Date(ticket.createdAt).toLocaleString()}
                </div>
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