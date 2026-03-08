# Phase 7-A: ローンチ前チェック 実装計画

**作成日**: 2026-03-07

## 概要
Phase 6完了後のローンチ前整備。git statusクリーンアップ + SEO確認 + 未追跡ファイル整理。

## タスク一覧

### 1. 未追跡ファイル整理 + git statusクリーンアップ
以下の未追跡ファイルは全て不要であることを確認済み。削除する。

**削除対象（レガシーファイル）:**
- `frontend/webapp/src/App.jsx` — TypeScript版(App.tsx)が正式版
- `frontend/webapp/src/index.jsx` — TypeScript版(index.tsx)が正式版
- `frontend/webapp/src/reportWebVitals.js` — utils/webVitals.tsに移行済
- `frontend/webapp/src/setupProxy.js` — CRA用、Viteでは不要
- `frontend/webapp/src/setupProxy.disabled.js` — 無効化スタブ
- `frontend/webapp/src/setupProxy.js.bak` — バックアップ
- `frontend/webapp/src/craco.config.js` — CRA用、Viteでは不要
- `frontend/webapp/src/context/` — Zustand移行済、Context全廃止
- `frontend/webapp/src/tokens/atlassian-tokens.js` — 未参照
- `frontend/webapp/emergency-deploy.sh` — CLAUDE.mdで使用禁止
- `e2e/auth-e2e.spec.mjs` — CI未統合、手動テスト残骸

**ドキュメント整理:**
- `document/frontend/*.md` (5ファイル) — 古いドキュメント、documentsフォルダに統合

**ステージ済み変更のコミット:**
- `documents/tmp/phase6-review-fixes.md` — deleted
- `documents/tmp/redesign-plan.md` — modified (Phase 7計画追加)
- LP改善関連の変更（sitemap, Landing.test, i18n, seo.ts）

### 2. index.html修正
- `/src/index.jsx` → `/src/index.tsx` 参照修正

### 3. SEO確認
- sitemap.xml確認
- OGP meta tags確認
- 構造化データ確認

### 4. Lighthouse確認
- Performance > 90 目標
- Accessibility > 90 目標

### 5. ビルド + デプロイ
- ビルド実行
- 本番デプロイ
- GitHubプッシュ
