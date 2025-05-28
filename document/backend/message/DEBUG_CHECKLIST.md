# デバッグチェックリスト

## 1. redirect_uri_mismatch問題

### 確認すべきこと
1. **Google Cloud Console**
   - 承認済みのリダイレクトURIに `http://localhost:3001/auth/google/callback` が**正確に**登録されているか
   - スペースや見えない文字がないか
   - コピー＆ペーストで再度登録してみる

2. **バックエンドログ（CloudWatch）**
   ```
   /auth/google/login エンドポイントのログを確認
   - 受信したredirect_uri
   - Google OAuth APIに送信しているredirect_uri
   ```

## 2. データタブでログアウトされる問題

### ブラウザで確認すること

1. **ネットワークタブ**
   - データタブをクリック
   - `/auth/session` または `/marketdata` へのリクエストを確認
   - レスポンスのステータスコード（401？403？）
   - レスポンスボディのエラーメッセージ

2. **コンソール**
   - エラーメッセージを確認
   - 特に「MISSING_DRIVE_SCOPE」というエラーがあるか

### 問題の切り分け

#### A. MISSING_DRIVE_SCOPEエラーの場合
**バックエンドの問題**
- 新しい実装でDriveスコープが必須になった
- 既存のセッションにDriveスコープがない
- 解決策：一度ログアウトして再ログイン

#### B. 401 Unauthorizedの場合
**セッション/Cookie問題**
- Cookieが正しく送信されていない
- セッションが無効化されている

### デバッグコード追加

```javascript
// src/context/AuthContext.js に追加
const checkSession = async () => {
  console.log('=== Session Check Debug ===');
  console.log('Cookies:', document.cookie);
  console.log('Has session cookie:', document.cookie.includes('sessionId'));
  
  const response = await authFetch(getApiEndpoint('auth/session'), 'get');
  console.log('Session response:', response);
  
  if (response.error) {
    console.error('Session error:', response.error);
  }
};
```

## 3. 即座に試すこと

1. **ブラウザのシークレットモードで試す**
   - 既存のセッションやCookieの影響を排除

2. **完全なクリーンスタート**
   ```bash
   # ブラウザで
   1. すべてのCookieをクリア
   2. キャッシュをクリア
   3. 新しいタブでアプリを開く
   4. 新規ログイン
   ```

3. **ログを収集**
   - ログインボタンクリック時のコンソールログ
   - データタブクリック時のネットワークログ
   - エラーメッセージの全文

これらの情報を教えていただければ、問題を特定できます。