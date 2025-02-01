import { SqlExample } from "../types/queryTypes";

export const SQL_EXAMPLES: SqlExample[] = [
  {
    question: "Show me all open tickets",
    query: `SELECT * FROM "Tickets" WHERE status = 'open' ORDER BY created_at DESC LIMIT 10`,
    explanation: "Basic query to fetch open tickets"
  },
  {
    question: "Find high priority tickets assigned to John",
    query: `
      SELECT t.* 
      FROM "Tickets" t
      JOIN "Users" u ON t.assignee_id = u.user_id
      WHERE t.priority = 'high' 
      AND u.name ILIKE '%John%'
      ORDER BY t.created_at DESC
    `,
    explanation: "Query with join to find tickets by assignee name and priority"
  },
  {
    question: "How many tickets are in each status category?",
    query: `
      SELECT status, COUNT(*) as count
      FROM "Tickets"
      GROUP BY status
      ORDER BY count DESC
    `,
    explanation: "Aggregation query to count tickets by status"
  },
  {
    question: "Find tickets created in the last 24 hours",
    query: `
      SELECT * 
      FROM "Tickets"
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `,
    explanation: "Time-based query using interval"
  },
  {
    question: "Show me unassigned urgent tickets",
    query: `
      SELECT * 
      FROM "Tickets"
      WHERE assignee_id IS NULL
      AND priority = 'urgent'
      ORDER BY created_at ASC
    `,
    explanation: "Query for null values and priority filter"
  }
];

// Examples specifically for ticket analysis
export const TICKET_ANALYSIS_EXAMPLES: SqlExample[] = [
  {
    question: "What's the average response time for urgent tickets?",
    query: `
      SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))) as avg_response_time
      FROM "Tickets"
      WHERE priority = 'urgent'
      AND first_response_at IS NOT NULL
    `,
    explanation: "Complex time calculation with aggregation"
  },
  {
    question: "Who are the top 5 agents by resolved tickets this month?",
    query: `
      SELECT 
        u.name,
        COUNT(*) as resolved_tickets
      FROM "Tickets" t
      JOIN "Users" u ON t.assignee_id = u.user_id
      WHERE t.status = 'solved'
      AND t.solved_at >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY u.name
      ORDER BY resolved_tickets DESC
      LIMIT 5
    `,
    explanation: "Complex query with join, date truncation, and aggregation"
  }
]; 