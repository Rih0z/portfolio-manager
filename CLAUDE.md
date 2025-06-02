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