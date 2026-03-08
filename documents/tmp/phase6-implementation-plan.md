# Phase 6 実装計画

## Phase 6-A: エラー監視 + Web Vitals + console クリーンアップ

### 6-A-1: Sentry 統合
- [x] `@sentry/react` + `@sentry/vite-plugin` インストール
- [x] `src/utils/sentry.ts` 新規作成
- [x] `src/index.tsx` に `initSentry()` 追加
- [x] `src/utils/errorHandler.ts` の TODO を Sentry に置換
- [x] `src/components/common/ErrorBoundary.tsx` に Sentry 追加
- [x] `src/App.tsx` に `Sentry.setUser()` 追加
- [x] `vite.config.js` に Sentry プラグイン追加

### 6-A-2: Web Vitals 計測
- [x] `web-vitals` インストール
- [x] `src/utils/webVitals.ts` 新規作成
- [x] `src/index.tsx` に `reportWebVitals()` 追加

### 6-A-3: console クリーンアップ
- [ ] 全 console 文を logger に統一
- [ ] ESLint `no-console: error` に変更

### 6-A-4: E2E テスト拡充
- [ ] 12件の新規E2Eスペック作成
- [ ] data-testid 追加
- [ ] ページオブジェクト拡充

## Phase 6-B: アクセシビリティ
（Phase 6-A 完了後に実施）

## Phase 6-C: パフォーマンス + コード品質
（Phase 6-B 完了後に実施）
