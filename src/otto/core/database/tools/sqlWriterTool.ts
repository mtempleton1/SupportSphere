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
    const columnMappings: Record<string, string> = {
      'assignee_id': 'assigneeId',
      'user_id': 'userId',
      'ticket_id': 'ticketId',
      'account_id': 'accountId',
      'created_at': 'createdAt',
      'updated_at': 'updatedAt'
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

IMPORTANT: All queries are about the current user. Never try to look up specific users by name.
The parameter ':currentUserId' MUST be used to reference the current user's ID.

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

CRITICAL RULES:
1. ALL queries are about the currently logged-in user
2. NEVER look up users by name - Otto is just the AI assistant
3. ALWAYS use :currentUserId for user identification
4. Use proper camelCase for column names
5. Always quote table and column names with double quotes
6. Return only the SQL query, no explanation or additional text

Question: ${question}`;
  }

  private extractSQLFromResponse(response: BaseMessage): string {
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    const lines = content.split('\n');
    
    // Try to find a line that starts with SELECT or WITH
    const sqlLine = lines.find((line: string) => 
      line.trim().toUpperCase().startsWith('SELECT') ||
      line.trim().toUpperCase().startsWith('WITH')
    );

    // If we found a SQL line, return it, otherwise return the whole content
    return sqlLine || content;
  }

  async execute(args: z.infer<typeof this.schema>, config?: RunnableConfig): Promise<string> {
    try {
      console.log("SQL WRITER TOOL");
      const prompt = await this.buildPrompt(args.query, args.filteredSchema);
      
      const response = await this.llm.invoke(prompt, config);
      console.log("LLM Response:", response);
      
      // Extract and clean the SQL query
      let sqlQuery = this.extractSQLFromResponse(response);
      console.log("Extracted SQL:", sqlQuery);

      // Validate column names
      sqlQuery = this.validateColumnNames(sqlQuery);
      console.log("Validated SQL:", sqlQuery);

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