import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      include: /\.(jsx|js|tsx|ts)$/,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    include: [
      'src/**/__tests__/**/*.{ts,tsx,js,jsx}',
      'src/**/*.{test,spec}.{ts,tsx,js,jsx}',
    ],
    exclude: [
      'node_modules',
      'build',
      'dist',
      'coverage',
      'scripts',
      '__tests__/manual/**',
      'src/__tests__/mocks/**',
    ],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/__tests__/**',
        'src/index.tsx',
        'src/vite-env.d.ts',
        'node_modules/**',
        // 型定義のみのファイル
        'src/types/**',
        // ブラウザAPI依存のインフラ（JSDOM非対応）
        'src/utils/webVitals.ts',
        'src/utils/sentry.ts',
        'src/utils/loadWithRetry.tsx',
        // エントリポイント・プロバイダー
        'src/providers/**',
        // React hooks（統合テストでカバー）
        'src/hooks/**',
        // ページコンポーネント（E2Eでカバー）
        'src/pages/**',
        // レイアウト・データ・認証コンポーネント（E2E/統合テストでカバー）
        'src/components/layout/**',
        'src/components/data/**',
        'src/components/auth/**',
        'src/components/dashboard/**',
        'src/components/settings/index.ts',
        // シミュレーション関連（E2Eでカバー）
        'src/components/simulation/**',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 75,
        lines: 80,
      },
    },
    // Mock modules
    alias: {
      '\\.(css|less|scss|sass)$': path.resolve(__dirname, '__mocks__/styleMock.js'),
      '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': path.resolve(__dirname, '__mocks__/fileMock.js'),
      'virtual:pwa-register/react': path.resolve(__dirname, '__mocks__/virtualPwaRegister.js'),
    },
  },
});
