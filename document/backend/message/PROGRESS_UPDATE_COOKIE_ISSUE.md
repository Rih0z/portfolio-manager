# Google Drive認証 - 進捗報告と Cookie 問題の特定

## ✅ 解決済みの問題
1. **Lambda関数のエラー**: `getLogger` 関数のエラーを修正し、Lambda関数が正常に起動するようになりました
2. **CORS プリフライト**: OPTIONS リクエストが正常に処理され、適切なCORSヘッダーが返されています
3. **GETリクエストの到達**: GETリクエストがLambda関数に到達しています

## ❌ 新たに特定された問題: Cookie が送信されていない

### AWSログから判明した事実
```
hasCookieHeader: false
Cookie: 'MISSING'
cookie: 'MISSING'
```

**重要**: ブラウザからのリクエストにCookieヘッダーが含まれていません。これが401エラーの原因です。

## 問題の根本原因

### 1. Cookie の SameSite 属性の問題
クロスオリジンリクエスト（localhost:3001 → AWS API Gateway）でCookieが送信されない理由：
- Cookie に `SameSite=None; Secure` が設定されていない可能性
- HTTPS でないと `SameSite=None` のCookieは送信されない

### 2. 現在の状況
- `/auth/google/login` でセッションCookieは作成されている
- しかし、クロスオリジンリクエストでCookieが送信されていない

## 推奨される解決策

### 方法1: Cookie設定の修正（バックエンド側）
`/auth/google/login` のレスポンスでCookieを設定する際に：

```javascript
// セッションCookieの設定
const cookieOptions = {
  httpOnly: true,
  secure: true, // HTTPS環境では必須
  sameSite: 'None', // クロスオリジンでCookieを送信するため
  maxAge: 24 * 60 * 60 * 1000, // 24時間
  path: '/'
};

// Set-Cookie ヘッダーの例
'Set-Cookie': `sessionId=${sessionId}; HttpOnly; Secure; SameSite=None; Max-Age=86400; Path=/`
```

### 方法2: 開発環境での回避策
開発環境（localhost）では HTTPS が使えないため：

1. **プロキシを使用**: フロントエンドでAPIリクエストをプロキシ経由にする
2. **Authorization ヘッダーを使用**: Cookieの代わりにAuthorizationヘッダーでセッションIDを送信

## クライアント側の確認事項

### 1. ブラウザの開発者ツールで確認
1. Application タブ → Cookies を確認
2. API Gateway のドメインに対するCookieが存在するか確認
3. Cookie の属性（SameSite, Secure）を確認

### 2. ネットワークタブで確認
1. `/auth/google/login` のレスポンスヘッダーで `Set-Cookie` を確認
2. `/auth/google/drive/initiate` のリクエストヘッダーで `Cookie` が含まれているか確認

## 次のステップ

1. **バックエンド**: `/auth/google/login` でのCookie設定を確認・修正
2. **フロントエンド**: 開発環境用の回避策を検討（Authorizationヘッダーの使用など）

## デバッグ用の追加情報
- Lambda関数は正常に動作しています
- CORSヘッダーは正しく設定されています
- 問題はCookieの送信のみです

よろしくお願いいたします。