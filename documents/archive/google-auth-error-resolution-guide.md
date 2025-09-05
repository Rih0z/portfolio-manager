# Google認証エラー解決ガイド

## 概要

このドキュメントは、Portfolio Manager（https://portfolio-wise.com/）で発生したGoogle認証エラー「Failed to fetch」を解決するための完全な手順書です。

## エラーの症状

- フロントエンド: `Failed to fetch` エラー
- バックエンド: `{"success": false, "hasDriveAccess": false}` レスポンス
- ブラウザコンソール: CORS関連のエラーまたは502 Bad Gateway

## 根本原因

1. **Lambda依存関係の問題**: モノレポ構造によりnpmパッケージがLambdaに含まれない
2. **認証フローの不一致**: フロントエンド（Authorization Code Flow）とバックエンド（Implicit Flow）の不一致
3. **AWS Secrets Manager依存関係**: AWS SDKモジュールの依存関係エラー

## 確実に動く修正手順

### 1. Lambda依存関係の修正

#### 問題の特定
```bash
# CloudWatchログで以下のエラーを確認
Runtime.ImportModuleError: Error: Cannot find module 'whatwg-url'
Runtime.ImportModuleError: Error: Cannot find module 'uuid'
Runtime.ImportModuleError: Error: Cannot find module 'base64-js'
```

#### 解決方法

**Step 1: 必要なパッケージをインストール**
```bash
cd backend
npm install whatwg-url uuid base64-js --save
```

**Step 2: serverless.ymlの修正**
```yaml
package:
  individually: false
  excludeDevDependencies: true  # falseからtrueに変更
  patterns:
    - '!__tests__/**'
    - '!test-results/**'
    - '!coverage/**'
    # 他の除外パターン...
```

**Step 3: モノレポのworkspace設定を追加**
```json
// backend/package.json
{
  "workspaces": {
    "nohoist": ["**"]
  }
}
```

### 2. 認証フローの修正

#### backend/src/function/auth/basicGoogleLogin.jsの修正

```javascript
// Authorization Code FlowとImplicit Flowの両方に対応
const { credential, code, redirectUri } = requestBody;

// Authorization Code Flowの処理
if (code && !credential) {
  console.log('Authorization Code Flow処理開始');
  
  const clientId = process.env.GOOGLE_CLIENT_ID || 'your-client-id';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'your-secret';
  
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  
  // 認証コードをトークンに交換
  const { tokens } = await client.getToken(code);
  
  // IDトークンを検証
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientId
  });
  
  const payload = ticket.getPayload();
  // 認証成功処理...
}

// Implicit Flowの処理（既存のコード）
if (credential && !code) {
  // 既存の処理...
}
```

### 3. 環境変数の設定

#### デプロイ時の環境変数設定
```bash
# Google Client Secretを環境変数として設定してデプロイ
GOOGLE_CLIENT_SECRET=your-actual-secret npm run deploy:prod
```

#### または、AWS Lambdaコンソールで直接設定
1. AWS Lambda → 該当の関数を選択
2. 設定 → 環境変数
3. `GOOGLE_CLIENT_SECRET` を追加

### 4. CORS設定の確認

#### serverless.ymlでCORS設定を確認
```yaml
functions:
  basicGoogleLogin:
    handler: src/function/auth/basicGoogleLogin.handler
    events:
      - http:
          path: auth/google/login
          method: post
          cors:
            origins:
              - https://portfolio-wise.com
            headers:
              - Content-Type
              - Authorization
              - Cookie
            allowCredentials: true
      - http:
          path: auth/google/login
          method: options
          cors:
            origins:
              - https://portfolio-wise.com
            allowCredentials: true
```

### 5. デプロイコマンド

```bash
# バックエンドのデプロイ
cd backend
npm install
GOOGLE_CLIENT_SECRET=your-actual-secret npm run deploy:prod
```

## トラブルシューティング

### 依存関係エラーが続く場合

1. **node_modulesを完全にクリア**
```bash
rm -rf node_modules
rm -rf ../node_modules  # 親ディレクトリも
npm install
```

2. **手動で依存関係をコピー**
```bash
# 親ディレクトリから必要なモジュールをコピー
cp -r ../node_modules/whatwg-url node_modules/
cp -r ../node_modules/uuid node_modules/
cp -r ../node_modules/base64-js node_modules/
```

### CORS エラーが発生する場合

1. **プリフライトリクエストの確認**
```bash
curl -X OPTIONS https://your-api-url/auth/google/login \
  -H "Origin: https://portfolio-wise.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" -v
```

2. **レスポンスヘッダーを確認**
- `Access-Control-Allow-Origin: https://portfolio-wise.com`
- `Access-Control-Allow-Credentials: true`

### 認証コードエラー（invalid_grant）

1. **Google Cloud Consoleで確認**
   - 承認済みリダイレクトURI: `https://portfolio-wise.com/auth/google/callback`
   - 承認済みJavaScriptオリジン: `https://portfolio-wise.com`
   - OAuth同意画面: 本番モード

2. **ユーザー側の対処**
   - ブラウザのキャッシュとCookieをクリア
   - シークレットウィンドウで試行
   - 別のブラウザで試行

## 確認コマンド集

### Lambda関数の環境変数確認
```bash
aws lambda get-function-configuration \
  --function-name pfwise-api-prod-basicGoogleLogin \
  --region us-west-2 \
  --query 'Environment.Variables'
```

### エンドポイントのテスト
```bash
# CORS プリフライト
curl -X OPTIONS https://your-api-url/auth/google/login \
  -H "Origin: https://portfolio-wise.com" -v

# 認証テスト（ダミーコード）
curl -X POST https://your-api-url/auth/google/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://portfolio-wise.com" \
  -d '{"code": "test", "redirectUri": "https://portfolio-wise.com/auth/google/callback"}'
```

### CloudWatchログの確認
```bash
aws logs tail /aws/lambda/pfwise-api-prod-basicGoogleLogin --follow
```

## 成功の確認方法

1. **CORS プリフライト**: 200 OK レスポンス
2. **POST リクエスト**: 
   - 有効な認証コード: 200 OK with user data
   - 無効な認証コード: 400 with specific error message
3. **CloudWatch**: エラーログなし
4. **ユーザー体験**: スムーズなログインフロー

## 今後の改善点

1. **Secrets Manager統合の復活**
   - モノレポの依存関係管理を改善
   - AWS SDK依存関係を適切に解決

2. **エラーハンドリングの改善**
   - より詳細なエラーメッセージ
   - ユーザーフレンドリーなエラー表示

3. **監視の強化**
   - Lambda関数のエラー率監視
   - 認証成功率のメトリクス

## まとめ

この手順に従うことで、Google認証エラーを確実に解決できます。重要なポイントは：

1. Lambda依存関係の適切な管理
2. 認証フロー（Authorization Code Flow）の正しい実装
3. 環境変数の適切な設定
4. Google Cloud Console側の設定確認

これらすべてが正しく設定されていれば、認証は確実に動作します。