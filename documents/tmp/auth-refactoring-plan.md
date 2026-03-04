# AuthContext 統合リファクタリング計画

**作成日**: 2026-03-04
**目的**: 3つのAuthContext実装を1つに統合（大規模リファクタリング）

## 現状の問題
- AuthContext.jsx, AuthContextFix.jsx, AuthContext.client.jsx の3つが混在
- App.jsxはAuthContextFix、useAuth.jsはAuthContextを参照 → Context不一致でクラッシュ

## 統合方針

### 新しいAuthContext.jsx のAPI仕様

**State:**
- `user` - ユーザー情報
- `isAuthenticated` - 認証状態
- `loading` - ローディング状態
- `error` - エラー情報
- `hasDriveAccess` - Google Driveアクセス状態
- `googleClientId` - Google OAuth Client ID

**Methods:**
- `loginWithGoogle(credentialResponse)` - Google認証（One Tap + OAuth Code両対応）
- `logout()` - ログアウト
- `checkSession()` - セッション確認
- `initiateDriveAuth()` - Drive API認証開始
- `setPortfolioContextRef(ref)` - PortfolioContext参照設定

**Aliases (後方互換):**
- `handleLogout` → logout
- `login` → loginWithGoogle

### 統合する機能
1. **AuthContext.jsx**: Google OAuth完全フロー（One Tap + Code Flow）、authFetchによるAPI通信
2. **AuthContextFix.jsx**: localStorageセッション永続化、タブ切り替え対応
3. 過剰なconsole.logを削除（WARNレベルのみ残す）

### ファイル変更
- `AuthContext.jsx` → 統合版で上書き
- `AuthContextFix.jsx` → 削除
- `AuthContext.client.jsx` → 削除
- `App.jsx` → import元をAuthContextに変更
- `useAuth.js` → 変更なし（既にAuthContextを参照）

## ステータス: 実装中
