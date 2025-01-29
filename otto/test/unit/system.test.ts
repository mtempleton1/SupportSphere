import { describe, it, expect } from '@jest/globals';
import { OttoSystem } from '../../core/system.js';
import { createTestConfig } from '../utils.js';
import { ChatOpenAI } from '@langchain/openai';
import { traceable } from 'langsmith/traceable';

describe('OttoSystem', () => {
  it('should initialize with config', () => {
    const config = createTestConfig({
      openAiKey: process.env.OPENAI_API_KEY
    });
    const otto = new OttoSystem(config);
    expect(otto).toBeInstanceOf(OttoSystem);
  });

  it('should process a query and return a response', async () => {
    const config = createTestConfig({
      openAiKey: process.env.OPENAI_API_KEY
    });
    const otto = new OttoSystem(config);

    // Use traceable to wrap the query processing
    const tracedProcessQuery = traceable(async (query: string) => {
      return await otto.processQuery(query);
    }, {
      name: 'OttoSystem.processQuery'
    });

    const response = await tracedProcessQuery('Hello');
    
    // Verify the response structure
    expect(response).toHaveProperty('messages');
    expect(response).toHaveProperty('context');
    expect(response.messages).toHaveLength(2);
    expect(response.messages[0]).toEqual({
      role: 'user',
      content: 'Hello'
    });
    expect(response.messages[1]).toHaveProperty('role', 'assistant');
    expect(response.messages[1]).toHaveProperty('content');
    expect(typeof response.messages[1].content).toBe('string');
  });
}); 