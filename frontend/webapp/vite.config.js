import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // CRAからの移行: .jsファイル内のJSXもBabelで処理
      include: /\.(jsx|js|tsx|ts)$/,
    }),
    VitePWA({
      registerType: 'prompt',
      strategies: 'generateSW',
      manifest: false,
      injectRegister: null,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/sitemap.xml', '**/robots.txt'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.execute-api\..*\.amazonaws\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-responses',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/accounts\.google\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-oauth',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    // Sentry ソースマップアップロード（SENTRY_AUTH_TOKEN が設定されている場合のみ有効）
    process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ['./build/**/*.map'],
      },
      telemetry: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api-proxy': {
        target: process.env.VITE_API_BASE_URL || 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 200,
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-csv': ['papaparse'],
          'vendor-query': ['@tanstack/react-query', 'zustand', 'axios'],
          'vendor-sentry': ['@sentry/react'],
        },
      },
    },
  },
  define: {
    // CRA互換: process.env.NODE_ENV をサポート
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
