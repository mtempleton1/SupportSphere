import { ChatOpenAI } from "@langchain/openai";
// import { PromptTemplate } from "@langchain/core/prompts";
// import { RunnableSequence } from "@langchain/core/runnables";
// import { StructuredOutputParser } from "langchain/output_parsers";
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
  [key: string]: any;
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
    return prop;
  }

  // Handle boolean types
  if (schema instanceof z.ZodBoolean) {
    return {
      type: 'boolean',
      description: schema.description
    };
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

const ValidationSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(z.string()),
  suggestedFix: z.string().optional(),
  securityRisks: z.array(z.string())
});

export class QueryValidator {
  private static instance: QueryValidator;
  private llm: ChatOpenAI;

  private constructor(openAIApiKey: string) {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
      openAIApiKey: openAIApiKey
    });
  }

  public static getInstance(openAIApiKey: string): QueryValidator {
    if (!QueryValidator.instance) {
      QueryValidator.instance = new QueryValidator(openAIApiKey);
    }
    return QueryValidator.instance;
  }

  private buildPrompt(query: string): string {
    return `You are a SQL query validator. Analyze the following SQL query for potential issues and security risks.
Pay special attention to:
1. SQL injection vulnerabilities
2. Proper use of parameterized queries
3. Performance implications
4. Proper handling of NULL values
5. Correct join conditions
6. Appropriate use of indexes
7. Resource consumption (memory, CPU)
8. Data type mismatches
9. Potential deadlocks or blocking issues
10. Access control implications

Query to validate:
${query}

Provide a structured analysis including:
1. Whether the query is valid
2. Any issues found
3. Suggested fixes (if applicable)
4. Security risks identified`;
  }

  public async validateQuery(query: string): Promise<z.infer<typeof ValidationSchema>> {
    try {
      const prompt = this.buildPrompt(query);
      const convertedSchema = zodToJsonSchema(ValidationSchema);
      
      // Ensure we have a proper object schema
      if (!('type' in convertedSchema) || convertedSchema.type !== 'object') {
        throw new Error('Invalid schema conversion: Root schema must be an object type');
      }
      
      // First get the function response from the model
      const response = await this.llm.bind({
        functions: [
          {
            name: "validate_query",
            description: "Validate a SQL query for issues and security risks",
            parameters: convertedSchema
          }
        ],
        function_call: { name: "validate_query" }
      }).invoke(prompt);

      // Extract the function call result
      const functionCall = response.additional_kwargs?.function_call;
      if (!functionCall?.arguments) {
        throw new Error('No function call arguments received from model');
      }

      // Parse the function arguments
      const parsedArgs = JSON.parse(functionCall.arguments);

      // Validate against our schema
      return ValidationSchema.parse(parsedArgs);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Query validation failed: ${error.message}`);
      }
      throw new Error('Query validation failed with unknown error');
    }
  }

  // private schema = {
  //   type: "object",
  //   properties: {
  //     isValid: { type: "boolean" },
  //     issues: {
  //       type: "array",
  //       items: { type: "string" }
  //     },
  //     suggestedFix: {
  //       type: "string",
  //       optional: true
  //     },
  //     securityRisks: {
  //       type: "array",
  //       items: { type: "string" }
  //     }
  //   },
  //   required: ["isValid", "issues", "securityRisks"]
  // } as const;

  public async validateAndFixQuery(query: string): Promise<string> {
    // Build the validation prompt
    const prompt = this.buildPrompt(query);

    // Convert ValidationSchema to JSON Schema
    const validationJsonSchema = {
      type: "object",
      properties: {
        isValid: {
          type: "boolean",
          description: "Whether the query is valid"
        },
        issues: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of issues found in the query"
        },
        suggestedFix: {
          type: "string",
          description: "Suggested fix for the query if issues are found"
        },
        securityRisks: {
          type: "array",
          items: {
            type: "string"
          },
          description: "List of potential security risks identified"
        }
      },
      required: ["isValid", "issues", "securityRisks"]
    };
    
    const response = await this.llm.bind({
      functions: [
        {
          name: "validate_query",
          description: "Validate and fix SQL query if needed",
          parameters: validationJsonSchema
        }
      ],
      function_call: { name: "validate_query" }
    }).invoke(prompt);

    // Parse the function call arguments
    const functionCall = response.additional_kwargs?.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error("Failed to get function call response from OpenAI");
    }

    const args = JSON.parse(functionCall.arguments);

    // Validate the arguments against our schema
    const validatedArgs = ValidationSchema.parse(args);

    // Check validation result and return appropriate query
    if (!validatedArgs.isValid && validatedArgs.suggestedFix) {
      return validatedArgs.suggestedFix;
    } else if (!validatedArgs.isValid) {
      throw new Error(`Invalid query: ${validatedArgs.issues.join(', ')}`);
    }

    return query;
  }
} 