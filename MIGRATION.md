# PortfolioWise Migration Guide

## Current Version: 3.0.0 (Phase 2-A)

This guide provides step-by-step instructions for migrating between major versions of PortfolioWise.

## Table of Contents
1. [Version 3.0.0 - shadcn/ui + Zustand + Vite](#version-300---shadcnui--zustand--vite)
2. [Version 2.0.0 - Atlassian Design System (Deprecated)](#version-200---atlassian-design-system-deprecated)
3. [Version 1.5.0 - Cloudflare Migration](#version-150---cloudflare-migration)
4. [Version 1.0.0 - Initial Release](#version-100---initial-release)

---

## Version 3.0.0 - shadcn/ui + Zustand + Vite
*Released: 2026-03-05 (Phase 0-A〜2-A)*

### Overview
フルスタック刷新: ビルドツール (CRA→Vite)、テスト (Jest→Vitest)、状態管理 (Context→Zustand)、デザインシステム (Atlassian→shadcn/ui) を全面移行。

### Breaking Changes
- React Context API (AuthContext/PortfolioContext) 廃止 → Zustand stores
- CRA (react-scripts) 廃止 → Vite
- Jest 廃止 → Vitest
- Atlassian Design System 廃止 → shadcn/ui + Radix UI
- CSS ハードコードカラー → CSS Variables (セマンティックトークン)

### Migration Steps

#### 1. ビルドツール: CRA → Vite
```bash
# 旧: react-scripts 依存を削除
npm uninstall react-scripts

# 新: Vite + プラグインをインストール
npm install vite @vitejs/plugin-react --save-dev
```

設定ファイル:
- `vite.config.ts` — ビルド設定
- `index.html` — ルートに移動 (public/ から)
- 環境変数: `REACT_APP_*` → `VITE_*` (互換ラッパー使用中)

#### 2. テスト: Jest → Vitest
```bash
npm uninstall jest @testing-library/jest-dom
npm install vitest @vitest/coverage-v8 --save-dev
```

設定ファイル:
- `vitest.config.ts` — テスト設定
- `vitest.setup.ts` — セットアップ

主な変更点:
```typescript
// Before (Jest)
jest.mock('./stores/authStore');

// After (Vitest)
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn((selector) => selector({
    isAuthenticated: true,
    user: { name: 'Test' },
  })),
}));
```

#### 3. 状態管理: Context API → Zustand
```bash
npm install zustand @tanstack/react-query
```

主な変更点:
```typescript
// Before (Context)
const { user } = useAuth();
const { portfolio } = usePortfolio();

// After (Zustand)
const user = useAuthStore(s => s.user);
const portfolio = usePortfolioStore(s => s.currentAssets);
```

4ストア体制:
- `authStore` — 認証、JWT、Google OAuth
- `portfolioStore` — ポートフォリオ CRUD、Google Drive 同期
- `uiStore` — テーマ、通知
- `subscriptionStore` — サブスクリプション、プラン管理

#### 4. デザイン: Atlassian → shadcn/ui
```bash
# shadcn/ui コンポーネント
npx shadcn-ui@latest add button card input badge dialog progress switch tabs
```

コンポーネントの場所: `src/components/ui/`

```typescript
// Before (Atlassian)
import Button from './components/atlassian/Button';

// After (shadcn/ui)
import { Button } from './components/ui/button';
```

テーマ: CSS Variables で Light/Dark/System を管理
```css
:root {
  --primary: 217 91% 60%;
  --background: 0 0% 100%;
}
.dark {
  --primary: 217 91% 60%;
  --background: 222 47% 11%;
}
```

#### 5. テスト実行
```bash
npm run typecheck   # TypeScript チェック
npm test            # Vitest 実行
```

---

## Version 2.0.0 - Atlassian Design System (Deprecated)
*Released: 2025-08-22*

> **Note**: このバージョンのデザインシステムは v3.0.0 で shadcn/ui に置き換えられました。

---

## Version 1.5.0 - Cloudflare Migration
*Released: 2025-05-29*

### Overview
Netlify → Cloudflare Pages へのインフラ移行。

### Migration Steps

#### 1. Wrangler CLI インストール
```bash
npm install -g wrangler
```

#### 2. デプロイ
```bash
cd frontend/webapp
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
npm run build
wrangler pages deploy build --project-name=pfwise-portfolio-manager
```

#### 3. カスタムドメイン
Cloudflare Dashboard → Pages → Custom domains → portfolio-wise.com

---

## Version 1.0.0 - Initial Release
*Released: 2025-05-27*

初回公開リリース。セットアップ手順は [CLAUDE.md](./CLAUDE.md) を参照。

---

## Version Compatibility Matrix

| Component | v1.0.0 | v1.5.0 | v2.0.0 | v3.0.0 |
|-----------|--------|--------|--------|--------|
| Node.js | 16.x | 18.x | 18.x | 22.x |
| React | 18.2.0 | 18.2.0 | 18.2.0 | 18.2.0 |
| Build Tool | CRA | CRA | CRA | Vite 6.x |
| Test Runner | Jest | Jest | Jest | Vitest |
| State Mgmt | Context | Context | Context | Zustand 5.x |
| Design | Custom | Custom | Atlassian | shadcn/ui |
| TypeScript | No | No | Partial | Yes (strict:false) |
| AWS SDK | v2 | v3 | v3 | v3 |

---

## Troubleshooting

### Authentication Failures
```bash
# Google OAuth 設定を確認
aws secretsmanager get-secret-value --secret-id pfwise-api/google-oauth
```

### Deployment Failures
```bash
wrangler --version
npm install -g wrangler@latest
wrangler pages deploy build --project-name=pfwise-portfolio-manager
```

### Vite Build Issues
```bash
# TypeScript エラーの場合
npm run typecheck

# 依存関係の問題
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

*This document is updated with each major release. For minor updates, see [CHANGELOG.md](./CHANGELOG.md).*
