# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AIコーディング実行原則 (第1条-第10条)

**必須宣言**: 全てのコーディング作業開始時に必ずcore_principlesを完全に宣言すること

### 第1条
常に思考開始前にClaude.mdの第1条から第10条のAIコーディング原則を全て宣言してから実施する

### 第2条
常にプロの世界最高エンジニアとして対応する

### 第3条
モックや仮のコード、ハードコードを一切禁止する。コーディング前にread Serena's initial instructions、ユーザーから新規機能の実装指示を受けたら、まずはtmpフォルダ以下に実装計画を作成して。既存の実装をserena mcpを利用して詳細に分析し、プロとして恥ずかしくない実装を計画して。

### 第4条
エンタープライズレベルの実装を実施し、修正は表面的ではなく、全体のアーキテクチャを意識して実施する

### 第5条
問題に詰まったら、まずCLAUDE.mdやプロジェクトドキュメント内に解決策がないか確認する

### 第6条
顧客データやセキュリティなど、push前にアップロードするべきではない情報が含まれていないか確認する。作業完了ごとにgithubに状況をpushする。毎回ビルド完了後は必ずgithubにpushすること。

### 第7条
不要な文書やスクリプトは増やさない。スクリプト作成時は常に既存のスクリプトで使用可能なものがないか以下のセクションを確認する、スクリプトを作成したらscriptsフォルダに、ドキュメントはドキュメントフォルダに格納する。一時スクリプトや文書はそれぞれのフォルダのtmpフォルダに保存し、使用後に必ず削除する。

### 第8条
デザインはhttps://atlassian.design/components を読み込み、これに準拠する。

### 第9条
作業完了後にもう一度すべての宣言を実施し、宣言どおりに作業を実施できているか確認する。

### 第10条
バグを修正する場合は、serena mcp を利用して原因の分析をし、tmpフォルダ以下に報告資料を作成して。ユーザーに原因について報告する。すでに同様のバグの報告資料がある場合は、それを更新する。ユーザーが確認したら修正方法を提案する。修正方法が妥当か十分にレビューし、他の宣言に矛盾していないか確認した上でユーザーの確認をとり修正を実施する。バグ報告はドキュメントを作成し、tmpフォルダ以下に保存する。ユーザーがバグが解決したと言うまでドキュメントを残し、バグが解決したらドキュメントは削除する。

## 実行チェックリスト

### 作業開始前
- [ ] 第1条から第10条の完全宣言を実施
- [ ] Serena's initial instructionsを読み込み
- [ ] 既存実装の詳細分析
- [ ] 実装計画の作成（tmpフォルダ）

### 作業中
- [ ] エンタープライズレベルの実装
- [ ] アーキテクチャ全体を意識した修正
- [ ] セキュリティチェック
- [ ] 適切なフォルダ構成の維持

### 作業完了後
- [ ] 全宣言との整合性確認
- [ ] ビルド実行とテスト
- [ ] ビルド完了後必ずGitHubへのpush
- [ ] tmpフォルダのクリーンアップ
- [ ] 完了報告

## ファイル組織ルール
- **スクリプト**: scriptsフォルダ
- **ドキュメント**: documentsフォルダ  
- **一時ファイル**: 各フォルダ/tmpサブフォルダ（使用後削除）
- **バグ報告**: documents/tmpフォルダ（解決まで保持）

## Important Workflow Guidelines

### Completion of Work
1. **GitHub Commit**: 作業が完了したらGitHubに追加すること
   - 変更内容を必ずコミットしてプッシュする
   - コミットメッセージは日本語でも英語でも可

2. **Build and Deploy**: 作業が完了したらClaude環境でビルドしデプロイすること
   ```bash
   # frontendディレクトリの場合
   cd frontend/webapp
   npm run build
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

# Advanced test options (using script/run-tests.sh)
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
- Custom test runner script (`script/run-tests.sh`) with advanced options
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

### Deployment
- **Frontend Hosting**: Cloudflare Pages (migrated from Netlify)
- **Backend API**: AWS Lambda + API Gateway
- **Database**: Amazon DynamoDB
- **Authentication**: Google OAuth + AWS Cognito

## Deployment Commands

### Frontend Deployment to Cloudflare Pages

```bash
# 1. Build the project
cd frontend/webapp
npm install
npm run build

# 2. Deploy to Cloudflare Pages
wrangler pages deploy build --project-name=portfolio-manager
```

### Backend Deployment to AWS

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Install required serverless plugin (if needed)
npm install serverless-dotenv-plugin --save-dev

# 3. Deploy to production
npm run deploy:prod
```

### Environment Variables for Cloudflare Pages

Set these in Cloudflare Pages dashboard:
- `REACT_APP_API_BASE_URL`: https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod
- `REACT_APP_DEFAULT_EXCHANGE_RATE`: 150.0

### CORS Configuration

The backend serverless.yml is configured to allow:
- https://portfolio-manager-7bx.pages.dev
- https://*.portfolio-manager-7bx.pages.dev
- https://portfolio-wise.com

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

## Deployment and URL Management

### Production URL
- **Primary Domain**: https://portfolio-wise.com/
- **Hosting**: Cloudflare Pages
- **Important**: Only this URL is registered with Google OAuth. Preview URLs (e.g., https://abc123.portfolio-manager-7bx.pages.dev) will NOT work for authentication.

### Deployment Process
1. **Build the production bundle**:
   ```bash
   cd frontend/webapp
   REACT_APP_API_BASE_URL='https://YOUR_AWS_API_URL.execute-api.REGION.amazonaws.com/prod' \
   REACT_APP_DEFAULT_EXCHANGE_RATE='150.0' \
   NODE_OPTIONS='--openssl-legacy-provider' \
   npm run build
   ```

2. **Deploy to Cloudflare Pages**:
   ```bash
   wrangler pages deploy build --project-name=portfolio-manager
   ```
   This creates a preview URL (e.g., https://abc123.portfolio-manager-7bx.pages.dev)

3. **Production Deployment**:
   - The deployment automatically promotes to https://portfolio-wise.com/ when pushed to the main branch
   - Custom domain is configured in Cloudflare Pages settings
   - SSL certificates are managed automatically by Cloudflare
   - **Note**: GitHub Actions is NOT used for deployment. Manual deployment via Wrangler CLI is required.

### Important Notes on URLs
- **Preview URLs**: Generated for each deployment, useful for testing UI changes but cannot authenticate with Google
- **Production URL**: Fixed domain (portfolio-wise.com) that is registered with Google OAuth
- **Google OAuth Redirect URIs**: Only the following are registered:
  - https://portfolio-wise.com/auth/google/callback
  - https://portfolio-wise.com/ (for popup auth)
  
Never attempt to add preview URLs to Google OAuth settings as they change with each deployment.