import { z } from "zod";

interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  [key: string]: unknown;  // Allow additional properties
}

interface JsonSchemaDefinition {
  type: "object";
  properties: {
    [key: string]: JsonSchemaProperty;
  };
  required?: string[];
  [key: string]: unknown;  // Allow additional properties
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JsonSchemaDefinition;
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodObject<z.ZodRawShape>;
  abstract execute(args: unknown): Promise<string>;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(this.schema.shape).map(([key, value]) => [
            key,
            {
              type: this.getJsonSchemaType(value),
              description: value.description || undefined
            }
          ])
        ),
        required: Object.entries(this.schema.shape)
          .filter(([_, value]) => !value.isOptional())
          .map(([key]) => key)
      }
    };
  }

  private getJsonSchemaType(zodType: any): string {
    if (zodType._def.typeName === 'ZodString') return 'string';
    if (zodType._def.typeName === 'ZodNumber') return 'number';
    if (zodType._def.typeName === 'ZodBoolean') return 'boolean';
    if (zodType._def.typeName === 'ZodEnum') return 'string';
    if (zodType._def.typeName === 'ZodOptional') return this.getJsonSchemaType(zodType._def.innerType);
    return 'string'; // fallback
  }
} 