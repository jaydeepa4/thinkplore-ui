import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'THINKPLORE_')
  const proxy = {
    '/api': {
      target: env.THINKPLORE_API_TARGET || 'http://127.0.0.1:8000',
      changeOrigin: false,
    },
  }

  return {
    base: './',
    server: { host: '127.0.0.1', port: 5175, strictPort: true, proxy },
    preview: { host: '127.0.0.1', port: 4175, strictPort: true, proxy },
  }
})
