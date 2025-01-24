type RealtimeEvent = {
    table: 'Tickets' | 'TicketComments';
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

export type { RealtimeEvent };
