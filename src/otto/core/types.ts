import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  additional_kwargs?: Record<string, any>;
}

export interface NodeState {
  messages: Message[];
  context?: Record<string, any>;
}

export interface OttoConfig {
  openAIApiKey?: string;
  supabaseConfig?: {
    projectUrl?: string;
    anonKey?: string;
    serviceRoleKey?: string;
  };
  langSmithConfig?: {
    apiUrl?: string;
    apiKey?: string;
    projectName?: string;
  };
  userProfile: {
    userId: string;
    accountId: string;
    userType: string;
    roleId: string;
  };
}

export interface OttoResponse {
  messages: Message[];
  context: Record<string, any>;
  error?: string;
}

// Convert between LangChain and Otto message formats
export function toLangChainMessage(msg: Message): BaseMessage {
  switch (msg.role) {
    case 'user':
      return new HumanMessage(msg.content);
    case 'assistant':
      return new AIMessage(msg.content);
    case 'system':
      return new SystemMessage(msg.content);
    default:
      throw new Error(`Unknown message role: ${msg.role}`);
  }
}

export function fromLangChainMessage(msg: BaseMessage): Message {
  let role: Message['role'];
  if (msg instanceof HumanMessage) {
    role = 'user';
  } else if (msg instanceof AIMessage) {
    role = 'assistant';
  } else if (msg instanceof SystemMessage) {
    role = 'system';
  } else {
    throw new Error(`Unknown message type: ${msg.constructor.name}`);
  }

  return {
    role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    additional_kwargs: msg.additional_kwargs,
    timestamp: new Date().toISOString()
  };
} 
