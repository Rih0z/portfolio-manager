# デプロイメント状況

最終更新: 2025年5月29日

## 環境別エンドポイント

### 開発環境 (dev)
- **ベースURL**: https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev
- **ステータス**: ✅ 稼働中
- **最終デプロイ**: 2025年5月29日

### 本番環境 (prod)
- **ベースURL**: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
- **ステータス**: ✅ 稼働中
- **最終デプロイ**: 2025年5月29日

## セキュリティ強化内容

### 1. 脆弱性対策
- ✅ jsonpath-plus の RCE 脆弱性を修正
- ✅ すべての依存関係で脆弱性ゼロを確認

### 2. 本番環境セキュリティ
- ✅ 環境別レート制限
  - 開発: 500 req/時間（ユーザー）
  - 本番: 60 req/時間（ユーザー）
- ✅ 管理者API の IP ホワイトリスト必須化
- ✅ HTTPS 必須（本番環境）
- ✅ セキュリティヘッダーの強化
- ✅ ログレベルの環境別設定（本番: warn）

### 3. AWS設定
- ✅ CloudWatch Logs 保持期間: 30日（本番）
- ✅ Lambda 予約同時実行数: 100（本番）
- ✅ DynamoDB TTL 有効化
- ✅ Secrets Manager 必須化（本番）

## 主要エンドポイント

### 公開API
- `GET /api/market-data` - 市場データ取得
- `GET /config/client` - クライアント設定
- `POST /auth/google/login` - Google ログイン
- `GET /auth/session` - セッション確認

### 認証必須API
- `POST /drive/save` - Google Drive 保存
- `GET /drive/load` - Google Drive 読み込み
- `GET /drive/files` - ファイル一覧

### 管理者API（IPホワイトリスト必須）
- `GET /admin/status` - システムステータス
- `POST /admin/reset` - 使用量リセット
- `GET /admin/getBudgetStatus` - 予算状況

## フロントエンド設定

Netlifyで以下の環境変数を設定してください：

```
# 開発環境
REACT_APP_API_BASE_URL=https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com

# 本番環境
REACT_APP_API_BASE_URL=https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com
```

## 監視とアラート

### CloudWatch ダッシュボード
- Lambda 関数のエラー率
- API Gateway のレスポンスタイム
- DynamoDB の読み書きスループット
- 予算使用状況

### 推奨アラート設定
1. Lambda エラー率 > 1%
2. API レスポンスタイム > 3秒
3. 月間リクエスト数 > 180,000（90%）
4. AWS 予算 > $20

## トラブルシューティング

### ログの確認
```bash
# 開発環境
npm run logs

# 本番環境
npx serverless@3.32.2 logs -f marketData -t --stage prod
```

### ロールバック
```bash
# 本番環境のロールバック
npx serverless@3.32.2 rollback --stage prod
```

## 次のステップ

1. カスタムドメインの設定
2. WAF の設定
3. CloudFront の設定
4. 監視ダッシュボードの構築
5. 自動スケーリングの最適化