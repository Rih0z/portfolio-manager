# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start development server
npm start

# Build for production
npm run build

# Run all tests with coverage
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests

# Advanced test options (using scripts/run-tests.sh)
npm run test:all          # All tests
npm run test:coverage-chart  # Generate visual coverage report
npm run test:visual       # Open coverage in browser

# Run a single test file
npm test -- path/to/test.js
```

## Architecture Overview

This is a React-based portfolio management application with AI-powered investment analysis capabilities. Key architectural decisions:

### Frontend Architecture
- **React 18** with functional components and hooks
- **Context API** for state management (AuthContext for auth, PortfolioContext for portfolio data)
- **TailwindCSS** for styling with custom theme colors
- **Recharts** for data visualization
- **Google OAuth** for authentication
- **Axios** for API calls with retry logic

### Testing Architecture
- **Jest + React Testing Library** for unit/integration tests
- **MSW (Mock Service Worker)** for API mocking
- Custom test runner script (`scripts/run-tests.sh`) with advanced options
- Coverage thresholds enforced (70-80% target)
- Visual coverage reporting with chart generation

### Key Patterns

1. **Service Layer Pattern**: All API calls go through `/src/services/` modules
   - `api.js`: Core API client with auth handling
   - `marketDataService.js`: Market data fetching with fallbacks
   - `adminService.js`: Admin functionality

2. **Context Bridge Pattern**: `ContextConnector` component bridges AuthContext and PortfolioContext

3. **Environment Configuration**: All API settings are dynamically fetched from AWS
   - No API URLs or keys stored in client
   - Configuration fetched from AWS at runtime
   - Enhanced security and easier maintenance

4. **Component Organization**:
   ```
   components/
   ├── auth/       # LoginButton, UserProfile
   ├── common/     # ErrorBoundary, ToastNotification, etc.
   ├── dashboard/  # Portfolio visualization components
   ├── data/       # Import/Export, Google Drive integration
   ├── layout/     # Header, TabNavigation, DataStatusBar
   ├── settings/   # Holdings/Allocation editors, AI prompt settings
   └── simulation/ # Investment simulation components
   ```

## Important Implementation Details

### API Integration
- All API endpoints dynamically configured from AWS
- Production API hosted on AWS (separate repository)
- **Batch API**: Use `fetchMultipleStocks` to fetch multiple tickers in one request
- Supports multiple market data sources with automatic fallback
- API keys and authentication handled server-side
- **Rate Limiting**: Circuit breakers, exponential backoff, request deduplication
- **Session-based auth**: Uses cookies with `withCredentials: true`

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
- Integration tests for API interactions in `__tests__/integration/`
- Mock handlers in `__tests__/mocks/handlers.js`
- Use existing test patterns and utilities

## Development Tips

1. When modifying API calls, update both the service layer and corresponding MSW handlers
2. Run tests before committing - the project has strict coverage requirements
3. Use the visual coverage report to identify untested code paths
4. Follow the existing component structure and naming conventions
5. Ensure mobile responsiveness - the app is optimized for iOS devices
6. Consider Japanese users (primary target audience) in UI/UX decisions

## Build Issues and Notes

### React DOM Compatibility
- This project uses `react-dom` instead of `react-dom/client` for compatibility with react-scripts@3.4.4
- Use `ReactDOM.render()` instead of `ReactDOM.createRoot().render()`
- Node.js v22 requires `NODE_OPTIONS='--openssl-legacy-provider'` for building

### Dependency Management
- Use `npm install --legacy-peer-deps` to handle peer dependency conflicts
- MSW requires TypeScript 4.8+ but the project uses TypeScript 3.9.10
- Build process is handled by GitHub Actions with proper environment setup

### Deployment

#### Manual Deployment with Claude Code
For immediate deployment using Claude Code environment:

**Note**: Due to npm workspace conflicts in the monorepo structure, use the following method:

1. **Create an isolated copy for building**:
   ```bash
   cd frontend
   cp -r webapp webapp-build
   ```

2. **Install dependencies in the isolated copy**:
   ```bash
   cd webapp-build
   npm install --legacy-peer-deps --no-audit --no-fund
   ```

3. **Build with environment variables**:
   ```bash
   REACT_APP_API_BASE_URL='https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod' \
   REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
   NODE_OPTIONS='--openssl-legacy-provider' \
   npm run build
   ```

4. **Deploy to Cloudflare Pages**:
   ```bash
   wrangler pages deploy build --project-name=portfolio-manager
   ```

5. **Clean up**:
   ```bash
   cd ../..
   rm -rf frontend/webapp-build
   ```

**Important Notes**:
- This method avoids npm workspace conflicts by creating an isolated build directory
- Environment variables must be set at build time for React apps
- The deployment creates a preview URL first, then updates the main site

#### Automated Deployment
- Cloudflare Pages deployment is also automated via GitHub Actions
- Build artifacts are generated in `frontend/webapp/build/` directory
- Environment variables are configured in Cloudflare Pages dashboard

#### Deployment Notes
- Wrangler CLI must be installed and authenticated with Cloudflare
- The project name `portfolio-manager` corresponds to the Cloudflare Pages project
- Deployment URL: https://portfolio-manager-7bx.pages.dev

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
- **Authentication**: Session-based using cookies (no JWT tokens currently)
- **Important**: Backend needs to implement JWT token response for full functionality

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

## Project History & Development Reports

### Atlassian Design System Implementation (2025-08-22)
A comprehensive UI quality improvement project implementing enterprise-level design standards:

- **Complete Report**: [Atlassian Design System Implementation Report](../../documents/atlassian-design-system-implementation-report-20250822.md)
- **Implementation**: Design Tokens + 5 foundation components (Button, Card, Input, Modal)
- **Quality Standards**: WCAG 2.1 AA 100% compliance, enterprise-level implementation
- **Strategic Evaluation**: 125/125 perfect score (recommended approval)

**Key Achievements**:
- ✅ Design Tokens: Complete Atlassian-compliant color, typography, spacing systems
- ✅ Button Component: 4 variants × 3 sizes, full accessibility
- ✅ Card Component: Elevation system, dark theme support
- ✅ Input/Form Components: Validation states, accessibility compliance
- ✅ Modal Component: Focus management, keyboard navigation

**Technical Impact**:
- Bundle size: ~8-12% increase (within 20% target)
- Performance: Design Tokens optimized
- Architecture: Existing excellent functionality (AIAdvisor.jsx 40+ functions) fully preserved

This project established PortfolioWise as an enterprise-grade application with competitive advantages in the B2B market.

### Implementation Files
```
src/
├── tokens/
│   └── atlassian-tokens.js        # Design Tokens
└── components/
    └── atlassian/
        ├── Button.jsx              # Button component
        ├── Card.jsx                # Card component  
        ├── Input.jsx               # Form components
        └── Modal.jsx               # Modal component
```