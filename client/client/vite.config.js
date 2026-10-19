import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the local Express server (same origin as in production)
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
