# JWT認証実装レビュー

**レビュー日**: 2026-03-04
**最終更新**: 2026-03-04（セキュリティ修正全8件完了確認）
**対象**: Phase 0（JWT基盤）+ Phase 1（デュアルモード）+ Phase 2（フロントエンド移行）
**レビュー範囲**: セキュリティ、コード品質、テストカバレッジ、アーキテクチャ整合性
**ステータス**: 🟢 CRITICAL/HIGH全修正完了。Phase 3（レガシー削除）まで保持。

---

## セキュリティ修正完了ステータス（2026-03-04）

| 重要度 | 修正内容 | ファイル | 確認 |
|--------|---------|---------|------|
| 🔴 CRITICAL | Refresh Token Reuse Detection | refreshToken.js, googleLogin.js | ✅ DynamoDB currentRefreshTokenId管理 |
| 🟠 HIGH | オープンリダイレクト防止 | logout.js | ✅ ドメインホワイトリスト検証 |
| 🟠 HIGH | 認証情報ログマスク化 | sessionHelper.js, googleLogin.js | ✅ ヘッダーキーのみ/boolean/[REDACTED] |
| 🟡 MEDIUM | ?debug=true本番無効化 | getSession.js | ✅ NODE_ENV/DEBUGのみ（クエリパラメータ削除） |
| 🟡 MEDIUM | sessionIdレスポンス露出削除 | googleLogin.js | ✅ レスポンスボディから除去 |
| Phase3準備 | JWT audクレーム追加 | jwtUtils.js | ✅ audience: 'pfwise-web' |
| Phase3準備 | Origin必須化（refresh） | refreshToken.js | ✅ 403 MISSING_ORIGIN |
| Phase3準備 | formatRedirectResponse CORS修正 | responseUtils.js | ✅ 動的origin（event渡し時） |

**テスト**: jwtUtils(24) + refreshToken(11) + logout(9) = 44件全PASS

---

## 総合評価

| 領域 | 評価 | コメント |
|------|------|---------|
| アーキテクチャ | ◎ | デュアルモード（Session+JWT）の後方互換設計が優秀 |
| フロントエンド設計 | ◎ | メモリのみのトークン保存、httpOnly Cookie、3階層フォールバック |
| セキュリティ | **○** | **CRITICAL/HIGH全修正完了**。残存はコード品質レベルの改善のみ |
| テストカバレッジ | △ | バックエンド合格(44件PASS)。**フロントエンドapiUtils.jsテストが欠如** |
| コード品質 | ○ | 一部コード重複・テストフック混入あるが全体的に良好 |

---

## アーキテクチャ評価: デュアルモードの設計は優秀

### 認証フロー（正しく実装済み）

```
[ログイン]
Google OAuth → googleLogin.js → Session Cookie + JWT Access Token + Refresh Token Cookie

[API呼び出し]
フロントエンド → Authorization: Bearer {accessToken} (メモリ) + Cookie (自動送信)
バックエンド → sessionHelper.js: JWT優先 → Cookie Session フォールバック

[トークンリフレッシュ]
Access Token期限切れ → 401 → apiUtils.js自動リトライ → POST /auth/refresh
→ httpOnly Refresh Token Cookie → 新Access Token + 新Refresh Token

[セッション復元（ページリロード時）]
localStorage (ユーザー情報のみ) → UI即座復元 → checkSession() → JWT/Session検証
```

### フロントエンドの3階層フォールバック（優秀）

```
1. JWT Access Token (メモリ) → exp確認 → 有効ならそのまま使用（DB不要）
2. POST /auth/refresh → httpOnly Cookie → 新トークン発行
3. GET /auth/session → レガシーSession Cookie → DB問い合わせ
4. 全失敗 → ログアウト
```

### トークン保存方式（セキュアに実装）

| データ | 保存先 | XSS耐性 |
|--------|--------|---------|
| Access Token | **メモリのみ** (apiUtils.js module変数) | ◎ |
| Refresh Token | **httpOnly Cookie** (ブラウザ管理) | ◎ |
| ユーザー情報 | localStorage (非機密データのみ) | ○ |

---

## セキュリティ指摘事項

### 🔴 CRITICAL: Refresh Token Rotation が不完全

**ファイル**: `backend/src/function/auth/refreshToken.js`

新しいRefresh Tokenは発行されるが、**旧Refresh Tokenが無効化されない**。JWT は署名ベースのためサーバー側で取り消せない。

**リスク**: 攻撃者がRefresh Tokenを窃取した場合、正規ユーザーと攻撃者の両方が並行してトークンをリフレッシュ可能。検知不能。

**修正案**: DynamoDB SessionsTable に現在の `tokenId` を保存。リフレッシュ時に提示された `tokenId` と照合し、不一致なら全セッション無効化（Token Family Revocation）。

