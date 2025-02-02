import { z } from "zod";
import { BaseTool } from "../../tools/base";
import { createSupabaseClient, type SupabaseConfig } from "../../../../lib/supabase";

export class SQLExecutorTool extends BaseTool {
  name = "executeSQL";
  description = "Execute a SQL query against the database and return the results";
  
  private supabase;
  private userId: string;
  
  schema = z.object({
    sql: z.string().describe("The SQL query to execute")
  });

  constructor(supabaseConfig: SupabaseConfig, userId: string) {
    super();
    this.supabase = createSupabaseClient(supabaseConfig);
    this.userId = userId;
  }

  private async replaceQueryParameters(query: string): Promise<string> {
    // Escape any single quotes in the UUID to prevent SQL injection
    const safeUserId = this.userId.replace(/'/g, "''");
    
    // Replace the current user ID parameter with the actual value
    return query.replace(/:currentUserId/g, `'${safeUserId}'`);
  }

  async execute(args: z.infer<typeof this.schema>): Promise<string> {
    try {
      // Replace parameters in the query
      const finalQuery = await this.replaceQueryParameters(args.sql);

      // Execute the query
      const { data: result, error } = await this.supabase.rpc(
        'execute_raw_query',
        { query: finalQuery }
      );
      if (error) {
        throw error;
      }


      return JSON.stringify({
        success: true,
        result
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
} 