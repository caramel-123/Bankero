import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'bankero-logo.png'],
      manifest: {
        name: 'Bankero',
        short_name: 'Bankero',
        description: 'Decentralized credit scoring & micro-lending on Stellar — build a verifiable, on-chain financial identity without a bank account.',
        theme_color: '#15803D',
        background_color: '#F5F9F6',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the built app shell (JS/CSS/fonts/images) — no
        // runtimeCaching rules are added, so Supabase and Stellar Horizon/
        // Soroban RPC calls always hit the network directly. This is a
        // financial app; balances, scores, and loan state must never be
        // served stale from a cache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false, // avoid SW caching interfering with `vite dev` hot reload
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
