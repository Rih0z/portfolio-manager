# ログイン2回要求される問題について

## 問題の概要
フロントエンドでGoogle認証とDrive連携を統合実装しましたが、ユーザーがログインを2回要求される問題が発生しています。

## 現在のフロントエンド実装
```javascript
// LoginButton.jsx
1. ユーザーがGoogleログインボタンをクリック
2. Google One Tapでログイン → /auth/google/login を呼び出し
3. ログイン成功後、1.5秒待機
4. 自動的に initiateDriveAuth() を呼び出し → /auth/google/drive/initiate を呼び出し
5. サーバーからのレスポンスで window.location.href = response.authUrl にリダイレクト
```

## 問題の詳細
- 最初のGoogle One Tapログインは成功
- その後、Drive連携のためにGoogleの認証画面に再度リダイレクトされる
- ユーザーは2回Googleアカウントを選択する必要がある

## 原因の推測
1. **Google One Tap**ではDrive APIのスコープを取得できない制限がある
2. `/auth/google/drive/initiate`が新しいOAuthフローを開始している
3. 既存のセッションを活用せず、新規認証を要求している

## 解決案の提案

### 案1: セッション情報を活用した認証スキップ
```javascript
// /auth/google/drive/initiate の処理で
if (session && session.googleUserId) {
  // 既にログイン済みの場合、同じGoogleアカウントでDrive認証
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/drive.file',
    login_hint: session.userEmail, // ← これを追加
    prompt: 'consent' // ← 'select_account'ではなく'consent'のみ
  });
}
```

### 案2: リフレッシュトークンの活用
もし最初のログインでリフレッシュトークンを取得できている場合：
```javascript
// 既存のトークンでDriveスコープを追加取得
const { tokens } = await oauth2Client.refreshAccessToken();
// Drive APIアクセス用のトークンを追加で要求
```

### 案3: 統合OAuthフロー（推奨される長期的解決策）
新しいエンドポイント `/auth/google/login-with-drive` を作成：
```javascript
// 最初から全てのスコープを要求
const scopes = [
  'openid',
  'email', 
  'profile',
  'https://www.googleapis.com/auth/drive.file'
];
```

## 即座に実装可能な改善

`/auth/google/drive/initiate` エンドポイントで以下の変更を行ってください：

```javascript
// 現在のセッション情報を活用
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: 'https://www.googleapis.com/auth/drive.file',
  login_hint: session.userEmail, // ユーザーのメールアドレスをヒントとして渡す
  prompt: 'consent', // アカウント選択をスキップし、権限承認のみ表示
  // prompt: 'select_account consent' を使わない
});
```

これにより：
- 既にログインしているアカウントが自動的に選択される
- ユーザーはDrive権限の承認のみ行えばよい
- アカウント選択画面が表示されない

## テスト方法
1. ブラウザのCookieとキャッシュをクリア
2. Googleログインを実行
3. Drive連携が開始された際に、アカウント選択画面が表示されないことを確認
4. Drive権限の承認画面のみが表示されることを確認

## 参考情報
- [Google OAuth2 parameters](https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient)
- `login_hint`: ユーザーのメールアドレスを渡すことで、アカウント選択をスキップ
- `prompt`: 'consent'のみにすることで、権限承認のみ表示

よろしくお願いいたします。