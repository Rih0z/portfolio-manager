# Googleログインと同時にDrive連携を行う実装ガイド

## 実装概要

右上のGoogleログインボタンをクリックするだけで、ログインとGoogle Drive連携を同時に行う方法です。

## フロントエンド実装

### 1. スコープの追加

`LoginButton.jsx`または認証設定部分で、Google Drive用のスコープを追加します：

```javascript
// Google認証の設定
const googleAuthConfig = {
  client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  callback: handleGoogleResponse,
  auto_select: false,
  scope: [
    'openid',
    'email', 
    'profile',
    // Drive用のスコープを追加
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata'
  ].join(' ')
};
```

### 2. 認証レスポンスの処理

```javascript
const handleGoogleResponse = async (response) => {
  if (response.credential) {
    // 従来のログイン処理
    const loginResult = await loginWithGoogle(response.credential);
    
    if (loginResult.success && loginResult.requiresDriveAuth) {
      // Drive認証が必要な場合、自動的にDrive連携を開始
      // ただし、この場合はバックエンドでの処理が必要
      console.log('Drive authorization required');
    }
  }
};
```

### 3. 推奨される実装方法

**Option A: One Tap + OAuth Flow（2段階認証）**

```javascript
const handleGoogleLogin = async () => {
  try {
    // Step 1: Google One Tapでログイン
    const loginResult = await loginWithGoogle();
    
    if (loginResult.success) {
      // Step 2: 自動的にDrive OAuth認証を開始
      const driveAuthUrl = await initiateDriveAuth();
      
      // ユーザーに通知してからリダイレクト
      showNotification('Google Driveの認証画面に移動します...');
      setTimeout(() => {
        window.location.href = driveAuthUrl;
      }, 1000);
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

**Option B: 完全OAuth Flow（推奨）**

バックエンドに新しいエンドポイントを作成し、ログインとDrive連携を1つのOAuthフローで処理：

```javascript
// 新しい統合認証エンドポイントを呼び出す
const handleGoogleLogin = async () => {
  // バックエンドの統合認証エンドポイントにリダイレクト
  window.location.href = `${API_BASE_URL}/auth/google/login-with-drive`;
};
```

## バックエンド実装（新エンドポイント）

`/auth/google/login-with-drive` エンドポイントを作成：

```javascript
// src/function/auth/googleLoginWithDrive.js
module.exports.handler = async (event) => {
  // 必要なスコープを全て含めてOAuth URLを生成
  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata'
  ];
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
  
  // Google認証画面にリダイレクト
  return {
    statusCode: 302,
    headers: {
      Location: authUrl
    }
  };
};
```

## UI/UX改善案

### 1. ボタンの統合

```jsx
// 統合されたログインボタン
<Button onClick={handleGoogleLogin} className="google-login-btn">
  <GoogleIcon />
  <span>
    {isLoggedIn 
      ? "Google Driveを連携" 
      : "Googleでログイン（Drive連携付き）"}
  </span>
</Button>
```

### 2. 進行状況の表示

```jsx
const [authStep, setAuthStep] = useState('idle');

const handleGoogleLogin = async () => {
  setAuthStep('logging-in');
  
  try {
    const loginResult = await loginWithGoogle();
    
    if (loginResult.success) {
      setAuthStep('connecting-drive');
      // Drive連携処理
      await connectGoogleDrive();
      setAuthStep('complete');
    }
  } catch (error) {
    setAuthStep('error');
  }
};

// UI表示
{authStep === 'logging-in' && <p>Googleアカウントでログイン中...</p>}
{authStep === 'connecting-drive' && <p>Google Driveを連携中...</p>}
{authStep === 'complete' && <p>✓ ログインとDrive連携が完了しました</p>}
```

### 3. 初回ログイン時の説明

```jsx
// 初回ユーザー向けの説明モーダル
<Modal show={isFirstTimeUser}>
  <h3>Googleアカウントでログイン</h3>
  <p>
    ログインと同時に以下の機能が利用可能になります：
    • ポートフォリオデータの自動保存
    • Google Driveでのバックアップ
    • 複数デバイスでのデータ同期
  </p>
  <Button onClick={handleGoogleLogin}>
    同意してログイン
  </Button>
</Modal>
```

## 実装の優先順位

1. **即座に実装可能**: Option A（2段階認証）
   - 既存のコードを最小限の変更で対応
   - ユーザー体験は2ステップ

2. **推奨される実装**: Option B（統合OAuth）
   - より良いユーザー体験（1ステップ）
   - バックエンドの新規開発が必要

## セキュリティ考慮事項

1. **スコープの最小化**: 必要最小限のスコープのみ要求
2. **同意画面の明確化**: ユーザーが何を許可するのか明確に表示
3. **トークン管理**: アクセストークンとリフレッシュトークンの適切な保存

よろしくお願いいたします。