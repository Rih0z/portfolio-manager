# バックエンド認証セッション修正依頼

## 良いニュース！ 🎉
CORS設定の修正ありがとうございました！Network Errorは解消されました。

## 現在の状況
- **CORS**: ✅ 解決済み（リクエストが到達するようになりました）
- **新しい問題**: 401 Unauthorized エラー

## エラーの詳細

### リクエストフロー
1. `/auth/google/login` → ✅ 200 OK（成功）
2. `/auth/google/drive/initiate` → ❌ 401 Unauthorized

### ログ出力
```
Google認証成功: Object
トークンがレスポンスに含まれていません
Drive API initiate endpoint: https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate
API Request: GET https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate
Auth API error: Request failed with status code 401
```

## 問題の原因分析

### 1. セッションCookieが正しく処理されていない可能性

クライアント側は`withCredentials: true`でCookieを送信していますが、サーバー側でセッションの検証に失敗している可能性があります。

### 2. 確認していただきたい点

#### `/auth/google/drive/initiate` エンドポイントのLambda関数で：

1. **セッション検証ロジックの確認**
```javascript
// セッションIDの取得方法を確認
const sessionId = event.headers.Cookie?.match(/sessionId=([^;]+)/)?.[1];
console.log('Received sessionId:', sessionId);

// DynamoDBからセッション情報を取得
const session = await getSessionFromDynamoDB(sessionId);
console.log('Session found:', !!session);
console.log('Session data:', session);
```

2. **Cookieパースの問題**
```javascript
// Cookieヘッダーの内容を確認
console.log('Cookie header:', event.headers.Cookie);
console.log('All headers:', JSON.stringify(event.headers));
```

3. **セッションの有効期限**
- `/auth/google/login`で作成したセッションがまだ有効か？
- TTLが短すぎないか？

## 推奨される修正

### 1. デバッグログの追加
```javascript
exports.handler = async (event) => {
    console.log('=== Drive Initiate Request ===');
    console.log('Headers:', JSON.stringify(event.headers));
    console.log('Cookie:', event.headers.Cookie || event.headers.cookie);
    
    // セッションIDの抽出
    const cookieHeader = event.headers.Cookie || event.headers.cookie || '';
    const sessionId = cookieHeader.match(/sessionId=([^;]+)/)?.[1];
    
    console.log('Extracted sessionId:', sessionId);
    
    if (!sessionId) {
        console.log('No session ID found in cookies');
        return {
            statusCode: 401,
            headers: getCorsHeaders(event),
            body: JSON.stringify({ error: 'No session found' })
        };
    }
    
    // セッション検証
    try {
        const session = await validateSession(sessionId);
        console.log('Session validation result:', session);
        
        if (!session) {
            return {
                statusCode: 401,
                headers: getCorsHeaders(event),
                body: JSON.stringify({ error: 'Invalid session' })
            };
        }
        
        // 正常な処理を続行...
    } catch (error) {
        console.error('Session validation error:', error);
        // エラー処理...
    }
};
```

### 2. セッション作成時の確認（`/auth/google/login`）
```javascript
// セッション作成時にログを追加
console.log('Creating session for user:', user.id);
console.log('Session ID:', sessionId);
console.log('Session expires at:', expiresAt);
```

## テスト手順

1. ブラウザでGoogle認証を実行
2. CloudWatch Logsで以下を確認：
   - `/auth/google/login`でセッションが作成されているか
   - `/auth/google/drive/initiate`でセッションIDが受信されているか
   - DynamoDBからセッション情報が取得できているか

## 参考情報

- クライアントは正しくCookieを送信しています（`withCredentials: true`）
- `/auth/google/login`は正常に動作しているので、セッション作成は成功しています
- 問題は`/auth/google/drive/initiate`でのセッション検証にあると思われます

よろしくお願いいたします。