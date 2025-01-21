export type ViewType = 'dashboard' | 'ticket';
export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Tab {
  id: string;
  type: ViewType;
  title: string;
  data?: {
    ticketId?: string;
    subject?: string;
    priority?: TicketPriority;
    ticketNumber?: number;
  };
}

export interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string | null;
} 