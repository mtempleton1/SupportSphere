export { BaseTool, type ToolDefinition } from './base.js';
export { ToolRegistry } from './registry.js';
export { CurrentTimeTool } from './currentTime.js';
import { DatabaseQueryTool } from "../database/tools/databaseQueryTool";
import { type SupabaseConfig } from "../../../lib/supabase";

export interface ToolsConfig {
  openAIApiKey: string;
  supabaseConfig: SupabaseConfig;
}

export function createTools(config: ToolsConfig) {
  return [
    new DatabaseQueryTool(config.openAIApiKey, config.supabaseConfig),
  ] as const;
}

// Helper to get environment variables safely
// function getEnvVar(name: string): string {
//   // Check process.env first (Node/test environment)
//   if (typeof process !== 'undefined' && process.env && process.env[name]) {
//     return process.env[name] as string;
//   }
  
//   // Return empty string as fallback
//   return '';
// }

// Default config for development/testing
// const defaultConfig: ToolsConfig = {
//   openAIApiKey: getEnvVar('VITE_OPENAI_API_KEY'),
//   supabaseConfig: {
//     projectUrl: getEnvVar('VITE_SUPABASE_PROJECT_URL'),
//     anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY')
//   }
// };

// Only create tools with default config in development
// export const tools = process.env.NODE_ENV === 'development' ? createTools(defaultConfig) : []; 