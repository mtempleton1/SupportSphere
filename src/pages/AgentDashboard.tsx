import {
  Home,
  Search,
  Settings,
  Users,
  BarChart3,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
export function App() {
  const tickets = [
    {
      id: 491,
      subject: "I'm having problems with my order",
      requester: "Sophie W",
      updated: "Today 04:08",
      group: "Support",
      assignee: "Jan Jackson",
      priority: "Normal",
      status: "Open",
    },
    {
      id: 456,
      subject: "Offline Message from Sophie W",
      requester: "Sophie W",
      updated: "Aug 26, 2016",
      group: "",
      assignee: "",
      status: "Open",
    },
    {
      id: 452,
      subject: "I could use some help",
      requester: "Sophie W",
      updated: "Oct 21, 2016",
      group: "",
      assignee: "",
      status: "Pending",
    },
    {
      id: 465,
      subject: "I need to reset my password",
      requester: "Sophie W",
      updated: "Nov 02, 2016",
      group: "",
      assignee: "",
      status: "Open",
    },
    {
      id: 467,
      subject: "[Flagged] How do I publish my content in other languages",
      requester: "Jan Jackson",
      updated: "Nov 02, 2016",
      group: "",
      assignee: "",
      status: "Pending",
    },
  ];
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
        <header className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="flex items-center">
            <h1 className="text-lg font-medium mr-8">Dashboard</h1>
            <button className="text-sm text-gray-600 mr-4">
              Explore Zendesk Support
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <Search size={20} className="text-gray-400" />
            <HelpCircle size={20} className="text-gray-400" />
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
          </div>
        </header>
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">
              Updates to your tickets
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Open Tickets</span>
                  <span className="text-sm text-gray-500">(current)</span>
                </div>
                <div className="text-2xl font-medium">3</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-sm font-medium mb-2">Pending</div>
                <div className="text-2xl font-medium">2</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-sm font-medium mb-2">Solved</div>
                <div className="text-2xl font-medium">0</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-sm font-medium mb-2">New</div>
                <div className="text-2xl font-medium">0</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h3 className="font-medium">
                Tickets requiring your attention (5)
              </h3>
              <div className="text-sm text-blue-600 mt-1">What is this?</div>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 text-sm text-gray-500">
                <tr>
                  <th className="py-3 px-4 text-left font-medium">Priority</th>
                  <th className="py-3 px-4 text-left font-medium">Subject</th>
                  <th className="py-3 px-4 text-left font-medium">Requester</th>
                  <th className="py-3 px-4 text-left font-medium">
                    Requester updated
                  </th>
                  <th className="py-3 px-4 text-left font-medium">Group</th>
                  <th className="py-3 px-4 text-left font-medium">Assignee</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>{ticket.priority}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">#{ticket.id}</span>
                        <span>{ticket.subject}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{ticket.requester}</td>
                    <td className="py-3 px-4">{ticket.updated}</td>
                    <td className="py-3 px-4">{ticket.group}</td>
                    <td className="py-3 px-4">{ticket.assignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
