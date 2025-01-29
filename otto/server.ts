import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OttoSystem, type OttoConfig } from './core/index.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.OTTO_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create Otto system instance
const ottoConfig: OttoConfig = {
  openAiKey: process.env.OPENAI_API_KEY!,
  supabaseClient: null!, // Will be created per-request
  adminClient: null!, // Will be created per-request
  userProfile: null!, // Will be set from request headers
};

const otto = new OttoSystem(ottoConfig);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main Otto endpoint
app.post('/', async (req, res) => {
  try {
    const userProfile = JSON.parse(req.headers['x-user-profile'] as string);
    const { query, context } = req.body;

    // Process the query
    const response = await otto.processQuery(query, context);

    res.json({
      data: response,
      error: null
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.json({
      data: null,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

app.listen(port, () => {
  console.log(`Otto service listening at http://localhost:${port}`);
}); 