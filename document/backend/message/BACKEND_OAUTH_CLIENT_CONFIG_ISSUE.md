# Google OAuth設定の問題 - 2つの異なるアプリへの認証要求

## 問題の詳細

ユーザーが2回ログインを要求される際、それぞれ異なるアプリへの認証を求められています：

1. **1回目**: 「Portfolio Manager」への認証
2. **2回目**: 「x4scpbsuv2.execute-api.us-west-2.amazonaws.com」への認証

## 原因

フロントエンドとバックエンドで**異なるGoogle OAuth クライアントID**を使用している可能性があります。

### 現在の状況（推測）
- フロントエンド: クライアントID A を使用（Portfolio Manager として登録）
- バックエンド: クライアントID B を使用（AWS API として登録）

## 解決方法

### 1. 統一されたOAuthクライアントIDの使用（推奨）

すべての認証で同じGoogle OAuth クライアントIDを使用する必要があります。

**Google Cloud Consoleでの設定:**
1. 1つのOAuth 2.0 クライアントIDを使用
2. アプリケーション名: 「Portfolio Manager」
3. 承認済みリダイレクトURI:
   ```
   http://localhost:3001/auth/google/callback
   https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/callback
   https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
   ```

### 2. バックエンドの修正

```javascript
// 環境変数の確認
// フロントエンドと同じGOOGLE_CLIENT_IDを使用すること
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // 統一されたクライアントID

// OAuth設定
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID, // フロントエンドと同じID
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);
```

### 3. 環境変数の確認

**フロントエンド (.env)**:
```
REACT_APP_GOOGLE_CLIENT_ID=xxx-yyy.apps.googleusercontent.com
```

**バックエンド (serverless.yml または .env)**:
```
GOOGLE_CLIENT_ID=xxx-yyy.apps.googleusercontent.com  # 同じIDを使用
GOOGLE_CLIENT_SECRET=your-client-secret
```

## 即座に確認すべき点

1. **フロントエンドのクライアントID**:
   - `src/context/AuthContext.js` で使用されているID
   - 環境変数 `REACT_APP_GOOGLE_CLIENT_ID`

2. **バックエンドのクライアントID**:
   - Lambda関数で使用されているID
   - 環境変数 `GOOGLE_CLIENT_ID`

3. **両者が同じIDを使用しているか確認**

## テスト手順

1. 両方の環境で同じクライアントIDが使用されていることを確認
2. Google Cloud Consoleで、そのクライアントIDに必要なすべてのリダイレクトURIが登録されていることを確認
3. ブラウザのキャッシュとCookieをクリア
4. 再度ログインを試行

## 期待される結果

- ユーザーは1回だけ「Portfolio Manager」への認証を求められる
- Drive連携時も追加の認証は不要（同じアプリ内での権限追加として扱われる）

よろしくお願いいたします。