# バックエンド /auth/session CORS設定修正依頼

## 問題
`/auth/session`エンドポイントでCORSエラーが発生し、セッション確認ができません。
これにより、ページ遷移時にユーザーがログアウトされてしまいます。

## エラー詳細
```
A cross-origin resource sharing (CORS) request was blocked because of invalid or missing response headers
```

## 修正が必要な箇所

### 1. /auth/session Lambda関数

```javascript
// 現在の実装（推測）
exports.handler = async (event) => {
  // セッション確認処理...
  
  return {
    statusCode: 200,
    body: JSON.stringify(sessionData)
  };
};

// 修正後
exports.handler = async (event) => {
  // CORSヘッダーを返す関数
  const getCorsHeaders = (event) => {
    const origin = event.headers.origin || event.headers.Origin || 'http://localhost:3001';
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json'
    };
  };
  
  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(event),
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: ''
    };
  }
  
  // セッション確認処理...
  
  return {
    statusCode: 200,
    headers: getCorsHeaders(event), // ← 重要：CORSヘッダーを必ず含める
    body: JSON.stringify(sessionData)
  };
};
```

### 2. 他のエンドポイントも確認

以下のエンドポイントでも同様のCORSヘッダーが設定されているか確認してください：
- `/auth/logout`
- `/marketdata/*`
- `/admin/*`

### 3. API Gateway設定

もしAPI GatewayでCORS設定をしている場合、Lambda関数のヘッダーと競合しないよう注意してください。

## テスト方法

```bash
# CORSヘッダーの確認
curl -X GET https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/session \
  -H "Origin: http://localhost:3001" \
  -H "Cookie: sessionId=xxx" \
  -v

# レスポンスヘッダーに以下が含まれることを確認
# Access-Control-Allow-Origin: http://localhost:3001
# Access-Control-Allow-Credentials: true
```

## 重要性

このCORSエラーが原因で：
1. セッション確認ができない
2. ユーザーが頻繁にログアウトされる
3. アプリケーションが正常に動作しない

早急な修正をお願いします。