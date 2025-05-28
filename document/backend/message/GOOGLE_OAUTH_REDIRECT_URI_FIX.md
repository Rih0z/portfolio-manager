# Google OAuth リダイレクトURI設定の修正について

## 問題の内容
Google OAuth認証で「redirect_uri_mismatch」エラーが発生していました。これは、アプリケーションが送信するリダイレクトURIと、Google Cloud Consoleに登録されているURIが一致しないことが原因です。

## 修正内容

### 1. リダイレクトURIの修正
以前の誤った設定:
```
http://localhost:3000/api/auth/google/drive/callback
```

正しい設定:
```
https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
```

### 2. コードの更新
- `googleDriveAuth.js`: API GatewayのエンドポイントURLを動的に構築するように修正
- `serverless.yml`: デフォルトのリダイレクトURIを正しいAPI Gatewayエンドポイントに更新

## フロントエンド開発者への重要なお知らせ

### Google Cloud Consoleでの設定が必要です

Google Cloud Console（https://console.cloud.google.com/）で、OAuth 2.0クライアントIDの設定に以下のリダイレクトURIを追加してください：

#### 開発環境用
```
https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/drive/callback
```

#### 本番環境用（将来的に）
```
https://api.portfoliomanager.com/auth/google/drive/callback
```

### 設定手順
1. Google Cloud Consoleにログイン
2. プロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動
4. 該当するOAuth 2.0クライアントIDをクリック
5. 「承認済みのリダイレクトURI」セクションで「URIを追加」
6. 上記のURIを追加して保存

### 注意事項
- リダイレクトURIは完全一致する必要があります（末尾のスラッシュも含めて）
- HTTPSが必須です（localhostを除く）
- 非推奨のOOB（Out-of-Band）フローは使用していません

### テスト方法
1. ブラウザのキャッシュとCookieをクリア
2. Google Drive認証を再度実行
3. エラーが解消されることを確認

## 技術的詳細

### 非推奨のOOBフローについて
- 当アプリケーションはWebアプリケーション用の標準的なリダイレクトフローを使用
- `urn:ietf:wg:oauth:2.0:oob`のような非推奨のOOBフローは使用していません

### 今後の推奨事項
- 環境変数`GOOGLE_REDIRECT_URI`を明示的に設定することを推奨
- 本番環境では独自ドメインのリダイレクトURIを使用

よろしくお願いいたします。