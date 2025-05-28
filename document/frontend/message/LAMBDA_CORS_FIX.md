# Lambda関数CORS設定修正依頼（緊急）

## 問題の詳細

### 1. 現在の状況
- **OPTIONS**リクエストは処理されている（ログで確認）
- しかし、実際の**GET**リクエストが到達していない
- フロントエンドでは`Network Error`が発生

### 2. AWSログの分析
```
2025-05-27T19:47:45.569Z INFO Handling OPTIONS request for Drive Auth
```
- OPTIONSリクエストの処理は確認できる
- しかし、その後のGETリクエストのログがない
- これはOPTIONSレスポンスのCORSヘッダーが不適切な可能性が高い

## 必要な修正

### 1. OPTIONSレスポンスの修正
現在のOPTIONSレスポンスに以下のヘッダーが**すべて**含まれているか確認してください：

```javascript
// Lambda関数内のOPTIONSレスポンス
if (event.httpMethod === 'OPTIONS') {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
        },
        body: ''
    };
}
```

### 2. GETリクエストのレスポンスヘッダー
GETリクエストのレスポンスにも同じCORSヘッダーを含める必要があります：

```javascript
// GETリクエストの処理
return {
    statusCode: 200,
    headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3001',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(responseData)
};
```

### 3. API Gatewayの設定確認
API GatewayでCORS設定が二重に適用されていないか確認してください。Lambda関数でCORSを処理する場合、API GatewayのCORS設定は無効にする必要があります。

## 追加の確認事項

1. **Cookie認証の確認**
   - `/auth/google/login`では正常に動作しているので、同じCookie処理ロジックを使用してください

2. **エラーハンドリング**
   - Lambda関数内でエラーが発生していないか確認
   - try-catchブロックでエラーをログ出力

## デバッグ用のログ追加
以下のようなログを追加して、リクエストの詳細を確認してください：

```javascript
exports.handler = async (event) => {
    console.log('Request Method:', event.httpMethod);
    console.log('Request Headers:', JSON.stringify(event.headers));
    console.log('Request Path:', event.path);
    
    // 処理...
};
```

## 参考情報
- フロントエンドは`withCredentials: true`でリクエストを送信
- Cookie認証を使用しているため、`Access-Control-Allow-Credentials: true`は必須
- `/auth/google/login`エンドポイントは正常に動作中

よろしくお願いいたします。