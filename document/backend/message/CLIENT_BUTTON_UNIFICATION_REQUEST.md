# Google認証ボタンの統一に関するお願い

## 現在の問題

現在、以下の2つの別々のボタンが存在することで、セキュリティとユーザビリティの問題が発生しています：

1. **Googleログインボタン** - アカウントAでログイン
2. **Google Drive連携ボタン** - アカウントBで認証

ユーザーが異なるGoogleアカウントを選択した場合、セッションの不整合が発生し、強制ログアウトやデータの混在リスクがあります。

## 推奨される実装方法

### 方法1: 統合ボタン（推奨）

**「Googleでログイン & Drive連携」** という1つのボタンに統合

```javascript
// 初回ログイン時の処理
const handleGoogleLogin = async () => {
  // 1. Google認証（ログイン）
  const loginResult = await loginWithGoogle();
  
  if (loginResult.success) {
    // 2. 自動的にDrive連携も開始
    await initiateDriveAuth();
  }
};
```

**メリット:**
- ユーザーは1回の認証で完了
- アカウントの不一致が発生しない
- UXがシンプル

### 方法2: Drive連携時のアカウント固定

現在のボタンを維持する場合は、Drive連携時に同じアカウントを強制する実装：

```javascript
// Drive連携ボタンクリック時
const handleDriveConnect = async () => {
  // ログイン中のユーザーメールを取得
  const currentUserEmail = user.email;
  
  // Google OAuth URLに login_hint パラメータを追加
  const authUrl = await getDriveAuthUrl({
    login_hint: currentUserEmail  // 同じアカウントをヒント表示
  });
  
  window.location.href = authUrl;
};
```

### 方法3: アカウント確認UI

Drive連携前に確認ダイアログを表示：

```javascript
const handleDriveConnect = async () => {
  const confirmed = await showConfirmDialog({
    title: "Google Drive連携",
    message: `${user.email} のアカウントでDrive連携を行います。\n同じGoogleアカウントでログインしてください。`,
    confirmText: "続行"
  });
  
  if (confirmed) {
    await initiateDriveAuth();
  }
};
```

## UIデザイン案

### 統合ボタンの場合

```jsx
<Button onClick={handleGoogleAuth} variant="primary">
  <GoogleIcon />
  {isLoggedIn ? "Google Driveを連携" : "Googleでログイン"}
</Button>
```

### ステータス表示

```jsx
<div className="google-integration-status">
  <div>
    <CheckIcon /> Googleアカウント: {user.email}
  </div>
  {user.driveConnected ? (
    <div>
      <CheckIcon /> Google Drive: 連携済み
    </div>
  ) : (
    <Button onClick={handleDriveConnect} variant="secondary">
      Google Driveを連携
    </Button>
  )}
</div>
```

## 実装時の注意点

1. **login_hintパラメータの追加**
   - バックエンドAPIに`login_hint`を渡せるようにする
   - `/auth/google/drive/initiate`エンドポイントで受け取る

2. **エラーハンドリング**
   - アカウント不一致エラーの適切な表示
   - ユーザーへの分かりやすいメッセージ

3. **セッション管理**
   - 同一アカウントでの認証を保証
   - セッションの整合性を維持

## 移行スケジュール案

1. **Phase 1**: アカウント確認UIの追加（即時対応可能）
2. **Phase 2**: login_hintパラメータの実装
3. **Phase 3**: ボタンの統合とUI改善

## まとめ

セキュリティとUXの観点から、**方法1の統合ボタン**を強く推奨します。これにより、アカウントの不一致によるトラブルを根本的に防ぐことができます。

実装についてご不明な点がございましたら、お気軽にお問い合わせください。