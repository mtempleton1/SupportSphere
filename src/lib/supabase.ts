
import { createClient } from '@supabase/supabase-js'

// Determine if we're in Vite or Node environment
const isViteEnvironment = typeof import.meta?.env !== 'undefined'

// Get environment variables based on environment
const supabaseUrl = isViteEnvironment ? 
  import.meta.env.VITE_SUPABASE_PROJECT_URL : 
  process.env.VITE_SUPABASE_PROJECT_URL

const supabaseAnonKey = isViteEnvironment ? 
  import.meta.env.VITE_SUPABASE_ANON_KEY : 
  process.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables in ${isViteEnvironment ? 'Vite' : 'Node'} environment. 
    Make sure VITE_SUPABASE_PROJECT_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 