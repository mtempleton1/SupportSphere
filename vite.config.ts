import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      'node:async_hooks': path.resolve(__dirname, 'src/lib/async_hooks-browser.ts')
    }
  },
  define: {
    'process.env.LANGCHAIN_TRACING': JSON.stringify(process.env.LANGCHAIN_TRACING),
    'process.env.LANGCHAIN_SESSION': JSON.stringify(process.env.LANGCHAIN_SESSION),
    'process.env.LANGCHAIN_API_KEY': JSON.stringify(process.env.LANGCHAIN_API_KEY),
    'process.env.LANGSMITH_API_KEY': JSON.stringify(process.env.LANGSMITH_API_KEY)
  }
})
