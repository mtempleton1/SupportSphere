import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Tab, WorkspaceState, TicketPriority } from '../types/workspace';
import { X, Circle, Plus } from 'lucide-react';
import { AgentHeader } from '../components/AgentHeader';
import { DashboardView } from '../components/views/DashboardView';
import { TicketView } from '../components/views/TicketView';
import { NewTabDialog } from '../components/NewTabDialog';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '../types/supatypes';
import { RealtimeEvent, TabEvent } from '../types/realtime'

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

export function AgentWorkspace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    tabs: [],
    activeTabId: null,
  });
  const [isNewTabDialogOpen, setIsNewTabDialogOpen] = useState(false);
  const [unreadMessageTabs, setUnreadMessageTabs] = useState<string[]>([]);
  const [currentRealtimeEvent, setCurrentRealtimeEvent] = useState<RealtimeEvent | null>(null);
  
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

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
    }

    checkAuth();
  }, [navigate]);

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

  // Handle a new realtime event immediately when it occurs
  const handleRealtimeEvent = (event: RealtimeEvent) => {
    // Update the current event for views that need it
    setCurrentRealtimeEvent(event);

    // Handle unread message indicators
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
      setSearchParams(params);
    }
  }, [workspace.activeTabId, workspace.tabs, setSearchParams]);

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
    }
  };

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
          variant={workspace.tabs.find(tab => tab.id === workspace.activeTabId)?.type === 'dashboard' ? 'dashboard' : 'conversation'}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {workspace.tabs.map(tab => (
          <div
            key={tab.id}
            className={`h-full ${workspace.activeTabId === tab.id ? '' : 'hidden'}`}
          >
            {tab.type === 'dashboard' && (
              <DashboardView 
                onTicketSelect={(ticketId, subject, priority, ticketNumber) => 
                  openTicketTab(ticketId, subject, priority, ticketNumber)} 
                realtimeEvent={currentRealtimeEvent}
              />
            )}
            {tab.type === 'ticket' && tab.data?.ticketId && (
              <TicketView 
                ticketId={tab.data.ticketId} 
                realtimeEvent={currentRealtimeEvent}
                onTabEvent={handleTabEvent}
                isActive={workspace.activeTabId === tab.id}
              />
            )}
          </div>
        ))}
      </div>

      {/* New Tab Dialog */}
      <NewTabDialog
        isOpen={isNewTabDialogOpen}
        onClose={() => setIsNewTabDialogOpen(false)}
      />
    </div>
  );
} 