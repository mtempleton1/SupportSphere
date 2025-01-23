import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
}

export const ChatWidget = ({ ticket, defaultOpen = false }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      console.log(response)
      const { data, error: apiError } = await response.json();
      console.log(data)
      console.log(apiError)
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
            />
            <div className="mt-2 flex justify-end">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Send
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