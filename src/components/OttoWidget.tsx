import { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface OttoResponse {
  messages: Message[];
  context: Record<string, any>;
}

interface OttoWidgetProps {
  defaultOpen?: boolean;
}

export const OttoWidget = ({ defaultOpen = false }: OttoWidgetProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasScrolledToBottomRef = useRef(false);
  const wasAtBottomRef = useRef(false);
  const [isStaffUser, setIsStaffUser] = useState(false);

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
    }
  };

  // Initial scroll after data loads
  useEffect(() => {
    if (!loading && messages.length > 0 && !hasScrolledToBottomRef.current) {
      scrollToBottom();
      hasScrolledToBottomRef.current = true;
    }
  }, [loading, messages.length]);

  // Add scroll event listener
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      wasAtBottomRef.current = isAtBottom();
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Check if user is staff
  useEffect(() => {
    async function checkUserRole() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('UserProfiles')
          .select('userType')
          .eq('userId', session.user.id)
          .single();
        
        setIsStaffUser(profile?.userType === 'staff');
      }
    }

    checkUserRole();
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session');
        return;
      }

      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      setMessage('');

      // Store wasAtBottom before adding message
      const wasAtBottom = wasAtBottomRef.current;

      // Call Otto service directly
      const response = await fetch(`${import.meta.env.VITE_OTTO_SERVICE_URL || 'http://localhost:3001'}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-User-Profile': JSON.stringify({
            userId: session.user.id,
            accountId: session.user.user_metadata.accountId,
            userType: session.user.user_metadata.userType,
            roleId: session.user.user_metadata.roleId
          })
        },
        body: JSON.stringify({
          query: userMessage.content,
          context: {
            previousMessages: messages
          }
        })
      });

      const { data, error } = await response.json();
      if (error) throw new Error(error);

      const ottoResponse = data as OttoResponse;
      
      // Add Otto's response
      const assistantMessage: Message = {
        role: 'assistant',
        content: ottoResponse.messages[ottoResponse.messages.length - 1].content,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Scroll to bottom if we were at bottom before
      if (wasAtBottom) {
        setTimeout(scrollToBottom, 100);
      }
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

  // Don't render if not a staff user
  if (!isStaffUser) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-lg w-96 flex flex-col" style={{ height: '600px' }}>
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="font-medium">Otto AI Assistant</h2>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto relative">
              <div ref={chatContainerRef} className="p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className="flex space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0">
                      {/* Avatar placeholder */}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">
                          {msg.role === 'assistant' ? 'Otto' : 'You'}
                        </span>
                      </div>
                      <div className={`rounded-lg p-3 ${
                        msg.role === 'assistant' ? 'bg-blue-50' : 'bg-gray-100'
                      }`}>
                        <p className="text-left whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {msg.timestamp && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(msg.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="text-center py-4">Loading...</div>
                )}
                {error && (
                  <div className="text-center text-red-500 py-4">{error}</div>
                )}
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <textarea
              placeholder="Ask Otto anything..."
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