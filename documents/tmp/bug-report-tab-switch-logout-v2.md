# バグ報告: タブ切替ログアウト問題 v2

**報告日**: 2026-03-05
**深刻度**: CRITICAL
**再現率**: 高（特にChrome/Safari最新版）
**前回修正**: Phase 0-B (commit a5bc012c) — 4件のバグ修正適用済み
**状態**: 再発（前回修正では不十分）

---

## 1. 症状

ユーザーがブラウザのタブを切り替えて戻ると、ログアウト状態になる。

---

## 2. 原因分析（2件のCRITICAL）

### CRITICAL-1: フロントエンド — checkSession() のlocalStorageフォールバック欠落

**ファイル**: `frontend/webapp/src/stores/authStore.ts` 行 259-278

```typescript
// Step 3: Fallback: legacy session check
try {
  const sessionEndpoint = await getApiEndpoint('auth/session');
  const response: any = await authFetch(sessionEndpoint, 'get');
  if (response?.success && response.isAuthenticated) {
    // Success → return true
  }
} catch (sessionErr: any) {
  console.warn('Session check fallback failed:', sessionErr.message);
}

// ★★★ ここが問題 ★★★
// 3段階全て失敗 → 即ログアウト（localStorageフォールバックなし！）
setAuthState(null, false, false, null);  // ← 即ログアウト
notifyPortfolioStore(false, null);
```

**問題の詳細:**
- `checkSession()` は3段階で認証を試行: ①JWT local decode → ②refresh token → ③session check
- 3段階全て失敗した場合、行276で即座に `setAuthState(null, ...)` → ログアウト
- localStorageには有効なセッションデータが保存されている（24時間有効）
- しかし行276では localStorage を確認せず即ログアウトしている
- localStorage フォールバックは外側の catch ブロック（行286-290）にのみ存在
- 「正常な失敗」（例外を投げないが値が null/false）の場合、この catch に到達しない

**Phase 0-B の修正との関係:**
- Phase 0-B では例外パスの修正（ネットワークエラー時のトークン保持等）を行った
- しかし「正常な失敗パス」（null/falseを返すケース）には対処していなかった

### CRITICAL-2: バックエンド — サードパーティCookie問題

**ファイル**: `backend/src/utils/cookieParser.js` 行 139-163

```javascript
// 両Cookie共に SameSite=None
const createSessionCookie = (sessionId, maxAge = 604800, secure = true, sameSite = 'None') => {
  return `session=${encodeURIComponent(sessionId)}; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}; Path=/`;
};

const createRefreshTokenCookie = (token, maxAge = 604800) => {
  return `refreshToken=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}; Path=/`;
};
```

**問題の詳細:**
- フロントエンド: `portfolio-wise.com`（Cloudflare Pages）
- バックエンドAPI: `gglwlh6sc7.execute-api.us-west-2.amazonaws.com`（AWS）
- **異なるドメイン** → Cookie は「サードパーティCookie」として扱われる
- Chrome (2025〜) と Safari は サードパーティCookieをブロック/制限
- タブ切替時、`SameSite=None` のCookieがブラウザにブロックされる可能性が高い
- `/auth/refresh` エンドポイントに `refreshToken` Cookie が送信されない
- → `NO_REFRESH_TOKEN` (401) エラー → リフレッシュ失敗

**サードパーティCookieの影響フロー:**
```
タブ切替で戻る
  → checkSession() → JWT期限内なら即成功（問題なし）
  → JWT期限切れ → refreshAccessToken() 呼出
  → POST /auth/refresh (withCredentials: true)
  → ブラウザが refreshToken Cookie をブロック（サードパーティ）
  → サーバー: NO_REFRESH_TOKEN (401)
  → refreshAccessToken() → null を返す + authToken クリア
  → session fallback: authFetch(auth/session) → JWT なし + Cookie ブロック → 401
  → 3段階全て失敗 → 行276: setAuthState(null, ...) → ログアウト
```

