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

デプロイ手順の詳細は[メインCLAUDE.mdのDeployment Commands章](../../CLAUDE.md#deployment-commands)を参照してください。

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
   - デプロイ手順の詳細は[メインCLAUDE.mdのDeployment Commands章](../../CLAUDE.md#deployment-commands)を参照

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
  - ビルド時の環境変数設定は[メインCLAUDE.mdのDeployment Commands章](../../CLAUDE.md#deployment-commands)を参照

## SOLID Principles

このプロジェクトではSOLID原則に従った実装を心がけています：

### S - Single Responsibility Principle (単一責任の原則)
- **コンポーネント**: 各コンポーネントは単一の責任を持つ
  - 例: `MarketSelectionWizard` は市場選択のUIのみ担当
  - 例: `PortfolioPromptService` はプロンプト生成のみ担当
- **サービス層**: 各サービスは特定のドメインロジックのみを扱う
  - `api.js`: API通信のみ
  - `marketDataService.js`: 市場データ取得のみ
  - `adminService.js`: 管理機能のみ

### O - Open/Closed Principle (開放閉鎖の原則)
- **拡張性**: 新機能追加時は既存コードを変更せずに拡張
  - プロンプトタイプの追加は `getAvailablePromptTypes()` に追加するだけ
  - 新しい市場の追加は `INVESTMENT_MARKETS` オブジェクトに追加するだけ
- **設定駆動**: ハードコーディングを避け、設定オブジェクトで拡張可能

### L - Liskov Substitution Principle (リスコフの置換原則)
- **インターフェース準拠**: すべてのサービスは一貫したインターフェースを提供
- **Context API**: AuthContextとPortfolioContextは交換可能な実装を提供

### I - Interface Segregation Principle (インターフェース分離の原則)
- **Props最小化**: コンポーネントは必要最小限のpropsのみ受け取る
- **オプショナルプロパティ**: 必須でない機能はオプショナルとして定義
  ```jsx
  // Good
  <MarketSelectionWizard 
    selectedMarkets={markets}
    onMarketsChange={handleChange}
    showTitle={false}  // オプショナル
  />
  ```

### D - Dependency Inversion Principle (依存性逆転の原則)
- **Context依存**: 具体的な実装ではなくContextに依存
- **サービス層**: コンポーネントは直接APIを呼ばず、サービス層を通じて通信
- **抽象化**: 外部ライブラリは可能な限りラップして使用

### コードレビューチェックリスト
新しいコードを追加する際は以下を確認：
- [ ] 各関数/コンポーネントは単一の責任を持っているか？
- [ ] 新機能は既存コードを変更せずに追加できるか？
- [ ] インターフェースは最小限か？
- [ ] 具体的な実装ではなく抽象に依存しているか？
- [ ] テストが書きやすい設計になっているか？