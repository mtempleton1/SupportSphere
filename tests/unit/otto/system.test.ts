import { describe, it, expect } from '@jest/globals';
import { OttoSystem } from '../../../src/otto/core/system';
// import { Message } from '../../../src/otto/core/types';

// Increase timeout for tests making real API calls
jest.setTimeout(30000);  // 30 seconds

describe('OttoSystem', () => {
  const createTestConfig = () => ({
    openAiKey: process.env.VITE_OPENAI_API_KEY || 'test-key',
    userProfile: {
      userId: 'test-user',
      accountId: 'test-account',
      userType: 'staff',
      roleId: 'admin'
    }
  });

  // Store original console.error
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Reset console.error before each test
    console.error = originalConsoleError;
  });

  afterAll(() => {
    // Restore console.error after all tests
    console.error = originalConsoleError;
  });

  it('should initialize with config', () => {
    const config = createTestConfig();
    const otto = new OttoSystem(config);
    expect(otto).toBeInstanceOf(OttoSystem);
  });

  it('should process a query and return a response', async () => {
    const config = createTestConfig();
    const otto = new OttoSystem(config);

    const response = await otto.processQuery('Hello');
    
    // Verify the response structure
    expect(response).toHaveProperty('messages');
    expect(response).toHaveProperty('context');
    expect(response.messages).toHaveLength(2);
    expect(response.messages[0]).toEqual({
      role: 'user',
      content: 'Hello',
      timestamp: expect.any(String)
    });
    expect(response.messages[1]).toHaveProperty('role', 'assistant');
    expect(response.messages[1]).toHaveProperty('content');
    expect(typeof response.messages[1].content).toBe('string');
  });

  it('should maintain conversation history', async () => {
    const config = createTestConfig();
    const otto = new OttoSystem(config);

    // First message
    const response1 = await otto.processQuery('Hello');
    expect(response1.messages).toHaveLength(2);

    // Second message with history
    const response2 = await otto.processQuery('How are you?', {
      previousMessages: response1.messages
    });

    expect(response2.messages).toHaveLength(4);
    expect(response2.messages[0]).toEqual(response1.messages[0]); // First user message
    expect(response2.messages[1]).toEqual(response1.messages[1]); // First assistant response
    expect(response2.messages[2]).toEqual({
      role: 'user',
      content: 'How are you?',
      timestamp: expect.any(String)
    });
    expect(response2.messages[3]).toHaveProperty('role', 'assistant');
  });

  it('should handle authentication errors gracefully', async () => {
    // Suppress console.error for this test since we expect an error
    console.error = jest.fn();

    const config = createTestConfig();
    config.openAiKey = 'invalid-key';
    const otto = new OttoSystem(config);

    const response = await otto.processQuery('Hello');
    
    expect(response).toHaveProperty('error');
    expect(response.error).toContain('Incorrect API key provided');
    expect(response.messages).toHaveLength(0);
    expect(response.context).toEqual({});

    // Verify error was logged (but suppressed)
    expect(console.error).toHaveBeenCalled();
  });
}); 