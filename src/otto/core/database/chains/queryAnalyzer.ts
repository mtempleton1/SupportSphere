import { ChatOpenAI } from "@langchain/openai";
// import { PromptTemplate } from "@langchain/core/prompts";
// import { RunnableSequence } from "@langchain/core/runnables";
// import { StructuredOutputParser } from "langchain/output_parsers";
import { SchemaManager } from "../schema/schemaManager";
// import { SQL_EXAMPLES } from "../examples/sqlExamples";
import { QuerySchema, QueryType, TableSchema } from "../types/queryTypes";
import { z } from "zod";

interface JsonSchemaProperty {
  type: string;
  description?: string;
  format?: string;
  enum?: string[];
  items?: any;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  [key: string]: any;
}

interface JsonSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  [key: string]: any;  // Add index signature
}

function zodToJsonSchema(schema: z.ZodType<any>): JsonSchema | JsonSchemaProperty {
  // Handle array types
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element),
      description: schema.description
    };
  }

  // Handle enum types
  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema._def.values,
      description: schema.description
    };
  }

  // Handle string types
  if (schema instanceof z.ZodString) {
    const prop: JsonSchemaProperty = {
      type: 'string',
      description: schema.description
    };
    const checks = schema._def.checks;
    if (checks?.some(c => c.kind === 'uuid')) {
      prop.format = 'uuid';
    }
    return prop;
  }

  // Handle optional types
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }

  // Handle object types (or default to object type for unknown schemas)
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  if (schema instanceof z.ZodObject) {
    Object.entries(schema.shape).forEach(([key, value]) => {
      const converted = zodToJsonSchema(value as z.ZodType<any>);
      if ('type' in converted) {  // Check if it's a JsonSchemaProperty
        properties[key] = converted;
        if (!(value instanceof z.ZodOptional)) {
          required.push(key);
        }
      }
    });
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {})
  };
}

export class QueryAnalyzer {
  private static instance: QueryAnalyzer;
  private llm: ChatOpenAI;
  private schemaManager: SchemaManager;

