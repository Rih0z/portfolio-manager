# CORS withCredentials 設定修正ガイド

## 問題の概要

`withCredentials: true`を設定後、Google認証エンドポイントでCORSエラーが発生している問題の修正方法です。

## 修正が必要な箇所

### 1. API Gateway CORS設定

各エンドポイントのCORS設定を以下のように更新してください：

```json
{
  "Access-Control-Allow-Origin": "$request.header.Origin",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
}
```

**重要**: `Access-Control-Allow-Origin`にワイルドカード(`*`)は使用できません。

### 2. Lambda関数のレスポンスヘッダー

すべてのLambda関数で以下のヘッダーを返すように修正：

```javascript
// Lambda関数のレスポンス例
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': event.headers.origin || 'http://localhost:3001',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(responseData)
};
```

### 3. 環境別のオリジン管理

```javascript
// Lambda関数での環境別オリジン管理
const getAllowedOrigins = (stage) => {
  const origins = {
    dev: ['http://localhost:3001', 'http://localhost:3000'],
    prod: ['https://portfolio-wise.com', 'https://www.portfolio-wise.com']
  };
  return origins[stage] || origins.dev;
};

const isOriginAllowed = (origin, stage) => {
  const allowedOrigins = getAllowedOrigins(stage);
  return allowedOrigins.includes(origin);
};

// レスポンスヘッダーの設定
const origin = event.headers.origin || event.headers.Origin;
if (isOriginAllowed(origin, process.env.STAGE)) {
  headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Allow-Credentials'] = 'true';
}
```

### 4. OPTIONSメソッドの処理

プリフライトリクエストを適切に処理：

```javascript
// Lambda関数の最初に追加
if (event.httpMethod === 'OPTIONS') {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': event.headers.origin || 'http://localhost:3001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  };
}
```

## クライアント側の修正（完了済み）

apiUtils.jsでの修正は完了しています：
- `withCredentials: true`の設定
- デフォルトヘッダーの設定

## テスト方法

1. ブラウザの開発者ツールでネットワークタブを開く
2. Google認証を実行
3. 以下を確認：
   - OPTIONSリクエストが200を返すこと
   - レスポンスヘッダーに`Access-Control-Allow-Credentials: true`が含まれること
   - `Access-Control-Allow-Origin`が具体的なオリジンを返すこと

## トラブルシューティング

### エラーが続く場合

1. CloudWatch Logsで詳細なエラーを確認
2. API Gatewayのテスト機能でヘッダーを確認
3. ブラウザのコンソールでCORSエラーの詳細を確認

### よくある問題

- **問題**: "The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'"
  - **解決**: Lambda関数で具体的なオリジンを返すように修正

- **問題**: "CORS policy: No 'Access-Control-Allow-Credentials' header is present"
  - **解決**: すべてのレスポンスに`Access-Control-Allow-Credentials: true`を追加

## 参考情報

- [MDN: CORS and credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#requests_with_credentials)
- [AWS API Gateway CORS設定](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)