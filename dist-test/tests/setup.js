import '@testing-library/jest-dom';
import { config } from 'dotenv';
import { resolve } from 'path';
import 'cross-fetch/polyfill'; // Add fetch API to Node.js environment
import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill';
// import { dirname } from 'path';
// Add Web Streams API to global scope
Object.assign(global, {
    ReadableStream,
    WritableStream,
    TransformStream
});
// Load environment variables from the root .env file
config({ path: resolve(__dirname, '../.env') });
// Set up test environment variables
process.env.VITE_OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || 'test-key';
// Disable LangSmith tracing for tests to avoid warnings
process.env.LANGCHAIN_TRACING_V2 = 'false';
process.env.LANGCHAIN_PROJECT = undefined;
process.env.LANGCHAIN_API_KEY = undefined;
// Add any global test setup here 
