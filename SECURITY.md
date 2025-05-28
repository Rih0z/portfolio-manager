# セキュリティガイドライン

## セキュリティ監査結果と対策

### 🔴 重大なセキュリティリスク

1. **ハードコードされたAWS URL**
   - **問題箇所**: 
     - `/frontend/webapp/src/setupProxy.js` (Line 8)
     - `/backend/scripts/test-aws-app.js` (Line 4)
   - **リスク**: バックエンドインフラの詳細が露出
   - **対策**: 環境変数に移行済み（REACT_APP_API_BASE_URL）

2. **デバッグエンドポイントの露出**
   - **問題箇所**: `/backend/src/function/auth/googleDriveAuthDebug.js`
   - **リスク**: 本番環境で詳細なログが露出する可能性
   - **対策**: 本番環境では無効化すること

### 🟡 中程度のリスク

1. **ログ内の機密データ**
   - **問題**: 認証トークンの一部（最初の10-20文字）がログに記録
   - **対策**: ログ出力時にトークンをマスク処理

2. **公開ディレクトリ内のテストファイル**
   - **問題箇所**: `/frontend/webapp/public/test-google-auth.html`
   - **対策**: 本番ビルドから除外

3. **CORS設定のフォールバック**
   - **問題**: 許可リストにないオリジンがlocalhost:3000にフォールバック
   - **対策**: 本番環境では厳密なオリジンチェックを実装

### 🟢 実装済みのセキュリティ対策

1. **適切な.gitignore設定**
   - すべての`.env*`ファイルを除外
   - ログファイルとテスト結果を除外

2. **認証情報の管理**
   - AWS Secrets Managerで一元管理
   - ハードコードされたパスワードなし

3. **認証実装**
   - セキュアなCookieベースのセッション管理
   - トークンリフレッシュ機構
   - 適切なセッション検証

4. **入力検証**
   - APIパラメータの検証
   - SQLインジェクション対策済み
   - 適切なサニタイゼーション

5. **XSS対策**
   - Reactのデフォルトエスケープ機能を活用
   - dangerouslySetInnerHTMLの不使用

## セキュリティベストプラクティス

### 環境変数の管理

```bash
# フロントエンド（.env.production）
REACT_APP_API_BASE_URL=https://your-api.amazonaws.com
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0

# バックエンド（AWS Secrets Manager）
- pfwise-api/credentials
- pfwise-api/google-oauth
- pfwise-api/external-apis
```

### デプロイ前チェックリスト

- [ ] すべての環境変数が正しく設定されている
- [ ] デバッグログが無効化されている
- [ ] テストファイルが除外されている
- [ ] CORS設定が本番用に設定されている
- [ ] レート制限が有効化されている

### 継続的なセキュリティ対策

1. **依存関係の更新**
   ```bash
   npm audit
   npm audit fix
   ```

2. **セキュリティヘッダーの追加**
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

3. **定期的な監査**
   - 四半期ごとのセキュリティ監査
   - 依存関係の脆弱性チェック
   - ペネトレーションテストの実施