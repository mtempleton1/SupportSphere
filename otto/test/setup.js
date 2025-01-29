import dotenv from 'dotenv'
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

// No need to set environment variables manually as they are loaded from .env
// If any variables are missing in .env, we can set defaults here
if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found in .env, using test key');
  process.env.OPENAI_API_KEY = 'test-key';
}

if (!process.env.LANGCHAIN_API_KEY) {
  console.warn('LANGCHAIN_API_KEY not found in .env, using test key');
  process.env.LANGCHAIN_API_KEY = 'test-langsmith-key';
}

// Ensure tracing is enabled for tests
process.env.LANGCHAIN_TRACING_V2 = 'true';
process.env.LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || 'otto-tests';
process.env.LANGCHAIN_CALLBACKS_BACKGROUND = 'true'; 