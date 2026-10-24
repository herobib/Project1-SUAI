import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', // или '0.0.0.0', чтобы открыть доступ в локальной сети
    port: 5173         // принудительно фиксируем порт
  },
  build: {
  cssCodeSplit: false,
  rollupOptions: {
    output: {
      entryFileNames: 'assets/app.js',
      chunkFileNames: 'assets/[name].js',
      assetFileNames: 'assets/style[extname]',
    },
  },
},
})
