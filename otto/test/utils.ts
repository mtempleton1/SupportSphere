import { SupabaseClient } from "@supabase/supabase-js";
import { OttoConfig } from "../core/system.js";
import { NodeState, Message } from "../core/nodes/base.js";
import { jest } from '@jest/globals';

export function createMockSupabaseClient(): SupabaseClient {
  return {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    })),
    auth: {
      getUser: jest.fn()
    }
  } as unknown as SupabaseClient;
}

export function createTestConfig(overrides: Partial<OttoConfig> = {}): OttoConfig {
  return {
    openAiKey: process.env.OPENAI_API_KEY || 'test-key',
    supabaseClient: createMockSupabaseClient(),
    adminClient: createMockSupabaseClient(),
    userProfile: {
      userId: 'test-user',
      accountId: 'test-account',
      userType: 'staff',
      roleId: 'admin'
    },
    ...overrides
  };
}

export function createTestState(messages: Message[] = []): NodeState {
  return {
    messages,
    context: {}
  };
} 