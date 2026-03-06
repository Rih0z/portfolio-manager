# セキュリティガイドライン

## 認証アーキテクチャ

### JWT デュアルモード認証
PortfolioWise は JWT + Session Cookie のデュアルモード認証を採用しています。

| 項目 | 仕様 |
|------|------|
| **JWT Access Token** | HS256, 24時間有効, メモリのみ保存 (localStorage 禁止) |
| **Refresh Token** | httpOnly Cookie, 7日間有効, Token Reuse Detection |
| **Session Cookie** | レガシー互換のフォールバック認証 |
| **JWT 秘密鍵** | AWS Secrets Manager (`pfwise-api/credentials` の `JWT_SECRET` キー) |
| **Refresh エンドポイント** | POST /auth/refresh: Origin 必須化、CSRF 保護 |

### Token Reuse Detection
- DynamoDB (`pfwise-api-prod-sessions`) でリフレッシュトークンを管理
- 同一トークンの再利用を検出し、全トークンを無効化
- セッションハイジャック対策

### Google OAuth 2.0
- Google Cloud Console で OAuth クレデンシャルを管理
- 登録済みリダイレクト URI:
  - `https://portfolio-wise.com/auth/google/callback`
  - `https://portfolio-wise.com/`
- Google Drive API スコープ: `drive.appdata` (アプリ専用フォルダのみ)

---

## セキュリティ対策一覧

### 実装済み

1. **認証情報の安全な管理**
   - AWS Secrets Manager で一元管理
   - ハードコードされたパスワード/API キーなし
   - クライアントに秘密情報を露出しない

2. **CORS 制限**
   - 許可オリジン: `portfolio-wise.com`, `*.portfolio-manager-7bx.pages.dev`
   - `withCredentials: true` で Cookie 送信
   - Origin ヘッダー必須化

3. **レート制限**
   - 認証ステータスに基づくレート制限
   - Circuit breaker パターン
   - Exponential backoff + リクエスト重複排除
   - サブスクリプションプラン別制限 (Free / Standard)

4. **XSS 対策**
   - React のデフォルトエスケープ機能
   - `dangerouslySetInnerHTML` 不使用
   - CSP ヘッダー (Cloudflare で設定)

5. **入力検証**
   - API パラメータの検証
   - CSV インポート時のサニタイゼーション (Shift-JIS 自動検出含む)

6. **Stripe Webhook セキュリティ**
   - `stripe.webhooks.constructEvent()` で署名検証
   - Webhook シークレットは AWS Secrets Manager で管理
   - べき等処理 (重複イベント対策)

---

## 環境変数の管理

### フロントエンド
```bash
# ビルド時に指定 (クライアントに露出される)
REACT_APP_API_BASE_URL=https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

### バックエンド (AWS Secrets Manager)
```
pfwise-api/credentials    — JWT_SECRET, API キー
pfwise-api/google-oauth   — Google OAuth クレデンシャル
pfwise-api/external-apis  — 外部 API キー
pfwise-api/stripe         — Stripe API キー, Webhook シークレット
```

---

## デプロイ前チェックリスト

- [ ] `.env*` ファイルがコミットされていないか確認
- [ ] API キーや秘密情報がソースコードに含まれていないか確認
- [ ] `console.log` でセンシティブな情報を出力していないか確認
- [ ] CORS 設定が本番用に設定されている
- [ ] レート制限が有効化されている
- [ ] Stripe Webhook シークレットが最新か確認

---

## 継続的なセキュリティ対策

1. **依存関係の更新**
   ```bash
   npm audit
   npm audit fix
   ```

2. **セキュリティヘッダー** (Cloudflare で設定)
   - Content-Security-Policy
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Strict-Transport-Security

3. **定期監査**
   - 四半期ごとのセキュリティ監査
   - 依存関係の脆弱性チェック
   - JWT 秘密鍵のローテーション

---

## 脆弱性報告

セキュリティの問題を発見した場合は、公開 Issue ではなく、直接開発チームに連絡してください。
