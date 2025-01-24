type RealtimeEvent = {
    table: 'Tickets' | 'TicketComments' | 'TicketTags';
    schema: 'public';
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    payload: {
      new: {
        ticketId: string;
        [key: string]: any;
      };
      old: {
        [key: string]: any;
      };
    };
  };

type AgentPresenceState = {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status?: string;
  lastActivity: string;
  isActive: boolean;
  presence_ref?: string;
};

type PresenceState = {
  [key: string]: AgentPresenceState[];
};

type TabEvent = {
  type: 'TICKET_UPDATE' | 'MESSAGES_READ';
  ticketId: string;
  changes?: {
    subject?: string;
    // Add other potential changes here in the future
  };
};

type TicketPresenceState = {
  userId: string;
  name: string;
  avatarUrl?: string;
  currentSection: 'details' | 'conversation' | 'requester';
  isTyping: boolean;
  lastActivity: string;
};

type TicketPresenceChannelState = {
  [key: string]: TicketPresenceState[];
};

export type { RealtimeEvent, TabEvent, AgentPresenceState, PresenceState, TicketPresenceState, TicketPresenceChannelState };
