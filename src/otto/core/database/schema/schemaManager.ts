import { supabase } from "../../../../lib/supabase";
// import { TableSchema, ColumnSchema, RelationshipSchema } from "../types/queryTypes";
import { TableSchema } from "../types/queryTypes";

export class SchemaManager {
  private static instance: SchemaManager;
  private schemaCache: Map<string, TableSchema>;
  private lastRefresh: Date;

  private constructor() {
    this.schemaCache = new Map();
    this.lastRefresh = new Date(0); // Force first refresh
  }

  public static getInstance(): SchemaManager {
    if (!SchemaManager.instance) {
      SchemaManager.instance = new SchemaManager();
    }
    return SchemaManager.instance;
  }

  private getTableDescription(tableName: string): string {
    const descriptions: Record<string, string> = {
      'Tickets': 'Central table for managing support tickets. Each record represents a support request, incident, problem, or task that needs attention. For staff users, tickets represent work items assigned to them or their groups for resolution. For regular users, tickets are support requests they have submitted. Tickets can be linked to problems (for incident tickets) and can be either public or private.'
    };
    return descriptions[tableName] || '';
  }

  private getColumnDescription(tableName: string, columnName: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      'Tickets': {
        'ticketId': 'Unique identifier for the ticket',
        'accountId': 'ID of the account this ticket belongs to',
        'brandId': 'ID of the brand this ticket is associated with',
        'requesterId': 'ID of the user who needs help (the end-user/customer requesting support)',
        'submitterId': 'ID of the user who actually created the ticket (might be different from requester if created on behalf of someone)',
        'assigneeId': 'ID of the staff member assigned to handle this ticket. For staff users querying their tickets, this is typically the most relevant field.',
        'assigneeGroupId': 'ID of the group assigned to handle this ticket. A ticket can be assigned either to an individual or a group, but not both.',
        'subject': 'Brief summary or title of the ticket (limited to 150 characters)',
        'description': 'Detailed explanation of the issue, request, or task',
        'status': 'Current state of the ticket (new, open, pending, on_hold, solved, closed)',
        'type': 'Category of the ticket (question, incident, problem, task)',
        'priority': 'Urgency level of the ticket (low, normal, high, urgent)',
        'dueDate': 'When the ticket needs to be completed by (primarily used for tasks)',
        'isShared': 'Whether the ticket is shared with other organizations',
        'isPublic': 'Whether the ticket is visible to end-users',
        'problemTicketId': 'For incident tickets, links to the problem ticket that tracks the underlying issue',
        'createdAt': 'When the ticket was created',
        'updatedAt': 'When the ticket was last modified',
        'solvedAt': 'When the ticket was marked as solved',
        'closedAt': 'When the ticket was closed',
        'ticketNumber': 'Sequential identifier for the ticket, unique within the account'
      }
    };
    return descriptions[tableName]?.[columnName] || '';
  }

  private getRelationshipDescription(tableName: string, columnName: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      'Tickets': {
        'accountId': 'Links to the organization/account that owns this ticket. Used for multi-tenant support and access control.',
        'brandId': 'Links to the brand this ticket belongs to, determining the support portal and branding context.',
        'requesterId': 'Links to the user who needs help. This relationship connects the ticket to the customer who needs support.',
        'submitterId': 'Links to the user who created the ticket, which might be different from the requester if created on behalf of someone.',
        'assigneeId': 'Links to the staff member assigned to resolve the ticket. This relationship is crucial for staff members managing their workload.',
        'assigneeGroupId': 'Links to the group assigned to handle the ticket. Groups can be assigned instead of individual staff members.',
        'problemTicketId': 'For incident tickets, links to the problem ticket that tracks the root cause.'
      }
    };
    return descriptions[tableName]?.[columnName] || '';
  }

  private getTableExamples(tableName: string): { description: string, query: string }[] {
    const examples: Record<string, { description: string, query: string }[]> = {
      'Tickets': [
        {
          description: "Count tickets assigned to current staff user",
          query: 'SELECT COUNT(*) FROM "Tickets" WHERE "assigneeId" = :current_user_id'
        },
        {
          description: "Count tickets submitted by current user",
          query: 'SELECT COUNT(*) FROM "Tickets" WHERE "requesterId" = :current_user_id'
        },
        {
          description: "Count tickets assigned to current user's group",
          query: 'SELECT COUNT(*) FROM "Tickets" WHERE "assigneeGroupId" IN (SELECT "groupId" FROM "UserGroups" WHERE "userId" = :current_user_id)'
        }
      ]
    };
    return examples[tableName] || [];
  }

  public async getSchema(forceRefresh = false): Promise<Map<string, TableSchema>> {
    const CACHE_TTL = 1000 * 60 * 60; // 1 hour
    const now = new Date();

    if (forceRefresh || now.getTime() - this.lastRefresh.getTime() > CACHE_TTL) {
      await this.refreshSchema();
    }

    return this.schemaCache;
  }

  private async refreshSchema(): Promise<void> {
    try {
      // Get table information using raw SQL
      const { data: tables, error: tablesError } = await supabase
        .rpc('execute_raw_query', {
          query: `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
          `
        });

      if (tablesError) throw tablesError;

      // Clear existing cache
      this.schemaCache.clear();

      // Process each table
      for (const table of tables) {
        const tableName = table.table_name;
        
        // Get column information
        const { data: columns, error: columnsError } = await supabase
          .rpc('execute_raw_query', {
            query: `
              SELECT column_name, data_type, is_nullable, column_default,
                     (SELECT true 
                      FROM information_schema.table_constraints tc 
                      JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name 
                      WHERE tc.table_name = c.table_name 
                        AND kcu.column_name = c.column_name 
                        AND tc.constraint_type = 'PRIMARY KEY') is_primary_key
              FROM information_schema.columns c
              WHERE table_schema = 'public' 
              AND table_name = '${tableName}'
            `
          });

        if (columnsError) throw columnsError;

        // Get foreign key relationships
        const { data: foreignKeys, error: fkError } = await supabase
          .rpc('execute_raw_query', {
            query: `
              SELECT
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name as referenced_table_name,
                ccu.column_name as referenced_column_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
              JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
              WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND tc.table_name = '${tableName}'
            `
          });

        if (fkError) throw fkError;

        // Create table schema with rich descriptions
        const tableSchema: TableSchema = {
          name: tableName,
          description: this.getTableDescription(tableName),
          columns: columns.map((col: { 
            column_name: string;
            data_type: string;
            is_nullable: string;
            is_primary_key: boolean;
          }) => ({
            name: col.column_name,
            type: col.data_type,
            description: this.getColumnDescription(tableName, col.column_name),
            isNullable: col.is_nullable === 'YES',
            isPrimaryKey: col.is_primary_key || false
          })),
          relationships: foreignKeys.map((fk: {
            referenced_table_name: string;
            column_name: string;
            referenced_column_name: string;
          }) => ({
            table: fk.referenced_table_name,
            from: fk.column_name,
            to: fk.referenced_column_name,
            description: this.getRelationshipDescription(tableName, fk.column_name)
          })),
          examples: this.getTableExamples(tableName)
        };

        this.schemaCache.set(tableName, tableSchema);
      }

      this.lastRefresh = new Date();
    } catch (error) {
      throw error;
    }
  }

  public getTableInfo(tableName: string): TableSchema | undefined {
    return this.schemaCache.get(tableName);
  }

  public getAllTableNames(): string[] {
    return Array.from(this.schemaCache.keys());
  }

  public getFormattedSchema(): string {
    let schema = '';
    this.schemaCache.forEach((tableSchema, tableName) => {
      schema += `Table: ${tableName}\n`;
      schema += `Description: ${tableSchema.description}\n\n`;
      
      schema += 'Columns:\n';
      tableSchema.columns.forEach(col => {
        schema += `  - ${col.name} (${col.type})${col.isPrimaryKey ? ' PRIMARY KEY' : ''}${col.isNullable ? ' NULL' : ' NOT NULL'}\n`;
        schema += `    Description: ${col.description}\n`;
      });
      
      if (tableSchema.relationships.length > 0) {
        schema += '\nRelationships:\n';
        tableSchema.relationships.forEach(rel => {
          schema += `  - ${rel.from} -> ${rel.table}.${rel.to}\n`;
          schema += `    Description: ${rel.description}\n`;
        });
      }

      const examples = tableSchema.examples || [];
      if (examples.length > 0) {
        schema += '\nExample Queries:\n';
        examples.forEach(ex => {
          schema += `  - ${ex.description}:\n    ${ex.query}\n`;
        });
      }
      
      schema += '\n';
    });
    return schema;
  }
} 