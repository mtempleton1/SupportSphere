import { z } from "zod";
import { BaseTool } from "../../tools/base";
import { QueryAnalyzer } from "../chains/queryAnalyzer";
import { QueryValidator } from "../chains/queryValidator";
import { createSupabaseClient, type SupabaseConfig } from "../../../../lib/supabase";

export class DatabaseQueryTool extends BaseTool {
  name = "databaseQuery";
  description = "Query the database using natural language questions about tickets and related data";
  
  private queryAnalyzer: QueryAnalyzer;
  private queryValidator: QueryValidator;
  private supabase;

  schema = z.object({
    question: z.string().describe("The natural language question to query the database with")
  });

  constructor(openAIApiKey: string, supabaseConfig: SupabaseConfig) {
    super();
    this.queryAnalyzer = QueryAnalyzer.getInstance(openAIApiKey);
    this.queryValidator = QueryValidator.getInstance(openAIApiKey);
    this.supabase = createSupabaseClient(supabaseConfig);
  }

  private async replaceQueryParameters(query: string): Promise<string> {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('User must be authenticated to execute queries');
    }

    // Escape any single quotes in the UUID to prevent SQL injection
    const safeUserId = session.user.id.replace(/'/g, "''");
    
    // Replace the current user ID parameter with the actual value
    // We only support :currentUserId format to maintain consistency with camelCase convention
    return query.replace(/:currentUserId/g, `'${safeUserId}'`);
  }

  async execute(args: z.infer<typeof this.schema>): Promise<string> {
    try {
      // Step 1: Analyze the question and generate structured query
      const analysisResult = await this.queryAnalyzer.analyzeQuery(args.question);

      // Step 2: Validate the primary query
      const validatedQuery = await this.queryValidator.validateAndFixQuery(analysisResult.primaryQuery);

      // Step 3: Replace parameters and execute the primary query
      const finalQuery = await this.replaceQueryParameters(validatedQuery);
      const { data: primaryResult } = await this.supabase.rpc(
        'execute_raw_query',
        { query: finalQuery }
      );
      // Check for query execution errors in the result
      if (primaryResult?.error) {
        throw new Error(`Primary query execution failed: ${primaryResult.message}`);
      }

      // Step 4: Execute any sub-queries if present
      let subQueryResults = [];
      if (analysisResult.subQueries && analysisResult.subQueries.length > 0) {
        for (const subQuery of analysisResult.subQueries) {
          const validatedSubQuery = await this.queryValidator.validateAndFixQuery(subQuery);
          const finalSubQuery = await this.replaceQueryParameters(validatedSubQuery);
          const { data: subResult } = await this.supabase.rpc(
            'execute_raw_query',
            { query: finalSubQuery }
          );

          if (subResult?.error) {
            continue;
          }

          subQueryResults.push(subResult);
        }
      }

      // Step 5: Format and return results
      const response = {
        success: true,
        primaryResults: primaryResult,
        subQueryResults: subQueryResults.length > 0 ? subQueryResults : undefined,
        metadata: {
          tablesAccessed: analysisResult.requiredTables,
          filters: analysisResult.filters
        }
      };

      return JSON.stringify(response, null, 2);
    } catch (error) {
      // Return a structured error response
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        metadata: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };

      return JSON.stringify(errorResponse, null, 2);
    }
  }
} 
