import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  // Read env vars (VITE_*) from the repo-root .env so the whole monorepo shares
  // a single configuration file.
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Dev server: proxy the API to the NestJS backend so same-origin `/api` calls
  // (and login) work in `make dev` exactly like the built, single-port app.
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5800',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Compiled straight into the Go backend, which embeds this directory
    // (go:embed) to ship the whole app as a single binary.
    outDir: path.resolve(__dirname, '../backend/static'),
    emptyOutDir: true,
  },
})
