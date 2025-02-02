import { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OttoSystem } from '../otto/core/system';
import { Message } from '../otto/core/types';

interface OttoWidgetProps {
  defaultOpen?: boolean;
}

export const OttoWidget = ({ defaultOpen = false }: OttoWidgetProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const wasAtBottomRef = useRef(true);
  const [isStaffUser, setIsStaffUser] = useState(false);
  const [otto, setOtto] = useState<OttoSystem | null>(null);

  // Function to check if scrolled to bottom
  const isAtBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return false;
    
    const threshold = 50; // pixels from bottom to consider "at bottom"
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
  };

  // Function to scroll to bottom
  const scrollToBottom = (force: boolean = false) => {
    if (chatContainerRef.current && (shouldAutoScroll || force)) {
      const container = chatContainerRef.current;
      // Use requestAnimationFrame to ensure DOM update is complete
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  };

  // Watch for new messages and scroll if needed
  useEffect(() => {
    if (messages.length > 0) {
      // Force scroll on new messages
      scrollToBottom(true);
    }
  }, [messages, shouldAutoScroll]); // Add shouldAutoScroll as dependency

  // Add scroll event listener to track user scroll position
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = isAtBottom();
      setShouldAutoScroll(atBottom);
      wasAtBottomRef.current = atBottom;
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    // Initial check
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Initial scroll after loading
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Small delay to ensure container is properly rendered
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [loading]);

  // Initialize Otto system and check if user is staff
  useEffect(() => {
    async function initOtto() {
      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('UserProfiles')
          .select('userType, accountId, roleId')
          .eq('userId', session.user.id)
          .single();

        if (profileError) {
          throw new Error(`Failed to load user profile: ${profileError.message}`);
        }
        
        setIsStaffUser(profile?.userType === 'staff');

        // Initialize Otto if user is staff
        if (profile?.userType === 'staff') {
          const config = {
            openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
            supabaseConfig: {
              projectUrl: import.meta.env.VITE_SUPABASE_PROJECT_URL,
              anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
            },
            userProfile: {
              userId: session.user.id,
              accountId: profile.accountId,
              userType: profile.userType,
              roleId: profile.roleId
            }
          };
          const newOtto = new OttoSystem(config);
          setOtto(newOtto);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error initializing Otto:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Otto');
        setLoading(false);
      }
    }

    initOtto();
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || sendingMessage || !otto) return;

    try {
      setSendingMessage(true);
      setError(null);

      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: message.trim(),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      setMessage('');
      setShouldAutoScroll(true); // Enable auto-scroll when sending new message

      // Get response from Otto
      const response = await otto.query(userMessage.content, {
        previousMessages: messages
      });
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Only add Otto's latest response message
      const assistantMessages = response.messages.filter(msg => msg.role === 'assistant');
      if (assistantMessages.length > 0) {
        // Take only the last assistant message
        const latestMessage = assistantMessages[assistantMessages.length - 1];
        setMessages(prev => [...prev, latestMessage]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
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

  // Don't render if not a staff user and we're done loading
  if (!loading && !isStaffUser) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-lg w-96 flex flex-col" style={{ height: '600px' }}>
          {/* Header */}
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="font-medium">Otto AI Assistant</h2>
              {loading && <span className="text-sm text-gray-500">(Initializing...)</span>}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto" ref={chatContainerRef}>
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="text-center py-4">Initializing Otto...</div>
              ) : error ? (
                <div className="text-center text-red-500 py-4">{error}</div>
              ) : messages.length === 0 ? (
                <div className="text-gray-500 text-center">
                  Ask me anything about your tickets or support tasks!
                </div>
              ) : (
                <>
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
                  {sendingMessage && (
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">Otto</span>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <textarea
              placeholder={loading ? "Initializing Otto..." : "Ask Otto anything..."}
              className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading || sendingMessage}
            />
            <div className="mt-2 flex justify-end">
              <button 
                onClick={handleSendMessage}
                disabled={loading || !message.trim() || sendingMessage}
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg ${
                  loading || !message.trim() || sendingMessage
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-blue-700'
                }`}
              >
                {loading ? 'Initializing...' : sendingMessage ? 'Sending...' : 'Send'}
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