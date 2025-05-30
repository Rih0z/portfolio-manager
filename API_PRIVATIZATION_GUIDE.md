# API非公開化ガイド

## 概要
公開APIを非公開化し、Cloudflare Pages Function経由でのみアクセス可能にする設定です。

## 実装内容

### 1. Cloudflare Pages Function
`frontend/webapp/functions/api-proxy.js`
- フロントエンドからのAPIリクエストをプロキシ
- セキュリティヘッダー`X-API-Secret`を自動付与
- `/api-proxy/*`へのリクエストをバックエンドAPIに転送

### 2. バックエンドミドルウェア
`backend/src/middleware/apiSecretValidation.js`
- `X-API-Secret`ヘッダーの検証
- 直接アクセスを403で拒否
- Google認証関連のパスは除外（OAuth用）

### 3. フロントエンドの変更
`src/services/configService.js`
- プロダクション環境では`/api-proxy`経由でアクセス
- 開発環境では従来通り直接アクセス

## セットアップ手順

### Cloudflare Pages側の設定

1. Cloudflare Dashboardにログイン
2. Pages > 該当プロジェクト > Settings > Environment variables
3. 以下の環境変数を追加：
   ```
   API_SECRET = your-secure-random-string-here
   REACT_APP_API_BASE_URL = https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
   ```

### AWS側の設定

1. AWS Lambdaコンソールにログイン
2. 該当のLambda関数を選択
3. Configuration > Environment variables
4. 以下を追加：
   ```
   API_SECRET = (Cloudflareと同じ値)
   ```

### API Secretの生成方法
```bash
# ランダムな32文字の文字列を生成
openssl rand -base64 32
```

## 動作確認

### 1. 直接アクセスの確認（403エラーになるはず）
```bash
curl https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod/config/client
# Expected: {"error":"Forbidden","message":"Direct API access is not allowed"}
```

### 2. プロキシ経由のアクセス（正常動作するはず）
```bash
curl https://portfolio-manager-7bx.pages.dev/api-proxy/config/client
# Expected: 正常なレスポンス
```

## 今後の改善案

### 1. IP制限の追加
AWSのAPI Gatewayリソースポリシーで、CloudflareのIPアドレスのみ許可：
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "execute-api:Invoke",
    "Resource": "*",
    "Condition": {
      "IpAddress": {
        "aws:SourceIp": [
          "173.245.48.0/20",
          "103.21.244.0/22",
          "103.22.200.0/22",
          "103.31.4.0/22",
          "141.101.64.0/18",
          "108.162.192.0/18",
          "190.93.240.0/20",
          "188.114.96.0/20",
          "197.234.240.0/22",
          "198.41.128.0/17",
          "162.158.0.0/15",
          "104.16.0.0/13",
          "104.24.0.0/14",
          "172.64.0.0/13",
          "131.0.72.0/22"
        ]
      }
    }
  }]
}
```

### 2. JWT認証の実装
現在のセッションベース認証に加えて、JWT認証を実装することで、より安全な認証が可能。

### 3. WAFの設定
AWS WAFでレート制限やBot対策を実装。

## トラブルシューティング

### 「Direct API access is not allowed」エラーが出る場合
1. `API_SECRET`が両側で一致しているか確認
2. Cloudflare Pages Functionが正しくデプロイされているか確認
3. フロントエンドがプロキシURLを使用しているか確認

### CORSエラーが出る場合
1. バックエンドのCORS設定にCloudflare PagesのURLが含まれているか確認
2. プロキシ関数のレスポンスヘッダー設定を確認

### 認証が動作しない場合
Google OAuth関連のパスは直接アクセスが必要なため、`SKIP_VALIDATION_PATHS`に含まれているか確認。