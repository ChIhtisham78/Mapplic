import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '',
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        assetFileNames: "mapplic.[ext]",
        entryFileNames: "mapplic.js",
        chunkFileNames: "mapplic.js"
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 1100,
  },
  plugins: [react()]
})