import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Tab, WorkspaceState, TicketPriority } from '../types/workspace';
import { X, Circle, Plus } from 'lucide-react';
import { AgentHeader } from '../components/AgentHeader';
import { DashboardView } from '../components/views/DashboardView';
import { TicketView } from '../components/views/TicketView';
import { NewTabDialog } from '../components/NewTabDialog';

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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Tabs */}
      <div className="bg-white border-b relative">
        <div className="flex items-center">
          {workspace.tabs.map(tab => (
            <div
              key={tab.id}
              className={`
                flex items-center px-4 border-r cursor-pointer font-medium h-[3.5rem]
                ${workspace.activeTabId === tab.id 
                  ? 'bg-gray-100 border-b border-gray-100 relative -mb-px' 
                  : 'bg-white shadow-[inset_0_-4px_8px_-4px_rgba(0,0,0,0.1)]'
                }
                ${workspace.activeTabId === tab.id ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}
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
          ))}
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
            {tab.type === 'dashboard' && <DashboardView onTicketSelect={(ticketId, subject, priority, ticketNumber) => 
              openTicketTab(ticketId, subject, priority, ticketNumber)} />}
            {tab.type === 'ticket' && tab.data?.ticketId && (
              <TicketView ticketId={tab.data.ticketId} />
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