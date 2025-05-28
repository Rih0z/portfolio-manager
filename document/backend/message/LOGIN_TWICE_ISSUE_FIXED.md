# ログイン2回要求される問題の修正完了

## 実装した修正

### 1. login_hint パラメータの追加

`/auth/google/drive/initiate` エンドポイントで、以下の変更を実装しました：

```javascript
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  state: sessionId,
  prompt: 'consent', // アカウント選択をスキップし、権限承認のみ表示
  login_hint: session.email, // ユーザーのメールアドレスをヒントとして渡す ← 追加
  redirect_uri: redirectUri
});
```

これにより：
- ✅ 既にログインしているアカウントが自動的に選択される
- ✅ アカウント選択画面がスキップされる
- ✅ Drive権限の承認画面のみが表示される

## 動作確認

CloudWatch Logsで以下のログが出力されます：
```
Generated OAuth URL with login_hint: {
  hasLoginHint: true,
  userEmail: 'use***',
  prompt: 'consent'
}
```

## フロントエンドでの確認事項

1. **ユーザー体験の改善**
   - Googleログイン後、Drive連携時にアカウント選択画面が表示されない
   - 権限承認画面のみが表示される

2. **エラーハンドリング**
   - 万が一、異なるアカウントでログインしようとした場合でも、login_hintによって正しいアカウントが提案される

## 将来的な改善案（実装済み）

統合認証エンドポイント `googleLoginWithDrive.js` も作成しました。これを使用すると：

1. **完全な1ステップ認証**が可能
2. 最初から全てのスコープを要求
3. ログインとDrive連携が1回の認証で完了

### 使用方法（将来的な実装）

```javascript
// フロントエンドから直接リダイレクト
window.location.href = `${API_BASE_URL}/auth/google/login-with-drive`;
```

## 現在の状態

- ✅ `login_hint`パラメータによるアカウント選択スキップ（デプロイ済み）
- ✅ `prompt: 'consent'`による権限承認のみの表示
- ✅ セッション情報の活用

これで、ユーザーは2回ログインすることなく、スムーズにDrive連携を完了できます。