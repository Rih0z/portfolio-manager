# 認証エラー（401）の解決方法

## 認証方式について

当システムは**セッションベース認証（Cookie）**を使用しています。
- JWTトークンではなく、HTTPOnly Cookieによるセッション管理
- セッションIDはサーバー側で安全に管理されています

## 現在の実装状況

`/auth/google/login` エンドポイントは正常に動作しており、以下のレスポンスを返しています：

```json
{
  "success": true,
  "isAuthenticated": true,
  "user": {
    "id": "109476395873295845628",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://lh3.googleusercontent.com/..."
  },
  "requiresOAuth": false
}
```

同時に、レスポンスヘッダーで `Set-Cookie` によりセッションCookieも設定されています。

## 401エラーの原因と解決方法

### 問題の原因
クライアント側でCookieの送受信設定が不足していることが原因です。

### 必要な修正

#### 1. axios使用時
```javascript
// ログイン時
const loginResponse = await axios.post(
  'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login',
  {
    credential: credentialResponse.credential
  },
  {
    withCredentials: true // ⚠️ 必須：Cookieを受信するため
  }
);

// Drive API呼び出し時
const driveResponse = await axios.get(
  'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate',
  {
    withCredentials: true // ⚠️ 必須：Cookieを送信するため
  }
);
```

#### 2. fetch API使用時
```javascript
// ログイン時
const loginResponse = await fetch(
  'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credential: credentialResponse.credential
    }),
    credentials: 'include' // ⚠️ 必須：Cookieを送受信するため
  }
);
```

## 確認事項

### 1. ブラウザのDevToolsで確認

**Network タブ**：
- ログインレスポンスに `Set-Cookie` ヘッダーが含まれているか
- Drive API リクエストに `Cookie` ヘッダーが含まれているか

**Application/Storage タブ**：
- `sessionId` という名前のCookieが保存されているか

### 2. CORS設定

現在の許可オリジン：
- `http://localhost:3000`
- `http://localhost:3001`
- `https://portfolio-wise.com`

※ クライアントのオリジンが上記以外の場合は追加設定が必要です

## Google One Tap使用時の注意

レスポンスに `"requiresOAuth": true` が含まれる場合：
- Google One TapではDrive APIのアクセストークンが取得できません
- Drive API使用前に `/auth/google/drive/initiate` で追加のOAuth認証が必要です

## テスト方法

### cURLでのテスト
```bash
# 1. ログイン（Cookieを保存）
curl -X POST https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -d '{"credential": "test_credential"}' \
  -c cookies.txt \
  -v

# 2. セッション確認
curl -X GET https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/session \
  -H "Origin: http://localhost:3001" \
  -b cookies.txt \
  -v

# 3. Drive API呼び出し
curl -X GET https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate \
  -H "Origin: http://localhost:3001" \
  -b cookies.txt \
  -v
```

## まとめ

- ✅ サーバー側は正しくユーザー情報とCookieを返しています
- ⚠️ クライアント側で `withCredentials: true` または `credentials: 'include'` の設定が必要です
- 📝 すべてのAPI呼び出しでこの設定を忘れずに追加してください

この設定により、401エラーは解消されるはずです。