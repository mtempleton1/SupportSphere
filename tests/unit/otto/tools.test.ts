import 'dotenv/config';
import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import { OttoSystem } from '../../../src/otto/core/system';
import { CurrentTimeTool } from '../../../src/otto/core/tools/currentTime';
import { ToolRegistry } from '../../../src/otto/core/tools/registry';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/supatypes';

// Increase timeout for tests making real API calls
jest.setTimeout(30000);  // 30 seconds

describe('Otto Tools', () => {
  // Store original environment variables
  const originalEnv = process.env;
  let testUser: any;
  let testConfig: any;

  beforeAll(async () => {
    // Create a Supabase client with a unique storage key for testing
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL || '', 
      process.env.SUPABASE_SERVICE_KEY || '', 
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storageKey: 'sb-test-auth-' + Math.random()
        }
      }
    );

    // Fetch first active staff user for testing
    const { data: user, error } = await supabase
      .from('UserProfiles')
      .select('*')
      .eq('userType', 'staff')
      .eq('isActive', true)
      .limit(1)
      .single();

    if (error) {
      throw new Error(`Failed to fetch test user: ${error.message}`);
    }

    testUser = user;
    
    // Set up test config with the real user
    testConfig = {
      openAIApiKey: process.env.VITE_OPENAI_API_KEY || 'test-key',
      supabaseConfig: {
        projectUrl: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_KEY,
        storageKey: 'sb-test-auth-' + Math.random()  // Unique key for the main client
      },
      userProfile: testUser
    };
  });

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore environment variables after all tests
    process.env = originalEnv;
  });

  // describe('CurrentTimeTool', () => {
  //   it('should return time in 24h format by default', async () => {
  //     const tool = new CurrentTimeTool();
  //     const result = await tool.execute({});
      
  //     // Should match format like "14:30"
  //     expect(result).toMatch(/^\d{2}:\d{2}$/);
  //   });

  //   it('should return time in 12h format when specified', async () => {
  //     const tool = new CurrentTimeTool();
  //     const result = await tool.execute({ format: '12h' });
      
  //     // Should match format like "2:30 PM"
  //     expect(result).toMatch(/^\d{1,2}:\d{2} [AP]M$/);
  //   });
  // });

  // describe('Tool Integration', () => {
  //   it('should process a query using the current time tool', async () => {
  //     const otto = new OttoSystem(testConfig);
  //     const response = await otto.processQuery('What time is it?');
      
  //     // The response should include both the user's question and Otto's response
  //     expect(response.messages).toHaveLength(2);
  //     expect(response.messages[0]).toEqual({
  //       role: 'user',
  //       content: 'What time is it?',
  //       timestamp: expect.any(String)
  //     });
  //     expect(response.messages[1]).toHaveProperty('role', 'assistant');
      
  //     // The response should mention the time
  //     const assistantMessage = response.messages[1].content;
  //     expect(typeof assistantMessage).toBe('string');
  //     expect(assistantMessage.toLowerCase()).toMatch(/time|clock|\d{1,2}:\d{2}/);
  //   });

  //   it('should handle tool execution errors gracefully', async () => {
  //     const otto = new OttoSystem(testConfig);
      
  //     // Create a failing tool for testing
  //     const failingTool = new CurrentTimeTool();
  //     const mockExecute = jest.fn<typeof failingTool.execute>()
  //       .mockRejectedValue(new Error('Time service unavailable'));
  //     failingTool.execute = mockExecute;
      
  //     // Replace the tool registry with our failing tool
  //     (otto as any).tools = new ToolRegistry();
  //     (otto as any).tools.registerTool(failingTool);

  //     const response = await otto.processQuery('What time is it?');
      
  //     // Should still get a response, even if tool failed
  //     expect(response.messages.length).toBeGreaterThan(1);
  //     expect(response.messages[response.messages.length - 1].role).toBe('assistant');
  //   });
  // });

  describe('DatabaseQueryTool', () => {
    it('should handle ticket count queries', async () => {
      const otto = new OttoSystem(testConfig);
      const response = await otto.processQuery('How many tickets do I have?');

      expect(response).toHaveProperty('messages');
      expect(response.messages).toHaveLength(2);
      expect(response.messages[1].content).toContain('tickets');
    });

    it('should handle ticket status queries', async () => {
      const otto = new OttoSystem(testConfig);
      const response = await otto.processQuery('Show me my open tickets');

      expect(response).toHaveProperty('messages');
      expect(response.messages).toHaveLength(2);
      expect(response.messages[1].content).toContain('tickets');
    });
  });
}); 
