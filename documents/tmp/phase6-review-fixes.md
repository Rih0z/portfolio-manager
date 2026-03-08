# Phase 6 レビュー修正計画

## レビュー指摘の精査結果

### 誤検出（修正不要）
- `index.html` lang属性: 既に `lang="ja"` ✅
- スキップリンク: 既に App.tsx L317-322 に実装済み ✅
- PnLTrendChart a11y: 既に `role="img"` + `aria-label` あり（L176） ✅
- NotificationDisplay: 既に `aria-live="assertive"` あり ✅
- ErrorBoundary: 既に `role="alert"` あり ✅
- Sentry DSN未設定: 設計上正しい（DSNはCloudflare環境変数で設定、.env.exampleに文書化のみ必要）

### 実際の修正項目

#### P0: Critical
1. **Logger環境変数**: `process.env.NODE_ENV` → `import.meta.env` (Vite best practice)
2. **.env.example**: VITE_SENTRY_DSN の文書化追加

#### P1: Medium
3. **TabNavigation**: `aria-current="page"` 追加
4. **TickerSearch**: `aria-invalid` + `aria-describedby` + メッセージに `role="alert"`
5. **NotificationBell**: `aria-controls` + ドロップダウンに `id` 追加
6. **HoldingCard**: `alert()` → インライン検証メッセージ、+/- ボタンに `aria-label`
7. **PnLTrendChart**: 期間ボタンに fuller `aria-label`
8. **PnLSummary**: ※マークの説明追加

#### P2: Low
9. **vitest.config.ts**: カバレッジ閾値を段階的に引き上げ
