# バグ報告: 本番サイト useAuth must be used within an AuthProvider

**報告日**: 2026-03-04
**深刻度**: 🔴 緊急（本番サイト完全動作不可）
**発見経緯**: Playwright MCPによるスモークテストで発覚

## 現象
- portfolio-wise.com にアクセスすると「エラーが発生しました」が表示される
- エラーメッセージ: `useAuth must be used within an AuthProvider`
- アプリケーション全体が使用不可

## 根本原因分析

### AuthContextの不一致（Context Mismatch）

**App.jsx (Line 24):**
```javascript
import { AuthProvider } from './context/AuthContextFix';
```

**useAuth.js (Line 19):**
```javascript
import { AuthContext } from '../context/AuthContext';
```

- `App.jsx` は `AuthContextFix.jsx` の `AuthProvider` でコンポーネントツリーをラップ
- `useAuth.js` は `AuthContext.jsx` の `AuthContext` を参照
- **これらは別々のReact.createContext()インスタンス** → useAuth()がnullを返す → エラー

### 3つのAuthContext実装が存在
1. `AuthContext.jsx` (20.5KB) - メイン実装（Google OAuth、セッション管理）
2. `AuthContextFix.jsx` (10.2KB) - セッション永続化改善版（App.jsxが使用）
3. `AuthContext.client.jsx` (4.5KB) - クライアント専用版

### API互換性の問題
- `AuthContextFix.jsx`: `login()`, `logout()`, `authorizeDrive()`
- `AuthContext.jsx`: `loginWithGoogle()`, `logout()`, `initiateDriveAuth()`
- `LoginButton.jsx`は`loginWithGoogle()`を期待 → AuthContextFixには存在しない

## 影響範囲
useAuth()を使用するコンポーネント（全11箇所）:
- App.jsx, Header.jsx, LoginButton.jsx, UserProfile.jsx
- GoogleDriveIntegration.jsx, ContextConnector.js
- DataImport 2.jsx, DataIntegration.jsx
- useGoogleDrive.js, LoginButton.client.jsx, OAuthLoginButton.jsx

## 修正方針

### 選択肢A: useAuth.jsのimportを修正（即時修正）
- `useAuth.js` のimportを `AuthContextFix` に変更
- リスク: AuthContextFixにはLoginButton.jsxが期待するメソッドが不足

### 選択肢B: App.jsxのProviderをAuthContextに戻す（推奨）
- `App.jsx` のimportを `AuthContext.jsx` に変更
- AuthContext.jsxがメイン実装で、全コンポーネントが期待するAPIを持つ
- AuthContextFix.jsxは後で機能を統合する

### 選択肢C: AuthContextを1つに統合（Phase 0-B向け）
- 3つのファイルを1つに統合
- 最も正しいが、今すぐやるにはリスクが高い

**推奨: 選択肢B（App.jsxのProviderを元のAuthContextに変更）**
- 理由: useAuth.jsと全コンポーネントがAuthContext.jsxのAPIを前提に書かれている
- AuthContextFix.jsxの改善点（セッション永続化）はPhase 0-Bで統合

## ステータス: ユーザー確認待ち
