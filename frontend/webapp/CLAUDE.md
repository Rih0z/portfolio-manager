# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start development server
npm start

# Build for production
npm run build

# Run all tests
npm test                   # vitest run
npm run test:watch         # vitest (watch mode)
npm run test:coverage      # vitest run --coverage

# TypeScript type checking
npm run typecheck          # tsc --noEmit

# View coverage report
npm run test:view-coverage

# Run a single test file
npx vitest run path/to/test.ts
```

## Architecture Overview

This is a React-based portfolio management application with AI-powered investment analysis capabilities. Key architectural decisions:

### Frontend Architecture
- **React 18** with functional components and hooks
- **TypeScript 5.x** (strict: false, allowJs: true — インクリメンタル移行中)
- **Vite 7.x** for build and dev server
- **Zustand 5.x** for client state management (authStore, portfolioStore, uiStore, subscriptionStore)
- **TanStack Query 5.x** for server state caching
- **TailwindCSS** + **shadcn/ui** for styling (CSS変数ベース、ライト/ダーク切替)
- **Recharts** for data visualization
- **Google OAuth** for authentication
- **Axios** for API calls with retry logic
- **JetBrains Mono** for numeric display (tabular-nums)

### Testing Architecture
- **Vitest + React Testing Library** for unit/integration tests
- **MSW (Mock Service Worker) v1** for API mocking
- Coverage via `@vitest/coverage-v8`
- Setup: `vitest.config.ts` + `vitest.setup.ts`

### Key Patterns

1. **Service Layer Pattern**: All API calls go through `/src/services/` modules
   - `api.ts`: Core API client with auth handling
   - `marketDataService.ts`: Market data fetching with fallbacks
   - `subscriptionService.ts`: Stripe subscription management

2. **Zustand Store Pattern**: 4 stores with cross-store communication via `getState()`
   - `authStore.ts`: 認証・JWT管理
   - `portfolioStore.ts`: ポートフォリオデータ・Google Drive連携
   - `uiStore.ts`: 通知・テーマ管理
   - `subscriptionStore.ts`: サブスクリプション・プラン制限

3. **Environment Configuration**: All API settings are dynamically fetched from AWS
   - No API URLs or keys stored in client
   - Configuration fetched from AWS at runtime
   - Enhanced security and easier maintenance

4. **Component Organization**:
   ```
   components/
   ├── auth/       # LoginButton, OAuthLoginButton
   ├── common/     # ErrorBoundary, InitialSetupWizard, UpgradePrompt
   ├── dashboard/  # Portfolio visualization, PortfolioScoreCard
   ├── data/       # Import/Export, Google Drive integration
   ├── layout/     # Header, TabNavigation, DataStatusBar, Footer
   ├── settings/   # Holdings/Allocation editors, AI prompt settings
   ├── simulation/ # Investment simulation components
   └── ui/         # shadcn/ui (Button, Card, Input, Badge, Dialog, Progress, Switch, Tabs)
   ```

## Important Implementation Details

### API Integration
- All API endpoints dynamically configured from AWS
- Production API hosted on AWS (separate repository)
- **Batch API**: Use `fetchMultipleStocks` to fetch multiple tickers in one request
- Supports multiple market data sources with automatic fallback
- API keys and authentication handled server-side
- **Rate Limiting**: Circuit breakers, exponential backoff, request deduplication
- **Dual-mode auth**: JWT Bearer Token (in-memory) + Session Cookie fallback with `withCredentials: true`

### Multi-Currency Support
- Handles JPY and USD
- Exchange rate fetching from multiple sources
- Automatic currency conversion in calculations

### AI Features
- Custom prompt generation for investment analysis
- Configurable AI settings in Settings page
- Integration with external AI services via prompts

### Data Persistence
- Google Drive integration for backup/restore
- Local storage for offline capability
- Export to CSV/JSON formats

### Testing Requirements
- All new components need corresponding tests in `__tests__/unit/components/`
- Store tests in `__tests__/unit/stores/`
- Service tests in `__tests__/unit/services/`
- Use `vi.mock()` for Zustand store mocking (not Context Provider wrapping)
- Mock handlers in `__tests__/mocks/handlers.js`
- Use existing test patterns and utilities

## Development Tips

1. When modifying API calls, update both the service layer and corresponding MSW handlers
2. Run tests before committing - the project has strict coverage requirements
3. Use the visual coverage report to identify untested code paths
4. Follow the existing component structure and naming conventions
5. Ensure mobile responsiveness - the app is optimized for iOS devices
6. Consider Japanese users (primary target audience) in UI/UX decisions

## Build and Deployment

### Dependency Management
- Use `npm install --legacy-peer-deps` to handle peer dependency conflicts

### Deployment
```bash
# ビルド
REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
npm run build

