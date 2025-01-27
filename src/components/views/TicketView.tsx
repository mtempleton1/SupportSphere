import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Paperclip,
  Smile,
  Link2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  Search,
  ChevronRight,
  ArrowRight,
  Check
} from "lucide-react";
import { formatDistanceToNow, format } from 'date-fns';
import { RealtimeEvent, TabEvent, TicketPresenceState } from '../../types/realtime'
import { useTabData } from '../../contexts/TabDataContext';
import { useToast } from '../../contexts/ToastContext';

// TimeAgo component to handle relative time display
function TimeAgo({ timestamp }: { timestamp: string }) {
  const [relativeTime, setRelativeTime] = useState('');
  const [fullDateTime, setFullDateTime] = useState('');
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const updateTime = () => {
      // Parse the UTC timestamp and create a new Date object
      const utcDate = new Date(timestamp + 'Z'); // Append 'Z' to ensure UTC parsing
      
      // Now utcDate will be automatically converted to local time for display
      setRelativeTime(formatDistanceToNow(utcDate, { addSuffix: true }));
      setFullDateTime(format(utcDate, 'PPpp'));
    };

    // Update immediately
    updateTime();

    // Update every minute
    const intervalId = setInterval(updateTime, 60000);

    return () => clearInterval(intervalId);
  }, [timestamp]);

  return (
    <span 
      className="text-sm text-gray-500 cursor-help" 
      title={`${fullDateTime} (${userTimeZone})`}
    >
      {relativeTime}
    </span>
  );
}

interface Account {
  accountId: string
  name: string
  subdomain: string
  endUserAccountCreationType: 'submit_ticket' | 'sign_up'
}

type RoleCategory = 'agent' | 'admin' | 'owner' | 'end_user'
type TicketStatus = 'new' | 'open' | 'pending' | 'on_hold' | 'solved' | 'closed'

// interface Role {
//   roleCategory: RoleCategory
// }

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
  organization?: {
    name: string
  }
  TicketTags?: {
    Tags: {
      tagId: string
      name: string
    }
  }[]
}

interface Comment {
  commentId: string
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
  onTabEvent: (event: TabEvent) => void;
  isActive: boolean;
  currentUserId: string | null;
  currentViewers: TicketPresenceState[];
  onSectionChange: (section: 'details' | 'conversation' | 'requester') => void;
  onTypingChange: (isTyping: boolean) => void;
}

type SubmitAction = 'Solved' | 'Pending' | 'On Hold';
type AfterSubmitAction = 'Close tab' | 'Stay on ticket';

// Add these type guards at the top of the file, before the component
const isTicketEvent = (event: RealtimeEvent): boolean => 
  event.table === 'Tickets';

const isUpdateEvent = (event: RealtimeEvent): boolean => 
  event.eventType === 'UPDATE';

