import { useEffect, useState, useRef } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Ticket,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  // MessageCircle,
  Circle,
  X,
  Filter,
  Bell,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/supatypes";
import { TicketPriority } from "../../types/workspace";
// import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { TeamOverview } from './TeamOverview';
import type { AgentPresenceState, PresenceState, RealtimeEvent } from '../../types/realtime';

type Ticket = Database["public"]["Tables"]["Tickets"]["Row"] & {
  requester: { name: string } | null;
  assignee: { name: string } | null;
  assigneeGroup: { name: string } | null;
  readStatus: { lastReadAt: string } | null;
  priority: TicketPriority;
  ticketNumber: number;
  TicketTags: {
    tagId: string;
    Tags: {
      name: string;
    };
  }[];
};

// interface TicketCounts {
//   open: number;
//   pending: number;
//   solved: number;
//   new: number;
// }

interface TicketSections {
  requireAction: Ticket[];
  urgent: Ticket[];
  high: Ticket[];
  normal: Ticket[];
  low: Ticket[];
}

interface DashboardViewProps {
  onTicketSelect: (ticketId: string, subject: string, priority: TicketPriority, ticketNumber: number) => void;
  realtimeEvent: RealtimeEvent | null;
  presenceState: PresenceState;
}

type SidebarItem = 'tickets' | 'notifications' | 'team' | 'statistics' | 'settings';

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
      className="text-xs text-gray-500 cursor-help truncate block" 
      title={`${fullDateTime} (${userTimeZone})`}
    >
      {relativeTime}
    </span>
  );
}

