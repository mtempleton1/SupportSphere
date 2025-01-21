import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'

dotenv.config()

// Get current directory path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_PROJECT_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Make sure VITE_SUPABASE_PROJECT_URL and SUPABASE_SERVICE_KEY are set in your .env file.')
}

// Now TypeScript knows these are strings
const SUPABASE_URL: string = supabaseUrl
const SUPABASE_SERVICE_KEY: string = supabaseServiceKey

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    fetch: fetch as any
  }
})

async function instantiateDatabase() {
  try {
    console.log('Starting database instantiation...')

    // Read the SQL file
    const modelSqlPath = path.join(__dirname, 'model.sql')
    const sqlContent = fs.readFileSync(modelSqlPath, 'utf8')

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent })

    if (error) {
      console.error('Error executing SQL:', error)
      throw error
    }

    console.log('Database schema instantiated successfully!')
  } catch (error) {
    console.error('Error instantiating database:', error)
    throw error
  }
}

// Export the instantiate function
export default instantiateDatabase

// If running directly (not imported), execute instantiation
await instantiateDatabase()