# バグ報告: 本番サイト /config/client 403エラー

**報告日**: 2026-03-04
**深刻度**: 🔴 緊急（本番サイトでログイン不可）
**発見経緯**: Phase 0-A デプロイ後のレビュー v4 で発覚

## 現象
- portfolio-wise.com にアクセスするとページは表示されるが、ログイン不可
- Google OAuth の Client ID が取得できない

## 根本原因分析

### 原因1: `/config/client` が 403 を返す
- **ファイル**: `backend/src/middleware/apiSecretValidation.js` (Line 12-16)
- `SKIP_VALIDATION_PATHS` に `/config/client` が含まれていない
- このエンドポイントは `X-API-Secret` ヘッダーを要求するが、フロントエンドからは送信できない
- **導入時期**: commit `42df37bd` (2025年5月29日) — Vite移行以前から存在

### 原因2: フロントエンド configService.js がヘッダーなしで呼び出し
- **ファイル**: `frontend/webapp/src/services/configService.js` (Line 70)
- `axios.get(CONFIG_ENDPOINT)` にヘッダー付与なし
- `/api-proxy` フォールバックも Cloudflare Pages にプロキシ設定がないため機能しない

### 原因3: フォールバック設定の googleClientId が空
- **ファイル**: `frontend/webapp/src/services/configService.js` (Line 100)
- `googleClientId: ''` — API取得失敗時に空文字がセットされる
- Google OAuth が機能しない

### 原因4: 市場データが古い
- AAPL $185.75 (2025年7月のデータ) — yahoo-finance2 がライブデータを返していない可能性

## 修正方針

**選択肢B（推奨）**: `/config/client` を apiSecretValidation のスキップ対象に追加
- `/config/client` のレスポンスは公開情報のみ（Google Client ID、機能フラグ）
- セキュリティリスクなし

## 修正内容

1. `backend/src/middleware/apiSecretValidation.js`: SKIP_VALIDATION_PATHS に `/config/client` 追加
2. バックエンドをデプロイ
3. 本番動作確認

## 修正実施内容

### 修正1: apiSecretValidation.jsの修正
- `SKIP_VALIDATION_PATHS` に `/config/client` と `/health` を追加
- ファイル: `backend/src/middleware/apiSecretValidation.js`

### 修正2: npm workspace hoisting問題の解決
- backendをroot package.jsonのworkspacesから除外
- 理由: npm workspacesのhoistingにより `@smithy/util-base64`, `tslib` 等がrootにhoistされ、
  Serverless Frameworkがbackend/node_modulesのみをパッケージングするため、Lambdaで502エラー発生
- rootの `package.json` の `workspaces` から `"backend"` を除外

### 修正3: バックエンドの再デプロイ
- `npx serverless@3.32.2 deploy --stage prod` で本番環境にデプロイ
- `/config/client` → 200 (googleClientId取得成功)
- `/api/market-data` → 200 (AAPL $263.75, 2026-03-04)

## 検証結果
- [x] `/config/client` が200を返す
- [x] `googleClientId` が正しく取得できる
- [x] `portfolio-wise.com` が200を返す
- [x] 市場データAPIが最新データを返す
- [ ] Google ログインの動作確認（ユーザーによる手動確認が必要）

## ステータス: 修正完了（ユーザー確認待ち）