export function TicketView({ 
  ticketId, 
  realtimeEvent, 
  onTabEvent, 
  isActive, 
  currentUserId,
  currentViewers,
  // onSectionChange,
  onTypingChange 
}: TicketViewProps) {
  const { getTicketData, setTicketData } = useTabData();
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
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const [isInternalMessage, setIsInternalMessage] = useState(false)
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [userRole, setUserRole] = useState<RoleCategory>('agent')
  const [assigneeInput, setAssigneeInput] = useState('')
  const [teamSuggestions, setTeamSuggestions] = useState<Array<{
    userId: string;
    name: string;
    email: string;
    title?: string;
  }>>([])
  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const searchTimeoutRef = useRef<number | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const wasAtBottomRef = useRef(false)
  const lastEventRef = useRef<RealtimeEvent | null>(null)
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<{tagId: string, name: string}[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isMessageInputFocused, setIsMessageInputFocused] = useState(false);
  const [selectedAssigneeIndex, setSelectedAssigneeIndex] = useState(0);
  const [selectedSubmitAction, setSelectedSubmitAction] = useState<SubmitAction>('Pending');
  const [showSubmitMenu, setShowSubmitMenu] = useState(false);
  const [afterSubmitAction, setAfterSubmitAction] = useState<AfterSubmitAction>('Close tab');
  const submitButtonRef = useRef<HTMLDivElement>(null);
  const [showMacrosMenu, setShowMacrosMenu] = useState(false);
  const [showAfterSubmitMenu, setShowAfterSubmitMenu] = useState(false);
  const macrosButtonRef = useRef<HTMLDivElement>(null);
  const afterSubmitButtonRef = useRef<HTMLDivElement>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<{userId: string, name: string} | null>(null);
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  // Mock suggested tags - in real implementation, these would come from the backend
  // const suggestedTags = [
  //   'urgent',
  //   'bug',
  //   'feature-request',
  //   'documentation',
  //   'customer-feedback',
  //   'needs-review',
  //   'in-progress',
  //   'blocked'
  // ].filter(tag => !ticket?.TicketTags?.some(t => t.Tags.name === tag));

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

  // Add scroll event listener to track if user is at bottom and check for unread messages
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isCurrentlyAtBottom = isAtBottom();
      wasAtBottomRef.current = isCurrentlyAtBottom;
      
      // If we're at the bottom, clear unread messages and notify parent
      if (isCurrentlyAtBottom) {
        setHasUnreadMessages(false);
        onTabEvent?.({
          type: 'MESSAGES_READ',
          ticketId
        });
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
  }, [ticketId, onTabEvent]);

  // Add initial scroll effect
  useEffect(() => {
    if (!loading && comments.length > 0) {
      scrollToBottom();
    }
  }, [loading, comments.length]);

  // Scroll to bottom when view becomes active if it was at bottom before
  useEffect(() => {
    if (isActive && wasAtBottomRef.current) {
      scrollToBottom();
    }
  }, [isActive]);

  // Modify fetchTicketData to use cache
  const fetchTicketData = async (session: any) => {
    try {
      const cachedData = getTicketData(ticketId);

      if (cachedData) {
        return cachedData;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-ticket?ticketId=${ticketId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { data: ticketData, error } = await response.json();
      if (error) throw new Error(error);
      // Cache the fetched data

      setTicketData(ticketId, ticketData);
      return ticketData;
    } catch (err) {
      throw err;
    }
  };

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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const data = await fetchTicketData(session);
        setAccount(data.account);
        setTicket(data.ticket);
        setComments(data.comments);
        setAssignee(data.assignee);
        setRequester(data.requester);

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
        setError(err instanceof Error ? err.message : 'Failed to fetch ticket data');
      } finally {
        setLoading(false);
      }
    }

    initializeTicketData();
  }, [ticketId]);

  // Handle realtime events
  const handleRealtimeEvent = useCallback(async (event: RealtimeEvent, session?: any) => {
    if (!session) {
      const { data: { session: newSession } } = await supabase.auth.getSession();
      session = newSession;
    }
    if (!session) return;

    // Store scroll position state before updates
    wasAtBottomRef.current = isAtBottom()

    // Handle ticket updates
    if (isTicketEvent(event) && 
        isUpdateEvent(event) && 
        event.payload.new.ticketId === ticketId) {
      
      // Emit tab event if subject changed
      if (event.payload.new.subject !== event.payload.old.subject) {
        onTabEvent?.({
          type: 'TICKET_UPDATE',
          ticketId,
          changes: {
            subject: event.payload.new.subject
          }
        })
      }

      // Update ticket data in place with new values
      setTicket(prevTicket => {
        if (!prevTicket) return prevTicket;
        
        return {
          ...prevTicket,
          ...event.payload.new,
          // Preserve nested objects that aren't in the payload
          brand: prevTicket.brand,
          requester: prevTicket.requester,
          assignee: prevTicket.assignee,
          group: prevTicket.group,
          channel: prevTicket.channel,
          TicketTags: prevTicket.TicketTags
        };
      });

      // If assignee changed and new assignee info isn't in userProfiles, fetch it
      if (event.payload.new.assigneeId !== event.payload.old.assigneeId && 
          event.payload.new.assigneeId && 
          !userProfiles[event.payload.new.assigneeId]) {
        const profile = await getUserProfile(event.payload.new.assigneeId, session);
        if (profile) {
          setUserProfiles(prev => ({
            ...prev,
            [event.payload.new.assigneeId]: profile
          }));
        }
      }
    }
    
    // Handle comment changes
    if (event.table === 'TicketComments') {
      const commentPayload = event.payload.new;
      
      // Only process comments for this ticket
      if (commentPayload.ticketId === ticketId) {
        if (event.eventType === 'INSERT') {
          // Get the author profile
          const authorProfile = await getUserProfile(commentPayload.authorId, session);
          if (authorProfile) {
            // Add the new comment to state
            const newComment: Comment = {
              commentId: commentPayload.commentId,
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
            // Update comments state
            setComments(prevComments => {
              if (prevComments.some(comment => comment.commentId === newComment.commentId)) {
                return prevComments;
              }
              const newComments = [...prevComments, newComment]
              
              // If we were at bottom when we last checked, scroll to bottom after render
              if (wasAtBottomRef.current) {
                setTimeout(scrollToBottom, 15)
              } else {
                // If we weren't at bottom, show unread messages indicator
                setHasUnreadMessages(true)
              }
              return newComments;
            });

            // Update cache separately since we need to await getUserProfile
            const cachedData = getTicketData(ticketId);
            if (cachedData && !cachedData.comments.some(comment => comment.commentId === newComment.commentId)) {
              const updatedComments = [...cachedData.comments, {
                commentId: newComment.commentId,
                content: newComment.content,
                isPublic: newComment.isPublic,
                createdAt: newComment.createdAt,
                author: {
                  userId: authorProfile.id,
                  name: authorProfile.name,
                  email: authorProfile.email
                }
              }];

              setTicketData(ticketId, {
                ...cachedData,
                comments: updatedComments
              });
            }
          }
        } else if (event.eventType === 'UPDATE') {
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
      }
    }

    // Handle tag changes
    if (event.table === 'TicketTags') {
      const tagPayload = event.eventType === 'DELETE' ? event.payload.old : event.payload.new;
      // Only process tags for this ticket
      if (tagPayload.ticketId === ticketId) {
        if (event.eventType === 'INSERT') {
          // Fetch the tag details
          const { data: tagData, error: tagError } = await supabase
            .from('Tags')
            .select('tagId, name')
            .eq('tagId', tagPayload.tagId)
            .single();

          if (!tagError && tagData) {
            // Add the new tag to the ticket's tags
            setTicket(prevTicket => {
              if (!prevTicket) return prevTicket;

              const newTicketTags = [...(prevTicket.TicketTags || [])];
              // Only add if not already present
              if (!newTicketTags.some(tt => tt.Tags.tagId === tagData.tagId)) {
                newTicketTags.push({
                  Tags: {
                    tagId: tagData.tagId,
                    name: tagData.name
                  }
                });
              }

              return {
                ...prevTicket,
                TicketTags: newTicketTags
              };
            });
          }
        } else if (event.eventType === 'DELETE') {
          // Remove the tag from the ticket's tags
          const tagPayloadOld = event.payload.old;
          setTicket(prevTicket => {
            if (!prevTicket) return prevTicket;

            return {
              ...prevTicket,
              TicketTags: prevTicket.TicketTags?.filter(
                tt => tt.Tags.tagId !== tagPayloadOld.tagId
              ) || []
            };
          });
        }
      }
    }
  }, [ticketId, onTabEvent]);

  // Watch for new realtime events
  useEffect(() => {
    if (realtimeEvent && realtimeEvent !== lastEventRef.current) {
      lastEventRef.current = realtimeEvent;
      handleRealtimeEvent(realtimeEvent);
      // setRealTimeEvent(null);
    }
  }, [realtimeEvent, handleRealtimeEvent]);

  // Track scroll position when tab becomes active/inactive
  useEffect(() => {
    // Check if we're at bottom when component mounts or updates
    wasAtBottomRef.current = isAtBottom();
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.ctrlKey) {
        handleSendMessage(true); // Send as internal
      } else {
        handleSendMessage(false); // Send as public
      }
    }
  };

  // Add keyboard event listeners for CTRL key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' && isMessageInputFocused) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' && isMessageInputFocused) {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMessageInputFocused]);

  const handleSendMessage = async (forceInternal?: boolean) => {
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
          isPublic: forceInternal ? false : !isInternalMessage,
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

  // Debounced tag search
  const searchTags = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setTagSuggestions([]);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: tags, error } = await supabase
      .from('Tags')
      .select('tagId, name')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error('Error searching tags:', error);
      return;
    }

    // Filter out tags that are already attached to the ticket
    const filteredTags = tags?.filter(tag => 
      !ticket?.TicketTags?.some(tt => tt.Tags.tagId === tag.tagId)
    ) || [];

    setTagSuggestions(filteredTags);
  };

  // Handle tag input change with debounce
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setShowTagSuggestions(true);
    setSelectedSuggestionIndex(0); // Reset selection when input changes

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTags(value);
    }, 500);
  };

  // Handle keyboard navigation
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filteredSuggestions = tagSuggestions.filter(tag => 
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !ticket?.TicketTags?.some(tt => tt.Tags.tagId === tag.tagId)
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Tab':
        if (showTagSuggestions && filteredSuggestions.length > 0) {
          e.preventDefault();
          const selectedTag = filteredSuggestions[selectedSuggestionIndex];
          handleTagSelect(selectedTag.tagId);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (tagInput.trim()) {
          handleAddTag(tagInput.trim());
        }
        break;
      case 'Escape':
        setShowTagSuggestions(false);
        break;
    }
  };

  // Handle tag selection
  const handleTagSelect = async (tagId: string) => {
    if (isAddingTag || !ticket) return;

    setIsAddingTag(true);
    try {
      const { error } = await supabase
        .from('TicketTags')
        .insert({
          ticketId: ticket.ticketId,
          tagId: tagId
        });

      if (error) throw error;

      setTagInput('');
      setShowTagSuggestions(false);
    } catch (error) {
      console.error('Error adding tag:', error);
    } finally {
      setIsAddingTag(false);
    }
  };

  // Handle adding a new tag with the exact input
  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim() || isAddingTag || !ticket) return;

    try {
      setIsAddingTag(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // First check if tag exists
      const { data: existingTags, error: searchError } = await supabase
        .from('Tags')
        .select('tagId, name')
        .eq('accountId', account?.accountId)
        .ilike('name', tagName.trim())
        .limit(1);

      if (searchError) throw searchError;

      let tagId: string;

      if (existingTags && existingTags.length > 0) {
        // Use existing tag
        tagId = existingTags[0].tagId;
      } else {
        // Create new tag
        const { data: newTag, error: createError } = await supabase
          .from('Tags')
          .insert({
            accountId: account?.accountId,
            name: tagName.trim(),
            tagType: 'user'
          })
          .select('tagId')
          .single();

        if (createError) throw createError;
        if (!newTag) throw new Error('Failed to create tag');
        
        tagId = newTag.tagId;
      }

      // Add tag to ticket
      const { error: attachError } = await supabase
        .from('TicketTags')
        .insert({
          ticketId: ticket.ticketId,
          tagId: tagId
        });

      if (attachError) throw attachError;

      // Clear input
      setTagInput('');
      setShowTagSuggestions(false);
    } catch (error) {
      console.error('Error adding tag:', error);
    } finally {
      setIsAddingTag(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('TicketTags')
        .delete()
        .match({
          ticketId: ticket?.ticketId,
          tagId
        });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
    }
  };

  // Handle section changes
  // useEffect(() => {
  //   onSectionChange(currentSection);
  // }, [currentSection, onSectionChange]);

  // Handle typing status
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    
    const handleTyping = () => {
      onTypingChange(true);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => onTypingChange(false), 1000);
    };

    const messageInput = document.querySelector('textarea');
    if (messageInput) {
      messageInput.addEventListener('input', handleTyping);
      return () => {
        messageInput.removeEventListener('input', handleTyping);
        clearTimeout(typingTimeout);
      };
    }
  }, [onTypingChange]);

  // Render viewer avatars
  const renderViewers = () => {
    if (currentViewers.length === 0) return null;

    return (
      <div className="flex items-center space-x-1">
        <Users size={16} className="text-gray-400" />
        <div className="flex -space-x-2">
          {currentViewers
            .filter(viewer => viewer.userId !== currentUserId)
            .map(viewer => (
              <div
                key={viewer.userId}
                className="relative group"
              >
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden">
                  {viewer.avatarUrl ? (
                    <img 
                      src={viewer.avatarUrl} 
                      alt={viewer.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-medium">
                      {viewer.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {viewer.name}
                  {viewer.isTyping && <span className="ml-1">(typing...)</span>}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            ))}
        </div>
        {currentViewers.length > 1 && (
          <span className="text-xs text-gray-500">
            {currentViewers.length} viewing
          </span>
        )}
      </div>
    );
  };

  // Fetch user role on mount
  useEffect(() => {
    async function fetchUserRole() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('UserProfiles')
          .select('roleId')
          .eq('userId', session.user.id)
          .single();
        
        if (profile?.roleId) {
          const { data: role } = await supabase
            .from('Roles')
            .select('roleCategory')
            .eq('roleId', profile.roleId)
            .single();
          
          if (role?.roleCategory === 'admin' || role?.roleCategory === 'owner') {
            setUserRole('admin');
          }
        }
      }
    }
    fetchUserRole();
  }, []);

  // Handle keyboard navigation for assignee suggestions
  const handleAssigneeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showTeamSuggestions || teamSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedAssigneeIndex(prev => 
          prev < teamSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedAssigneeIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Tab':
        e.preventDefault();
        if (teamSuggestions[selectedAssigneeIndex]) {
          handleAssigneeSelect(teamSuggestions[selectedAssigneeIndex].userId);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (teamSuggestions[selectedAssigneeIndex]) {
          handleAssigneeSelect(teamSuggestions[selectedAssigneeIndex].userId);
        }
        break;
      case 'Escape':
        setShowTeamSuggestions(false);
        break;
    }
  };

  // Modify the existing searchTeamMembers function
  const searchTeamMembers = async (searchTerm: string) => {
    if (!searchTerm.trim() || userRole !== 'admin') {
      setTeamSuggestions([]);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-team`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const { data, error } = await response.json();
      if (error) {
        console.error('Error searching team members:', error);
        return;
      }

      // Filter team members based on search term
      const filteredMembers = data.filter((member: any) => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setTeamSuggestions(filteredMembers);
      setSelectedAssigneeIndex(0); // Reset selection to first item
    } catch (error) {
      console.error('Error searching team members:', error);
    }
  };

  // Modify the handleAssigneeInputChange function
  const handleAssigneeInputChange = (value: string) => {
    setAssigneeInput(value);
    setShowTeamSuggestions(true);
    setSelectedAssigneeIndex(0); // Reset selection when input changes
    setSelectedTeamMember(null); // Clear selected team member when input changes
    setShowSubmitButton(false);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTeamMembers(value);
    }, 500);
  };

  // Handle team member selection
  const handleAssigneeSelect = async (userId: string, shouldSubmit: boolean = false) => {
    if (isAssigning || !ticket) return;

    // Find the selected team member
    const selectedMember = teamSuggestions.find(member => member.userId === userId);
    if (!selectedMember) return;

    // If this is the same as current assignee, don't show submit button
    if (ticket.assigneeId === userId) {
      setShowSubmitButton(false);
      setSelectedTeamMember(null);
    } else {
      setSelectedTeamMember(selectedMember);
      setShowSubmitButton(true);
    }

    setAssigneeInput(selectedMember.name);
    setShowTeamSuggestions(false);

    if (shouldSubmit) {
      await submitAssigneeChange(userId);
    }
  };

  // Modify submitAssigneeChange
  const submitAssigneeChange = async (userId: string) => {
    if (isAssigning || !ticket) return;

    setIsAssigning(true);
    try {
      const updateData: { assigneeId: string; status?: TicketStatus } = {
        assigneeId: userId
      };

      // If ticket is new, also update status to open
      if (ticket.status === 'new') {
        updateData.status = 'open';
      }

      const { error } = await supabase
        .from('Tickets')
        .update(updateData)
        .eq('ticketId', ticket.ticketId);

      if (error) throw error;

      // Show success check
      setShowSubmitButton(false);
      setShowSuccessCheck(true);
      setSelectedTeamMember(null);

      // Show toast notification
      showToast(`Assigned ticket to ${selectedTeamMember?.name}`);

      // Clear any existing timeout
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }

      // Set timeout to revert to search icon
      successTimeoutRef.current = setTimeout(() => {
        setShowSuccessCheck(false);
      }, 3000);

    } catch (error) {
      console.error('Error assigning ticket:', error);
      showToast('Failed to assign ticket', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // Set initial assignee input value
  useEffect(() => {
    if (assignee?.name) {
      setAssigneeInput(assignee.name);
    }
  }, [assignee?.name]);

  const handleSubmitAction = async () => {
    if (!ticket) return;

    try {
      const status = selectedSubmitAction.toLowerCase().replace(' ', '_');
      const { error } = await supabase
        .from('Tickets')
        .update({ status })
        .eq('ticketId', ticket.ticketId);

      if (error) throw error;

      if (afterSubmitAction === 'Close tab') {
        // Trigger tab close through the parent
        onTabEvent({
          type: 'CLOSE_TAB',
          ticketId
        });
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (macrosButtonRef.current && !macrosButtonRef.current.contains(event.target as Node)) {
        setShowMacrosMenu(false);
      }
      if (afterSubmitButtonRef.current && !afterSubmitButtonRef.current.contains(event.target as Node)) {
        setShowAfterSubmitMenu(false);
      }
      if (submitButtonRef.current && !submitButtonRef.current.contains(event.target as Node)) {
        setShowSubmitMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!account || !ticket) return <div>Data not found</div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0">
        <div className="w-64 flex-shrink-0 border-r bg-white">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">
                {requester?.name || 'Unknown Requester'}
              </span>
              {renderViewers()}
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <span>{ticket.subject}</span>
              <span className="text-gray-500">Ticket #{ticket.ticketNumber}</span>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-left">
                  Brand
                </label>
                <select className="w-full p-2 border rounded">
                  <option>{ticket.brand?.name || 'No Brand'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-left">
                  Requester
                </label>
                <select className="w-full p-2 border rounded">
                  <option>{requester?.name || 'Unknown Requester'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-left">
                  Assignee
                </label>
                <div className="relative">
                  <div className="flex items-center border rounded bg-white">
                    <input
                      type="text"
                      value={assigneeInput}
                      onChange={(e) => handleAssigneeInputChange(e.target.value)}
                      onKeyDown={handleAssigneeKeyDown}
                      onFocus={() => {
                        if (userRole === 'admin') {
                          setShowTeamSuggestions(true);
                          searchTeamMembers(assigneeInput);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow click events to fire
                        setTimeout(() => {
                          setShowTeamSuggestions(false);
                          // If no valid team member was selected, reset to current assignee
                          if (!selectedTeamMember) {
                            setAssigneeInput(assignee?.name || '');
                          }
                        }, 200);
                      }}
                      className={`w-full p-2 outline-none ${userRole !== 'admin' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      placeholder={userRole === 'admin' ? "Search for team member..." : ""}
                      disabled={userRole !== 'admin'}
                    />
                    {userRole === 'admin' && !showSubmitButton && !showSuccessCheck && (
                      <div className="px-2 text-gray-400">
                        <Search size={16} />
                      </div>
                    )}
                    {showSubmitButton && selectedTeamMember && (
                      <button
                        onClick={() => submitAssigneeChange(selectedTeamMember.userId)}
                        disabled={isAssigning}
                        className="px-2 text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors"
                      >
                        <ArrowRight size={16} />
                      </button>
                    )}
                    {showSuccessCheck && (
                      <div className="px-2 text-green-500 animate-[fadeInScale_0.2s_ease-out]">
                        <Check size={16} className="animate-[checkmark_0.4s_ease-out]" />
                      </div>
                    )}
                  </div>
                  {showTeamSuggestions && teamSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                      {teamSuggestions.map((member, index) => (
                        <div
                          key={member.userId}
                          className={`px-3 py-2 cursor-pointer text-sm ${
                            index === selectedAssigneeIndex 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleAssigneeSelect(member.userId)}
                        >
                          <div className="font-medium">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                          {member.title && (
                            <div className="text-xs text-gray-400">{member.title}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-left">
                  Tags
                </label>
                <div className="relative">
                  <div className="flex flex-wrap gap-1 p-2 border rounded bg-white min-h-[38px]">
                    {ticket.TicketTags && ticket.TicketTags.map(({ Tags }, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs group"
                      >
                        {Tags.name}
                        <button 
                          className="opacity-0 group-hover:opacity-100 hover:text-gray-900"
                          onClick={() => handleRemoveTag(Tags.tagId)}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => handleTagInputChange(e.target.value)}
                      onFocus={() => setShowTagSuggestions(true)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={() => {
                        // Delay hiding suggestions to allow click events to fire
                        setTimeout(() => setShowTagSuggestions(false), 200);
                      }}
                      className="flex-1 min-w-[60px] outline-none"
                      placeholder={ticket?.TicketTags?.length ? '' : 'Add tags...'}
                      disabled={isAddingTag}
                    />
                  </div>
                  {showTagSuggestions && tagInput && tagSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                      {tagSuggestions
                        .filter(tag => 
                          tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
                          !ticket?.TicketTags?.some(tt => tt.Tags.tagId === tag.tagId)
                        )
                        .map((tag, index) => (
                          <div
                            key={tag.tagId}
                            className={`px-3 py-2 cursor-pointer text-sm text-left ${
                              index === selectedSuggestionIndex 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleTagSelect(tag.tagId)}
                          >
                            {tag.name}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-white min-w-0">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-medium text-left">
                  Conversation with {requester?.name || 'Unknown Requester'}
                </h1>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-sm capitalize">
                  {ticket.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
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
                const authorProfile = userProfiles[comment.authorId]
                const authorName = authorProfile?.name || comment.author?.name || 'Unknown User'
                const isCurrentUser = comment.authorId === currentUserId;

                return (
                  <div key={comment.commentId} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} mb-4`}>
                    <div className={`flex items-start gap-2 max-w-[85%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                        {authorProfile?.avatarUrl ? (
                          <img src={authorProfile.avatarUrl} alt={authorName} className="w-8 h-8 rounded-full" />
                        ) : (
                          <span className="text-sm">{authorName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          {!comment.isPublic && isCurrentUser && (
                            <div className="text-[10px] text-orange-700 bg-orange-100 rounded px-1 py-0.5 leading-none">
                              Internal Note
                            </div>
                          )}
                          <span className="text-sm font-medium">{authorName}</span>
                          <TimeAgo timestamp={comment.createdAt} />
                          {!comment.isPublic && !isCurrentUser && (
                            <div className="text-[10px] text-orange-700 bg-orange-100 rounded px-1 py-0.5 leading-none ml-auto">
                              Internal Note
                            </div>
                          )}
                        </div>
                        <div className={`rounded-lg p-3 ${
                          !comment.isPublic 
                            ? 'bg-orange-50/70' 
                            : isCurrentUser 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-blue-50'
                        }`}>
                          <div className={`whitespace-pre-wrap ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                            {comment.content}
                          </div>
                        </div>
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
                  onKeyDown={handleKeyPress}
                  onFocus={() => {
                    setIsMessageInputFocused(true);
                    setIsCtrlPressed(false);
                  }}
                  onBlur={() => {
                    setIsMessageInputFocused(false);
                    setIsCtrlPressed(false);
                  }}
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
                  <label className="flex items-center space-x-1 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalMessage}
                      onChange={(e) => setIsInternalMessage(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Internal message</span>
                  </label>
                </div>
                <div className="flex flex-col items-end">
                  <button 
                    className={`px-4 py-1.5 text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      isCtrlPressed ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                    }`}
                    onClick={() => handleSendMessage()}
                    disabled={!messageInput.trim() || isSending}
                  >
                    {isSending ? 'Sending...' : isCtrlPressed ? 'Send Internally' : 'Send'}
                  </button>
                  {!isCtrlPressed && !isSending && (
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      (CTRL+Enter for private)
                    </span>
                  )}
                </div>
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
                <span className="font-medium text-left">
                  {requester?.name || 'Unknown Requester'}
                </span>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <Maximize2 size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-left">
                  Email
                </label>
                <div className="p-2 border rounded text-sm text-left">
                  {requester?.email || 'No email available'}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-left">
                  Organization
                </label>
                <div className="p-2 border rounded text-sm text-left">
                  {ticket.organization?.name || 'No organization'}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-left">
                  Language
                </label>
                <div className="p-2 border rounded text-sm text-left">
                  English
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-left">
                  Time zone
                </label>
                <div className="p-2 border rounded text-sm text-left">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New footer section */}
      <div className="flex items-center justify-between px-4 py-1 border-t bg-gray-100">
        <div className="flex items-center space-x-4">
          <div ref={macrosButtonRef} className="relative">
            <button
              className="p-2 border rounded text-sm bg-white w-[360px] text-left flex justify-between items-center"
              onClick={() => setShowMacrosMenu(!showMacrosMenu)}
            >
              <span className="text-gray-600">Macros</span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            
            {showMacrosMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-white border rounded-md shadow-lg overflow-hidden w-full z-50">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  No macros available
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div ref={afterSubmitButtonRef} className="relative">
            <button
              className="p-2 border rounded text-sm bg-white text-left flex justify-between items-center min-w-[120px]"
              onClick={() => setShowAfterSubmitMenu(!showAfterSubmitMenu)}
            >
              <span>{afterSubmitAction}</span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            
            {showAfterSubmitMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border rounded-md shadow-lg overflow-hidden z-50">
                {(['Close tab', 'Stay on ticket'] as const).map((action) => (
                  <button
                    key={action}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      afterSubmitAction === action ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    onClick={() => {
                      setAfterSubmitAction(action);
                      setShowAfterSubmitMenu(false);
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div ref={submitButtonRef} className="relative">
            <div className="flex">
              <button
                className={`px-3 py-2 text-white rounded-l transition-colors ${
                  selectedSubmitAction === 'Solved' ? 'bg-blue-500/80 hover:bg-blue-500/90' :
                  selectedSubmitAction === 'Pending' ? 'bg-amber-400/80 hover:bg-amber-400/90' :
                  'bg-orange-400 hover:bg-orange-500'
                }`}
                onClick={() => setShowSubmitMenu(!showSubmitMenu)}
              >
                <ChevronRight size={16} />
              </button>
              <button
                className={`px-6 py-2 text-white rounded-r transition-colors min-w-[150px] text-left ${
                  selectedSubmitAction === 'Solved' ? 'bg-blue-500/80 hover:bg-blue-500/90' :
                  selectedSubmitAction === 'Pending' ? 'bg-amber-400/80 hover:bg-amber-400/90' :
                  'bg-orange-400 hover:bg-orange-500'
                }`}
                onClick={handleSubmitAction}
              >
                Submit as {selectedSubmitAction}
              </button>
            </div>
            
            {showSubmitMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-white border rounded-md shadow-lg overflow-hidden">
                {(['Solved', 'Pending', 'On Hold'] as const).map((action) => (
                  <button
                    key={action}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      selectedSubmitAction === action ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    onClick={() => {
                      setSelectedSubmitAction(action);
                      setShowSubmitMenu(false);
                    }}
                  >
                    Submit as {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 