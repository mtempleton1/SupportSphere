import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolRegistry, type ToolConfig } from "./tools/registry.js";
import { AgentNode } from "./nodes/agent.js";
import { type NodeState } from "./nodes/base.js";
import { RunnableSequence } from "@langchain/core/runnables";

export interface OttoConfig extends ToolConfig {
  openAiKey: string;
}

export class OttoSystem {
  private model: ChatOpenAI;
  private tools: ToolRegistry;
  private graph!: RunnableSequence;

  constructor(config: OttoConfig) {
    this.model = new ChatOpenAI({
      openAIApiKey: config.openAiKey,
      temperature: 0,
      modelName: "gpt-4"
    });

    this.tools = new ToolRegistry(config);
    this.initializeGraph();
  }

  private initializeGraph() {
    const agentNode = new AgentNode(this.model, this.tools);

    // Create the workflow as a simple sequence for now
    // We'll expand this with proper graph-based routing later
    this.graph = RunnableSequence.from([
      (input: { messages: NodeState["messages"]; context?: Record<string, any> }) => ({
        messages: input.messages,
        context: input.context || {}
      }),
      agentNode
    ]);
  }

  async processQuery(query: string, context?: Record<string, any>): Promise<NodeState> {
    return await this.graph.invoke({
      messages: [{
        role: "user",
        content: query
      }],
      context
    });
  }
} 