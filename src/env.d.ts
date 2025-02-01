/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_SUPABASE_PROJECT_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_LANGSMITH_API_URL?: string
  readonly VITE_LANGSMITH_API_KEY?: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 