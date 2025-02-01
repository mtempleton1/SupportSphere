import { describe, it, expect, beforeAll } from '@jest/globals';
import { OttoSystem } from '../../../src/otto/core/system';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/supatypes';

// Increase timeout for tests making real API calls
jest.setTimeout(30000);  // 30 seconds

describe('OttoSystem', () => {
  // Store original environment variables
  const originalEnv = process.env;
  let testUser: any;

  // Store original console.error
  const originalConsoleError = console.error;

  beforeAll(async () => {
    // Fetch a real user for testing
    const supabase = createClient<Database>(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '', {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })

    const { data: testUser, error } = await supabase
      .from('UserProfiles')
      .select()
      .eq('userType', 'staff')
      .single()
    console.log("----------------------------------------------------------------------")
    console.log(testUser)
    console.log(error)
    console.log("----------------------------------------------------------------------")
  });

  const testConfig = {
    openAIApiKey: process.env.OPENAI_API_KEY || 'test-key',
    supabaseConfig: {
      projectUrl: process.env.VITE_SUPABASE_PROJECT_URL || 'https://test-project.supabase.co',
      anonKey: process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    userProfile: testUser
  };

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    // Reset console.error before each test
    console.error = originalConsoleError;
  });

  afterAll(() => {
    // Restore environment variables after all tests
    process.env = originalEnv;
    // Restore console.error after all tests
    console.error = originalConsoleError;
  });

  it('should initialize correctly', () => {
    const otto = new OttoSystem(testConfig);
    expect(otto).toBeInstanceOf(OttoSystem);
  });

  it('should process a query and return a response', async () => {
    const otto = new OttoSystem(testConfig);

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
    const otto = new OttoSystem(testConfig);

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

    // Set invalid API key in config
    const invalidConfig = {
      ...testConfig,
      openAIApiKey: 'invalid-key'
    };
    const otto = new OttoSystem(invalidConfig);

    const response = await otto.processQuery('Hello');
    
    expect(response).toHaveProperty('error');
    expect(response.error).toContain('Incorrect API key provided');
    expect(response.messages).toHaveLength(0);
    expect(response.context).toEqual({});

    // Verify error was logged (but suppressed)
    expect(console.error).toHaveBeenCalled();
  });
}); 