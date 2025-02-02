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
      },
      'UserProfiles': {
        'userId': 'Unique identifier for the user, links to the auth.users table for authentication',
        'name': 'Full name of the user',
        'email': 'Primary email address for the user, used for notifications and communications',
        'userType': 'Type of user (staff or end_user). Staff users have access to support tools and can handle tickets, while end-users submit and view their own tickets',
        'roleId': 'Links to the role that defines the user\'s permissions and access levels within the system',
        'accountId': 'The account/company this user belongs to. For staff, this is their employer; for end-users, this is the company they\'re getting support from',
        'organizationId': 'For end-users, links to their specific organization within the account (optional)',
        'isActive': 'Whether the user account is currently active and can access the system',
        'isSuspended': 'Whether the user account has been temporarily suspended',
        'isEmailVerified': 'Whether the user has verified their email address',
        'isOnline': 'Current online status of the user',
        'title': 'Job title or position of the user',
        'status': 'Custom status message set by the user',
        'avatarUrl': 'URL to the user\'s profile picture',
        'createdAt': 'When the user profile was created',
        'updatedAt': 'When the user profile was last modified'
      },
      'Roles': {
        'roleId': 'Unique identifier for the role',
        'accountId': 'ID of the account this role belongs to, enabling per-account role customization',
        'name': 'Display name of the role (e.g., "Senior Support Agent", "Team Lead")',
        'description': 'Detailed description of the role\'s purpose and responsibilities',
        'roleType': 'Type of role (system, custom, light, contributor) indicating how the role was created and its mutability',
        'roleCategory': 'Primary category of the role (end_user, agent, admin, owner) determining base access level',
        'isEnterpriseOnly': 'Whether this role is only available to enterprise accounts',
        'isStaffRole': 'Whether this is a staff role (true) or an end-user role (false)',
        'parentRoleId': 'Optional reference to a parent role for hierarchical role structures, inheriting permissions',
        'canViewAllTickets': 'Whether users with this role can view all tickets in their account, not just ones they\'re involved with',
        'canManageAllTickets': 'Whether users with this role can modify and manage all tickets in their account',
        'canConfigureSystem': 'Whether users with this role can modify system settings and configurations',
        'canManageUsers': 'Whether users with this role can create, modify, and deactivate user accounts',
        'canManageRoles': 'Whether users with this role can create and modify roles (typically admin-only)',
        'canViewReports': 'Whether users with this role can access and view reporting features',
        'canManageGroups': 'Whether users with this role can create and manage support groups',
        'canManageOrganizations': 'Whether users with this role can create and manage organizations',
        'canMakePrivateComments': 'Whether users with this role can make internal notes on tickets',
        'canMakePublicComments': 'Whether users with this role can make comments visible to end-users',
        'isDefault': 'Whether this is the default role assigned to new users of this type',
        'createdAt': 'When the role was created',
        'updatedAt': 'When the role was last modified'
      },
      'Organizations': {
        'organizationId': 'Unique identifier for the organization',
        'accountId': 'ID of the support account this organization belongs to, enabling multi-tenant support',
        'name': 'Display name of the organization (e.g., "Acme Corp", "Tech Solutions Inc")',
        'description': 'General description of the organization, typically including business type and support context',
        'notes': 'Internal notes about the organization, visible only to support staff',
        'details': 'Additional structured or unstructured details about the organization (e.g., size, industry, support preferences)',
        'isShared': 'Whether this organization\'s information and tickets can be shared with other organizations in the account',
        'defaultGroupId': 'The default support group assigned to handle tickets from this organization, enabling specialized support teams',
        'createdAt': 'When the organization was created in the system',
        'updatedAt': 'When the organization\'s information was last modified'
      },
      'Brands': {
        'brandId': 'Unique identifier for the brand',
        'accountId': 'ID of the account this brand belongs to, enabling multi-brand support within a single account',
        'name': 'Customer-facing name of the brand. Must be unique within the account (e.g., "Enterprise Support", "Developer Platform")',
        'description': 'Detailed description of the brand and its purpose',
        'subdomain': 'Unique subdomain for the brand\'s help center (e.g., "support" in support.company.com). Used for both help center URL and default support email address',
        'logo': 'URL to the brand\'s logo image. Should be 2MB or less, in PNG, JPG, JPEG, or GIF format, ideally square for best display',
        'hostMapping': 'Optional custom domain mapping for the brand\'s help center (e.g., "support.customdomain.com"). Requires SSL certificate configuration',
        'brandSignature': 'Default signature appended to agent responses when representing this brand in communications',
        'isDefault': 'Whether this is the default brand for the account. Default brand is used when no specific brand is indicated and cannot be deleted until another brand is made default',
        'isAgentBrand': 'Whether this is the agent brand (agent route) that agents are directed to when signing in. Cannot be deleted until another brand is made the agent brand',
        'isActive': 'Whether the brand is currently active and available for use. Inactive brands are hidden from end-users but retain their configuration',
        'sslCertificate': 'SSL certificate information for host-mapped domains, required for secure custom domain access',
        'createdAt': 'When the brand was created',
        'updatedAt': 'When the brand was last modified'
      },
      'Permissions': {
        'permissionId': 'Unique identifier for the permission',
        'name': 'Name of the permission that describes the specific action or access right (e.g., "view_tickets", "manage_users", "delete_comments")',
        'description': 'Detailed explanation of what this permission allows a user to do and any relevant context or limitations',
        'category': 'Broad classification of the permission for organizational purposes (e.g., "tickets", "users", "system", "reporting"). Helps in grouping related permissions',
        'createdAt': 'When the permission was created in the system',
        'updatedAt': 'When the permission was last modified'
      },
      'Tags': {
        'tagId': 'Unique identifier for the tag',
        'accountId': 'ID of the account this tag belongs to, enabling per-account tag management',
        'name': 'The actual tag text/label (e.g., "vip", "urgent", "enterprise"). Must be unique within an account',
        'tagType': 'Categorizes the tag usage: "user" for user-specific tags, "organization" for organization tags, or "group" for group-related tags',
        'createdAt': 'When the tag was created in the system',
        'updatedAt': 'When the tag was last modified'
      },
      'TicketReadStatus': {
        'ticketId': 'ID of the ticket being tracked for read status',
        'userId': 'ID of the user whose read status is being tracked',
        'lastReadAt': 'Timestamp of when the user last read or viewed the ticket. Used to determine if there are unread updates'
      },
      'CommentReadStatus': {
        'commentId': 'ID of the specific comment being tracked for read status',
        'userId': 'ID of the user whose read status is being tracked',
        'readAt': 'Timestamp of when the user read this specific comment. Used to track which comments are new/unread'
      },
      'Macros': {
        'macroId': 'Unique identifier for the macro',
        'accountId': 'ID of the account this macro belongs to',
        'categoryId': 'Optional reference to the category this macro belongs to for organizational purposes',
        'createdById': 'ID of the staff member who created this macro',
        'title': 'Name of the macro that describes its purpose (e.g., "Escalate to Tier 2", "Request More Info")',
        'description': 'Detailed explanation of what the macro does and when to use it',
        'isPersonal': 'Whether this is a personal macro (only visible to creator) or shared with the team',
        'isActive': 'Whether the macro is currently active and available for use',
        'position': 'Optional ordering position for display in macro lists',
        'createdAt': 'When the macro was created',
        'updatedAt': 'When the macro was last modified'
      },
      'MacroCategories': {
        'categoryId': 'Unique identifier for the macro category',
        'accountId': 'ID of the account this category belongs to',
        'name': 'Display name of the category (e.g., "Customer Service", "Technical Support", "Billing")',
        'description': 'Detailed explanation of what types of macros belong in this category',
        'parentCategoryId': 'Optional reference to a parent category for hierarchical organization',
        'createdAt': 'When the category was created',
        'updatedAt': 'When the category was last modified'
      },
      'Channels': {
        'channelId': 'Unique identifier for the channel',
        'accountId': 'ID of the account this channel belongs to',
        'brandId': 'Optional reference to the brand this channel is associated with',
        'type': 'Type of channel (email, help_center, web_messaging, whatsapp, facebook, twitter, voice, etc.)',
        'name': 'Display name of the channel',
        'description': 'Detailed description of the channel\'s purpose and configuration',
        'isEnabled': 'Whether the channel is currently active and accepting new tickets',
        'configuration': 'JSON configuration specific to the channel type (e.g., API keys, webhook URLs, phone numbers)',
        'createdAt': 'When the channel was created',
        'updatedAt': 'When the channel was last modified'
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