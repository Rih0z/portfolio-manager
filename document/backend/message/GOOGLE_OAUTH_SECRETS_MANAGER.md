# Google OAuth認証情報のSecrets Manager移行手順

## 概要
Google OAuth認証情報（Client ID/Secret）をAWS Secrets Managerで安全に管理する設定です。

## 現在の実装状況

### ✅ 既に実装済み
1. **コードベース**: `src/utils/secretsManager.js` で `pfwise-api/google-oauth` からクレデンシャルを取得する実装済み
2. **Lambda IAM権限**: `serverless.yml` でSecrets Managerへのアクセス権限設定済み
3. **環境変数削除**: `serverless.yml` から `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を削除済み

### 🔧 必要な作業

#### 1. AWS Secrets Managerにシークレットを作成

専用のスクリプトを用意しました：

```bash
# 環境変数を読み込み
export $(cat .env | grep -v '^#' | xargs)

# スクリプトを実行
./scripts/setup-google-oauth-secret.sh
```

または手動で作成：

```bash
# シークレットの作成
aws secretsmanager create-secret \
  --name pfwise-api/google-oauth \
  --description "Google OAuth credentials for Portfolio Manager API" \
  --secret-string '{
    "clientId": "YOUR_GOOGLE_CLIENT_ID",
    "clientSecret": "YOUR_GOOGLE_CLIENT_SECRET"
  }' \
  --region us-west-2
```

#### 2. デプロイ

```bash
npm run deploy
```

## セキュリティ上の利点

1. **環境変数の削除**: Lambda環境変数から機密情報を除去
2. **アクセス制御**: IAMロールベースの厳密なアクセス管理
3. **監査証跡**: Secrets Managerへのアクセスログ
4. **ローテーション**: 将来的にシークレットの自動ローテーション可能

## 動作確認

1. Secrets Managerにシークレットが作成されたことを確認：
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id pfwise-api/google-oauth \
     --region us-west-2
   ```

2. Lambda関数のログで認証情報の取得を確認：
   - CloudWatch Logsで「Drive OAuth configuration」を検索
   - `hasClientId: true` が表示されることを確認

## トラブルシューティング

### エラー: "AccessDeniedException"
- Lambda実行ロールにSecrets Managerへのアクセス権限があることを確認
- `serverless.yml` の `iamRoleStatements` を確認

### エラー: "ResourceNotFoundException"
- シークレット名が正しいことを確認: `pfwise-api/google-oauth`
- 正しいリージョンを指定していることを確認

### エラー: "Missing required parameter: client_id"
- Secrets Managerのシークレットが正しいJSON形式であることを確認
- キー名が `clientId` と `clientSecret` であることを確認