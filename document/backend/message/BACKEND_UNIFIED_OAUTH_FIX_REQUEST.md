# 【緊急】Google OAuth クライアントID統一の修正依頼

## 修正が必要な理由

現在、ユーザーが2回異なるアプリへの認証を要求される問題が発生しています：
- 1回目：「Portfolio Manager」（フロントエンドのクライアントID）
- 2回目：「x4scpbsuv2.execute-api.us-west-2.amazonaws.com」（バックエンドのクライアントID）

これはユーザー体験を著しく損なうため、早急な修正が必要です。

## 修正内容

### 1. 環境変数の確認と統一

**フロントエンドで使用しているクライアントID**を確認してください：
```bash
# フロントエンドの.envファイルを確認
REACT_APP_GOOGLE_CLIENT_ID=xxx-yyy.apps.googleusercontent.com
```

**このIDをバックエンドでも使用するように変更**してください。

### 2. Lambda関数の環境変数を更新

以下のLambda関数の環境変数を更新：
- `portfolio-manager-dev-googleLogin`
- `portfolio-manager-dev-googleDriveInitiate`
- `portfolio-manager-dev-googleDriveCallback`

```yaml
# serverless.yml
provider:
  environment:
    GOOGLE_CLIENT_ID: ${env:GOOGLE_CLIENT_ID}  # フロントエンドと同じIDを設定
    GOOGLE_CLIENT_SECRET: ${env:GOOGLE_CLIENT_SECRET}  # 対応するシークレット
```

### 3. コードの修正箇所

各Lambda関数で、OAuth2クライアントの初期化部分を確認：

```javascript
// 修正前（異なるクライアントIDを使用している可能性）
const oauth2Client = new google.auth.OAuth2(
  process.env.BACKEND_GOOGLE_CLIENT_ID,  // ← これが問題
  process.env.BACKEND_GOOGLE_CLIENT_SECRET,
  redirectUri
);

// 修正後（統一されたクライアントIDを使用）
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,  // フロントエンドと同じID
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);
```

### 4. Google Cloud Console での確認

統一するクライアントIDが以下の設定を持っていることを確認：

**承認済みのJavaScript生成元**:
```
http://localhost:3000
http://localhost:3001
https://portfolio-wise.com
```

**承認済みのリダイレクトURI**:
```
http://localhost:3001/auth/google/callback
https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/callback
https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
```

### 5. 設定の流れ

1. **開発環境の.envファイル**を更新：
   ```bash
   GOOGLE_CLIENT_ID=フロントエンドと同じID
   GOOGLE_CLIENT_SECRET=対応するシークレット
   ```

2. **AWS Lambda環境変数**を更新：
   - AWS コンソール → Lambda → 各関数 → 設定 → 環境変数
   - または `serverless deploy` で一括更新

3. **デプロイ**：
   ```bash
   serverless deploy --stage dev
   ```

## 確認方法

修正後、以下を確認してください：

1. CloudWatch Logsで使用されているクライアントIDを確認
2. ブラウザの開発者ツールで、認証画面のURLパラメータを確認
3. `client_id`がフロントエンドと同じであることを確認

## テスト手順

1. ブラウザのキャッシュとCookieを完全にクリア
2. アプリケーションにアクセス
3. Googleログインを実行
4. **1回の認証**で「Portfolio Manager」へのアクセスのみが要求されることを確認
5. Drive連携時も追加の認証画面が表示されないことを確認

## 期待される結果

- ユーザーは「Portfolio Manager」への認証を1回だけ行う
- Drive連携は同じ認証セッション内で権限追加として処理される
- 「x4scpbsuv2.execute-api...」への個別認証は表示されない

## 注意事項

- クライアントIDを変更する際は、対応するクライアントシークレットも更新すること
- 本番環境への適用前に、開発環境で十分にテストすること
- 既存のユーザーセッションには影響しない（新規ログインから適用）

よろしくお願いいたします。