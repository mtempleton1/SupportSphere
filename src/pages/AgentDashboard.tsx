import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
//   Search,
  Settings,
  Users,
  BarChart3,
//   HelpCircle,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AgentHeader } from "../components/AgentHeader";
import { supabase } from "../lib/supabase";
import type { Database } from "../types/supatypes";

type Ticket = Database["public"]["Tables"]["Tickets"]["Row"] & {
  requester: { name: string } | null;
  assignee: { name: string } | null;
  assigneeGroup: { name: string } | null;
  readStatus: { lastReadAt: string } | null;
};

interface TicketCounts {
  open: number;
  pending: number;
  solved: number;
  new: number;
}

interface TicketSections {
  requireAction: Ticket[];
  urgent: Ticket[];
  high: Ticket[];
  normal: Ticket[];
  low: Ticket[];
}

export function AgentDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSections, setTicketSections] = useState<TicketSections>({
    requireAction: [],
    urgent: [],
    high: [],
    normal: [],
    low: [],
  });
  const [ticketCounts, setTicketCounts] = useState<TicketCounts>({
    open: 0,
    pending: 0,
    solved: 0,
    new: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);
  const [isUpdatesPanelOpen, setIsUpdatesPanelOpen] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/');
          return;
        }

        // Get the account ID for the current user
        const { data: userProfile, error: userError } = await supabase
          .from('UserProfiles')
          .select('accountId')
          .eq('userId', session.user.id)
          .single();

        if (userError) throw userError;

        // Fetch tickets for the account with related data
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('Tickets')
          .select(`
            *,
            requester:UserProfiles!requesterId(name),
            assignee:UserProfiles!assigneeId(name),
            assigneeGroup:Groups!assigneeGroupId(name),
            readStatus:TicketReadStatus!inner(lastReadAt)
          `)
          .eq('accountId', userProfile.accountId)
          .order('updatedAt', { ascending: false });

        if (ticketsError) throw ticketsError;

        // Transform the data to match our Ticket interface
        const transformedTickets = ticketsData.map(ticket => ({
          ...ticket,
          requester: ticket.requester || null,
          assignee: ticket.assignee || null,
          assigneeGroup: ticket.assigneeGroup || null,
          readStatus: ticket.readStatus || null,
        }));

        // Organize tickets into sections
        const sections: TicketSections = {
          requireAction: [],
          urgent: [],
          high: [],
          normal: [],
          low: [],
        };

        transformedTickets.forEach(ticket => {
          // Check if ticket is unread and assigned to current user
          const isUnread = !ticket.readStatus?.lastReadAt || 
            new Date(ticket.readStatus.lastReadAt) < new Date(ticket.updatedAt || '');
          const isAssignedToMe = ticket.assigneeId === session.user.id;

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

        setTicketSections(sections);
        setTickets(transformedTickets);

        // Calculate ticket counts
        const counts = transformedTickets.reduce((acc, ticket) => {
          acc[ticket.status as keyof TicketCounts] = (acc[ticket.status as keyof TicketCounts] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setTicketCounts({
          open: counts.open || 0,
          pending: counts.pending || 0,
          solved: counts.solved || 0,
          new: counts.new || 0,
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, [navigate]);

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

  const renderTicketSection = (title: string, tickets: Ticket[]) => {
    if (tickets.length === 0) return null;

    return (
      <>
        <tr>
          <td colSpan={6} className="text-sm text-gray-500 bg-gray-50 pl-4 py-2 border-t text-left">{title} ({tickets.length})</td>
        </tr>
        {tickets.map((ticket) => (
          <tr 
            key={ticket.ticketId} 
            className="border-t hover:bg-gray-50 cursor-pointer h-12"
          >
            <td className="py-3 px-4 w-12">
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
            <td className="py-3 px-4" onClick={() => navigate(`/agent/tickets/${ticket.ticketId}`)}>
              <div className="flex items-center space-x-2 overflow-hidden">
                <span className="text-blue-600 flex-shrink-0">#{ticket.ticketId.split('-')[0]}</span>
                <span className="truncate">{ticket.subject}</span>
              </div>
            </td>
            <td className="py-3 px-4 truncate" onClick={() => navigate(`/agent/tickets/${ticket.ticketId}`)}>{ticket.requester?.name || 'Unknown'}</td>
            <td className="py-3 px-4 truncate" onClick={() => navigate(`/agent/tickets/${ticket.ticketId}`)}>{new Date(ticket.updatedAt || '').toLocaleString()}</td>
            <td className="py-3 px-4 truncate" onClick={() => navigate(`/agent/tickets/${ticket.ticketId}`)}>{ticket.assigneeGroup?.name || ''}</td>
            <td className="py-3 px-4 truncate" onClick={() => navigate(`/agent/tickets/${ticket.ticketId}`)}>{ticket.assignee?.name || ''}</td>
          </tr>
        ))}
      </>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-14 bg-[#1f73b7] flex flex-col items-center py-4 text-white">
        <div className="mb-8">
          <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
            <MessageCircle size={20} />
          </div>
        </div>
        <nav className="space-y-4">
          <button className="p-2 hover:bg-white/10 rounded">
            <Home size={20} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded">
            <Users size={20} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded">
            <BarChart3 size={20} />
          </button>
          <button className="p-2 hover:bg-white/10 rounded">
            <Settings size={20} />
          </button>
        </nav>
      </div>
      
      <div className="flex-1 flex flex-col">
        <AgentHeader variant="dashboard" />
        
        <div className="flex-1 flex">
          {/* Updates Panel */}
          <div className={`relative bg-gray-100 border-r ${isUpdatesPanelOpen ? 'w-80' : 'w-0'} transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}>
            {isUpdatesPanelOpen && (
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
            )}
          </div>

          {/* Collapse Button - Moved outside the panel */}
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
          <div className="flex-1 p-6">
            <div className="mb-6">
              <div className="flex divide-x">
                {/* Open Tickets Section */}
                <div className="pr-6 w-[300px]">
                  <h2 className="text-lg font-medium mb-4 text-left">Open Tickets</h2>
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
            <div className="bg-white rounded-lg border p-4">
              <table className="w-full">
                <thead className="bg-gray-50 text-sm text-gray-500">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium w-12">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 transition-all duration-150 ease-in-out cursor-pointer hover:border-blue-400"
                          checked={allSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium w-1/4">Subject</th>
                    <th className="py-3 px-4 text-left font-medium w-1/5">Requester</th>
                    <th className="py-3 px-4 text-left font-medium w-1/5">Requester updated</th>
                    <th className="py-3 px-4 text-left font-medium w-1/5">Group</th>
                    <th className="py-3 px-4 text-left font-medium w-1/5">Assignee</th>
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
  );
}