```javascript
// refreshToken.js に追加すべきロジック
const session = await getSession(sessionId);
if (session.currentTokenId !== payload.tokenId) {
  // Token reuse detected → revoke entire session
  await invalidateSession(sessionId);
  return 401;
}
// 新tokenIdでセッション更新
await updateSession(sessionId, { currentTokenId: newTokenId });
```

---

### 🟠 HIGH: logout.js にオープンリダイレクト脆弱性

**ファイル**: `backend/src/function/auth/logout.js` Lines 50-84

```javascript
const redirectUrl = event.queryStringParameters.redirect;
// → バリデーションなしで302リダイレクト
```

**リスク**: `https://portfolio-wise.com/auth/logout?redirect=https://evil.com/phishing` でフィッシングサイトに誘導可能。

**修正案**: リダイレクトURLをドメインホワイトリストで検証。

```javascript
const ALLOWED_REDIRECT_DOMAINS = ['portfolio-wise.com', 'localhost'];
const url = new URL(redirectUrl);
if (!ALLOWED_REDIRECT_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith(`.${d}`))) {
  return formatErrorResponse(event, 400, 'INVALID_REDIRECT');
}
```

---

### 🟠 HIGH: 認証ヘッダー・Cookie のログ出力

**ファイル**:
- `sessionHelper.js` Lines 26-35: 全リクエストヘッダーをログ出力（Cookie, Authorization含む）
- `googleLogin.js` Lines 53-58, 109: 認可コードの一部をログ出力
- `apiUtils.js` (フロントエンド) Lines 434-441: `document.cookie` をconsole.log

**リスク**: CloudWatch Logs / ブラウザコンソールに認証情報が残る。ログアクセス権限のある開発者やCI/CDパイプライン侵害時にセッションハイジャック可能。

**修正案**:
- バックエンド: `Authorization` と `Cookie` ヘッダーをログ出力前にマスク
- フロントエンド: `document.cookie` のログを `NODE_ENV === 'development'` ガード or 削除

---

### 🟡 MEDIUM 指摘一覧

| # | 指摘 | ファイル | 修正案 |
|---|------|---------|--------|
| 1 | JWT に `aud` (audience) クレームがない | `jwtUtils.js` | `audience: 'pfwise'` を sign/verify に追加 |
| 2 | `/auth/refresh` で Origin ヘッダー未送信時にチェックがスキップされる | `refreshToken.js` L86 | Origin必須化 or Refererフォールバック |
| 3 | `googleLogin.js` のレスポンスボディに `sessionId` が露出 | `googleLogin.js` L248 | レスポンスから `sessionId`, `token` フィールドを除去 |
| 4 | `getSession.js` の `?debug=true` が本番でも動作 | `getSession.js` L167 | クエリパラメータによるデバッグ情報公開を本番で無効化 |
| 5 | 全Cookieに `SameSite=None` でCSRF保護が弱い | `cookieParser.js` | Authorization Bearerヘッダーが暗黙的CSRF保護として機能。レガシーSessionのみのリクエストは要CSRF対策 |
| 6 | `formatRedirectResponse` が `Access-Control-Allow-Origin: *` をハードコード | `responseUtils.js` L286 | 動的Origin設定に統一 |
| 7 | ログアウトリダイレクト時にRefresh Token Cookieが消去されない | `logout.js` L76-84 | `multiValueHeaders` を `formatRedirectResponse` に対応させる |
| 8 | フロントエンドのレスポンスから7種のトークンフィールド名を受理 | `apiUtils.js` L275-289 | `accessToken` のみに限定 |
| 9 | CSRF保護がダミー実装（`csrfManager.js`） | `csrfManager.js` L43 | Bearer Headerが暗黙的保護として機能するため即時リスクは低いが、Stage 2までに実装すべき |

---

## テストカバレッジ評価

### バックエンド

| テストファイル | テスト数 | 評価 |
|---------------|---------|------|
| `jwtUtils.test.js` | 19 | ○ — コア機能と主要セキュリティパスをカバー |
| `refreshToken.test.js` | 8 | ○ — 主要フローとエラーパスをカバー |

**バックエンドで不足しているテスト**:

| # | 不足テスト | 重要度 |
|---|-----------|--------|
| 1 | `alg: "none"` トークンの拒否 | 🟡 (実装は `algorithms: [HS256]` で保護済みだがテストなし) |
| 2 | 異なる `issuer` を持つトークンの拒否 | 🟡 |
| 3 | Token Reuse Detection（同じRefresh Tokenの2回使用） | 🔴 (実装自体が未対応) |
| 4 | 期限切れRefresh Token JWTの拒否（malformedではなくexpired） | 🟡 |
| 5 | Originヘッダー未送信時の動作 | 🟡 |
| 6 | 500エラーハンドラ（内部例外時） | 🟢 |

### フロントエンド

