# Phase 2-B 実装計画

## 分析結果
- `backend/src/services/portfolioService.js` は既存（Google Drive用）→ DynamoDB用は `portfolioDbService.js` で新規作成
- `csvParsers.ts` は `purchasePrice` をパースしていない → 追加必要
- `apiUtils.ts` の `authFetch` を利用してフロントエンド同期
- 6ステップの実装を順次実行

## 実装順序
1. serverless.yml にDynamoDBテーブル2個 + Lambda定義追加
2. 価格履歴サービス + 日次スナップショットLambda + API
3. ポートフォリオDB保存（バックエンド） + フロントエンド同期
4. 損益ダッシュボード（型追加 + 計算 + UI）
5. 予算超過グレースフルデグレーション
6. GA4アナリティクス
7. テスト + ビルド + デプロイ
