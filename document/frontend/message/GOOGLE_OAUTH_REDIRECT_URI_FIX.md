# Google OAuth Redirect URI 設定修正ガイド

## エラー内容
```
redirect_uri_mismatch
認可リクエストで渡された redirect_uri が、OAuth クライアント ID の承認済みリダイレクト URI と一致しません。
```

## 修正が必要な箇所

### 1. Google Cloud Console側の設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 左メニューから「APIとサービス」→「認証情報」を選択
4. OAuth 2.0 クライアント IDをクリック
5. 「承認済みのリダイレクト URI」セクションで以下を追加：

```
https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
```

**注意**: 開発環境用に以下も追加することをお勧めします：
```
http://localhost:3001/auth/google/drive/callback
http://localhost:3000/auth/google/drive/callback
```

### 2. バックエンド側の設定確認

`/auth/google/drive/initiate` Lambda関数で使用しているredirect_uriを確認：

```javascript
// 現在の設定を確認
console.log('Using redirect_uri:', redirectUri);

// 推奨される設定
const redirectUri = 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback';
```

### 3. フロントエンド側の対応（必要に応じて）

もしフロントエンドでリダイレクトを処理する場合は、以下のように設定：

```javascript
// src/context/AuthContext.js
const GOOGLE_DRIVE_REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://portfolio-wise.com/auth/google/drive/callback'
  : 'http://localhost:3001/auth/google/drive/callback';
```

## 推奨される実装パターン

### A. バックエンドリダイレクト方式（推奨）
1. ユーザーがGoogleで認証
2. Googleが`https://your-api.com/auth/google/drive/callback`にリダイレクト
3. バックエンドで認証コードを処理
4. バックエンドからフロントエンドにリダイレクト

### B. フロントエンドリダイレクト方式
1. ユーザーがGoogleで認証
2. Googleが`http://localhost:3001/auth/google/drive/callback`にリダイレクト
3. フロントエンドで認証コードを取得
4. バックエンドAPIに認証コードを送信

## 完全な設定例

### Google Cloud Console設定
```
承認済みのリダイレクト URI:
- https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
- https://portfolio-wise.com/auth/google/drive/callback (本番用)
- http://localhost:3001/auth/google/drive/callback (開発用)
```

### Lambda関数設定
```javascript
const getRedirectUri = (stage) => {
  const uris = {
    dev: 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback',
    prod: 'https://api.portfolio-wise.com/auth/google/drive/callback'
  };
  return uris[stage] || uris.dev;
};

// OAuth URL生成時
const authParams = new URLSearchParams({
  client_id: process.env.GOOGLE_CLIENT_ID,
  redirect_uri: getRedirectUri(process.env.STAGE || 'dev'),
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/drive.file',
  access_type: 'offline',
  prompt: 'consent'
});
```

## テスト手順

1. Google Cloud Consoleで承認済みリダイレクトURIを追加
2. 変更を保存（反映に数分かかる場合があります）
3. Lambda関数のredirect_uriが正しく設定されているか確認
4. ブラウザのキャッシュをクリア
5. 再度Google Drive連携を試す

## トラブルシューティング

- **エラーが続く場合**: Google Cloud Consoleの変更が反映されるまで5-10分待つ
- **URLの末尾**: スラッシュの有無に注意（`/callback`と`/callback/`は別扱い）
- **HTTPSとHTTP**: 本番環境では必ずHTTPSを使用

よろしくお願いいたします。