# デプロイ
wrangler pages deploy build --project-name=pfwise-portfolio-manager
```

- **本番URL**: https://portfolio-wise.com/
- Wrangler CLI must be installed and authenticated with Cloudflare
- Environment variables are set at build time for React apps

## Security Configuration

### Environment Variables
API configurations are fetched dynamically from AWS. The following environment variables are supported:

1. Required environment variables:
   ```bash
   REACT_APP_API_BASE_URL=https://YOUR_AWS_API_URL_HERE.execute-api.YOUR_REGION.amazonaws.com
   REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
   ```

2. Setup instructions:
   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   # Edit files to replace YOUR_AWS_API_URL_HERE with actual URL
   ```

3. API endpoints, keys, and Google Client ID are fetched from AWS at runtime using the base URL

4. The `.gitignore` file is configured to exclude all `.env*` files except `.env.example`

5. For production deployments, set `REACT_APP_API_BASE_URL` in your hosting platform's environment variables

### API Security
- All API configurations are managed server-side on AWS
- API keys and sensitive data never exposed to client
- CORS restrictions enforced on the backend
- Rate limiting based on authentication status
- **Authentication**: JWT + Session デュアルモード認証（JWT Bearer in-memory + httpOnly Cookie fallback）

### Test Environment Setup

1. **Local Testing**:
   ```bash
   # First time setup
   cp .env.test.example .env.test
   # Edit .env.test and replace YOUR_AWS_API_URL_HERE with actual URL
   
   # Run tests
   npm test
   ```

2. **CI/CD Environment** (GitHub Actions, etc.):
   - Add `REACT_APP_MARKET_DATA_API_URL` as a secret in your CI/CD platform
   - The test runner will automatically use environment variables if available
   
3. **Using Mock API**:
   - If `USE_API_MOCKS=true` is set in .env.test, tests will use MSW mocks instead of real API
   - This is useful for unit tests and when the backend is unavailable

## Important Workflow Guidelines

### Completion of Work
1. **GitHub Commit**: 作業が完了したらGitHubに追加すること
   - 変更内容を必ずコミットしてプッシュする
   - コミットメッセージは日本語でも英語でも可

2. **Build and Deploy**: 作業が完了したらClaude環境でビルドしデプロイすること
   ```bash
   # ビルド
   npm run build
   
   # デプロイ（正しいプロジェクト名を使用）
   wrangler pages deploy build --project-name=pfwise-portfolio-manager
   ```

3. **Update README**: READMEにデプロイ先を記載して
   - 本番環境URL: https://portfolio-wise.com/
   - 開発環境URL: プレビューURLは毎回変わるため記載不要

### Security Considerations
- **セキュリティチェック**: GitHubへのプッシュ前にセキュリティ上の問題がないか確認すること
  - APIキーや秘密情報が含まれていないか確認
  - .envファイルがコミットされていないか確認
  - console.logでセンシティブな情報を出力していないか確認

### Documentation Updates
- **ドキュメント更新**: 実装を変更したらそれに合わせてドキュメントも更新すること
  - 技術的な変更はCLAUDE.mdに記載
  - ユーザー向けの変更はREADME.mdに記載
  - API仕様の変更は該当するドキュメントファイルに記載

### Production Deployment
- **固定URL使用**: 必ずURLが固定の本番環境にデプロイするようにして
  - 本番環境: https://portfolio-wise.com/
  - Cloudflare Pagesのカスタムドメインを使用
  - プレビューURLは開発確認用のみ

### API Configuration
- **固定API使用**: フロントエンドとバックエンドの通信が必ず成功するように固定のAPIを指定して
  - 本番API: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
  - ビルド時に環境変数で指定:
    ```bash
    REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
    REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
    npm run build
    ```

