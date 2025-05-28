# Google OAuth Redirect URIのSecrets Manager管理

## 実装完了

Google OAuth Redirect URIをAWS Secrets Managerで管理するように変更しました。これにより、URLがGitHubやユーザーに公開されることを防ぎます。

## 変更内容

### 1. Secrets Manager構造の更新
`pfwise-api/google-oauth`シークレットに`redirectUri`を追加：
```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "redirectUri": "https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback"
}
```

### 2. コードの更新
- `secretsManager.js`: `googleRedirectUri`プロパティを追加
- `googleDriveAuth.js`: Secrets Managerから`redirectUri`を取得
- `serverless.yml`: 環境変数`GOOGLE_REDIRECT_URI`を削除

### 3. ログの安全性
- URLが表示される箇所では`[REDACTED]`でマスク
- デバッグ情報でもURLの詳細は非表示

## Secrets Managerへの登録方法

### 方法1: 更新スクリプトを使用
```bash
# 環境変数をエクスポート
export $(cat .env | grep -v '^#' | xargs)

# スクリプト実行
./scripts/setup-all-secrets.sh
```

### 方法2: AWS CLIで直接更新
```bash
# 既存のシークレットを取得
aws secretsmanager get-secret-value \
  --secret-id pfwise-api/google-oauth \
  --region us-west-2 \
  --query SecretString \
  --output text > temp-secret.json

# redirectUriを追加
jq '. + {"redirectUri": "https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback"}' temp-secret.json > updated-secret.json

# シークレットを更新
aws secretsmanager update-secret \
  --secret-id pfwise-api/google-oauth \
  --secret-string file://updated-secret.json \
  --region us-west-2

# 一時ファイルを削除
rm temp-secret.json updated-secret.json
```

## .envファイルの更新

`.env`ファイルから`GOOGLE_REDIRECT_URI`を削除または以下のように変更：
```bash
# Google OAuth (Secrets Managerで管理)
# GOOGLE_CLIENT_ID=managed-by-secrets-manager
# GOOGLE_CLIENT_SECRET=managed-by-secrets-manager  
# GOOGLE_REDIRECT_URI=managed-by-secrets-manager
```

## セキュリティ上の利点

1. **URLの秘匿化**: API GatewayのエンドポイントURLが公開されない
2. **集中管理**: すべてのGoogle OAuth設定が一箇所で管理される
3. **監査証跡**: Secrets Managerアクセスがログに記録される
4. **ローテーション**: 必要に応じてURLを簡単に変更可能

## 動作確認

1. Secrets Managerにシークレットを登録
2. `npm run deploy`でデプロイ
3. CloudWatch Logsで確認：
   - "Using redirect URI from: Secrets Manager"
   - URLは`[REDACTED]`でマスクされている

これでGoogle OAuth Redirect URIが安全に管理されるようになりました。