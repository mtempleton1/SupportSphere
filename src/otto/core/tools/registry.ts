import { BaseTool } from "./base.js";
import { CurrentTimeTool } from "./currentTime.js";

export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Register the current time tool by default
    this.registerTool(new CurrentTimeTool());
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

  getToolDefinitions() {
    return this.getAllTools().map(tool => tool.getDefinition());
  }
} 
