import { createContext, useContext, useState } from 'react';
import type { Database } from '../types/supatypes';

// Type for dashboard ticket data
export type DashboardTicket = Database["public"]["Tables"]["Tickets"]["Row"] & {
  requester: { name: string } | null;
  assignee: { name: string } | null;
  assigneeGroup: { name: string } | null;
  readStatus: { lastReadAt: string } | null;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  ticketNumber: number;
  TicketTags: {
    tagId: string;
    Tags: {
      name: string;
    };
  }[];
};

// Type for individual ticket data
export type TicketData = Database["public"]["Tables"]["Tickets"]["Row"] & {
  requester: {
    userId: string;
    name: string;
    email: string;
  };
  assignee?: {
    userId: string;
    name: string;
    email: string;
  };
  assigneeGroup?: {
    groupId: string;
    name: string;
  };
  comments: {
    commentId: string;
    content: string;
    isPublic: boolean;
    createdAt: string;
    author: {
      userId: string;
      name: string;
      email: string;
    };
  }[];
  TicketTags: {
    tagId: string;
    Tags: {
      name: string;
    };
  }[];
  priority: 'urgent' | 'high' | 'normal' | 'low';
  ticketNumber: number;
};

// Generic cache entry type
interface CacheEntry<T> {
  data: T;
  lastFetched: number;
}

// Type for different cached data types
interface TabDataCache {
  dashboard?: CacheEntry<DashboardTicket[]>;
  tickets: Record<string, CacheEntry<TicketData>>;
}

interface TabDataContextType {
  // Dashboard methods
  getDashboardData: () => DashboardTicket[] | undefined;
  setDashboardData: (tickets: DashboardTicket[]) => void;
  updateDashboardTicket: (ticket: Partial<DashboardTicket> & { ticketId: string }) => void;
  invalidateDashboardData: () => void;
  
  // Individual ticket methods
  getTicketData: (ticketId: string) => TicketData | undefined;
  setTicketData: (ticketId: string, data: TicketData) => void;
  updateTicketData: (ticketId: string, updates: Partial<TicketData>) => void;
  invalidateTicketData: (ticketId: string) => void;
}

const TabDataContext = createContext<TabDataContextType | null>(null);

export function TabDataProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<TabDataCache>({
    tickets: {}
  });

  // Dashboard methods
  const getDashboardData = () => cache.dashboard?.data;

  const setDashboardData = (tickets: DashboardTicket[]) => {
    setCache(prev => ({
      ...prev,
      dashboard: {
        data: tickets,
        lastFetched: Date.now()
      }
    }));
  };

  const updateDashboardTicket = (updatedTicket: Partial<DashboardTicket> & { ticketId: string }) => {
    setCache(prev => {
      if (!prev.dashboard) return prev;

      const updatedTickets = prev.dashboard.data.map(ticket => 
        ticket.ticketId === updatedTicket.ticketId
          ? { ...ticket, ...updatedTicket }
          : ticket
      );

      return {
        ...prev,
        dashboard: {
          data: updatedTickets,
          lastFetched: Date.now()
        }
      };
    });
  };

  const invalidateDashboardData = () => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache.dashboard;
      return newCache;
    });
  };

  // Individual ticket methods
  const getTicketData = (ticketId: string) => cache.tickets[ticketId]?.data;

  const setTicketData = (ticketId: string, data: TicketData) => {
    setCache(prev => ({
      ...prev,
      tickets: {
        ...prev.tickets,
        [ticketId]: {
          data,
          lastFetched: Date.now()
        }
      }
    }));
  };

  const updateTicketData = (ticketId: string, updates: Partial<TicketData>) => {
    setCache(prev => {
      const existingTicket = prev.tickets[ticketId]?.data;
      if (!existingTicket) return prev;

      return {
        ...prev,
        tickets: {
          ...prev.tickets,
          [ticketId]: {
            data: { ...existingTicket, ...updates },
            lastFetched: Date.now()
          }
        }
      };
    });
  };

  const invalidateTicketData = (ticketId: string) => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache.tickets[ticketId];
      return newCache;
    });
  };

  return (
    <TabDataContext.Provider value={{
      getDashboardData,
      setDashboardData,
      updateDashboardTicket,
      invalidateDashboardData,
      getTicketData,
      setTicketData,
      updateTicketData,
      invalidateTicketData
    }}>
      {children}
    </TabDataContext.Provider>
  );
}

export const useTabData = () => {
  const context = useContext(TabDataContext);
  if (!context) {
    throw new Error('useTabData must be used within a TabDataProvider');
  }
  return context;
}; 