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

type TabEvent = {
  type: 'TICKET_UPDATE' | 'MESSAGES_READ';
  ticketId: string;
  changes?: {
    subject?: string;
    // Add other potential changes here in the future
  };
};

export type { RealtimeEvent, TabEvent };
