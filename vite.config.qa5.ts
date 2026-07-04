/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// QA5 build: BULLETPROOF against ALL caching, including service workers.
//  1. CONTENT-HASHED asset filenames (index-PYOv5-[hash].js) → URLs Jord's
//     phone/PWA has never requested → forced hard cache miss. The PYOv5 prefix
//     guarantees the strings differ from /qa (index-PYO2024.*) and
//     /qa4 (index-PYOv4-*).
//  2. __ENABLE_SW__ = false → main.tsx does NOT call
//     navigator.serviceWorker.register for this build. A staging page must
//     never install a service worker.
//  (The /qa5 index.html ALSO ships an inline head script that actively
//   unregisters any leftover SW + clears all CacheStorage on load — that is
//   added post-build, since vite's index.html is shared source.)
// base=/qa5/ so all asset + lazy-chunk URLs resolve under /qa5/assets/*.
export default defineConfig({
  plugins: [react()],
  base: '/qa5/',
  define: {
    __ENABLE_SW__: 'false',
  },
  build: {
    outDir: 'dist-qa5',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index-PYOv5-[hash].js',
        chunkFileNames: 'assets/[name]-qa5-[hash].js',
        assetFileNames: 'assets/[name]-qa5-[hash][extname]',
      },
    },
  },
})