  private constructor(openAIApiKey: string) {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
      openAIApiKey: openAIApiKey
    });
    this.schemaManager = SchemaManager.getInstance();
  }

  public static getInstance(openAIApiKey: string): QueryAnalyzer {
    if (!QueryAnalyzer.instance) {
      QueryAnalyzer.instance = new QueryAnalyzer(openAIApiKey);
    }
    return QueryAnalyzer.instance;
  }

  private validateColumnNames(query: string): string {
    // Replace common incorrect column names with correct ones
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

  private getRelevantTables(question: string): Set<string> {
    // Common keywords that indicate table relevance
    const tableKeywords: Record<string, string[]> = {
      'Tickets': ['ticket', 'tickets', 'issue', 'issues', 'request', 'requests', 'task', 'tasks', 'incident', 'problem'],
      'UserProfiles': ['user', 'users', 'staff', 'agent', 'agents', 'requester', 'assignee'],
      'Groups': ['group', 'groups', 'team', 'teams'],
      'Organizations': ['organization', 'organizations', 'org', 'orgs', 'company', 'companies']
    };

    const relevantTables = new Set<string>();
    const lowerQuestion = question.toLowerCase();

    // Add tables based on keyword matches
    Object.entries(tableKeywords).forEach(([table, keywords]) => {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        relevantTables.add(table);
      }
    });

    // Always include Tickets table for ticket-related operations
    relevantTables.add('Tickets');

    // If we're dealing with users/staff, include UserProfiles
    if (lowerQuestion.includes('i') || lowerQuestion.includes('my') || 
        lowerQuestion.includes('me') || lowerQuestion.includes('assigned')) {
      relevantTables.add('UserProfiles');
    }

    return relevantTables;
  }

  private filterSchemaForTables(schema: Map<string, TableSchema>, relevantTables: Set<string>): string {
    let filteredSchema = '';
    schema.forEach((tableSchema, tableName) => {
      if (relevantTables.has(tableName)) {
        filteredSchema += `Table: ${tableName}\n`;
        filteredSchema += `Description: ${tableSchema.description}\n\n`;
        
        filteredSchema += 'Columns:\n';
        tableSchema.columns.forEach(col => {
          filteredSchema += `  - ${col.name} (${col.type})${col.isPrimaryKey ? ' PRIMARY KEY' : ''}${col.isNullable ? ' NULL' : ' NOT NULL'}\n`;
          filteredSchema += `    Description: ${col.description}\n`;
        });
        
        if (tableSchema.relationships.length > 0) {
          const relevantRelationships = tableSchema.relationships.filter(
            rel => relevantTables.has(rel.table)
          );
          
          if (relevantRelationships.length > 0) {
            filteredSchema += '\nRelationships:\n';
            relevantRelationships.forEach(rel => {
              filteredSchema += `  - ${rel.from} -> ${rel.table}.${rel.to}\n`;
              filteredSchema += `    Description: ${rel.description}\n`;
            });
          }
        }

        const examples = tableSchema.examples || [];
        if (examples.length > 0) {
          filteredSchema += '\nExample Queries:\n';
          examples.forEach(ex => {
            filteredSchema += `  - ${ex.description}:\n    ${ex.query}\n`;
          });
        }
        
        filteredSchema += '\n';
      }
    });
    return filteredSchema;
  }

  private async buildPrompt(question: string): Promise<string> {
    // Normalize the question to always be about the current user
    question = this.normalizeQuestion(question);

    const schema = await this.schemaManager.getSchema();
    const relevantTables = this.getRelevantTables(question);
    const filteredSchema = this.filterSchemaForTables(schema, relevantTables);

    // Add specific examples for handling current user queries
    const personalQueryExamples = `
IMPORTANT: All queries are about the current user. Never try to look up specific users by name.
The parameter ':currentUserId' MUST be used to reference the current user's ID.

Example Queries for Current User:

Question: How many tickets are assigned to me?
Query: SELECT COUNT(*) FROM "Tickets" WHERE "assigneeId" = :currentUserId
Explanation: Uses :currentUserId to reference the current user's ID
Filters: { "assigneeId": ":currentUserId" }

Question: Show my open tickets
Query: SELECT * FROM "Tickets" WHERE "assigneeId" = :currentUserId AND "status" = 'open'
Explanation: Uses :currentUserId combined with status filter
Filters: { "assigneeId": ":currentUserId", "status": "open" }

Question: What tickets did I submit?
Query: SELECT * FROM "Tickets" WHERE "submitterId" = :currentUserId
Explanation: Uses :currentUserId to find tickets submitted by current user
Filters: { "submitterId": ":currentUserId" }

CRITICAL RULES:
1. ALL queries are about the currently logged-in user
2. NEVER look up users by name - Otto is just the AI assistant
3. ALWAYS use :currentUserId for user identification
4. Filter values must be simple strings, not objects
5. Other formats will fail:
   ❌ :current_user_id  (wrong)
   ❌ :userId          (wrong)
   ❌ :CURRENT_USER_ID (wrong)
   ✅ :currentUserId   (correct)
   ❌ { "$eq": ":currentUserId" }  (wrong)
   ✅ ":currentUserId"            (correct)`;

    return `You are an expert SQL query analyzer for a ticket management system.
Given a question in natural language, analyze it and create a structured query plan.

Database Schema (Relevant Tables):
${filteredSchema}

${personalQueryExamples}

Guidelines:
1. ALL queries are about the currently logged-in user
2. NEVER look up users by name - Otto is just the AI assistant
3. ALWAYS use :currentUserId for user identification
4. Filter values must be simple strings, not objects
5. Handle temporal queries appropriately
6. Use proper joins when dealing with related data
7. Consider performance implications
8. Use camelCase for all column names (e.g., "assigneeId" not "assignee_id")

Question: ${question}

Provide a structured response that includes:
1. The primary SQL query needed
2. Any additional sub-queries if required
3. The tables that need to be accessed
4. Any specific filters that should be applied (as simple string values)

Remember to:
- Use proper SQL syntax for Postgres
- Include appropriate joins when needed
- Handle NULL values appropriately
- Use proper date/time functions for temporal queries
- Consider pagination for large result sets
- Always use camelCase for column names
- ALWAYS use :currentUserId for the current user's ID
- Keep filter values as simple strings, not operator objects`;
  }

  private normalizeQuestion(question: string): string {
    // Remove any references to Otto and ensure questions are about the current user
    const normalized = question.toLowerCase()
      .replace(/\botto\b/gi, "me")
      .replace(/\botto's\b/gi, "my")
      .replace(/\bto otto\b/gi, "to me");

    // If the question doesn't contain any first-person references, add context
    if (!normalized.match(/\b(me|my|i)\b/)) {
      return `my ${normalized}`;
    }

    return normalized;
  }

  public async analyzeQuery(question: string): Promise<QueryType> {
    
    // Normalize the question first
    const normalizedQuestion = this.normalizeQuestion(question);

    // Get schema first as it's needed for multiple operations
    // const schema = await this.schemaManager.getSchema();

    // const relevantTables = this.getRelevantTables(normalizedQuestion);

    const prompt = await this.buildPrompt(normalizedQuestion);
    const convertedSchema = zodToJsonSchema(QuerySchema);
    
    // Ensure we have a proper object schema
    if (!('type' in convertedSchema) || convertedSchema.type !== 'object') {
      throw new Error('Invalid schema conversion: Root schema must be an object type');
    }

    // First get the function response from the model
    const response = await this.llm.bind({
      functions: [
        {
          name: "analyze_query",
          description: "Analyze a natural language question and convert it to a structured SQL query plan",
          parameters: convertedSchema
        }
      ],
      function_call: { name: "analyze_query" }
    }).invoke(prompt);


    // Extract the function call result
    const functionCall = response.additional_kwargs?.function_call;
    if (!functionCall?.arguments) {
      throw new Error('No function call arguments received from model');
    }

    // Parse the function arguments
    const parsedArgs = JSON.parse(functionCall.arguments);

    // Validate and fix column names in the query
    if (parsedArgs.primaryQuery) {
      parsedArgs.primaryQuery = this.validateColumnNames(parsedArgs.primaryQuery);
    }
    if (parsedArgs.subQueries) {
      parsedArgs.subQueries = parsedArgs.subQueries.map((q: string) => {
        const validated = this.validateColumnNames(q);
        return validated;
      });
    }

    // Validate against our schema
    const result = QuerySchema.parse(parsedArgs);
    
    return result;
  }
} 
