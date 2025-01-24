import { useState, useEffect, KeyboardEvent } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { RealtimeEvent } from '../types/realtime';

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

interface Ticket {
  ticketId: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  requesterId: string;
}

interface ChatWidgetProps {
  ticket?: Ticket | null;
  defaultOpen?: boolean;
  realtimeEvent: RealtimeEvent | null;
}

export const ChatWidget = ({ ticket, defaultOpen = false, realtimeEvent }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (isOpen && ticket?.ticketId) {
      fetchTicketData();
    }
  }, [isOpen, ticket?.ticketId]);

  // Handle realtime events
  useEffect(() => {
    if (!realtimeEvent || !ticket) return;

    // Only process events for this ticket
    if (realtimeEvent.table === 'TicketComments' && 
        realtimeEvent.payload.new.ticketId === ticket.ticketId) {
      
      const handleCommentEvent = async () => {
        const commentPayload = realtimeEvent.payload.new;

        // Only show public comments in the chat widget
        if (!commentPayload.isPublic) return;

        if (realtimeEvent.eventType === 'INSERT') {
          // Fetch the author information
          const { data: authorData } = await supabase
            .from('UserProfiles')
            .select('name')
            .eq('userId', commentPayload.authorId)
            .single();

          // Add the new comment to state
          const newComment: Comment = {
            commentId: commentPayload.commentId,
            content: commentPayload.content,
            isPublic: commentPayload.isPublic,
            createdAt: commentPayload.createdAt,
            authorId: commentPayload.authorId,
            author: {
              name: authorData?.name || 'Unknown User'
            }
          };

          setComments(prevComments => [...prevComments, newComment]);
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
  }, [realtimeEvent, ticket]);

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

      setComments(data.comments);
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

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
            <h2 className="font-medium">{ticket.subject}</h2>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Initial Ticket Description */}
            <div className="flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p>{ticket.description}</p>
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
              comments.map((comment) => (
                <div key={comment.commentId} className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">{comment.author?.name}</span>
                    </div>
                    <div className={`rounded-lg p-3 ${comment.isPublic ? 'bg-blue-50' : 'bg-gray-100'}`}>
                      <p>{comment.content}</p>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(comment.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
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