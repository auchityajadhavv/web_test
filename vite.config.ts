import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  // Dynamic imports isolate the map, 3D scene and owner pages with Vite 8's bundler.
  build: { chunkSizeWarningLimit: 900 },
})
