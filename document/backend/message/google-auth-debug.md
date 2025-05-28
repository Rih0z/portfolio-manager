# Google認証エラー調査レポート

## 現在の状況
クライアント側でGoogle認証を実装していますが、ログインボタンをクリックした際に「ログイン処理中にエラーが発生しました」というエラーメッセージが表示され、認証が完了しません。

## クライアント側の実装詳細

### 1. 使用ライブラリとバージョン
```json
"@react-oauth/google": "^0.12.1",
"react": "^18.2.0"
```

### 2. Google OAuth設定
```javascript
// Google Client ID (公開情報)
CLIENT_ID: '243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com'

// リダイレクトURI
REDIRECT_URI: 'http://localhost:3001/auth/callback'

// スコープ
SCOPES: [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email', 
  'https://www.googleapis.com/auth/userinfo.profile'
]

// OAuth設定
flow: 'auth-code'
access_type: 'offline'
prompt: 'consent'
```

### 3. 認証フロー
1. ユーザーが「Googleでログイン」ボタンをクリック
2. Googleの認証画面へリダイレクト
3. ユーザーが認証を完了
4. アプリケーションに認証コードと共にリダイレクト
5. 認証コードをサーバーに送信（ここでエラー）

### 4. APIリクエスト詳細
```javascript
// エンドポイント
POST https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login

// リクエストヘッダー
{
  "Content-Type": "application/json",
  "Origin": "http://localhost:3001"
}

// リクエストボディ
{
  "code": "4/0AcvDMrDn...(実際の認証コード)",
  "redirectUri": "http://localhost:3001/auth/callback"
}
```

## エラーパターン

### パターン1: テスト用の無効なコードでのレスポンス
```json
{
  "success": false,
  "error": {
    "code": "INVALID_AUTH_CODE",
    "message": "認証コードが無効または期限切れです"
  }
}
```
ステータスコード: 400

### パターン2: 実際のGoogle認証後のエラー
- ユーザーに表示されるメッセージ: 「ログイン処理中にエラーが発生しました」
- 詳細なエラー内容が不明

## 確認が必要な項目

### 1. Google Cloud Console設定
- [ ] OAuth 2.0 クライアントIDの設定は正しいか
- [ ] 承認済みのリダイレクトURIに `http://localhost:3001/auth/callback` が登録されているか
- [ ] 必要なAPIが有効化されているか（Google+ API、Google Drive API等）

### 2. サーバー側の設定
- [ ] 環境変数 `GOOGLE_CLIENT_SECRET` は正しく設定されているか
- [ ] Google OAuth2ライブラリのバージョンは最新か
- [ ] 認証コードの検証プロセスは正しく実装されているか

### 3. エラーログの確認
サーバー側のログで以下を確認してください：
- 認証コードを受け取っているか
- Googleのトークンエンドポイントへのリクエストは成功しているか
- エラーの詳細メッセージ

## デバッグ用の追加情報

### CORSヘッダー（正常）
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: OPTIONS,POST
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent
Access-Control-Allow-Credentials: true
```

### エンドポイントの動作確認（正常）
- セッションエンドポイント: ✅ 動作確認済み
- ログアウトエンドポイント: ✅ 動作確認済み
- CORS preflight: ✅ 動作確認済み

## 推測される問題

1. **Google Client Secretの設定ミス**
   - サーバー側で正しいClient Secretが設定されていない可能性

2. **リダイレクトURIの不一致**
   - サーバー側で検証しているリダイレクトURIとクライアントから送信されるURIが一致していない

3. **認証コードの有効期限**
   - 認証コードの処理に時間がかかりすぎて期限切れになっている

4. **Googleトークンエンドポイントへのアクセスエラー**
   - サーバーからGoogleへのリクエストが失敗している

## 必要なアクション

1. サーバー側のエラーログを確認し、具体的なエラー内容を特定する
2. Google Cloud ConsoleでOAuth設定を再確認する
3. 必要に応じて、より詳細なエラー情報をクライアントに返すようにサーバーを修正する

## テスト用コード
以下のコードでサーバー側の認証処理を単独でテストできます：

```bash
curl -X POST 'https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3001' \
  -d '{
    "code": "実際の認証コードをここに入力",
    "redirectUri": "http://localhost:3001/auth/callback"
  }'
```

以上の情報を元に、サーバー側の実装を確認していただけますか？