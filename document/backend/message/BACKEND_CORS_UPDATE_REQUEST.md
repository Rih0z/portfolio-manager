# バックエンドCORS設定修正のお願い

## 概要
フロントエンドで`withCredentials: true`を設定したことにより、CORS関連のエラーが発生しています。
Cookie認証を正しく動作させるため、バックエンド側のCORS設定の修正をお願いします。

## 現在の問題

1. **Google Drive API認証** (`/dev/auth/google/drive/initiate`)
   - 401エラーが継続

2. **Google通常ログイン** (`/dev/auth/google/login`)
   - 新たにCORSエラーが発生
   - エラー: "The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*' when credentials mode is 'include'"

## 必要な修正内容

### 1. API Gateway - CORS設定の更新

各エンドポイントのCORS設定を以下のように更新してください：

```yaml
# CORS設定
CorsConfiguration:
  AllowOrigins:
    - "http://localhost:3001"
    - "http://localhost:3000"
    - "https://portfolio-wise.com"
  AllowHeaders:
    - "Content-Type"
    - "X-Amz-Date"
    - "Authorization"
    - "X-Api-Key"
    - "X-Amz-Security-Token"
  AllowMethods:
    - "GET"
    - "POST"
    - "OPTIONS"
  AllowCredentials: true  # 重要: これを追加
  MaxAge: 86400
```

### 2. Lambda関数 - レスポンスヘッダーの修正

すべてのLambda関数で、以下のようにレスポンスヘッダーを設定してください：

```javascript
// 共通のCORSヘッダー設定関数
const getCorsHeaders = (event) => {
  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://portfolio-wise.com'
  ];
  
  // リクエストのオリジンが許可リストに含まれているか確認
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Credentials': 'true', // 文字列として設定
    'Content-Type': 'application/json'
  };
};

// Lambda関数のレスポンス例
exports.handler = async (event) => {
  // OPTIONSリクエストの処理（プリフライト）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...getCorsHeaders(event),
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }
  
  try {
    // 通常の処理
    const result = await processRequest(event);
    
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
```

### 3. 特に重要な修正ポイント

1. **Access-Control-Allow-Originにワイルドカード(*)を使用しない**
   - 具体的なオリジンを指定する必要があります

2. **Access-Control-Allow-Credentialsを必ず設定**
   - すべてのレスポンスに`'true'`（文字列）として設定

3. **OPTIONSメソッドの適切な処理**
   - プリフライトリクエストに正しく応答

## 修正対象のエンドポイント

以下のエンドポイントすべてで上記の修正を適用してください：

- `/auth/google/login` - Google認証
- `/auth/google/drive/initiate` - Google Drive API認証初期化
- `/auth/google/drive/callback` - Google Drive API認証コールバック
- `/auth/session` - セッション確認
- `/auth/logout` - ログアウト
- `/admin/*` - 管理API全般
- `/marketdata/*` - マーケットデータAPI全般

## テスト方法

修正後は以下を確認してください：

1. **ブラウザの開発者ツール**でネットワークタブを開く
2. 各エンドポイントへのリクエストで：
   - OPTIONSリクエストが200を返す
   - レスポンスヘッダーに`Access-Control-Allow-Credentials: true`が含まれる
   - `Access-Control-Allow-Origin`が具体的なオリジンを返す

## 期待される結果

- Cookie認証が正常に動作
- Google認証フローが完了
- セッション管理が適切に機能

## 参考情報

- [MDN: CORS with credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#requests_with_credentials)
- [AWS: Enabling CORS for a REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)

ご対応をよろしくお願いいたします。