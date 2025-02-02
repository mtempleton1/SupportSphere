import { ChatOpenAI } from "@langchain/openai";
import { type OttoConfig, type OttoResponse, toLangChainMessage, fromLangChainMessage } from "./types.js";
import { ToolRegistry } from "./tools/registry.js";
import { Client } from "langsmith";
import { createTools } from "./tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, type Runnable } from "@langchain/core/runnables";
import { BaseMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";

export class OttoSystem {
  private model: ChatOpenAI;
  private toolRegistry: ToolRegistry;
  private langsmith?: Client;
  private projectName: string = "otto-support";
  private tracingEnabled: boolean = false;
  private chain: Runnable;
  private systemMessage: SystemMessage;

  constructor(config: OttoConfig) {
    // Initialize tracing configuration
    this.initializeTracing(config);

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(createTools({
      openAIApiKey: config.openAIApiKey || import.meta.env.VITE_OPENAI_API_KEY,
      supabaseConfig: {
        projectUrl: config.supabaseConfig?.projectUrl || import.meta.env.VITE_SUPABASE_PROJECT_URL,
        anonKey: config.supabaseConfig?.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY,
        serviceRoleKey: config.supabaseConfig?.serviceRoleKey || import.meta.env.VITE_SUPABASE_SERVICE_KEY
      },
      userId: config.userProfile.userId
    }));

    // Initialize OpenAI client
    this.model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
      openAIApiKey: config.openAIApiKey || import.meta.env.VITE_OPENAI_API_KEY
    });

    // Create the system message
    this.systemMessage = new SystemMessage(
      `You are Otto, an AI assistant specialized in helping users with their support tickets and tasks. 
      You have access to tools that can help you query and analyze ticket data. 
      When users ask questions about tickets or need help with support tasks, use these tools to provide accurate information. 
      Always try to use the appropriate tool to get real data rather than making assumptions or stating you don't have access to the information.`
    );

    // Bind tools to the model
    const modelWithTools = this.model.bind({
      functions: this.toolRegistry.getToolDefinitions() as any
    });

    // Create the main chain
    this.chain = RunnableSequence.from([
      // First step: Format input into messages array
      async (input: { query: string, context?: Record<string, any> }) => {
        const previousMessages = (input.context?.previousMessages || []).map(toLangChainMessage);
        const messages = [
          this.systemMessage,
          ...previousMessages,
          new HumanMessage(input.query)
        ];
        const response = await modelWithTools.invoke(messages);
        return { response, messages };
      },
      // Second step: Handle tool calls if present
      async ({ response, messages }: { response: any, messages: BaseMessage[] }) => {
        // Handle tool calls if present
        const toolCalls = response.additional_kwargs?.tool_calls || [];
        const functionCall = response.additional_kwargs?.function_call;

        if (toolCalls.length > 0 || functionCall) {
          // Execute tools and collect results
          const results = [];
          
          if (functionCall) {
            const result = await this.toolRegistry
              .getTool(functionCall.name)
              ?.execute(JSON.parse(functionCall.arguments));
            if (result) {
              results.push({
                tool: functionCall.name,
                result
              });
            }
          }

          for (const toolCall of toolCalls) {
            const result = await this.toolRegistry
              .getTool(toolCall.function.name)
              ?.execute(JSON.parse(toolCall.function.arguments));
            if (result) {
              results.push({
                tool: toolCall.function.name,
                result
              });
            }
          }

          // If we executed any tools, get final response
          if (results.length > 0) {
            const toolMessages = results.map(r => 
              new SystemMessage(`Tool ${r.tool} returned: ${r.result}`)
            );

            const updatedMessages = [...messages, ...toolMessages];
            const finalResponse = await modelWithTools.invoke(updatedMessages);
            return finalResponse;
          }
        }

        return response;
      },
      // Third step: Format the final response
      (response: any) => ({
        messages: [
          fromLangChainMessage(response)
        ],
        context: {}
      })
    ]).withConfig({
      runName: "otto_support_chain"
    });
  }

  private async initializeTracing(config: OttoConfig) {
    try {
      // Check if tracing is enabled via environment variables
      const tracingEnabled = import.meta.env.VITE_LANGCHAIN_TRACING_V2 === 'true' || 
                           import.meta.env.VITE_LANGSMITH_TRACING_V2 === 'true';

      if (!tracingEnabled) {
        console.log('Tracing is disabled via environment variables');
        return;
      }

      // Get API key with proper fallbacks
      const langsmithApiKey = config.langSmithConfig?.apiKey || 
                             import.meta.env.VITE_LANGSMITH_API_KEY || 
                             import.meta.env.VITE_LANGCHAIN_API_KEY;

      if (!langsmithApiKey) {
        console.warn('No LangSmith API key found. Tracing will be disabled.');
        return;
      }

      // Set project name with fallbacks
      this.projectName = config.langSmithConfig?.projectName ||
                        import.meta.env.VITE_LANGCHAIN_PROJECT || 
                        import.meta.env.VITE_LANGSMITH_PROJECT || 
                        "otto-support";

      // Initialize the LangSmith client with environment variables
      process.env.LANGCHAIN_TRACING_V2 = 'true';
      process.env.LANGCHAIN_ENDPOINT = config.langSmithConfig?.apiUrl || "https://api.smith.langchain.com";
      process.env.LANGCHAIN_API_KEY = langsmithApiKey;
      process.env.LANGCHAIN_PROJECT = this.projectName;

      // Initialize the client
      this.langsmith = new Client();
      this.tracingEnabled = true;
      console.log('LangSmith tracing initialized successfully for project:', this.projectName);

    } catch (error) {
      console.error('Failed to initialize LangSmith tracing:', error);
      this.tracingEnabled = false;
      this.langsmith = undefined;
    }
  }

  public async query(query: string, context?: Record<string, any>): Promise<OttoResponse> {
    // try {
    
    const result = await this.chain.invoke({
      query,
      context
    }, {
      callbacks: [{
        handleToolStart: async (tool: any) => {
          console.log(`Starting tool: ${tool.name}`);
        },
        handleToolEnd: async (output: any) => {
          console.log(`Tool output: ${output}`);
        }
      }]
    });

    return {
      messages: [
        ...context?.previousMessages || [],
        {
          role: 'user',
          content: query,
          timestamp: new Date().toISOString()
        },
        ...result.messages
      ],
      context: result.context
    };
    // } catch (error) {
    //   console.error('Error in query:', error);
    //   return {
    //     messages: [],
    //     context: {},
    //     error: error instanceof Error ? error.message : 'An unexpected error occurred'
    //   };
    // }
  }
} 
