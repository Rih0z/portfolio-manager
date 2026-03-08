# NPS調査機能 実装計画

**Phase**: 7-C（Month 3目標）
**コスト**: ¥0（GA4イベント送信のみ、バックエンドAPI不要）

## 設計

### 概要
- アプリ内でNPS（Net Promoter Score）調査を表示
- 0-10のスケールで推奨度を質問
- スコアに応じたフォローアップコメント
- GA4イベントで集計（バックエンドAPI不要 = Stage 1ゼロコスト方針準拠）

### 表示条件
1. ユーザーが認証済み
2. 初回ログインから7日以上経過
3. 前回NPS回答から90日以上経過（またはdismissから30日以上）
4. ダッシュボードページで表示
5. 1セッション中は1回のみ

### NPS分類
- Promoter (9-10): 推奨者
- Passive (7-8): 中立者
- Detractor (0-6): 批判者

### ファイル構成
1. `src/components/survey/NPSSurvey.tsx` — NPS調査ダイアログ
2. `src/hooks/useNPSSurvey.ts` — 表示ロジック（localStorage管理）
3. `src/utils/analytics.ts` — NPS_SUBMIT イベント追加
4. `src/i18n/locales/ja.json` — 日本語テキスト追加
5. `src/i18n/locales/en.json` — 英語テキスト追加
6. `src/__tests__/unit/hooks/useNPSSurvey.test.ts` — テスト
7. `src/__tests__/unit/components/NPSSurvey.test.tsx` — テスト

### データ永続化
- localStorage: `pfwise_nps_last_submitted`, `pfwise_nps_last_dismissed`
- GA4イベント: `nps_submit` { score, category, comment_length }

### UI設計
- Dashboard下部にフローティングカード
- 0-10の数字ボタン（色分け: 赤→黄→緑）
- オプションのコメント入力
- 「送信」「後で」ボタン
- shadcn/ui Card + Button + Input
