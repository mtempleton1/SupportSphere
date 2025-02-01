import { z } from "zod";

// Helper schema for parameterized values
const ParameterizedValue = z.union([
  z.string().uuid(),
  z.string().startsWith(':').describe('A parameterized value starting with :')
]);

// Define the schema for structured query output
export const QuerySchema = z.object({
  primaryQuery: z.string().describe("The main SQL query to execute"),
  subQueries: z.array(z.string()).optional().describe("Additional queries that may be needed"),
  filters: z.object({
    ticketId: ParameterizedValue.optional(),
    status: z.enum(['new', 'open', 'pending', 'on_hold', 'solved', 'closed']).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    type: z.enum(['question', 'incident', 'problem', 'task']).optional(),
    assigneeId: ParameterizedValue.optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional(),
  requiredTables: z.array(z.string()).describe("Tables needed for this query")
});

export type QueryType = z.infer<typeof QuerySchema>;

// Define example type for few-shot learning
export interface SqlExample {
  question: string;
  query: string;
  explanation?: string;
}

// Enhanced schema info types
export interface ColumnSchema {
  name: string;
  type: string;
  description: string;  // Business context and purpose of the column
  isNullable: boolean;
  isPrimaryKey: boolean;
  examples?: string[];  // Optional example values to help with context
}

export interface RelationshipSchema {
  table: string;
  from: string;
  to: string;
  description: string;  // Business meaning of the relationship
}

export interface TableSchema {
  name: string;
  description: string;  // Business purpose and context of the table
  columns: ColumnSchema[];
  relationships: RelationshipSchema[];
  examples?: {
    description: string;
    query: string;
  }[];  // Example queries specific to this table
} 