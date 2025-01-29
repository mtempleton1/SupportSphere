export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  additional_kwargs?: Record<string, any>;
}

export interface NodeState {
  messages: Message[];
  context?: Record<string, any>;
}

export abstract class BaseNode {
  abstract process(state: NodeState): Promise<NodeState>;
} 