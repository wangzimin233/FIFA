import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createBackendHttpOrigin, normalizeBackendHost } from './src/config/backend'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendHost = normalizeBackendHost(env.VITE_BACKEND_HOST)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: createBackendHttpOrigin(backendHost),
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
