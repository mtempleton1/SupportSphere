import { BaseTool } from "./base.js";
import { SupabaseClient } from "@supabase/supabase-js";

export interface ToolConfig {
  supabaseClient: SupabaseClient;
  adminClient: SupabaseClient;
  userProfile: {
    userId: string;
    accountId: string;
    userType: string;
    roleId: string;
  };
}

export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  constructor(private config: ToolConfig) {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Register default tools here as they are implemented
    // Example: this.registerTool(new KnowledgeBaseTool(this.config));
  }

  registerTool(tool: BaseTool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }
} 