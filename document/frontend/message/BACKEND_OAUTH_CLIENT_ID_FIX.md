# Google OAuth Client ID 設定エラー修正依頼

## エラー内容
Google Drive連携ボタンをクリックすると、以下のエラーが発生します：

```
アクセスをブロック: 認証エラーです
Missing required parameter: client_id
エラー 400: invalid_request
```

## 問題の詳細

### エラーの意味
GoogleのOAuth認証URLを生成する際に、必須パラメータである`client_id`が含まれていません。

### 期待される認証URL形式
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=https://www.googleapis.com/auth/drive.file&
  access_type=offline&
  prompt=consent
```

## 修正が必要な箇所

### `/auth/google/drive/initiate` エンドポイントのLambda関数

現在のレスポンスが認証URLを返していると思われますが、`client_id`パラメータが欠落しています。

```javascript
// 修正前（推測）
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `redirect_uri=${redirectUri}&` +
  `response_type=code&` +
  `scope=${scope}`;

// 修正後
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${process.env.GOOGLE_CLIENT_ID}&` +  // ← これが必要
  `redirect_uri=${redirectUri}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file')}&` +
  `access_type=offline&` +
  `prompt=consent`;
```

## 環境変数の確認

Lambda関数の環境変数に以下が設定されているか確認してください：

1. `GOOGLE_CLIENT_ID` - Google Cloud Consoleで取得したOAuth 2.0クライアントID
2. `GOOGLE_CLIENT_SECRET` - 対応するクライアントシークレット
3. `REDIRECT_URI` - 認証後のリダイレクトURI（例: `https://your-api.com/auth/google/drive/callback`）

## 完全な修正例

```javascript
exports.handler = async (event) => {
    // ... 既存のセッション検証コード ...
    
    // 必須の環境変数チェック
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('GOOGLE_CLIENT_ID is not set');
        return {
            statusCode: 500,
            headers: getCorsHeaders(event),
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }
    
    // OAuth認証URLの生成
    const authParams = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.REDIRECT_URI || 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback',
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/drive.file',
        access_type: 'offline',
        prompt: 'consent',
        state: sessionId // CSRF対策用
    });
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
    
    console.log('Generated auth URL:', authUrl);
    
    return {
        statusCode: 200,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
            authUrl: authUrl,
            success: true
        })
    };
};
```

## Google Cloud Console設定の確認

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 対象プロジェクトを選択
3. 「APIとサービス」→「認証情報」
4. OAuth 2.0クライアントIDの設定を確認
5. 承認済みのリダイレクトURIに以下が含まれているか確認：
   - `https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback`

## テスト方法

1. Lambda関数を更新後、CloudWatch Logsで生成されたURLを確認
2. URLに`client_id`パラメータが含まれているか確認
3. ブラウザで直接URLにアクセスして、Googleの認証画面が表示されるか確認

よろしくお願いいたします。