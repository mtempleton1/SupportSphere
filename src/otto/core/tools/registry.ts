import { BaseTool, ToolDefinition } from "./base";

export class ToolRegistry {
  private tools: Map<string, BaseTool>;

  constructor(initialTools: readonly BaseTool[] = []) {
    this.tools = new Map();
    initialTools.forEach(tool => this.registerTool(tool));
  }

  registerTool(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }
} 
