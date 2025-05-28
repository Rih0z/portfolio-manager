# Google Drive連携後のログアウト問題 - 修正完了

## 問題の原因
Google Drive認証のコールバック処理で、既存セッションの場合にセッションCookieが再設定されていなかったため、リダイレクト後にログアウト状態になっていました。

## 修正内容

### 1. セッションCookieの再設定
既存セッションの場合でも、コールバック処理でセッションCookieを明示的に再設定するように修正：

```javascript
// 既存セッションでもCookieを再設定（セッションを維持）
const { createSessionCookie } = require('../../utils/cookieParser');
const cookieHeader = createSessionCookie(actualSessionId, 2592000); // 30日間

return {
  statusCode: 302,
  headers: {
    Location: `${redirectUrl}?${successParams.toString()}`,
    'Set-Cookie': cookieHeader
  },
  body: ''
};
```

### 2. 成功パラメータの追加
リダイレクトURLに成功パラメータを追加し、フロントエンドで成功状態を判断できるように改善：

```
http://localhost:3001/drive-success?success=true&message=Google%20Drive連携が完了しました
```

## 動作確認

1. **セッションの維持**: Google Drive認証後もログイン状態が維持される
2. **Cookie設定**: `Set-Cookie`ヘッダーが正しく設定される
3. **リダイレクト**: 成功ページへ適切にリダイレクトされる

## CloudWatch Logsでの確認ポイント

1. "Existing session updated, setting cookie for session:" のログでセッションIDを確認
2. リダイレクトレスポンスに`Set-Cookie`ヘッダーが含まれているか確認
3. `/getSession`エンドポイントでセッションが維持されているか確認

## セッションタイプ別の処理

1. **既存セッション（通常のログイン）**
   - セッション更新 + Cookie再設定
   - ログイン状態を維持

2. **一時セッション（Google One Tap）**
   - 新規永続セッション作成 + Cookie設定
   - Bearer認証からCookie認証へ移行

これで、Google Drive連携後もログイン状態が維持されるようになりました。