# CORS及びCookie設定修正依頼

## 問題の概要

ユーザーがログイン後、タブを切り替えるとログアウトされてしまう問題が発生しています。
ブラウザのコンソールに以下のエラーが表示されています：

### 1. CORSエラー
```
Ensure CORS response header values are valid
Access-Control-Allow-Origin: Missing Header
```

### 2. Cookie警告
```
Reading cookie in cross-site context may be impacted on Chrome
Cookies with the SameSite=None; Secure and not Partitioned attributes
```

## 必要な修正

### 1. CORS設定の修正

すべてのエンドポイントで以下のCORSヘッダーが正しく設定されているか確認してください：

```javascript
// Lambda関数のレスポンスヘッダー
const headers = {
  'Access-Control-Allow-Origin': 'http://localhost:3000', // 本番環境では適切なドメイン
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Cookie',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};
```

特に以下のエンドポイントで問題が発生しています：
- `/dev/config/client`
- `/dev/api/market-data`
- `/dev/auth/session`

### 2. Cookie設定の修正

セッションCookieの設定を以下のように修正してください：

```javascript
// Cookieの設定
res.cookie('session', sessionId, {
  httpOnly: true,
  secure: true, // HTTPS必須
  sameSite: 'None', // クロスサイトでのCookie送信を許可
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
  domain: '.amazonaws.com' // サブドメイン間で共有
});
```

### 3. プリフライトリクエスト（OPTIONS）の処理

OPTIONSメソッドのリクエストに対して適切なレスポンスを返すようにしてください：

```javascript
if (event.httpMethod === 'OPTIONS') {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': getAllowedOrigin(event.headers.origin),
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Cookie',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  };
}
```

### 4. 許可するオリジンの管理

環境に応じて許可するオリジンを適切に設定してください：

```javascript
const getAllowedOrigin = (origin) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://portfolio-wise.com',
    'https://www.portfolio-wise.com'
  ];
  
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // デフォルトは本番環境のURL
  return 'https://portfolio-wise.com';
};
```

## 確認事項

1. **API Gateway の CORS 設定**
   - API Gateway コンソールでCORSが有効になっているか確認
   - カスタムヘッダー（X-Api-Key）が許可されているか確認

2. **CloudFront の設定**（使用している場合）
   - CORSヘッダーがキャッシュされていないか確認
   - Origin Request Policyが適切に設定されているか確認

3. **セッション管理**
   - セッションの有効期限が適切に設定されているか
   - セッショントークンの検証ロジックが正しいか

## テスト方法

1. ローカル環境（http://localhost:3000）でログイン
2. 別のタブを開いて同じアプリケーションにアクセス
3. ログイン状態が維持されていることを確認
4. ブラウザの開発者ツールでCORSエラーが発生していないことを確認

## 期待される結果

- タブを切り替えてもログイン状態が維持される
- CORSエラーが発生しない
- Cookieが正しく送受信される

## 参考情報

- [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Chrome: SameSite Cookie の変更](https://developers.google.com/search/blog/2020/01/get-ready-for-new-samesitenone-secure)
- [AWS: API Gateway CORS設定](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)