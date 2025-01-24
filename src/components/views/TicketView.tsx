import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Paperclip,
  Smile,
  Link2,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RealtimeEvent } from '../../types/realtime'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
  id: string
  email: string
  name: string
  role: RoleCategory
  avatarUrl?: string
}

interface Brand {
  brandId: string
  name: string
}

interface Channel {
  type: string
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
  brand: Brand
  requester: UserProfile
  assignee?: UserProfile
  ticketNumber: number
  group?: {
    groupId: string
    name: string
  }
  channel?: Channel
  description: string
}

interface Comment {
  id: string
  content: string
  isPublic: boolean
  createdAt: string
  authorId: string
  author: UserProfile
}

// type RealtimeEvent = {
//   table: string;
//   schema: string;
//   eventType: 'INSERT' | 'UPDATE' | 'DELETE';
//   payload: RealtimePostgresChangesPayload<{
//     [key: string]: any;
//   }>;
// };

interface TicketViewProps {
  ticketId: string;
  realtimeEvent: RealtimeEvent | null;
}

export function TicketView({ ticketId, realtimeEvent }: TicketViewProps) {
  const [account, setAccount] = useState<Account | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [requester, setRequester] = useState<UserProfile | null>(null)
  const [assignee, setAssignee] = useState<UserProfile | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const hasScrolledToBottomRef = useRef(false)
  const wasAtBottomRef = useRef(false)

  // Function to check if scrolled to bottom
  const isAtBottom = () => {
    const container = chatContainerRef.current
    if (!container) return false
    
    const threshold = 50 // pixels from bottom to consider "at bottom"
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
  }

  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      setHasUnreadMessages(false)
    }
  }

  // Initial scroll after data loads - only once
  useEffect(() => {
    if (!loading && comments.length > 0 && !hasScrolledToBottomRef.current) {
      scrollToBottom()
      hasScrolledToBottomRef.current = true
    }

    const container = chatContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const isCurrentlyAtBottom = isAtBottom()

      wasAtBottomRef.current = isCurrentlyAtBottom
      
      // If we're at the bottom, clear unread messages
      if (isCurrentlyAtBottom) {
        setHasUnreadMessages(false)
      }
    }
    // Add both scroll and wheel event listeners for more reliable detection
    container.addEventListener('scroll', handleScroll)
    container.addEventListener('wheel', handleScroll)

    // Also check on any resize events
    window.addEventListener('resize', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('wheel', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [loading, comments.length])

  // // Add scroll event listener to track if user is at bottom and check for unread messages
  // useEffect(() => {
    
  // }, [])

  // Function to fetch ticket data
  const fetchTicketData = async (session: any) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-ticket?ticketId=${ticketId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const { data, error: apiError } = await response.json()
      console.log("DATA")
      console.log(data)
      console.log(userProfiles)
      if (apiError) {
        throw new Error(apiError)
      }

      if (!data) {
        throw new Error('No data returned from API')
      }

      setAccount(data.account)
      setTicket(data.ticket)
      setComments(data.comments)
      setAssignee(data.assignee)
      setRequester(data.requester)

      // Add requester profile to userProfiles if available
      if (data.requester) {
        setUserProfiles(prev => ({
          ...prev,
          [data.requester.userId]: {
            id: data.requester.userId,
            name: data.requester.name,
            email: data.requester.email,
            role: data.requester.userType,
          }
        }))
      }

      // Add assignee profile to userProfiles if available
      if (data.assignee) {
        setUserProfiles(prev => ({
          ...prev,
          [data.assignee.userId]: {
            id: data.assignee.userId,
            name: data.assignee.name,
            email: data.assignee.email,
            role: data.assignee.userType,
          }
        }))
      }

      // Fetch profiles for any comment authors not in userProfiles
      const uniqueAuthorIds = new Set(
        data.comments
          .map((comment: Comment) => comment.authorId)
          .filter((authorId: string) => 
            authorId && 
            authorId !== data.requester?.userId && 
            authorId !== data.assignee?.userId
          )
      )

      // Fetch profiles for authors we don't have yet
      for (const authorId of uniqueAuthorIds) {
        const profile = await getUserProfile(authorId as string, session)
        if (profile) {
          setUserProfiles(prev => ({
            ...prev,
            [authorId as string]: profile
          }))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    }
  }

  // Function to fetch user profile
  const fetchUserProfile = async (userId: string, session: any) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-user?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const { data, error } = await response.json()
      if (error) throw new Error(error)
      
      // Add the user profile to local storage
      setUserProfiles(prev => ({
        ...prev,
        [userId]: data
      }))
      
      return data
    } catch (err) {
      console.error(`Failed to fetch user profile for ${userId}:`, err)
      return null
    }
  }

  // Function to get user profile (from local storage or fetch)
  const getUserProfile = async (userId: string, session: any) => {
    if (userProfiles[userId]) {
      return userProfiles[userId]
    }
    return await fetchUserProfile(userId, session)
  }

  // Initial data fetch
  useEffect(() => {
    async function initializeTicketData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('No active session')
          return
        }

        await fetchTicketData(session)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    initializeTicketData()
  }, [ticketId])

  // Handle real-time events
  useEffect(() => {
    if (!realtimeEvent) return;

    const handleRealtimeEvent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // Store scroll position state before updates
      wasAtBottomRef.current = isAtBottom()


      // Handle ticket updates
      if (realtimeEvent.table === 'Tickets' && 
          realtimeEvent.eventType === 'UPDATE' && 
          realtimeEvent.payload.new.ticketId === ticketId) {
        await fetchTicketData(session);
      }
      
      // Handle comment changes
      if (realtimeEvent.table === 'TicketComments') {
        const commentPayload = realtimeEvent.payload.new;
        
        // Only process comments for this ticket
        if (commentPayload.ticketId === ticketId) {
          if (realtimeEvent.eventType === 'INSERT') {
            // Get the author profile
            const authorProfile = await getUserProfile(commentPayload.authorId, session);
            
            if (authorProfile) {
              // Add the new comment to state
              const newComment: Comment = {
                id: commentPayload.commentId,
                content: commentPayload.content,
                isPublic: commentPayload.isPublic,
                createdAt: commentPayload.createdAt,
                authorId: commentPayload.authorId,
                author: {
                  id: commentPayload.authorId,
                  name: authorProfile.name,
                  email: authorProfile.email,
                  role: authorProfile.role,
                  avatarUrl: authorProfile.avatarUrl
                }
              };

              setComments(prevComments => {
                const newComments = [...prevComments, newComment]

                // If we were at bottom, scroll to bottom after render
                if (wasAtBottomRef.current) {
                  setTimeout(scrollToBottom, 15)
                  // scrollToBottom()
                } else {
                  // If we weren't at bottom, show unread messages indicator
                  setHasUnreadMessages(true)
                }
                return newComments
              });
            }
          } else if (realtimeEvent.eventType === 'UPDATE') {
            // Update the existing comment
            setComments(prevComments => 
              prevComments.map(comment => 
                comment.id === commentPayload.commentId
                  ? {
                      ...comment,
                      content: commentPayload.content,
                      isPublic: commentPayload.isPublic,
                    }
                  : comment
              )
            );
          }
        }
      }
    };

    handleRealtimeEvent();
  }, [realtimeEvent, ticketId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    try {
      setIsSending(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { error: insertError } = await supabase
        .from('TicketComments')
        .insert({
          ticketId,
          content: messageInput.trim(),
          isPublic: true,
          authorId: session.user.id,
        });

      if (insertError) throw insertError;

      // Clear the input
      setMessageInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!account || !ticket) return <div>Data not found</div>

  return (
    <div className="flex h-full">
      <div className="w-64 flex-shrink-0 border-r bg-white">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">
              {requester?.name || 'Unknown Requester'}
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
                <option>{ticket.brand?.name || 'No Brand'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Requester
              </label>
              <select className="w-full p-2 border rounded">
                <option>{requester?.name || 'Unknown Requester'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Assignee
              </label>
              <select className="w-full p-2 border rounded">
                <option>
                  {ticket.group?.name && assignee?.name 
                    ? `${ticket.group.name}/${assignee.name}`
                    : assignee?.name || 'Unassigned'}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-white min-w-0">
        <div className="px-6 py-4 border-b">
          <h1 className="text-xl font-medium mb-1 text-left">
            Conversation with {requester?.name || 'Unknown Requester'}
          </h1>
          <div className="text-sm text-red-500 text-left mb-2">
            Via {ticket.channel?.name?.replace(/\s*Channel\s*/i, '') || ticket.channel?.type?.replace(/_/g, ' ') || 'unknown channel'}
          </div>
          <div 
            className="relative text-sm text-gray-600 text-left cursor-pointer group"
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          >
            <div className={`${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
              {ticket.description}
            </div>
            <button 
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={isDescriptionExpanded ? 'Collapse description' : 'Expand description'}
            >
              {isDescriptionExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
            {comments.map((comment) => {
              // Try to get author info from userProfiles first
              const authorProfile = userProfiles[comment.authorId]
              const authorName = authorProfile?.name || comment.author?.name || 'Unknown User'
              
              return (
                <div key={`${comment.id}-${comment.createdAt}`} className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0">
                    {authorProfile?.avatarUrl && (
                      <img 
                        src={authorProfile.avatarUrl} 
                        alt={authorName} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">{authorName}</span>
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
                      <p className="text-left">{comment.content}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* New messages indicator in its own container */}
          <div className="relative h-0">
            {hasUnreadMessages && (
              <div 
                className="absolute left-1/2 -top-4 -translate-x-1/2 bg-blue-500 text-white text-sm px-3 py-1.5 rounded-full shadow-lg cursor-pointer hover:bg-blue-600 transition-colors mx-auto w-fit z-10"
                onClick={scrollToBottom}
              >
                New messages ↓
              </div>
            )}
          </div>
        </div>
        <div className="border-t p-4 bg-white">
          <div className="border rounded-lg">
            <div className="p-3">
              <textarea
                placeholder="Write a message..."
                className="w-full resize-none focus:outline-none"
                rows={3}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
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
              <button 
                className={`px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || isSending}
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-80 flex-shrink-0 border-l bg-white">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full">
                {requester?.avatarUrl && (
                  <img 
                    src={requester.avatarUrl} 
                    alt={requester?.name || 'Unknown Requester'} 
                    className="w-full h-full rounded-full object-cover"
                  />
                )}
              </div>
              <span className="font-medium">
                {requester?.name || 'Unknown Requester'}
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
              <div className="text-blue-600">{requester?.email}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Role
              </label>
              <div className="capitalize">{requester?.role?.replace(/_/g, ' ')}</div>
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
  );
} 