---

## 3. テストの状況

### 現在のテストカバレッジ
- **authStore のユニットテスト**: 48件 — 基本的なログイン/ログアウト/セッション復元をテスト
- **apiUtils のテスト**: refreshAccessToken のモック済み
- **欠落**: タブ切替シナリオの統合テスト、サードパーティCookieブロックのテスト

### テストが不十分な理由
1. テスト環境では `same-origin` なので Cookie 問題が発生しない
2. jsdom は `visibilitychange` イベントをシミュレートしない
3. サードパーティCookieのブロックはブラウザ固有の動作でモックでは再現不能
4. `checkSession()` のテストは個々のステップを単独でテストしており、3段階連続失敗のフローをテストしていない

---

## 4. 修正方針

### 修正A: フロントエンド — localStorage フォールバック追加（即時修正可能）

**対象**: `authStore.ts` 行 276

```typescript
// 修正前:
setAuthState(null, false, false, null);

// 修正後:
const stored = loadSession();
if (stored) {
  // サーバー認証は失敗したが、ローカルセッションが有効 → UIは維持
  console.warn('全認証ティア失敗。localStorageフォールバック使用');
  setAuthState(stored.user, true, stored.hasDriveAccess, null);
  sessionCheckFailureCount++;
  lastFailureTime = Date.now();
} else {
  setAuthState(null, false, false, null);
  notifyPortfolioStore(false, null);
}
```

**効果**: サーバー側の認証が一時的に失敗しても、localStorage に有効なセッションがあればUIはログイン状態を維持。次回のAPI呼出時にサーバー認証が再試行される。

### 修正B: バックエンド — SameSite=Lax への変更（短期対策）

**対象**: `cookieParser.js`

```javascript
// SameSite=None → SameSite=Lax
// ただし cross-origin では Lax でも Cookie が送信されない
// → 根本解決にはならないが、same-site ナビゲーションでは改善
```

**注意**: フロントエンド(`portfolio-wise.com`)とAPI(`amazonaws.com`)が異なるドメインのため、`SameSite=Lax` でも cross-origin POST には Cookie が送信されない。これは部分的な改善のみ。

### 修正C: バックエンド — APIカスタムドメイン導入（根本対策）

```
現在: portfolio-wise.com → gglwlh6sc7.execute-api.us-west-2.amazonaws.com
修正: portfolio-wise.com → api.portfolio-wise.com (API Gateway カスタムドメイン)
```

**効果**: 同一ドメイン（portfolio-wise.com のサブドメイン）になるため、Cookie は「ファーストパーティ」として扱われ、ブラウザにブロックされない。`SameSite=Lax` で十分になる。

**必要な作業**:
1. API Gateway にカスタムドメイン `api.portfolio-wise.com` を設定
2. Cloudflare DNS に CNAME レコード追加
3. ACM 証明書の作成（us-east-1）
4. Cookie の Domain を `.portfolio-wise.com` に設定
5. フロントエンドの API_BASE_URL を `https://api.portfolio-wise.com/prod` に変更
6. Google OAuth の redirect_uri を更新

---

## 5. 推奨修正順序

| 順序 | 修正 | 工数 | 効果 |
|------|------|------|------|
| 1 | **修正A**: localStorage フォールバック | 30分 | タブ切替ログアウトの大部分を防止 |
| 2 | **テスト追加**: 3段階失敗フローのテスト | 1時間 | 再発防止 |
| 3 | **修正C**: APIカスタムドメイン | 2-3時間 | Cookie問題の根本解決 |

修正B（SameSite=Lax）は修正Cの一部として実施する。

---

## 6. 影響範囲

- フロントエンド: `authStore.ts` (checkSession)
- バックエンド: `cookieParser.js` (Cookie生成)
- インフラ: API Gateway + Cloudflare DNS（修正Cの場合）
- テスト: authStore テスト追加
