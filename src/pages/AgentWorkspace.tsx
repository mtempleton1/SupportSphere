import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Tab, WorkspaceState, TicketPriority } from '../types/workspace';
import { X, Circle, Plus } from 'lucide-react';
import { AgentHeader } from '../components/AgentHeader';
import { DashboardView } from '../components/views/DashboardView';
import { TicketView } from '../components/views/TicketView';
import { NewTabDialog } from '../components/NewTabDialog';
import { TabDataProvider, useTabData } from '../contexts/TabDataContext';
import { OttoWidget } from '../components/OttoWidget';
// import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '../types/supatypes';
import { RealtimeEvent, TabEvent, AgentPresenceState, TicketPresenceState, TicketPresenceChannelState, PresenceState } from '../types/realtime'

type DatabaseTicket = Database['public']['Tables']['Tickets']['Row'];
type DatabaseComment = Database['public']['Tables']['TicketComments']['Row'];
type DatabaseTicketTag = Database['public']['Tables']['TicketTags']['Row'];

const getPriorityColor = (priority: TicketPriority | undefined): string => {
  switch (priority) {
    case 'urgent':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'normal':
      return 'text-blue-500';
    case 'low':
      return 'text-gray-500';
    default:
      return 'text-gray-400';
  }
};

export function AgentWorkspaceContent() {
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();
  // const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    tabs: [],
    activeTabId: null,
  });
  const [isNewTabDialogOpen, setIsNewTabDialogOpen] = useState(false);
  const [unreadMessageTabs, setUnreadMessageTabs] = useState<string[]>([]);
  const [currentRealtimeEvent, setCurrentRealtimeEvent] = useState<RealtimeEvent | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<AgentPresenceState | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const lastActivityRef = useRef<string>(new Date().toISOString());
  const activityTimeoutRef = useRef<any>(null);
  const [ticketPresenceChannels, setTicketPresenceChannels] = useState<Record<string, any>>({});
  const [ticketViewers, setTicketViewers] = useState<Record<string, TicketPresenceState[]>>({});
  const currentSectionRef = useRef<'details' | 'conversation' | 'requester'>('details');
  const [globalPresenceState, setGlobalPresenceState] = useState<PresenceState>({});
  
  // Add refs to track current state
  const workspaceRef = useRef(workspace);
  const unreadMessageTabsRef = useRef(unreadMessageTabs);

  // Keep refs in sync with state
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    unreadMessageTabsRef.current = unreadMessageTabs;
  }, [unreadMessageTabs]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = new Date().toISOString();
      
      // Clear any existing timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      // Update presence state to active
      if (presenceChannelRef.current && userProfile) {
        presenceChannelRef.current.track({
          ...userProfile,
          lastActivity: lastActivityRef.current,
          isActive: true
        });
      }

      // Set timeout to mark as inactive after 5 minutes
      activityTimeoutRef.current = setTimeout(() => {
        if (presenceChannelRef.current && userProfile) {
          presenceChannelRef.current.track({
            ...userProfile,
            lastActivity: lastActivityRef.current,
            isActive: false
          });
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    // Initial activity update
    updateActivity();

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [userProfile]);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/${subdomain}`);
        return;
      }
      setCurrentUserId(session.user.id);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('UserProfiles')
        .select('userId, name, email, avatarUrl')
        .eq('userId', session.user.id)
        .single();

      if (profile) {
        const presenceState: AgentPresenceState = {
          userId: profile.userId,
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
          lastActivity: new Date().toISOString(),
          isActive: true
        };
        setUserProfile(presenceState);

        // Set up presence channel
        const channel = supabase.channel('agents_presence', {
          config: {
            presence: {
              key: profile.userId,
            },
          },
        });
        
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            // console.log('Presence state synced:', state);
            setGlobalPresenceState(state as PresenceState);
          })
          // .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          //   console.log('User joined:', key, newPresences);
          //   setGlobalPresenceState(channel.presenceState() as PresenceState);
          // })
          // .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          //   console.log('User left:', key, leftPresences);
          //   setGlobalPresenceState(channel.presenceState() as PresenceState);
          // })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Track presence once subscribed
              const trackStatus = await channel.track(presenceState);
              console.log('Presence tracking status:', trackStatus);
            }
          });

        presenceChannelRef.current = channel;
      }
    }

    checkAuth();

    return () => {
      // Cleanup presence channel on unmount
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack().then(() => {
          supabase.removeChannel(presenceChannelRef.current);
        });
      }
    };
  }, [navigate, subdomain]);

  // Initialize dashboard tab if no tabs exist
  useEffect(() => {
    if (workspace.tabs.length === 0) {
      const dashboardTab: Tab = {
        id: 'dashboard',
        type: 'dashboard',
        title: 'Dashboard',
      };
      setWorkspace({
        tabs: [dashboardTab],
        activeTabId: dashboardTab.id,
      });
    }
  }, [workspace.tabs.length]);

  const { updateDashboardTicket, updateTicketData } = useTabData();

  // Modify handleRealtimeEvent to update cache
  const handleRealtimeEvent = (event: RealtimeEvent) => {
    setCurrentRealtimeEvent(event);

    if (event.table === 'TicketComments' && event.eventType === 'INSERT') {
      const ticketId = event.payload.new.ticketId;
      const currentWorkspace = workspaceRef.current;
      const activeTab = currentWorkspace.tabs.find(tab => tab.id === currentWorkspace.activeTabId);
      
      if (activeTab?.type !== 'ticket' || activeTab.data?.ticketId !== ticketId) {
        const targetTab = currentWorkspace.tabs.find(
          tab => tab.type === 'ticket' && tab.data?.ticketId === ticketId
        );
        
        if (targetTab && !unreadMessageTabsRef.current.includes(targetTab.id)) {
          setUnreadMessageTabs(prev => [...prev, targetTab.id]);
        }
      }

      // Update ticket data with new comment
      // updateTicketData(ticketId, {
      //   comments: [...(getTicketData(ticketId)?.comments || []), {
      //     id: event.payload.new.commentId,
      //     content: event.payload.new.content,
      //     isPublic: event.payload.new.isPublic,
      //     createdAt: event.payload.new.createdAt,
      //     author: event.payload.new.author
      //   }]
      // });
    }

    // Update cached ticket data if needed
    if (event.table === 'Tickets' && event.eventType === 'UPDATE') {
      const ticketId = event.payload.new.ticketId;
      // Update both dashboard and individual ticket caches
      updateDashboardTicket(event.payload.new);
      updateTicketData(ticketId, event.payload.new);
    }
  };

  // Set up centralized realtime subscription
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase.channel('workspace-changes')
        // Listen for ticket changes
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'Tickets',
          },
          (payload) => {
            handleRealtimeEvent({
              table: 'Tickets',
              schema: 'public',
              eventType: 'INSERT',
              payload: {
                new: payload.new as DatabaseTicket,
                old: payload.old as DatabaseTicket,
              },
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'Tickets',
          },
          (payload) => {
            handleRealtimeEvent({
              table: 'Tickets',
              schema: 'public',
              eventType: 'UPDATE',
              payload: {
                new: payload.new as DatabaseTicket,
                old: payload.old as DatabaseTicket,
              },
            });
          }
        )
        // Listen for comment changes
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'TicketComments',
          },
          (payload) => {
            handleRealtimeEvent({
              table: 'TicketComments',
              schema: 'public',
              eventType: 'INSERT',
              payload: {
                new: payload.new as DatabaseComment,
                old: payload.old as DatabaseComment,
              },
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'TicketComments',
          },
          (payload) => {
            handleRealtimeEvent({
              table: 'TicketComments',
              schema: 'public',
              eventType: 'UPDATE',
              payload: {
                new: payload.new as DatabaseComment,
                old: payload.old as DatabaseComment,
              },
            });
          }
        )
        // Listen for tag changes
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'TicketTags',
          },
          (payload) => {
            handleRealtimeEvent({
              table: 'TicketTags',
              schema: 'public',
              eventType: 'INSERT',
              payload: {
                new: payload.new as DatabaseTicketTag,
                old: payload.old as DatabaseTicketTag,
              },
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'TicketTags',
          },
          (payload) => {
            handleRealtimeEvent({
              table: 'TicketTags',
              schema: 'public',
              eventType: 'DELETE',
              payload: {
                new: payload.new as DatabaseTicketTag,
                old: payload.old as DatabaseTicketTag,
              },
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, []);  // Remove workspace dependencies

  // Sync URL with active tab
  useEffect(() => {
    const activeTab = workspace.tabs.find(tab => tab.id === workspace.activeTabId);
    if (activeTab) {
      const params: { [key: string]: string } = { view: activeTab.type };
      if (activeTab.data?.ticketId) {
        params.ticketId = activeTab.data.ticketId;
      }
      // setSearchParams(params);
    }
  }, [workspace.activeTabId, workspace.tabs]);

  const openTicketTab = (ticketId: string, subject: string, priority: TicketPriority, ticketNumber: number) => {
    // Check if tab already exists
    const existingTab = workspace.tabs.find(
      tab => tab.type === 'ticket' && tab.data?.ticketId === ticketId
    );

    if (existingTab) {
      setWorkspace(prev => ({
        ...prev,
        activeTabId: existingTab.id,
      }));
      return;
    }

    // Create new tab
    const newTab: Tab = {
      id: `ticket-${ticketId}`,
      type: 'ticket',
      title: subject,
      data: { ticketId, subject, priority, ticketNumber },
    };

    setWorkspace(prev => ({
      tabs: [...prev.tabs, newTab],
      activeTabId: newTab.id,
    }));
  };

  const closeTab = (tabId: string) => {
    setWorkspace(prev => {
      const newTabs = prev.tabs.filter(tab => tab.id !== tabId);
      let newActiveTabId = prev.activeTabId;

      // If we're closing the active tab, activate the previous tab
      if (tabId === prev.activeTabId) {
        const index = prev.tabs.findIndex(tab => tab.id === tabId);
        newActiveTabId = newTabs[Math.max(0, index - 1)]?.id || null;
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    });
  };

  const handleTabEvent = (event: TabEvent) => {
    if (event.type === 'TICKET_UPDATE') {
      setWorkspace(prev => ({
        ...prev,
        tabs: prev.tabs.map(tab => {
          if (tab.type === 'ticket' && tab.data?.ticketId === event.ticketId) {
            return {
              ...tab,
              title: event.changes?.subject || tab.title,
              data: {
                ...tab.data,
                subject: event.changes?.subject || tab.data.subject
              }
            };
          }
          return tab;
        })
      }));
    } else if (event.type === 'MESSAGES_READ') {
      // Clear unread indicator when messages are confirmed read
      const tab = workspace.tabs.find(
        tab => tab.type === 'ticket' && tab.data?.ticketId === event.ticketId
      );
      
      if (tab) {
        setUnreadMessageTabs(prev => prev.filter(id => id !== tab.id));
      }
    } else if (event.type === 'CLOSE_TAB') {
      // Find and close the tab for this ticket
      const tabToClose = workspace.tabs.find(
        tab => tab.type === 'ticket' && tab.data?.ticketId === event.ticketId
      );
      
      if (tabToClose) {
        closeTab(tabToClose.id);
      }
    }
  };

  // Function to join a ticket's presence channel
  const joinTicketPresenceChannel = async (ticketId: string) => {
    if (ticketPresenceChannels[ticketId]) return; // Already joined

    if (!userProfile) {
      console.error('No user profile available');
      return;
    }

    const channel = supabase.channel(`ticket_presence_${ticketId}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as TicketPresenceChannelState;
        setTicketViewers(prev => ({
          ...prev,
          [ticketId]: Object.values(state).flat()
        }));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined ticket view:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left ticket view:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence once subscribed
          const presenceState: TicketPresenceState = {
            userId: userProfile.userId,
            name: userProfile.name,
            avatarUrl: userProfile.avatarUrl,
            currentSection: currentSectionRef.current,
            isTyping: false,
            lastActivity: new Date().toISOString()
          };
          
          await channel.track(presenceState);
        }
      });

    setTicketPresenceChannels(prev => ({
      ...prev,
      [ticketId]: channel
    }));
  };

  // Function to leave a ticket's presence channel
  const leaveTicketPresenceChannel = async (ticketId: string) => {
    const channel = ticketPresenceChannels[ticketId];
    if (channel) {
      await channel.untrack();
      await supabase.removeChannel(channel);
      
      setTicketPresenceChannels(prev => {
        const newChannels = { ...prev };
        delete newChannels[ticketId];
        return newChannels;
      });

      setTicketViewers(prev => {
        const newViewers = { ...prev };
        delete newViewers[ticketId];
        return newViewers;
      });
    }
  };

  // Update presence when section changes
  const handleSectionChange = async (ticketId: string, section: 'details' | 'conversation' | 'requester') => {
    currentSectionRef.current = section;
    const channel = ticketPresenceChannels[ticketId];
    
    if (channel && userProfile) {
      await channel.track({
        userId: userProfile.userId,
        name: userProfile.name,
        avatarUrl: userProfile.avatarUrl,
        currentSection: section,
        isTyping: false,
        lastActivity: new Date().toISOString()
      });
    }
  };

  // Update presence when typing status changes
  const handleTypingChange = async (ticketId: string, isTyping: boolean) => {
    const channel = ticketPresenceChannels[ticketId];
    
    if (channel && userProfile) {
      await channel.track({
        userId: userProfile.userId,
        name: userProfile.name,
        avatarUrl: userProfile.avatarUrl,
        currentSection: currentSectionRef.current as 'details' | 'conversation' | 'requester',
        isTyping,
        lastActivity: new Date().toISOString()
      });
    }
  };

  // Watch for active tab changes
  useEffect(() => {
    const activeTab = workspace.tabs.find(tab => tab.id === workspace.activeTabId);
    if (activeTab?.type === 'ticket' && activeTab.data?.ticketId) {
      joinTicketPresenceChannel(activeTab.data.ticketId);
    }
  }, [workspace.activeTabId]);

  // // Cleanup presence channels when tabs are closed
  // const handleCloseTab = async (tabId: string) => {
  //   const tab = workspace.tabs.find(t => t.id === tabId);
  //   if (tab?.type === 'ticket' && tab.data?.ticketId) {
  //     await leaveTicketPresenceChannel(tab.data.ticketId);
  //   }
    
  //   // ... existing tab closing logic ...
  // };

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      Object.keys(ticketPresenceChannels).forEach(ticketId => {
        leaveTicketPresenceChannel(ticketId);
      });
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Tabs */}
      <div className="bg-white border-b relative">
        <style>
          {`
            @keyframes gentlePulse {
              0% { background-color: rgb(239 246 255); }
              50% { background-color: rgb(219 234 254); }
              100% { background-color: rgb(239 246 255); }
            }
            .tab-unread {
              animation: gentlePulse 2s ease-in-out infinite;
            }
          `}
        </style>
        <div className="flex items-center">
          {workspace.tabs.map(tab => {
            const isUnread = unreadMessageTabs.includes(tab.id);
            const isActive = workspace.activeTabId === tab.id;
            
            return (
              <div
                key={tab.id}
                className={`
                  flex items-center px-4 border-r cursor-pointer font-medium h-[3.5rem]
                  ${isActive 
                    ? 'bg-gray-100 border-b border-gray-100 relative -mb-px' 
                    : isUnread
                      ? 'tab-unread'
                      : 'bg-white shadow-[inset_0_-4px_8px_-4px_rgba(0,0,0,0.1)]'
                  }
                  ${isActive ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}
                `}
                onClick={() => setWorkspace(prev => ({ ...prev, activeTabId: tab.id }))}
              >
                <div className="flex items-center w-full">
                  {tab.type === 'ticket' && (
                    <Circle
                      size={8}
                      className={`mr-2 flex-shrink-0 fill-current ${getPriorityColor(tab.data?.priority)}`}
                    />
                  )}
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="truncate max-w-[200px]">{tab.title}</span>
                    {tab.type === 'ticket' && tab.data?.ticketNumber && (
                      <span className="text-xs font-normal text-gray-500">
                        #{tab.data.ticketNumber}
                      </span>
                    )}
                  </div>
                  {tab.type !== 'dashboard' && (
                    <button
                      className="ml-2 p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <button
            onClick={() => setIsNewTabDialogOpen(true)}
            className="px-3 h-[3.5rem] hover:bg-gray-100 text-gray-600 hover:text-gray-900 border-r flex items-center"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gray-100">
        <AgentHeader
          subdomain={subdomain || ''}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {workspace.tabs.map((tab) => {
          if (tab.id !== workspace.activeTabId) return null;
          
          if (tab.type === 'dashboard') {
            return (
              <DashboardView
                key={tab.id}
                onTicketSelect={(ticketId, subject, priority, ticketNumber) => 
                  openTicketTab(ticketId, subject, priority, ticketNumber)} 
                realtimeEvent={currentRealtimeEvent}
                presenceState={globalPresenceState}
              />
            );
          }
          
          if (tab.type === 'ticket' && tab.data?.ticketId) {
            // Extract ticketId and verify it's defined
            const ticketId = tab.data.ticketId;
            if (!ticketId) return null;

            return (
              <TicketView
                key={tab.id}
                ticketId={ticketId}
                realtimeEvent={currentRealtimeEvent}
                onTabEvent={handleTabEvent}
                isActive={true}
                currentUserId={currentUserId}
                currentViewers={ticketViewers[ticketId] || []}
                onSectionChange={(section: 'details' | 'conversation' | 'requester') => 
                  handleSectionChange(ticketId, section)
                }
                onTypingChange={(isTyping: boolean) => 
                  handleTypingChange(ticketId, isTyping)
                }
              />
            );
          }
          
          return null;
        })}
      </div>

      {/* New Tab Dialog */}
      <NewTabDialog
        isOpen={isNewTabDialogOpen}
        onClose={() => setIsNewTabDialogOpen(false)}
      />

      {/* Add OttoWidget */}
      <OttoWidget />
    </div>
  );
}

// Create a new wrapper component that provides the context
export function AgentWorkspace() {
  return (
    <TabDataProvider>
      <AgentWorkspaceContent />
    </TabDataProvider>
  );
} 