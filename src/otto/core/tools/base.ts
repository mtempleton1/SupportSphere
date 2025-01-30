import { z } from "zod";

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodObject<any>;
  abstract execute(args: any): Promise<string>;

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      schema: this.schema
    };
  }
} 