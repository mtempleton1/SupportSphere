import { z } from "zod";
import { BaseTool, RunnableConfig } from "../../tools/base";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";

export class SQLWriterTool extends BaseTool {
  name = "writeSQL";
  description = "Convert a natural language query into a SQL statement using the provided schema information";
  
  private llm: ChatOpenAI;
  schema = z.object({
    query: z.string().describe("The natural language query to convert to SQL"),
    filteredSchema: z.string().describe("The filtered database schema relevant to this query")
  });

  constructor(openAIApiKey: string) {
    super();
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
      openAIApiKey: openAIApiKey
    });
  }

  private validateColumnNames(query: string): string {
    // Replace common incorrect column names with correct ones
    const columnMappings: Record<string, string> = {
      'assignee_id': 'assigneeId',
      'user_id': 'userId',
      'ticket_id': 'ticketId',
      'account_id': 'accountId',
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'company_id': 'accountId',
      'companyId': 'accountId',
      'organization_id': 'organizationId',
      'org_id': 'organizationId',
      'group_id': 'groupId',
      'brand_id': 'brandId',
      'role_id': 'roleId',
      'requester_id': 'requesterId',
      'submitter_id': 'submitterId',
      'macro_id': 'macroId',
      'category_id': 'categoryId',
      'channel_id': 'channelId',
      'permission_id': 'permissionId',
      'tag_id': 'tagId',
      'solved_at': 'solvedAt',
      'closed_at': 'closedAt',
      'due_date': 'dueDate',
      'last_read_at': 'lastReadAt',
      'read_at': 'readAt',
      'first_response_at': 'firstResponseAt',
      'is_active': 'isActive',
      'is_default': 'isDefault',
      'is_enabled': 'isEnabled',
      'is_shared': 'isShared',
      'is_public': 'isPublic',
      'is_suspended': 'isSuspended',
      'is_verified': 'isVerified',
      'is_online': 'isOnline',
      'is_enterprise': 'isEnterpriseOnly',
      'is_staff': 'isStaffRole',
      'is_personal': 'isPersonal'
    };

    let validatedQuery = query;
    Object.entries(columnMappings).forEach(([incorrect, correct]) => {
      validatedQuery = validatedQuery.replace(new RegExp(incorrect, 'g'), correct);
    });

    return validatedQuery;
  }

  private async buildPrompt(question: string, schema: string): Promise<string> {
    return `You are an expert SQL query writer for a ticket management system.
Given a question in natural language and a database schema, create a valid SQL query.

Database Schema:
${schema}

IMPORTANT: The parameter ':currentUserId' MUST be used to reference the current user's ID.
The current user is the user that wrote the question.

Example Queries for Current User:

Question: How many tickets are assigned to me?
Query: SELECT COUNT(*) FROM "Tickets" WHERE "assigneeId" = :currentUserId
Explanation: Uses :currentUserId to reference the current user's ID

Question: Show my open tickets
Query: SELECT * FROM "Tickets" WHERE "assigneeId" = :currentUserId AND "status" = 'open'
Explanation: Uses :currentUserId combined with status filter

Question: What tickets did I submit?
Query: SELECT * FROM "Tickets" WHERE "submitterId" = :currentUserId
Explanation: Uses :currentUserId to find tickets submitted by current user

Question: Is there anyone named John in my company?
Query: SELECT "name", "email" FROM "UserProfiles" WHERE "accountId" = (SELECT "accountId" FROM "UserProfiles" WHERE "userId" = :currentUserId) AND "name" ILIKE '%john%'
Explanation: Uses ILIKE for partial case-insensitive name matching within the same account

CRITICAL RULES:
1. NEVER look up the current user by name. Only look up users by name if they aren't the current user.
2. Use proper camelCase for column names
3. Always quote table and column names with double quotes
4. Return only the SQL query, no explanation or additional text
5. ONLY use column names that are explicitly listed in the schema above
6. NEVER guess or make up column names - if you're unsure about a column name, check the schema - if you simply cannot find the column you need then reply with an error message indicating what's missing.
7. When searching for people by name:
   - ALWAYS use ILIKE with wildcards (%) for partial matching
   - ALWAYS search within the same account as the current user
   - Example: "name" ILIKE '%john%' will match "John Smith", "Johnny", etc.
8. Common mistakes to avoid:
   - Don't use 'company_id' or 'companyId' - use 'accountId' instead
   - Don't use 'user_id' - use 'userId' instead
   - Don't use 'created_at' - use 'createdAt' instead
   - Don't use 'updated_at' - use 'updatedAt' instead
   - Don't use = for name comparisons - use ILIKE with wildcards instead

Question: ${question}`;
  }

  private extractSQLFromResponse(response: BaseMessage): string {
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    const lines = content.split('\n');
    
    // Find the start and end indices of the SQL query
    let startIndex = -1;
    let endIndex = -1;
    
    // Look for the start of the SQL query (SELECT or WITH)
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim().toUpperCase();
      if (trimmedLine.startsWith('SELECT') || trimmedLine.startsWith('WITH')) {
        startIndex = i;
        break;
      }
    }
    
    // If we found a start, look for the end (empty line or line starting with non-SQL keywords)
    if (startIndex !== -1) {
      for (let i = startIndex + 1; i < lines.length; i++) {
        const trimmedLine = lines[i].trim().toUpperCase();
        // If we hit an empty line or a line that doesn't look like part of the SQL query
        if (!trimmedLine || 
            (!trimmedLine.startsWith('SELECT') && 
             !trimmedLine.startsWith('FROM') && 
             !trimmedLine.startsWith('WHERE') && 
             !trimmedLine.startsWith('JOIN') && 
             !trimmedLine.startsWith('LEFT') && 
             !trimmedLine.startsWith('RIGHT') && 
             !trimmedLine.startsWith('INNER') && 
             !trimmedLine.startsWith('GROUP') && 
             !trimmedLine.startsWith('ORDER') && 
             !trimmedLine.startsWith('HAVING') && 
             !trimmedLine.startsWith('LIMIT') && 
             !trimmedLine.startsWith('OFFSET') && 
             !trimmedLine.startsWith('AND') && 
             !trimmedLine.startsWith('OR') && 
             !trimmedLine.startsWith('ON') && 
             !trimmedLine.startsWith('WITH') && 
             !trimmedLine.startsWith('UNION') && 
             !trimmedLine.startsWith('INTERSECT') && 
             !trimmedLine.startsWith('EXCEPT'))) {
          endIndex = i - 1;
          break;
        }
      }
      // If we didn't find an end, assume it goes to the end of the content
      if (endIndex === -1) {
        endIndex = lines.length - 1;
      }
      
      // Extract and join the SQL query lines
      return lines.slice(startIndex, endIndex + 1)
        .map(line => line.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // If no SQL query was found, return the whole content
    return content;
  }

  async execute(args: z.infer<typeof this.schema>, config?: RunnableConfig): Promise<string> {
    try {
      const prompt = await this.buildPrompt(args.query, args.filteredSchema);
      
      const response = await this.llm.invoke(prompt, config);
      
      // Extract and clean the SQL query
      let sqlQuery = this.extractSQLFromResponse(response);

      // Validate column names
      sqlQuery = this.validateColumnNames(sqlQuery);

      return JSON.stringify({
        success: true,
        sql: sqlQuery
      });
    } catch (error) {
      console.error("SQL Writer Error:", error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
} 