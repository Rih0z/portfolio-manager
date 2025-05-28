# バックエンドCORS設定 - 現状報告と追加修正依頼

## 現在の状況

### ✅ 動作している部分
- `/auth/google/login` エンドポイント: 正常に200 OKを返す
- ユーザー情報の取得: 成功

### ❌ 問題が継続している部分
- `/auth/google/drive/initiate` エンドポイント: Network Error（CORSエラー）

## クライアント側の実装状況

### 1. Cookie送信設定 ✅
```javascript
// apiUtils.js
const client = axios.create({
  withCredentials: true, // 実装済み
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
```

### 2. 認証フロー ✅
- Googleログイン → 成功（200 OK）
- セッションCookie受信 → 確認済み
- Drive API呼び出し → CORSエラーで失敗

## 詳細なエラー情報

```
エラー発生箇所: GET /auth/google/drive/initiate
エラータイプ: Network Error (CORS)
```

## 緊急修正依頼

### 1. Lambda関数の確認
`/auth/google/drive/initiate` のLambda関数で以下を確認してください：

```javascript
// ① メソッドチェックを最初に実行
if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS for /auth/google/drive/initiate');
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

// ② GETリクエストの処理
if (event.httpMethod === 'GET') {
    console.log('Handling GET for /auth/google/drive/initiate');
    // 処理...
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(responseData)
    };
}
```

### 2. API Gateway設定の確認

API Gatewayの統合レスポンスで、Lambda関数のレスポンスヘッダーが上書きされていないか確認してください。

### 3. デバッグログの追加

Lambda関数に以下のログを追加して、実際にリクエストが到達しているか確認：

```javascript
exports.handler = async (event) => {
    console.log('=== Drive Auth Request ===');
    console.log('Method:', event.httpMethod);
    console.log('Path:', event.path);
    console.log('Headers:', JSON.stringify(event.headers));
    console.log('Origin:', event.headers.origin || event.headers.Origin);
    
    // 処理...
};
```

## 比較：動作しているエンドポイント

`/auth/google/login` は正常に動作しているので、そのLambda関数の設定と比較してください：
- CORS設定が同じか？
- API Gatewayの設定が同じか？
- レスポンスヘッダーの形式が同じか？

## テスト用curlコマンド

```bash
# OPTIONSリクエスト（プリフライト）
curl -X OPTIONS https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# GETリクエスト
curl -X GET https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate \
  -H "Origin: http://localhost:3001" \
  -H "Cookie: sessionId=xxx" \
  -v
```

## 期待される結果

両方のリクエストで以下のヘッダーが返されること：
- `Access-Control-Allow-Origin: http://localhost:3001`
- `Access-Control-Allow-Credentials: true`

よろしくお願いいたします。