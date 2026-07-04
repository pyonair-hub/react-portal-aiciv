/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// QA4 build: CONTENT-HASHED asset filenames so the URLs are GUARANTEED new
// (never requested by Jord's phone/PWA before) — forces a hard cache miss.
// base=/qa4/ so all asset + lazy-chunk URLs resolve under /qa4/assets/*.
export default defineConfig({
  plugins: [react()],
  base: '/qa4/',
  build: {
    outDir: 'dist-qa4',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index-PYOv4-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
