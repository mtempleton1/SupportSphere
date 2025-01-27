import { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { RealtimeEvent } from '../types/realtime';

// interface Brand {
//   brandId: string;
//   name: string;
// }

// interface Channel {
//   type: string;
//   name: string;
// }

interface Comment {
  commentId: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  authorId: string;
  author: {
    name: string;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface Ticket {
  ticketId: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requesterId: string;
  // brand: Brand;
  // requester: UserProfile;
  // assignee?: UserProfile;
  // group?: {
  //   groupId: string;
  //   name: string;
  // };
  // channel?: Channel;
  // ticketNumber: number;
  // assigneeId: string | null;
  // assigneeGroupId: string | null;
  // brandId: string;
}

interface ChatWidgetProps {
  ticket?: Ticket | null;
  defaultOpen?: boolean;
  realtimeEvent: RealtimeEvent | null;
}

// Add type guards similar to TicketView
const isTicketEvent = (event: RealtimeEvent): boolean => 
  event.table === 'Tickets';

const isUpdateEvent = (event: RealtimeEvent): boolean => 
  event.eventType === 'UPDATE';

// Add debounce utility
const TYPING_DEBOUNCE_MS = 1000;
const TYPING_CHANNEL_PREFIX = 'typing';

interface AgentTypingState {
  userId: string;
  isTyping: boolean;
}

export const ChatWidget = ({ ticket: initialTicket, defaultOpen = false, realtimeEvent }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket || null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToBottomRef = useRef(false);
  const wasAtBottomRef = useRef(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel>>();
  const [agentTypingState, setAgentTypingState] = useState<AgentTypingState | null>(null);

  // Function to check if scrolled to bottom
  const isAtBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return false;
    
    const threshold = 50; // pixels from bottom to consider "at bottom"
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
  };

  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      setHasUnreadMessages(false);
    }
  };

  // Initial scroll after data loads - only once
  useEffect(() => {
    if (!loading && comments.length > 0 && !hasScrolledToBottomRef.current) {
      scrollToBottom();
      hasScrolledToBottomRef.current = true;
    }
  }, [loading, comments.length]);

  // Add scroll event listener to track if user is at bottom and check for unread messages
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isCurrentlyAtBottom = isAtBottom();
      wasAtBottomRef.current = isCurrentlyAtBottom;
      
      // If we're at the bottom, clear unread messages
      if (isCurrentlyAtBottom) {
        setHasUnreadMessages(false);
      }
    };

    // Add both scroll and wheel event listeners for more reliable detection
    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleScroll);

    // Also check on any resize events
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Function to fetch user profile through edge function
  const getUserProfile = async (userId: string, session: any) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-user?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { data, error } = await response.json();
      if (error) throw new Error(error);
      
      return data;
    } catch (err) {
      console.error(`Failed to fetch user profile for ${userId}:`, err);
      return null;
    }
  };

  useEffect(() => {
    if (isOpen && ticket?.ticketId) {
      fetchTicketData();
    }
  }, [isOpen, ticket?.ticketId]);

  const fetchTicketData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-ticket?ticketId=${ticket?.ticketId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { data, error: apiError } = await response.json();
      if (apiError) {
        throw new Error(apiError);
      }

      if (!data) {
        throw new Error('No data returned from API');
      }

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
        }));
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
        }));
      }

      setComments(data.comments);

      // Fetch profiles for any comment authors not in userProfiles
      const uniqueAuthorIds = new Set(
        data.comments
          .map((comment: Comment) => comment.authorId)
          .filter((authorId: string) => 
            authorId && 
            authorId !== data.requester?.userId && 
            authorId !== data.assignee?.userId
          )
      );

      // Fetch profiles for authors we don't have yet
      for (const authorId of uniqueAuthorIds) {
        const profile = await getUserProfile(authorId as string, session);
        if (profile) {
          setUserProfiles(prev => ({
            ...prev,
            [authorId as string]: profile
          }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !ticket?.ticketId || sendingMessage) return;

    try {
      setSendingMessage(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session');
        return;
      }

      const { error: insertError } = await supabase
        .from('TicketComments')
        .insert({
          ticketId: ticket.ticketId,
          content: message.trim(),
          authorId: session.user.id,
          isPublic: true
        });

      if (insertError) throw insertError;

      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Setup typing channel when ticket changes
  useEffect(() => {
    if (!initialTicket?.ticketId) return;

    const channel = supabase.channel(`${TYPING_CHANNEL_PREFIX}_${initialTicket.ticketId}`);
    
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        // Only handle agent typing events (not our own)
        if (payload.payload.userId !== initialTicket.requesterId) {
          const { userId, isTyping } = payload.payload;
          setAgentTypingState(isTyping ? { userId, isTyping } : null);
        }
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.error('Failed to subscribe to typing channel:', status);
        }
      });

    typingChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [initialTicket?.ticketId]);

  // Handle typing status changes
  const updateTypingStatus = (typing: boolean) => {
    if (!typingChannelRef.current || !initialTicket?.ticketId) return;
    
    // Only broadcast if state changed
    if (typing !== isTyping) {
      setIsTyping(typing);
      
      // Broadcast typing status
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          ticketId: initialTicket.ticketId,
          isTyping: typing,
          userId: initialTicket.requesterId
        }
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to clear typing status
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false);
      }, TYPING_DEBOUNCE_MS);
    }
  };

  // Modify existing handleKeyPress to include typing status
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      updateTypingStatus(false);
    } else {
      updateTypingStatus(true);
    }
  };

  // Update local ticket state when prop changes
  useEffect(() => {
    setTicket(initialTicket || null);
  }, [initialTicket]);

  // Handle realtime events
  useEffect(() => {
    if (!realtimeEvent || !ticket) return;

    // Handle ticket updates
    if (isTicketEvent(realtimeEvent) && 
        isUpdateEvent(realtimeEvent) && 
        realtimeEvent.payload.new.ticketId === ticket.ticketId) {
      
      // Update ticket data in place with new values
      setTicket(prevTicket => {
        if (!prevTicket) return prevTicket;
        
        return {
          ...prevTicket,
          ...realtimeEvent.payload.new,
          // Preserve nested objects that aren't in the payload
          // brand: prevTicket.brand,
          // requester: prevTicket.requester,
          // assignee: prevTicket.assignee,
          // group: prevTicket.group,
          // channel: prevTicket.channel
        };
      });
    }

    // Handle comment updates (existing code)
    if (realtimeEvent.table === 'TicketComments' && 
        realtimeEvent.payload.new.ticketId === ticket.ticketId) {
      
      const handleCommentEvent = async () => {
        const commentPayload = realtimeEvent.payload.new;

        // Store scroll position state before updates
        wasAtBottomRef.current = isAtBottom();

        // Only show public comments in the chat widget
        if (!commentPayload.isPublic) return;

        if (realtimeEvent.eventType === 'INSERT') {
          // Get the session for user profile fetch
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          // Check if we already have the author's profile
          let authorProfile = userProfiles[commentPayload.authorId];
          
          // If not, fetch it
          if (!authorProfile) {
            authorProfile = await getUserProfile(commentPayload.authorId, session);
            if (authorProfile) {
              setUserProfiles(prev => ({
                ...prev,
                [commentPayload.authorId]: authorProfile
              }));
            }
          }

          // Add the new comment to state
          const newComment: Comment = {
            commentId: commentPayload.commentId,
            content: commentPayload.content,
            isPublic: commentPayload.isPublic,
            createdAt: commentPayload.createdAt,
            authorId: commentPayload.authorId,
            author: {
              name: authorProfile?.name || 'Unknown User'
            }
          };

          setComments(prevComments => {
            if (!prevComments.some(comment => comment.commentId === newComment.commentId)) {
              const newComments = [...prevComments, newComment];
              // If we were at bottom, scroll to bottom after render
              if (wasAtBottomRef.current) {
                setTimeout(scrollToBottom, 15);
              } else {
                // If we weren't at bottom, show unread messages indicator
                setHasUnreadMessages(true);
              }
              return newComments;
            } else {
              return prevComments;
            }
          });
        } else if (realtimeEvent.eventType === 'UPDATE') {
          // Update the existing comment
          setComments(prevComments => 
            prevComments.map(comment => 
              comment.commentId === commentPayload.commentId
                ? {
                    ...comment,
                    content: commentPayload.content,
                    isPublic: commentPayload.isPublic,
                  }
                : comment
            )
          );
        }
      };

      handleCommentEvent();
    }
  }, [realtimeEvent, ticket, userProfiles]);

  // Add Supabase subscription for ticket updates
  useEffect(() => {
    if (!ticket?.ticketId) return;

    // Subscribe to ticket changes
    const ticketChannel = supabase
      .channel(`ticket-${ticket.ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Tickets',
          filter: `ticketId=eq.${ticket.ticketId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTicket(prevTicket => {
              if (!prevTicket) return prevTicket;
              
              return {
                ...prevTicket,
                ...payload.new,
                // Preserve nested objects that aren't in the payload
                // brand: prevTicket.brand,
                // requester: prevTicket.requester,
                // assignee: prevTicket.assignee,
                // group: prevTicket.group,
                // channel: prevTicket.channel
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
    };
  }, [ticket?.ticketId]);

  // Add typing indicator component
  const renderTypingIndicator = () => {
    if (!agentTypingState?.isTyping) return null;

    return (
      <div className="absolute bottom-0 left-0 mb-2 ml-4 z-10">
        <div className="flex items-center space-x-2 p-2 text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
          </div>
          <span>Agent is typing...</span>
        </div>
      </div>
    );
  };

  if (!ticket) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-lg w-96 flex flex-col" style={{ height: '600px' }}>
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="font-medium">{ticket.subject}</h2>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-sm capitalize">
                {ticket.status.replace(/_/g, ' ')}
              </span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto relative">
              <div ref={chatContainerRef} className="p-4 space-y-4">
                {/* Initial Ticket Description */}
                <div className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                  <div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-left">{ticket.description}</p>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Comments */}
                {loading ? (
                  <div className="text-center py-4">Loading comments...</div>
                ) : error ? (
                  <div className="text-center text-red-500 py-4">{error}</div>
                ) : (
                  comments.map((comment) => {
                    // Try to get author info from userProfiles first
                    const authorProfile = userProfiles[comment.authorId];
                    const authorName = authorProfile?.name || comment.author?.name || 'Unknown User';
                    
                    return (
                      <div key={comment.commentId} className="flex space-x-3">
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
                          </div>
                          <div className={`rounded-lg p-3 ${comment.isPublic ? 'bg-blue-50' : 'bg-gray-100'}`}>
                            <p className="text-left">{comment.content}</p>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(comment.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {renderTypingIndicator()}
              {/* New messages indicator */}
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
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <textarea
              placeholder="Write a message..."
              className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendingMessage}
            />
            <div className="mt-2 flex justify-end">
              <button 
                onClick={handleSendMessage}
                disabled={!message.trim() || sendingMessage}
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg ${
                  !message.trim() || sendingMessage 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-blue-700'
                }`}
              >
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}; 