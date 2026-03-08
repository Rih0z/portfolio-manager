# Phase 7 実装計画: 技術的負債解消 + ローンチ進行

**作成日**: 2026-03-07
**対象Phase**: Phase 7-A 残り（コーディング部分）→ Phase 7-B（GA4ファネル）

---

## Step 1: 技術的負債解消（Phase 7-A 追加コーディングタスク）

レビューで発見された問題のうち、ローンチ前に解消すべきもの:

### 1.1 不要ファイル削除
- [ ] `src/test-yaml-repair.js` — テスト用スクリプトがsrc/に残存
- [ ] `craco.config.js` — CRA時代のレガシー（Vite移行済み）
- [ ] `jest.config.custom.js` — Jest時代のレガシー（Vitest移行済み）
- [ ] `jest.config.minimal.js` — 同上
- [ ] `src/setupTests.js` — CRA時代のセットアップ（vitest.setup.tsに移行済み）
- [ ] `node_modules_backup_*` / `node_modules_old` — 263MB不要データ

### 1.2 コード品質修正
- [ ] `src/vite-env.d.ts` — 存在しないモジュール宣言を削除（AllocationChart, RebalanceRecommendations）
- [ ] `src/utils/csrfManager.ts` — ダミーCSRFトークンの対処（JWT認証がメインのため不要なら削除検討）

### 1.3 npm脆弱性対応
- [ ] `npm audit` 結果確認 + 可能な範囲でfix

## Step 2: 法務コンテンツ確認（Phase 7-A）
- [ ] Terms.tsx / Privacy.tsx / KKKR.tsx / Disclaimer.tsx の内容確認

## Step 3: 本番スモークテスト（Phase 7-A）
- [ ] scripts/smoke-test.sh 実行

## Step 4: Phase 7-B GA4ファネル設定（コーディング部分）
- [ ] GA4ファネル設定（LP→登録→ダッシュボード→課金）

## Step 5: 古い計画ドキュメントのクリーンアップ
- [ ] documents/tmp/ 内の完了済みプランファイル整理
