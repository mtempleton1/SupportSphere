import { ChatOpenAI } from "@langchain/openai";
// import { RunnableSequence } from "@langchain/core/runnables";
// import { type OttoConfig, type NodeState, type Message, type OttoResponse, toLangChainMessage, fromLangChainMessage } from "./types.js";
import { type OttoConfig, type OttoResponse, toLangChainMessage, fromLangChainMessage } from "./types.js";
import { ToolRegistry } from "./tools/registry.js";
import { OpenAIToolCall } from "@langchain/core/messages";

// import { BaseMessage } from "@langchain/core/messages";

export class OttoSystem {
  private model: ChatOpenAI;
  private tools: ToolRegistry;

  constructor(config: OttoConfig) {
    this.model = new ChatOpenAI({
      openAIApiKey: config.openAiKey,
      temperature: 0,
      modelName: "gpt-4"
    });

    this.tools = new ToolRegistry();
    this.model = this.model.bind({
      tools: this.tools.getToolDefinitions()
    }) as ChatOpenAI;
  }

  async processQuery(query: string, context?: Record<string, any>): Promise<OttoResponse> {
    try {
      // Convert previous messages if they exist
      const previousMessages = (context?.previousMessages || []).map(toLangChainMessage);
      
      // Add the new query message
      const messages = [
        ...previousMessages,
        toLangChainMessage({
          role: 'user',
          content: query,
          timestamp: new Date().toISOString()
        })
      ];

      // Get response from the model
      const response = await this.model.invoke(messages);

      // If the response includes tool calls, execute them
      if (response.additional_kwargs?.tool_calls) {
        for (const toolCall of response.additional_kwargs.tool_calls as OpenAIToolCall[]) {
          const tool = this.tools.getTool(toolCall.function.name);
          if (tool) {
            try {
              const result = await tool.execute(JSON.parse(toolCall.function.arguments));
              // Add the tool result as a system message
              messages.push(toLangChainMessage({
                role: 'system',
                content: `Tool ${toolCall.function.name} returned: ${result}`,
                timestamp: new Date().toISOString()
              }));
            } catch (err) {
              const error = err as Error;
              messages.push(toLangChainMessage({
                role: 'system',
                content: `Tool ${toolCall.function.name} failed: ${error.message}`,
                timestamp: new Date().toISOString()
              }));
            }
          }
        }

        // Get final response from model after tool execution
        const finalResponse = await this.model.invoke(messages);
        return {
          messages: [
            ...context?.previousMessages || [],
            {
              role: 'user',
              content: query,
              timestamp: new Date().toISOString()
            },
            fromLangChainMessage(finalResponse)
          ],
          context: context || {}
        };
      }

      // Convert the response message
      const responseMessage = fromLangChainMessage(response);

      return {
        messages: [
          ...context?.previousMessages || [],
          {
            role: 'user',
            content: query,
            timestamp: new Date().toISOString()
          },
          responseMessage
        ],
        context: context || {}
      };
    } catch (error) {
      console.error('Error in processQuery:', error);
      return {
        messages: [],
        context: {},
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }
} 