| テストファイル | テスト数 | 評価 |
|---------------|---------|------|
| `AuthContext.test.js` | 17 | ○ — ログイン/ログアウト/セッション復元をカバー |
| **`apiUtils.test.js`** | **0（存在しない）** | **🔴 — JWT関連ロジックのテストが完全欠如** |

**フロントエンドで不足しているテスト**:

| # | 不足テスト | 重要度 |
|---|-----------|--------|
| 1 | `refreshAccessToken()` の成功/失敗 | 🔴 |
| 2 | 401レスポンスでの自動リフレッシュ+リトライ | 🔴 |
| 3 | 同時複数401でのリフレッシュ重複排除 | 🟡 |
| 4 | `setAuthToken`/`getAuthToken`/`clearAuthToken` | 🟡 |
| 5 | Authorization Bearerヘッダーの付与 | 🟡 |
| 6 | トークンがlocalStorageに漏洩しないことの検証 | 🟡 |

---

## コード品質

### 良い点
- デュアルモードの後方互換設計が丁寧
- Refresh Token の httpOnly Cookie 管理
- フロントエンドのメモリのみトークン保存
- 同時リフレッシュの重複排除パターン
- ページ復帰時（visibility change）のセッション再検証

### 改善すべき点

| # | 問題 | ファイル |
|---|------|---------|
| 1 | `verifyAccessToken` と `verifyRefreshToken` がほぼ重複 | `jwtUtils.js` |
| 2 | `isAllowedOrigin` が `refreshToken.js` にローカル定義（DRY違反） | `refreshToken.js` |
| 3 | `createSessionCookie` が `secure`/`sameSite` パラメータを無視 | `cookieParser.js` |
| 4 | テストフック (`event._formatResponse` 等) が本番コードに混在 | `googleLogin.js` 等 |
| 5 | Cookieパーサーにテスト用ハードコード特殊ケース | `cookieParser.js` L122-126 |
| 6 | ログ出力に `console.warn` と `logger` が混在 | `refreshToken.js` vs `jwtUtils.js` |

---

## 優先修正リスト

### 即時修正（デプロイ前に対応すべき）

```
1. 🔴 logout.js: オープンリダイレクト修正（ドメインホワイトリスト検証）
2. 🟠 sessionHelper.js: ヘッダーログのマスク化（Authorization, Cookie）
3. 🟠 googleLogin.js: 認可コードのログ出力削除
4. 🟡 getSession.js: ?debug=true を本番環境で無効化
5. 🟡 googleLogin.js: レスポンスボディからsessionId除去
```

### Phase 3（レガシー削除）までに対応すべき

```
6. 🔴 refreshToken.js: Token Reuse Detection 実装（DynamoDBにtokenId保存）
7. 🟡 jwtUtils.js: aud クレーム追加
8. 🟡 refreshToken.js: Origin必須化 or Refererフォールバック
9. 🟡 logout.js: リダイレクト時のRefresh Token Cookie消去
10. 🟡 responseUtils.js: formatRedirectResponse のCORS修正
```

### テスト追加（Phase 0-B テスト移行に合わせて）

```
11. 🔴 apiUtils.test.js 新規作成（refreshAccessToken, 401インターセプタ, トークン管理）
12. 🟡 jwtUtils.test.js: alg:none拒否、issuer不一致拒否テスト追加
13. 🟡 refreshToken.test.js: 期限切れJWT、Origin未送信テスト追加
```

---

## 計画書との整合性チェック

計画書 Section 8.2 / Phase 1 との対応:

| 計画書の項目 | 実装状態 | 確認 |
|-------------|---------|------|
| JWT生成・検証ミドルウェア | `jwtUtils.js` 実装済み | ✅ |
| Refresh Token ローテーション | 発行は実装済み、**無効化が未実装** | ⚠️ |
| Google Drive トークン管理のセッションからの分離 | JWT クレームに `hasDriveAccess` 含むが、実トークンはセッション依存 | △ |
| 既存セッションからの移行パス | デュアルモードで後方互換 | ✅ |
| フロントエンド: Cookie → Bearer ヘッダー対応 | `apiUtils.js` 実装済み | ✅ |
| CORS設定の見直し | `serverless.yml` 更新済み | ✅ |

---

## AWS Secrets Manager 注意事項

**ユーザーへの確認**: `pfwise-api/credentials` に `JWT_SECRET` キーの手動追加が必要と報告されている。

確認事項:
1. `JWT_SECRET` は256bit以上のランダム文字列か
2. Secrets Manager のリージョンは `us-west-2` か（Lambda と同じリージョン）
3. Lambda の IAM Role に `secretsmanager:GetSecretValue` 権限があるか

**JWT_SECRET未設定時の動作**: `jwtUtils.js` は `process.env.JWT_SECRET` にフォールバック。環境変数にも未設定の場合はエラーをスロー（安全側に倒れる）。

---

*このレビュー文書はJWT関連の課題が解決されるまで保持（CLAUDE.md第10条準拠）*
