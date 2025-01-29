import { ChatOpenAI } from "@langchain/openai";
import { BaseNode, type NodeState } from "./base.js";
import { ToolRegistry } from "../tools/registry.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";

export class AgentNode extends Runnable<NodeState, NodeState> {
  lc_namespace = ["otto", "nodes", "agent"];

  constructor(
    private model: ChatOpenAI,
    private tools: ToolRegistry
  ) {
    super();
  }

  async invoke(state: NodeState, config?: RunnableConfig): Promise<NodeState> {
    // Convert messages to LangChain format
    const messages = state.messages.map(msg => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      }
      return new AIMessage(msg.content);
    });

    // Get response from the model
    const response = await this.model.invoke(messages);

    // Ensure content is a string
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    // Add the response to the state
    return {
      ...state,
      messages: [
        ...state.messages,
        {
          role: 'assistant',
          content,
          additional_kwargs: response.additional_kwargs
        }
      ]
    };
  }
} 