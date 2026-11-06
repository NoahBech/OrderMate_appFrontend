import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { productionBuildUrls } from './scripts/production-build.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [productionBuildUrls(), react()],
  build: {
    outDir: fileURLToPath(new URL('../production_new/', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 6600,
    strictPort: true,
  },
})
