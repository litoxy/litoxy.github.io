import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

// GitHub Pages (litoxy.github.io) → root deployment, base '/'
// Override with VITE_BASE=/sub-path/ for sub-path hosting.
function resolveBase() {
  if (process.env.VITE_BASE) return process.env.VITE_BASE
  return '/'
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react()],
  resolve: {
    alias: {
      '@mediapipe/pose': path.resolve(root, 'src/shims/mediapipe-pose.js'),
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/pose'],
  },
  server: {
    host: true,
  },
})