export function DashboardView({ onTicketSelect, realtimeEvent, presenceState }: DashboardViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  // const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState({
    priority: '',
    assignee: '',
    subject: '',
    tags: [] as string[]
  });
  const [ticketSections, setTicketSections] = useState<TicketSections>({
    requireAction: [],
    urgent: [],
    high: [],
    normal: [],
    low: [],
  });
  // const [ticketCounts, setTicketCounts] = useState<TicketCounts>({
  //   open: 0,
  //   pending: 0,
  //   solved: 0,
  //   new: 0,
  // });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);
  const [isUpdatesPanelOpen, setIsUpdatesPanelOpen] = useState(true);
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 48, // w-12
    status: 90,   // w-[90px]
    subject: 30,  // 30%
    requester: 15,// 15%
    updated: 15,  // 15%
    group: 15,    // 15%
    assignee: 15  // 15%
  });
  const [resizing, setResizing] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<SidebarItem>('notifications');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Add team fetching effect
  useEffect(() => {
    async function fetchTeam() {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-team`, {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        const { data, error } = await response.json();
        if (error) {
          console.error('Error fetching team:', error);
          return;
        }

        // Initialize team members with offline status
        const initialTeamMembers = data.map((member: any) => ({
          ...member,
          isOnline: false,
          isActive: false
        }));
        setTeamMembers(initialTeamMembers);
      } catch (error) {
        console.error('Error fetching team:', error);
      }
    }

    if (selectedSidebarItem === 'team') {
      fetchTeam();
    }
  }, [selectedSidebarItem]);

  // Update team members when presence state changes
  useEffect(() => {
    if (selectedSidebarItem === 'team' && teamMembers.length > 0) {
      const onlineUserIds = new Set(
        Object.values(presenceState)
          .flat()
          .map((p: AgentPresenceState) => p.userId)
      );

      setTeamMembers(prevMembers => {
        return prevMembers.map(member => {
          // If user is not in presence state, they are offline
          if (!onlineUserIds.has(member.userId)) {
            return {
              ...member,
              isOnline: false,
              isActive: false,
              status: undefined,
              lastActivity: undefined
            };
          }

          // Find this member in the presence state
          const presence = Object.values(presenceState)
            .flat()
            .find((p: AgentPresenceState) => p.userId === member.userId);

          if (presence) {
            return {
              ...member,
              isOnline: true,
              isActive: presence.isActive,
              status: presence.status,
              lastActivity: presence.lastActivity
            };
          }

          // Fallback case (should not happen)
          return member;
        });
      });
    }
  }, [presenceState, selectedSidebarItem, teamMembers.length]);

  // Function to organize tickets into sections
  const organizeTicketsIntoSections = (ticketsToOrganize: Ticket[], userId: string) => {
    const sections: TicketSections = {
      requireAction: [],
      urgent: [],
      high: [],
      normal: [],
      low: [],
    };

    ticketsToOrganize.forEach((ticket) => {
      // Check if ticket is unread and assigned to current user
      const isUnread = !ticket.readStatus?.lastReadAt || 
        new Date(ticket.readStatus.lastReadAt) < new Date(ticket.updatedAt || '');
      const isAssignedToMe = ticket.assigneeId === userId;

      if (isUnread && isAssignedToMe) {
        sections.requireAction.push(ticket);
      } else {
        // Add to priority-based section
        switch (ticket.priority) {
          case 'urgent':
            sections.urgent.push(ticket);
            break;
          case 'high':
            sections.high.push(ticket);
            break;
          case 'normal':
            sections.normal.push(ticket);
            break;
          case 'low':
            sections.low.push(ticket);
            break;
          default:
            sections.normal.push(ticket);
        }
      }
    });

    return sections;
  };

  // Function to update ticket counts
  // const updateTicketCounts = (ticketsToCount: Ticket[]) => {
  //   const counts = ticketsToCount.reduce((acc: Record<string, number>, ticket: Ticket) => {
  //     acc[ticket.status as keyof TicketCounts] = (acc[ticket.status as keyof TicketCounts] || 0) + 1;
  //     return acc;
  //   }, {} as Record<string, number>);

  //   return {
  //     open: counts.open || 0,
  //     pending: counts.pending || 0,
  //     solved: counts.solved || 0,
  //     new: counts.new || 0,
  //   };
  // };

  // Initial data fetch
  useEffect(() => {
    async function fetchTickets() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return;
        }

        // Call the fetch-tickets edge function
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-tickets`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const { data: transformedTickets, error } = await response.json();
        console.log(transformedTickets)
        if (error) {
          throw new Error(error);
        }

        setTickets(transformedTickets);
        setTicketSections(organizeTicketsIntoSections(transformedTickets, session.user.id));
        // setTicketCounts(updateTicketCounts(transformedTickets));

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, []);

  // Handle real-time events
  useEffect(() => {
    if (!realtimeEvent) return;

    const handleRealtimeEvent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (realtimeEvent.table === 'Tickets') {
        // Fetch the updated ticket's full details
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/fetch-tickets?ticketId=${realtimeEvent.payload.new.ticketId}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const { data: ticketData, error } = await response.json();
        if (error) {
          console.error('Error fetching ticket:', error);
          return;
        }

        if (ticketData && ticketData.length > 0) {
          const updatedTicket = ticketData[0];
          
          setTickets(prevTickets => {
            let updatedTickets;
            if (realtimeEvent.eventType === 'INSERT') {
              updatedTickets = [...prevTickets, updatedTicket];
            } else if (realtimeEvent.eventType === 'UPDATE') {
              updatedTickets = prevTickets.map(ticket => 
                ticket.ticketId === updatedTicket.ticketId ? updatedTicket : ticket
              );
            } else {
              return prevTickets;
            }

            // Update sections and counts based on the new tickets array
            setTicketSections(organizeTicketsIntoSections(updatedTickets, session.user.id));
            // setTicketCounts(updateTicketCounts(updatedTickets));
            return updatedTickets;
          });
        }
      }
    };

    handleRealtimeEvent();
  }, [realtimeEvent]);

  // Get unique tags from tickets
  const getUniqueTags = (tickets: Ticket[]): string[] => {
    const tagSet = new Set<string>();
    tickets.forEach(ticket => {
      ticket.TicketTags?.forEach(tt => {
        if (tt.Tags?.name) {
          tagSet.add(tt.Tags.name);
        }
      });
    });
    return Array.from(tagSet);
  };

  // Update tag suggestions when tickets change
  useEffect(() => {
    const uniqueTags = getUniqueTags(tickets);
    setTagSuggestions(uniqueTags);
  }, [tickets]);

  // Filter tickets when filters change
  useEffect(() => {
    const applyFilters = async () => {
      let result = tickets;
      const { data: { session } } = await supabase.auth.getSession();

      // Tags filter
      if (filters.tags.length > 0) {
        result = result.filter(ticket => 
          filters.tags.every(filterTag =>
            ticket.TicketTags?.some(tt => 
              tt.Tags?.name.toLowerCase() === filterTag.toLowerCase()
            )
          )
        );
      }

      // Priority filter
      if (filters.priority) {
        result = result.filter(ticket => ticket.priority === filters.priority);
      }

      // Assignee filter
      if (filters.assignee) {
        if (filters.assignee === 'me' && session) {
          result = result.filter(ticket => ticket.assigneeId === session.user.id);
        } else if (filters.assignee === 'unassigned') {
          result = result.filter(ticket => !ticket.assigneeId);
        }
      }

      // Subject filter
      if (filters.subject) {
        const searchTerm = filters.subject.toLowerCase();
        result = result.filter(ticket => 
          ticket.subject.toLowerCase().includes(searchTerm)
        );
      }

      // setFilteredTickets(result);
      setTicketSections(organizeTicketsIntoSections(result, session?.user.id || ''));
    };

    applyFilters();
  }, [tickets, filters]);

  // Handle filter changes
  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allTicketIds = tickets.map(ticket => ticket.ticketId);
      setSelectedTickets(new Set(allTicketIds));
    } else {
      setSelectedTickets(new Set());
    }
    setAllSelected(checked);
  };

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (checked) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
    setAllSelected(newSelected.size === tickets.length);
  };

  // Handle tag input change
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setShowTagSuggestions(true);
  };

  // Handle tag suggestion selection
  const handleTagSelect = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      setFilters(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'new':
        return 'text-orange-500';
      case 'open':
        return 'text-red-500';
      case 'pending':
        return 'text-blue-500';
      case 'on_hold':
        return 'text-gray-700';
      case 'solved':
      case 'closed':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusDescription = (status: string): string => {
    switch (status) {
      case 'new':
        return 'Indicates that no action has been taken on the ticket. After a New ticket\'s status has been changed, it can\'t be set back to New.';
      case 'open':
        return 'Indicates a ticket has been assigned to an agent and is in progress. It\'s waiting for action by the agent.';
      case 'pending':
        return 'Indicates the agent is waiting for more information from the requester. When the requester responds and a new comment is added, the ticket status is automatically reset to Open.';
      case 'on_hold':
        return 'Indicates the agent is waiting for information or action from someone other than the requester. On-hold is an internal status that the ticket requester never sees.';
      case 'solved':
        return 'Indicates the agent has submitted a solution.';
      case 'closed':
        return 'Indicates that the ticket is closed by the system and the requester can no longer reopen it. Tickets can\'t manually be set to Closed.';
      default:
        return '';
    }
  };

  const renderTicketSection = (title: string, tickets: Ticket[]) => {
    if (tickets.length === 0) return null;

    return (
      <>
        <tr>
          <td colSpan={7} className="text-sm text-gray-500 bg-gray-50 pl-4 py-2 border-t text-left">{title} ({tickets.length})</td>
        </tr>
        {tickets.map((ticket) => (
          <tr 
            key={ticket.ticketId} 
            className="border-t hover:bg-gray-50 cursor-pointer h-12"
          >
            <td className="py-3 px-4" style={{ width: columnWidths.checkbox }}>
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-all duration-150 ease-in-out cursor-pointer hover:border-blue-400"
                  checked={selectedTickets.has(ticket.ticketId)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectTicket(ticket.ticketId, e.target.checked);
                  }}
                />
              </div>
            </td>
            <td className="py-3 px-4 text-left" style={{ width: columnWidths.status }} onClick={() => onTicketSelect(ticket.ticketId, ticket.subject, ticket.priority, ticket.ticketNumber)}>
              <div className="flex items-start space-x-2 overflow-visible">
                <div className="relative group">
                  <Circle 
                    size={16} 
                    className={`flex-shrink-0 fill-current ${getStatusColor(ticket.status)}`} 
                  />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 invisible group-hover:visible bg-gray-900 text-white text-xs rounded py-1 px-2 w-64 whitespace-normal text-left" style={{ zIndex: 100000 }}>
                    <div className="font-medium mb-1 capitalize">{ticket.status.replace('_', ' ')}</div>
                    {getStatusDescription(ticket.status)}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
                <span className="text-blue-600 flex-shrink-0">#{ticket.ticketNumber}</span>
              </div>
            </td>
            <td className="py-3 px-4 text-left relative group" style={{ width: `${columnWidths.subject}%` }} onClick={() => onTicketSelect(ticket.ticketId, ticket.subject, ticket.priority, ticket.ticketNumber)}>
              <span className="truncate block">{ticket.subject}</span>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 invisible group-hover:visible bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                Created {new Date(ticket.createdAt || '').toLocaleString()}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </td>
            <td className="py-3 px-4 text-left" style={{ width: `${columnWidths.requester}%` }} onClick={() => onTicketSelect(ticket.ticketId, ticket.subject, ticket.priority, ticket.ticketNumber)}>
              <span className="truncate block">{ticket.requester?.name || 'Unknown'}</span>
            </td>
            <td className="py-3 px-4 text-left truncate" style={{ width: `${columnWidths.updated}%` }} onClick={() => onTicketSelect(ticket.ticketId, ticket.subject, ticket.priority, ticket.ticketNumber)}>
              <TimeAgo timestamp={ticket.updatedAt || ''} />
            </td>
            <td className="py-3 px-4 text-left" style={{ width: `${columnWidths.group}%` }} onClick={() => onTicketSelect(ticket.ticketId, ticket.subject, ticket.priority, ticket.ticketNumber)}>
              <span className="truncate block">{ticket.assigneeGroup?.name || ''}</span>
            </td>
            <td className="py-3 px-4 text-left" style={{ width: `${columnWidths.assignee}%` }} onClick={() => onTicketSelect(ticket.ticketId, ticket.subject, ticket.priority, ticket.ticketNumber)}>
              <span className="truncate block">{ticket.assignee?.name || ''}</span>
            </td>
          </tr>
        ))}
      </>
    );
  };

  const handleResizeStart = (e: React.MouseEvent, columnId: string, initialWidth: number) => {
    e.preventDefault();
    setResizing(columnId);
    setStartX(e.clientX);
    setStartWidth(initialWidth);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizing) return;

    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px

    setColumnWidths(prev => ({
      ...prev,
      [resizing]: resizing.includes('%') ? (newWidth / (tableRef.current?.clientWidth || 1)) * 100 : newWidth
    }));
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, startX, startWidth]);

  // Add new function to render sidebar content
  const renderSidebarContent = () => {
    switch (selectedSidebarItem) {
      case 'notifications':
        return (
          <>
            <div className="p-4 border-b bg-white">
              <h2 className="font-medium">Updates to tickets</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                Updates to tickets will appear here
              </div>
            </div>
          </>
        );
      case 'team':
        return (
          <>
            <div className="p-4 border-b bg-white">
              <h2 className="font-medium">Team Overview</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <TeamOverview teamMembers={teamMembers} />
            </div>
          </>
        );
      case 'statistics':
        return (
          <>
            <div className="p-4 border-b bg-white">
              <h2 className="font-medium">Statistics</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                Ticket statistics and analytics will appear here
              </div>
            </div>
          </>
        );
      case 'settings':
        return (
          <>
            <div className="p-4 border-b bg-white">
              <h2 className="font-medium">Settings</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                Dashboard settings and preferences will appear here
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-14 bg-[#1f73b7] flex flex-col items-center py-4 text-white">
        <nav className="space-y-4">
          <button 
            className={`p-2 rounded ${selectedSidebarItem === 'notifications' ? 'bg-white/30' : 'hover:bg-white/10'}`}
            onClick={() => {
              setSelectedSidebarItem('notifications');
              setIsUpdatesPanelOpen(true);
            }}
          >
            <Bell size={20} />
          </button>
          <button 
            className={`p-2 rounded ${selectedSidebarItem === 'team' ? 'bg-white/30' : 'hover:bg-white/10'}`}
            onClick={() => {
              setSelectedSidebarItem('team');
              setIsUpdatesPanelOpen(true);
            }}
          >
            <Users size={20} />
          </button>
          <button 
            className={`p-2 rounded ${selectedSidebarItem === 'statistics' ? 'bg-white/30' : 'hover:bg-white/10'}`}
            onClick={() => {
              setSelectedSidebarItem('statistics');
              setIsUpdatesPanelOpen(true);
            }}
          >
            <BarChart3 size={20} />
          </button>
          <button 
            className={`p-2 rounded ${selectedSidebarItem === 'settings' ? 'bg-white/30' : 'hover:bg-white/10'}`}
            onClick={() => {
              setSelectedSidebarItem('settings');
              setIsUpdatesPanelOpen(true);
            }}
          >
            <Settings size={20} />
          </button>
        </nav>
      </div>

      <div className="flex-1 flex">
        {/* Updates Panel */}
        <div className={`relative bg-gray-100 border-r ${isUpdatesPanelOpen ? 'w-80' : 'w-0'} transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}>
          {isUpdatesPanelOpen && renderSidebarContent()}
        </div>

        {/* Collapse Button */}
        <div className="relative z-50">
          <div className={`absolute top-1/2 ${isUpdatesPanelOpen ? '-right-3' : '-right-2'} transform -translate-y-1/2`}>
            <button
              onClick={() => setIsUpdatesPanelOpen(!isUpdatesPanelOpen)}
              className="bg-white rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors"
            >
              {isUpdatesPanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Fixed Header Section */}
          <div className="flex-none p-6 bg-gray-50">
            <div className="mb-6">
              <div className="flex divide-x">
                {/* Open Tickets Section */}
                <div className="pr-6 w-[300px]">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-medium text-left">Dashboard</h2>
                  </div>
                  <div className="flex">
                    <div className="bg-white p-4 rounded-l-lg border-l border-y w-[138px]">
                      <div className="text-sm font-medium mb-2">You</div>
                      <div className="text-2xl font-bold">999</div>
                    </div>
                    <div className="bg-white p-4 rounded-r-lg border w-[138px]">
                      <div className="text-sm font-medium mb-2">Groups</div>
                      <div className="text-2xl font-bold">999</div>
                    </div>
                  </div>
                </div>

                {/* Ticket Statistics Section */}
                <div className="pl-6 w-[450px]">
                  <h2 className="text-lg font-medium mb-4 text-left">Ticket Statistics</h2>
                  <div className="flex">
                    <div className="bg-white p-4 rounded-l-lg border-l border-y border-r w-[138px]">
                      <div className="text-sm font-medium mb-2">Good</div>
                      <div className="text-2xl font-bold">999</div>
                    </div>
                    <div className="bg-white p-4 border-y w-[138px]">
                      <div className="text-sm font-medium mb-2">Bad</div>
                      <div className="text-2xl font-bold">999</div>
                    </div>
                    <div className="bg-white p-4 rounded-r-lg border w-[138px]">
                      <div className="text-sm font-medium mb-2">Solved</div>
                      <div className="text-2xl font-bold">999</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="bg-white rounded-lg border p-4" style={{ overflow: 'visible' }}>
              {/* Advanced Filters Button */}
              <div className="flex items-center mb-4">
                <button
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowAdvancedFilters(true)}
                >
                  <Filter size={14} />
                  <span className="text-xs">Advanced filters</span>
                </button>
              </div>

              {/* Advanced Filters Dialog */}
              {showAdvancedFilters && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-medium">Advanced Filters</h2>
                        <button
                          onClick={() => setShowAdvancedFilters(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      
                      {/* Placeholder Content */}
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded border text-sm text-gray-600">
                          Advanced filtering options will be implemented here.
                        </div>
                        
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setShowAdvancedFilters(false)}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setShowAdvancedFilters(false)}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Apply Filters
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters Section */}
              <div className="mb-4 flex flex-wrap gap-4">
                {/* Tags Filter */}
                <div className="w-48 relative">
                  <label className="block text-sm text-gray-600 mb-1">
                    Tags
                  </label>
                  <div className="w-full p-2 border rounded text-sm min-h-[42px] bg-white">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {filters.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs group"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => handleTagInputChange(e.target.value)}
                        onFocus={() => setShowTagSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab' && tagInput && showTagSuggestions) {
                            e.preventDefault();
                            const suggestions = tagSuggestions.filter(tag => 
                              tag.toLowerCase().includes(tagInput.toLowerCase()) &&
                              !filters.tags.includes(tag)
                            );
                            if (suggestions.length > 0) {
                              handleTagSelect(suggestions[0]);
                            }
                          }
                        }}
                        placeholder={filters.tags.length === 0 ? "Filter by tags..." : ""}
                        className="border-none p-0 flex-1 min-w-[100px] focus:outline-none focus:ring-0 text-sm"
                      />
                    </div>
                  </div>
                  {showTagSuggestions && tagInput && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {tagSuggestions
                        .filter(tag => 
                          tag.toLowerCase().includes(tagInput.toLowerCase()) &&
                          !filters.tags.includes(tag)
                        )
                        .map((tag, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleTagSelect(tag)}
                          >
                            {tag}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Priority Filter */}
                <div className="w-48">
                  <label className="block text-sm text-gray-600 mb-1">
                    Priority
                  </label>
                  <select 
                    className="w-full p-2 border rounded text-sm"
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                  >
                    <option value="">All priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Assignee Filter */}
                <div className="w-48">
                  <label className="block text-sm text-gray-600 mb-1">
                    Assignee
                  </label>
                  <select 
                    className="w-full p-2 border rounded text-sm"
                    value={filters.assignee}
                    onChange={(e) => handleFilterChange('assignee', e.target.value)}
                  >
                    <option value="">All assignees</option>
                    <option value="me">Assigned to me</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </div>

                {/* Subject Search */}
                <div className="w-64">
                  <label className="block text-sm text-gray-600 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Search by subject..."
                    className="w-full p-2 border rounded text-sm"
                    value={filters.subject}
                    onChange={(e) => handleFilterChange('subject', e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-auto">
                <table ref={tableRef} className="w-full table-fixed relative" style={{ minWidth: '880px' }}>
                  <thead className="bg-gray-50 text-sm text-gray-500 sticky top-0">
                    <tr className="relative">
                      <th className="py-3 px-4 text-left font-medium" style={{ width: columnWidths.checkbox }}>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-all duration-150 ease-in-out cursor-pointer hover:border-blue-400"
                            checked={allSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                          />
                        </div>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 group"
                          onMouseDown={(e) => handleResizeStart(e, 'checkbox', columnWidths.checkbox)}
                        >
                          <div className="absolute inset-y-0 right-0 w-4 -translate-x-1/2 group-hover:bg-blue-500/10" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left font-medium relative" style={{ width: columnWidths.status }}>
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 group"
                          onMouseDown={(e) => handleResizeStart(e, 'status', columnWidths.status)}
                        >
                          <div className="absolute inset-y-0 right-0 w-4 -translate-x-1/2 group-hover:bg-blue-500/10" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left font-medium relative" style={{ width: `${columnWidths.subject}%` }}>
                        Subject
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 group"
                          onMouseDown={(e) => handleResizeStart(e, 'subject', columnWidths.subject)}
                        >
                          <div className="absolute inset-y-0 right-0 w-4 -translate-x-1/2 group-hover:bg-blue-500/10" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left font-medium relative" style={{ width: `${columnWidths.requester}%` }}>
                        Requester
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 group"
                          onMouseDown={(e) => handleResizeStart(e, 'requester', columnWidths.requester)}
                        >
                          <div className="absolute inset-y-0 right-0 w-4 -translate-x-1/2 group-hover:bg-blue-500/10" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left font-medium relative" style={{ width: `${columnWidths.updated}%` }}>
                        Requester updated
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 group"
                          onMouseDown={(e) => handleResizeStart(e, 'updated', columnWidths.updated)}
                        >
                          <div className="absolute inset-y-0 right-0 w-4 -translate-x-1/2 group-hover:bg-blue-500/10" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left font-medium relative" style={{ width: `${columnWidths.group}%` }}>
                        Group
                        <div
                          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 group"
                          onMouseDown={(e) => handleResizeStart(e, 'group', columnWidths.group)}
                        >
                          <div className="absolute inset-y-0 right-0 w-4 -translate-x-1/2 group-hover:bg-blue-500/10" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left font-medium relative" style={{ width: `${columnWidths.assignee}%` }}>
                        Assignee
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderTicketSection('Require Action', ticketSections.requireAction)}
                    {renderTicketSection('Urgent Tickets', ticketSections.urgent)}
                    {renderTicketSection('High Priority', ticketSections.high)}
                    {renderTicketSection('Normal Priority', ticketSections.normal)}
                    {renderTicketSection('Low Priority', ticketSections.low)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 