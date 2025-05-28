# バックエンド500エラー修正依頼

## 良い進捗！ 🎉
- ✅ CORSエラー: 解決済み
- ✅ 401認証エラー: 解決済み
- ❌ 新しい問題: 500 Internal Server Error

## 現在の状況

### エラーが発生しているエンドポイント
- `GET /auth/google/drive/initiate` → 500エラー

### リクエストの流れ
1. `/auth/google/login` → ✅ 200 OK（正常に動作）
2. セッションCookieが正しく送信されている
3. `/auth/google/drive/initiate` → ❌ 500エラー

## エラーの詳細

```
Request failed with status code 500
エンドポイント: https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/initiate
```

## 推測される原因

500エラーは通常、Lambda関数内でのエラーを示します。以下の可能性があります：

1. **環境変数の未設定**
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `REDIRECT_URI`

2. **コードのエラー**
   - 未定義の変数へのアクセス
   - 必要なモジュールのインポート漏れ
   - 非同期処理のエラー

3. **権限の問題**
   - Lambda実行ロールの権限不足
   - DynamoDBへのアクセス権限

## 調査方法

### 1. CloudWatch Logsの確認
```bash
# CloudWatch Logsで以下を確認
/aws/lambda/portfolio-manager-dev-googleDriveInitiate
```

エラーメッセージ、スタックトレース、console.logの出力を確認してください。

### 2. Lambda関数にデバッグログを追加

```javascript
exports.handler = async (event) => {
    console.log('=== Google Drive Initiate Handler ===');
    
    try {
        // 環境変数の確認
        console.log('Environment check:', {
            hasClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            hasRedirectUri: !!process.env.REDIRECT_URI,
            stage: process.env.STAGE
        });
        
        // リクエスト情報
        console.log('Request info:', {
            headers: event.headers,
            httpMethod: event.httpMethod,
            path: event.path
        });
        
        // セッションの確認
        const cookieHeader = event.headers.Cookie || event.headers.cookie || '';
        console.log('Cookie header:', cookieHeader);
        
        // ここで実際の処理...
        
    } catch (error) {
        console.error('Handler error:', error);
        console.error('Error stack:', error.stack);
        
        // エラーレスポンスを返す前にログ出力
        return {
            statusCode: 500,
            headers: getCorsHeaders(event),
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message // 開発環境のみ
            })
        };
    }
};
```

### 3. よくある500エラーの原因と解決方法

#### 環境変数が未設定の場合
```javascript
// 環境変数のデフォルト値を設定
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
}
```

#### getCorsHeaders関数が未定義の場合
```javascript
// CORS���ッダー関数を追加
const getCorsHeaders = (event) => {
    const origin = event.headers.origin || event.headers.Origin || 'http://localhost:3001';
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    };
};
```

## 緊急対応

Lambda関数のコードを確認し、以下の最小構成で動作するか確認してください：

```javascript
const getCorsHeaders = (event) => {
    const origin = event.headers.origin || event.headers.Origin || 'http://localhost:3001';
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
    };
};

exports.handler = async (event) => {
    console.log('Handler called with event:', JSON.stringify(event));
    
    try {
        // テスト用の最小レスポンス
        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
            'client_id=YOUR_CLIENT_ID&' +
            'redirect_uri=YOUR_REDIRECT_URI&' +
            'response_type=code&' +
            'scope=https://www.googleapis.com/auth/drive.file';
        
        return {
            statusCode: 200,
            headers: getCorsHeaders(event),
            body: JSON.stringify({
                authUrl: authUrl,
                success: true
            })
        };
    } catch (error) {
        console.error('Critical error:', error);
        return {
            statusCode: 500,
            headers: getCorsHeaders(event),
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
```

## 次のステップ

1. CloudWatch Logsで具体的なエラーメッセージを確認
2. 上記のデバッグコードを追加してエラーの原因を特定
3. エラーが解決したら、正しい実装に戻す

よろしくお願いいたします。