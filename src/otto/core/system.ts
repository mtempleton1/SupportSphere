import { ChatOpenAI } from "@langchain/openai";
// import { RunnableSequence } from "@langchain/core/runnables";
// import { type OttoConfig, type NodeState, type Message, type OttoResponse, toLangChainMessage, fromLangChainMessage } from "./types.js";
// import { type OttoConfig, type OttoResponse, toLangChainMessage, fromLangChainMessage } from "./types.js";
import { type OttoConfig, type OttoResponse, toLangChainMessage, fromLangChainMessage } from "./types.js";

import { ToolRegistry } from "./tools/registry.js";
// import { OpenAIToolCall } from "@langchain/core/messages";
import { Client } from "langsmith";
import { createTools } from "./tools";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { RunnableSequence } from "@langchain/core/runnables";

// import { BaseMessage } from "@langchain/core/messages";

import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";
import { OpenAI } from "openai";
import { LangChainTracer } from "langchain/callbacks";

// Utility function to generate UUID that works in both browser and Node.js
function generateUUID(): string {
  // Check if we're in a Node.js environment with crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface MetricsData {
  actionIdentificationSuccess: boolean;
  fieldUpdateAccuracy: boolean;
  responseTimeMs: number;
  error?: string;
  errorType?: string;
}

export class OttoSystem {
  private baseModel: ChatOpenAI;
  private model: ChatOpenAI;
  private toolRegistry: ToolRegistry;
  private langsmith?: Client;
  private tracer?: LangChainTracer;
  private metrics: {
    total: number;
    actionIdentificationSuccess: number;
    fieldUpdateAccuracy: number;
    totalResponseTimeMs: number;
    errors: number;
    errorTypes: Record<string, number>;
  };
  private wrappedTrackMetrics: (runId: string, metrics: MetricsData) => Promise<void>;
  private wrappedProcessQuery: (query: string, context?: Record<string, any>) => Promise<OttoResponse>;

