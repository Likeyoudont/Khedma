import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode, command }) => {
  const appEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const preview = process.env.VITE_STATIC_PREVIEW ?? appEnv.VITE_STATIC_PREVIEW ?? 'false'
  const demo = process.env.VITE_ENABLE_DEMO ?? appEnv.VITE_ENABLE_DEMO ?? 'false'
  const buildMode = command === 'serve' ? 'development' : preview === 'true' ? 'preview' : demo === 'true' ? 'demo' : 'public'
  return {
    plugins: [react(), {
      name: 'khedma-build-mode',
      transformIndexHtml() {
        return [{ tag: 'meta', attrs: { name: 'khedma-build-mode', content: buildMode }, injectTo: 'head' }]
      },
    }],
    define: {
      'import.meta.env.VITE_STATIC_PREVIEW': JSON.stringify(preview),
      'import.meta.env.VITE_ENABLE_DEMO': JSON.stringify(demo),
    },
    server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  }
})
