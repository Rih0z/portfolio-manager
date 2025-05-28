# 認証トークンがレスポンスに含まれていない問題

## 問題の概要
Google OAuth認証は成功していますが、バックエンドAPIが認証トークン（JWT）を返していないため、認証後のAPI呼び出しができません。

## 現在の状況

### フロントエンドのログ
```
認証レスポンス: {success: true, user: {...}}
トークンがレスポンスに含まれていません
利用可能なレスポンスキー: ['success', 'user']
```

### フロントエンドの実装
フロントエンドは以下の全ての可能な場所でトークンを探しています：
```javascript
const token = response.token || 
             response.accessToken || 
             response.access_token ||
             response.authToken ||
             response.auth_token ||
             response.jwt ||
             response.jwtToken ||
             response.data?.token || 
             response.data?.accessToken ||
             response.data?.access_token ||
             response.data?.authToken ||
             response.data?.auth_token ||
             response.data?.jwt ||
             response.data?.jwtToken;
```

## 必要な修正

### `/auth/google/login` エンドポイントの修正
現在のレスポンス:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "name": "..."
  }
}
```

期待されるレスポンス:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // JWT token
  "user": {
    "id": "...",
    "email": "...",
    "name": "..."
  }
}
```

## 推奨される実装

```javascript
// Lambda関数内で
const jwt = require('jsonwebtoken');

// 認証成功後
const token = jwt.sign(
  { 
    userId: user.id, 
    email: user.email,
    // その他必要な情報
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' } // 7日間有効
);

return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://portfolio-manager-app.netlify.app',
    'Access-Control-Allow-Credentials': 'true'
  },
  body: JSON.stringify({
    success: true,
    token: token, // ← これが必要
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  })
};
```

## セッション管理方式の選択

現在、以下の2つの認証方式が混在している可能性があります：

1. **Cookie-based session** (セッションCookie)
2. **JWT token-based** (Authorizationヘッダー)

どちらか一方に統一することを推奨します：

### Option 1: Cookie-based (現在部分的に実装されている)
- セッションIDをHTTP-only Cookieで管理
- CSRF対策が必要
- サーバー側でセッション状態を管理

### Option 2: JWT token-based (フロントエンドが期待している)
- JWTトークンをレスポンスで返す
- フロントエンドでトークンを管理
- 各リクエストでAuthorizationヘッダーに含める
- ステートレスな実装

## テスト方法

1. `/auth/google/login` エンドポイントの修正後
2. フロントエンドでログインを実行
3. ブラウザのコンソールで以下を確認：
   - "認証トークンを保存します:" のログが表示される
   - その後のAPI呼び出しでAuthorizationヘッダーが送信される

## 影響範囲

この修正により以下が改善されます：
- 認証後のAPI呼び出しが正常に動作
- Google Drive連携が正常に動作
- セッション管理が適切に機能

よろしくお願いいたします。