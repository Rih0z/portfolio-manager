# AWS Secrets Manager 完全移行ガイド

## 🚀 移行手順

### 1. 移行スクリプトの実行

```bash
# 環境変数を読み込み
export $(cat .env | grep -v '^#' | xargs)

# 移行スクリプトを実行
./scripts/setup-all-secrets.sh
```

このスクリプトは以下のシークレットを作成します：

1. **pfwise-api/google-oauth** - Google OAuth認証情報
   - clientId
   - clientSecret

2. **pfwise-api/credentials** - 管理者認証情報
   - ADMIN_API_KEY
   - ADMIN_EMAIL
   - CRON_SECRET

3. **pfwise-api/external-apis** - 外部API認証情報
   - ALPHA_VANTAGE_API_KEY
   - ALPACA_API_KEY
   - ALPACA_API_SECRET
   - OPEN_EXCHANGE_RATES_APP_ID
   - FIXER_API_KEY

4. **pfwise-api/github-token** - GitHubアクセストークン
   - token

### 2. 実装状況

✅ **完了済み:**
- `secretsManager.js` - 新しいシークレット構造に対応
- `serverless.yml` - 機密情報の環境変数を削除
- IAMロール権限 - Secrets Managerへのアクセス権限設定済み

### 3. デプロイ

```bash
# デプロイ（環境変数なしで実行可能）
npm run deploy
```

### 4. 移行後の.envファイル

移行後は`.env`ファイルから機密情報を削除し、`.env.example`の形式に従ってください：

```bash
# .env.exampleをコピー
cp .env.example .env

# 非機密情報のみを設定
vim .env
```

## 🔒 セキュリティ向上点

1. **環境変数の削除** - Lambda関数から機密情報を完全に排除
2. **IAMベースのアクセス制御** - Secrets Managerへのアクセスを厳密に管理
3. **監査証跡** - すべてのシークレットアクセスがCloudTrailに記録
4. **ローテーション対応** - 将来的な自動ローテーションが可能

## 📋 チェックリスト

- [ ] 移行スクリプトの実行
- [ ] AWS Secrets Managerでシークレットの作成確認
- [ ] デプロイの実行
- [ ] アプリケーションの動作確認
- [ ] .envファイルから機密情報の削除

## 🚨 重要な注意事項

1. **既存の.envファイルはバックアップしてください**
2. **移行後は.envから機密情報を必ず削除してください**
3. **本番環境では異なるシークレット名を使用することを推奨**

## 🛠️ トラブルシューティング

### シークレットが見つからない場合
```bash
# シークレットの一覧を確認
aws secretsmanager list-secrets --region us-west-2

# 特定のシークレットを確認
aws secretsmanager get-secret-value \
  --secret-id pfwise-api/google-oauth \
  --region us-west-2
```

### Lambda関数でエラーが発生する場合
- CloudWatch Logsで`pfwise-api/credentials not found`などのエラーを確認
- IAMロールの権限を確認
- リージョンが正しいか確認（us-west-2）