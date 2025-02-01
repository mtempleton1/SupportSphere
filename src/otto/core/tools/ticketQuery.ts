import { z } from "zod";
import { BaseTool } from "./base.js";
import { supabase } from "../../../lib/supabase";

export class TicketQueryTool extends BaseTool {
  name = "ticketQuery";
  description = "Query tickets from the database based on various filters";
  schema = z.object({
    ticketId: z.string().uuid().optional().describe("The specific ticket ID to query"),
    ticketNumber: z.number().optional().describe("The ticket number to query"),
    status: z.enum(['new', 'open', 'pending', 'on_hold', 'solved', 'closed']).optional().describe("Filter tickets by status"),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().describe("Filter tickets by priority"),
    type: z.enum(['question', 'incident', 'problem', 'task']).optional().describe("Filter tickets by type"),
    assigneeId: z.string().uuid().optional().describe("Filter tickets by assigned user ID"),
    assigneeGroupId: z.string().uuid().optional().describe("Filter tickets by assigned group ID"),
    requesterId: z.string().uuid().optional().describe("Filter tickets by requester ID"),
    brandId: z.string().uuid().optional().describe("Filter tickets by brand ID"),
    accountId: z.string().uuid().optional().describe("Filter tickets by account ID"),
    isPublic: z.boolean().optional().describe("Filter tickets by public/private status"),
    limit: z.number().min(1).max(50).optional().describe("Maximum number of tickets to return (default: 10)")
  });

  async execute(args: z.infer<typeof this.schema>): Promise<string> {
    try {
      let query = supabase.from('Tickets').select(`
        ticketId,
        ticketNumber,
        accountId,
        brandId,
        requesterId,
        submitterId,
        assigneeId,
        assigneeGroupId,
        subject,
        description,
        status,
        type,
        priority,
        dueDate,
        isShared,
        isPublic,
        problemTicketId,
        createdAt,
        updatedAt,
        solvedAt,
        closedAt,
        requester:requesterId (
          userId,
          name,
          email
        ),
        assignee:assigneeId (
          userId,
          name,
          email
        ),
        assigneeGroup:assigneeGroupId (
          groupId,
          name
        )
      `);

      // Apply filters
      if (args.ticketId) {
        query = query.eq('ticketId', args.ticketId);
      }
      if (args.ticketNumber) {
        query = query.eq('ticketNumber', args.ticketNumber);
      }
      if (args.status) {
        query = query.eq('status', args.status);
      }
      if (args.priority) {
        query = query.eq('priority', args.priority);
      }
      if (args.type) {
        query = query.eq('type', args.type);
      }
      if (args.assigneeId) {
        query = query.eq('assigneeId', args.assigneeId);
      }
      if (args.assigneeGroupId) {
        query = query.eq('assigneeGroupId', args.assigneeGroupId);
      }
      if (args.requesterId) {
        query = query.eq('requesterId', args.requesterId);
      }
      if (args.brandId) {
        query = query.eq('brandId', args.brandId);
      }
      if (args.accountId) {
        query = query.eq('accountId', args.accountId);
      }
      if (args.isPublic !== undefined) {
        query = query.eq('isPublic', args.isPublic);
      }

      // Apply limit
      query = query.limit(args.limit || 10);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return JSON.stringify(data, null, 2);
    } catch (err) {
      const error = err as Error;
      return `Error querying tickets: ${error.message}`;
    }
  }
} 
