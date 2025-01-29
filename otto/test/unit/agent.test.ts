import { describe, it, expect } from '@jest/globals';
import { AgentNode } from '../../core/nodes/agent.js';
import { ChatOpenAI } from '@langchain/openai';
import { ToolRegistry } from '../../core/tools/registry.js';
import { createTestConfig, createTestState } from '../utils.js';
import { Message } from '../../core/nodes/base.js';
import { traceable } from 'langsmith/traceable';

describe('AgentNode', () => {
  it('should process messages and return updated state', async () => {
    const config = createTestConfig({
      openAiKey: process.env.OPENAI_API_KEY
    });
    const tools = new ToolRegistry(config);
    const model = new ChatOpenAI({
      openAIApiKey: config.openAiKey,
      temperature: 0,
      modelName: 'gpt-4'
    });
    const agent = new AgentNode(model, tools);

    const initialMessages: Message[] = [
      { role: 'user', content: 'Hello' }
    ];
    const initialState = createTestState(initialMessages);

    // Use traceable to wrap the agent invocation
    const tracedAgentInvoke = traceable(async (state: typeof initialState) => {
      return await agent.invoke(state);
    }, {
      name: 'AgentNode.invoke'
    });

    const result = await tracedAgentInvoke(initialState);

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toEqual({
      role: 'user',
      content: 'Hello'
    });
    expect(result.messages[1]).toHaveProperty('role', 'assistant');
    expect(result.messages[1]).toHaveProperty('content');
    expect(typeof result.messages[1].content).toBe('string');
  });

  it('should handle non-string content from model', async () => {
    const config = createTestConfig({
      openAiKey: process.env.OPENAI_API_KEY
    });
    const tools = new ToolRegistry(config);
    const model = new ChatOpenAI({
      openAIApiKey: config.openAiKey,
      temperature: 0,
      modelName: 'gpt-4'
    });
    const agent = new AgentNode(model, tools);

    const initialMessages: Message[] = [
      { role: 'user', content: 'Return a JSON object with your name' }
    ];
    const initialState = createTestState(initialMessages);

    // Use traceable to wrap the agent invocation
    const tracedAgentInvoke = traceable(async (state: typeof initialState) => {
      return await agent.invoke(state);
    }, {
      name: 'AgentNode.invoke'
    });

    const result = await tracedAgentInvoke(initialState);

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0]).toEqual({
      role: 'user',
      content: 'Return a JSON object with your name'
    });
    expect(result.messages[1]).toHaveProperty('role', 'assistant');
    expect(result.messages[1]).toHaveProperty('content');
    expect(() => JSON.parse(result.messages[1].content)).not.toThrow();
  });
}); 