  constructor(config: OttoConfig) {
    // Add environment variable diagnostic logging
    console.log("ALL")
    console.log(import.meta.env)
    console.log('LangSmith Environment Variables:', {
      VITE_LANGCHAIN_TRACING_V2: import.meta.env.VITE_LANGCHAIN_TRACING_V2,
      VITE_LANGSMITH_TRACING_V2: import.meta.env.VITE_LANGSMITH_TRACING_V2,
      VITE_LANGCHAIN_PROJECT: import.meta.env.VITE_LANGCHAIN_PROJECT,
      VITE_LANGSMITH_PROJECT: import.meta.env.VITE_LANGSMITH_PROJECT,
      VITE_LANGCHAIN_API_KEY: import.meta.env.VITE_LANGCHAIN_API_KEY ? 'Set' : 'Not Set',
      VITE_LANGSMITH_API_KEY: import.meta.env.VITE_LANGSMITH_API_KEY ? 'Set' : 'Not Set'
    });

    // Initialize the tool registry first
    this.toolRegistry = new ToolRegistry(createTools({
      openAIApiKey: config.openAIApiKey || import.meta.env.VITE_OPENAI_API_KEY,
      supabaseConfig: {
        projectUrl: config.supabaseConfig?.projectUrl || import.meta.env.VITE_SUPABASE_PROJECT_URL,
        anonKey: config.supabaseConfig?.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY,
        serviceRoleKey: config.supabaseConfig?.serviceRoleKey || import.meta.env.VITE_SUPABASE_SERVICE_KEY
      }
    }));

    // Initialize the base language model with wrapped OpenAI
    const openAIClient = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
      openAIApiKey: config.openAIApiKey || import.meta.env.VITE_OPENAI_API_KEY
    });

    this.baseModel = openAIClient;

    // Create the bound model with tools
    this.model = this.baseModel.bind({
      functions: this.toolRegistry.getToolDefinitions() as any
    }) as ChatOpenAI;

    // Initialize LangSmith client if credentials are available
    const langsmithApiKey = import.meta.env.VITE_LANGSMITH_API_KEY || import.meta.env.VITE_LANGCHAIN_API_KEY;
    if (langsmithApiKey) {
      try {
        this.langsmith = new Client({
          apiKey: langsmithApiKey,
        });
        
        console.log('LangSmith client initialized successfully with project:', import.meta.env.VITE_LANGCHAIN_PROJECT);
        
      } catch (error) {
        console.error('Failed to initialize LangSmith client:', error);
      }
    } else {
      console.warn('No LangSmith API key found in environment variables (checked VITE_LANGSMITH_API_KEY and VITE_LANGCHAIN_API_KEY)');
    }

    // Initialize metrics
    this.metrics = {
      total: 0,
      actionIdentificationSuccess: 0,
      fieldUpdateAccuracy: 0,
      totalResponseTimeMs: 0,
      errors: 0,
      errorTypes: {},
    };

    // Wrap methods with traceable
    this.wrappedTrackMetrics = traceable(
      this.trackMetrics.bind(this),
      { 
        name: "track_metrics", 
        run_type: "chain",
        project_name: "otto-support"
      }
    );

    this.wrappedProcessQuery = traceable(
      this.processQuery.bind(this),
      { 
        name: "process_query", 
        run_type: "chain",
        project_name: "otto-support"
      }
    );
  }

  private async trackMetrics(runId: string, metrics: MetricsData) {
    // Update internal metrics
    this.metrics.total++;
    if (metrics.actionIdentificationSuccess) this.metrics.actionIdentificationSuccess++;
    if (metrics.fieldUpdateAccuracy) this.metrics.fieldUpdateAccuracy++;
    this.metrics.totalResponseTimeMs += metrics.responseTimeMs;
    
    if (metrics.error) {
      this.metrics.errors++;
      const errorType = metrics.errorType || 'unknown';
      this.metrics.errorTypes[errorType] = (this.metrics.errorTypes[errorType] || 0) + 1;
    }

    // Track in LangSmith if available
    if (this.langsmith) {
      try {
        const startTime = Date.now();
        await this.langsmith.createRun({
          name: "otto_query",
          id: runId,
          run_type: "chain",
          inputs: metrics,
          outputs: {
            success: !metrics.error,
            error: metrics.error,
          },
          start_time: startTime,
          end_time: Date.now(),
          extra: {
            metrics: this.getAggregateMetrics()
          },
          project_name: "otto-support"  // Explicitly set project name here
        });

        // Give LangSmith a moment to process the run before verification
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error('Failed to create LangSmith run:', error);
      }
    } else {
      console.warn('LangSmith client not initialized, tracing disabled');
    }
  }

  public getAggregateMetrics() {
    if (this.metrics.total === 0) return null;
    
    return {
      totalQueries: this.metrics.total,
      actionIdentificationRate: this.metrics.actionIdentificationSuccess / this.metrics.total,
      fieldUpdateAccuracyRate: this.metrics.fieldUpdateAccuracy / this.metrics.total,
      averageResponseTimeMs: this.metrics.totalResponseTimeMs / this.metrics.total,
      errorRate: this.metrics.errors / this.metrics.total,
      errorTypes: this.metrics.errorTypes,
    };
  }

  private async processQuery(query: string, context?: Record<string, any>): Promise<OttoResponse> {
    const startTime = Date.now();
    const runId = generateUUID();
    const metrics: MetricsData = {
      actionIdentificationSuccess: false,
      fieldUpdateAccuracy: false,
      responseTimeMs: 0,
    };

    try {
      // Convert previous messages if they exist
      const previousMessages = (context?.previousMessages || []).map(toLangChainMessage);
      
      // Add system message with instructions
      const systemMessage = toLangChainMessage({
        role: 'system',
        content: `You are Otto, an AI assistant specialized in helping users with their support tickets and tasks. You have access to tools that can help you query and analyze ticket data. When users ask questions about tickets or need help with support tasks, use these tools to provide accurate information. Always try to use the appropriate tool to get real data rather than making assumptions or stating you don't have access to the information.`,
        timestamp: new Date().toISOString()
      });

      // Add the new query message
      const messages = [
        systemMessage,
        ...previousMessages,
        toLangChainMessage({
          role: 'user',
          content: query,
          timestamp: new Date().toISOString()
        })
      ];

      // Get response from the model
      const response = await this.model.invoke(messages);

      // Handle both function_call and tool_calls formats
      const toolCalls = response.additional_kwargs?.tool_calls || [];
      const functionCall = response.additional_kwargs?.function_call;

      // If we have either tool calls or a function call, execute them
      if (toolCalls.length > 0 || functionCall) {
        metrics.actionIdentificationSuccess = true;  // Model identified an action to take
        console.log("HERERERERRE")
        console.log(toolCalls)
        console.log(functionCall)
        // Handle legacy function_call format
        if (functionCall) {
          const tool = this.toolRegistry.getTool(functionCall.name);

          if (tool) {
            try {
              const result = await tool.execute(JSON.parse(functionCall.arguments));
              // Add the tool result as a system message
              messages.push(toLangChainMessage({
                role: 'system',
                content: `Tool ${functionCall.name} returned: ${result}`,
                timestamp: new Date().toISOString()
              }));
              metrics.fieldUpdateAccuracy = true;  // Tool executed successfully
            } catch (err) {
              const error = err as Error;
              metrics.error = error.message;
              metrics.errorType = 'tool_execution_error';
              messages.push(toLangChainMessage({
                role: 'system',
                content: `Tool ${functionCall.name} failed: ${error.message}`,
                timestamp: new Date().toISOString()
              }));
            }
          }
        }

        // Handle new tool_calls format
        for (const toolCall of toolCalls) {
          console.log("CALLING TOOLS")
          console.log(toolCall)
          const tool = this.toolRegistry.getTool(toolCall.function.name);
          if (tool) {
            try {
              const result = await tool.execute(JSON.parse(toolCall.function.arguments));
              // Add the tool result as a system message
              messages.push(toLangChainMessage({
                role: 'system',
                content: `Tool ${toolCall.function.name} returned: ${result}`,
                timestamp: new Date().toISOString()
              }));
              metrics.fieldUpdateAccuracy = true;  // Tool executed successfully
            } catch (err) {
              const error = err as Error;
              metrics.error = error.message;
              metrics.errorType = 'tool_execution_error';
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
        metrics.responseTimeMs = Date.now() - startTime;
        await this.wrappedTrackMetrics(runId, metrics);

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

      // No tool calls or function calls, just a regular response
      metrics.responseTimeMs = Date.now() - startTime;
      await this.wrappedTrackMetrics(runId, metrics);

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
      metrics.responseTimeMs = Date.now() - startTime;
      metrics.error = error instanceof Error ? error.message : 'An unexpected error occurred';
      metrics.errorType = 'system_error';
      await this.wrappedTrackMetrics(runId, metrics);

      console.error('Error in processQuery:', error);
      return {
        messages: [],
        context: {},
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  // Public method that uses the wrapped version
  public async query(query: string, context?: Record<string, any>): Promise<OttoResponse> {
    return this.wrappedProcessQuery(query, context);
  }
} 
