import { useState } from 'react';
import { MessageCircle, X, Loader2 } from 'lucide-react';

interface Ticket {
  ticketId: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  requesterId: string;
}

interface TicketComment {
  commentId: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  authorId: string;
}

interface ChatWidgetProps {
  ticket: Ticket | null;
  comments: TicketComment[];
  loading?: boolean;
  defaultOpen?: boolean;
}

export const ChatWidget = ({ ticket, comments, loading = false, defaultOpen = false }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center transition-all duration-200"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white rounded-t-lg">
        <h3 className="font-semibold">Support Chat</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : ticket ? (
          <>
            {/* Ticket Subject */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-semibold text-blue-800">{ticket.subject}</h4>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(ticket.createdAt)}
              </p>
            </div>

            {/* Initial Description */}
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white p-3 rounded-lg max-w-[80%]">
                <p>{ticket.description}</p>
              </div>
            </div>

            {/* Comments */}
            {comments.map((comment) => (
              <div
                key={comment.commentId}
                className={`flex ${
                  comment.authorId === ticket.requesterId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[80%] ${
                    comment.authorId === ticket.requesterId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p>{comment.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatDate(comment.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No open tickets
          </div>
        )}
      </div>

      {/* Input Area - Disabled for now */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            disabled
            placeholder="Coming soon..."
            className="flex-1 p-2 border rounded-md bg-gray-50"
          />
          <button
            disabled
            className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}; 