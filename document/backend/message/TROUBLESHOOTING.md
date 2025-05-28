# Google認証エラーのトラブルシューティングガイド

## 現象: 401エラー「認証に失敗しました」

### 1. Google OAuth設定の確認

**Step 1: デバッグエンドポイントで設定確認**
```bash
curl https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/debug/google-config
```

**Step 2: 必要な設定値**
```
Google Client ID: 243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com
Google Client Secret: [Secrets Managerまたは環境変数から設定]
```

### 2. Secrets Manager設定

AWS Secrets Managerの `pfwise-api/credentials` に以下を追加：
```json
{
  "GOOGLE_CLIENT_ID": "243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "YOUR_GOOGLE_CLIENT_SECRET_HERE"
}
```

### 3. 環境変数フォールバック設定

`.env` ファイルに以下を追加：
```env
GOOGLE_CLIENT_ID=243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

### 4. Google Cloud Console設定

1. **OAuth 2.0 クライアント ID** の設定確認
2. **承認済みのリダイレクト URI** に以下を追加：
   ```
   http://localhost:3001/auth/callback
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```

### 5. よくあるエラーと対処法

**エラー: "Google Client ID/Secret not configured"**
- Secrets Managerまたは環境変数の設定を確認
- AWS権限でSecrets Managerへのアクセスが許可されているか確認

**エラー: "redirect_uri_mismatch"**
- Google Cloud ConsoleでリダイレクトURIが正しく設定されているか確認
- クライアント側のリダイレクトURIとサーバー側の設定が一致しているか確認

**エラー: "invalid_grant"**
- 認証コードの有効期限切れ（通常10分）
- 認証コードが既に使用済み
- 時刻同期の問題

### 6. デバッグ手順

1. **CloudWatch Logsで詳細確認**
   ```bash
   aws logs tail /aws/lambda/pfwise-api-dev-googleLogin --follow
   ```

2. **設定確認エンドポイント**
   ```bash
   curl https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/debug/google-config
   ```

3. **テスト用のGoogle認証**
   ```javascript
   // クライアント側でのテスト
   const testAuth = async () => {
     try {
       const response = await fetch('https://x4scpbsuv2.execute-api.us-west-2.amazonaws.com/dev/auth/google/login', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           code: 'your_auth_code_here',
           redirectUri: 'http://localhost:3001/auth/callback'
         })
       });
       const data = await response.json();
       console.log('Response:', data);
     } catch (error) {
       console.error('Error:', error);
     }
   };
   ```

### 7. 修正されたコード

認証エラーの詳細ログが追加され、以下の情報が出力されます：
- Google OAuth設定の状態
- 認証コード処理の進行状況
- 詳細なエラーメッセージ

### 8. 緊急対応

認証が完全に動作しない場合の回避策：
1. テスト用の固定セッションを作成
2. 開発環境でのみ認証をバイパス
3. モック認証の実装