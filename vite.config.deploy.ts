/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// DEFAULT-PROMOTION build (2026-06-19): builds the SAME source as /qa5 but with
// base=/ so it can be deployed into REACT_DIST (react-portal/dist) — the build
// live users load at https://forge-jordannah.ai-civ.com/ .
//
// Why this config and NOT vite.config.ts:
//  1. CONTENT-HASHED names (index-[hash].js / [name]-[hash]) instead of the
//     FIXED index-PYO2024.js. The fixed name was the root of Jord's stale-cache
//     / "I deployed but nobody sees it" pain — a returning browser/SW could
//     answer the same URL from cache. New hashes = guaranteed cache miss.
//  2. __ENABLE_SW__ = false → main.tsx does NOT register /sw.js for this build.
//     We also remove sw.js from the deployed dir AND ship an inline head script
//     (added post-build) that unregisters any leftover SW + clears CacheStorage,
//     so the previously-installed cache-first SW that served the stale shell is
//     actively neutralised on next load. (Same cure proven on /qa5.)
//
// base=/ so asset + lazy-chunk URLs resolve at /assets/* (default origin root).
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    __ENABLE_SW__: 'false',
  },
  build: {
    outDir: 'dist-deploy',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
