# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Testing
- `npm test` - Run all tests with forceExit
- `npm run test:unit` - Run only unit tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:all` - Run all tests in band (sequential)
- `jest --testNamePattern="specific test"` - Run specific test by name
- `jest path/to/test.js` - Run specific test file

### Development Server
- `npm run dev` - Start serverless offline development server
- `npm run dynamodb:start` - Start local DynamoDB instance (required for development)
- `npm run test:setup` - Initialize test environment

### Deployment

#### 独立プロジェクトとしてのデプロイ
バックエンドはモノレポから分離され、独立したServerlessプロジェクトとして運用されています。

```bash
# バックエンドデプロイ（本番環境）
cd backend
npm install  # 依存関係の独立管理
npm run deploy:prod

# 開発環境デプロイ
npm run deploy  # デフォルトはdev環境
```

#### デプロイ最適化
- **パッケージサイズ**: 32MB (Lambda制限250MBの13%)
- **Node.js Runtime**: 20.x (最新LTS)
- **Memory**: 512MB (パフォーマンス最適化)
- **除外パターン**: テスト・ドキュメント・開発ツール自動除外

### Utilities
- `npm run test:clean` - Clean test results directory

## Architecture Overview

This is an **独立したServerlessプロジェクト** - Google認証を含む portfolio management API built with AWS Lambda。モノレポから分離されており、フロントエンドとは独立してデプロイ・運用されます。

### 2025年7月現在の重要な変更
- ✅ **モノレポから独立**: 依存関係競合の解決
- ✅ **Google認証修復**: 502エラー→正常な400エラーレスポンス
- ✅ **パッケージ最適化**: 99.83MB→32MB (67%削減)
- ✅ **Node.js 20.x対応**: 最新ランタイム環境
- ✅ **Lambda Handler修正**: 正しいファイルパス設定

### 独立プロジェクトの利点
1. **デプロイ分離**: フロントエンド変更がバックエンドに影響しない
2. **依存関係最適化**: Lambdaに必要な最小限のパッケージのみ
3. **セキュリティ向上**: React開発ツールなどがLambda環境に混入しない
4. **スケーラビリティ**: 個別の最適化・監視が可能

### Core Components

1. **Multi-Source Data Fetching** (`src/services/sources/`)
   - Primary data sources (free優先):
     - Yahoo Finance2 (npm) - 無料、APIキー不要
     - JPX CSV - 日本取引所公式データ
     - Alpha Vantage API - APIキー必要時のみ
   - Fallback sources: Web scraping (Yahoo Finance, Minkabu, Kabutan, MarketWatch)
   - Blacklist system prevents repeated failures from same symbols

2. **Intelligent Caching** (`src/services/cache.js`)
   - DynamoDB-backed caching with configurable TTL per data type
   - Cache warming via scheduled Lambda (`src/function/preWarmCache.js`) - runs every 6 hours
   - Unified cache times: All data types cached for 1 hour
   - Batch caching support for multiple items (stocks, exchange rates)
   - Multi-item cache keys to reduce DynamoDB operations

3. **Fallback Data Store** (`src/services/fallbackDataStore.js`)
   - GitHub-based fallback data repository for when all live sources fail
   - Automatic failure tracking and statistics
   - Export functionality to update fallback data

4. **Google Integration** (`src/services/googleAuthService.js`)
   - OAuth authentication with Google
   - Google Drive integration for portfolio data storage
   - Session management with DynamoDB

5. **Budget and Usage Monitoring**
   - AWS budget tracking to stay within free tier limits
   - Request rate limiting and usage statistics
   - Alert system for budget and usage thresholds

### Key Data Flow

1. Request hits Lambda function handler (`src/function/marketData.js`)
2. Check cache first (`src/services/cache.js`)
3. If cache miss, try primary data sources in priority order
4. Use fallback data if all sources fail
5. Update cache and record metrics
6. Return standardized response format

### Data Types Supported
- `us-stock` - US stocks and ETFs
- `jp-stock` - Japanese stocks
- `mutual-fund` - Investment trusts/mutual funds
- `exchange-rate` - Currency exchange rates

### Error Handling Strategy
- Graceful degradation: always return data (even if stale/fallback)
- Comprehensive error categorization with specific error codes
- Blacklist system to avoid repeated failures
- Retry logic with exponential backoff for transient failures (reduced to 1 retry for cost optimization)

### Test Architecture
- Unit tests: Individual function testing with mocks
- Integration tests: Multi-component testing with real AWS services (mocked)
- E2E tests: Full API workflow testing
- Test utilities in `__tests__/testUtils/` for consistent mocking

## Important Development Notes

### Environment Variables
All configuration is done via environment variables defined in `serverless.yml`. Key variables:
- `DAILY_REQUEST_LIMIT` / `MONTHLY_REQUEST_LIMIT` - Usage limits (default: 5000/100000)
- `CACHE_TIME_*` - Cache TTL for different data types
- `ADMIN_IP_WHITELIST` - Allowed IPs for admin endpoints
- `SECRETS_MANAGER_SECRET_NAME` - AWS Secrets Manager secret name for API credentials
- External API keys stored in AWS Secrets Manager

### DynamoDB Tables
- `MarketDataCacheTable` - Data caching
- `SessionsTable` - User session management  
- `ScrapingBlacklistTable` - Failed symbol tracking
- `RateLimitTable` - Rate limiting tracking

### Testing Requirements
- Always run tests before committing changes
- Maintain coverage thresholds: 80% lines/statements, 70% branches
- Mock all external API calls and AWS services
- Use test utilities in `__tests__/testUtils/` for consistent setup

### Error Conventions
Use standardized error responses via `src/utils/errorHandler.js`:
- Include error type, message, and context
- Provide fallback data when possible
- Log appropriately based on severity level

### Code Patterns
- All Lambda handlers should use `src/utils/responseUtils.js` for consistent responses
- Use `src/utils/retry.js` for external API calls (default retry count: 1)
- Record metrics using `src/services/matrics.js` (note: filename uses non-standard spelling)
- Apply rate limiting and blacklist checks for web scraping
- Use `src/utils/corsHeaders.js` for CORS header management
- Admin endpoints are protected by AWS API Gateway `private: true` setting
- Prioritize free data sources (Yahoo Finance2, JPX CSV) over paid APIs
- Use batch requests to minimize API calls and avoid rate limits

### AWS Cost Optimization

1. **DynamoDB Optimizations**
   - Batch caching for multiple items to reduce read/write operations
   - Removed expensive Scan operations - rely on TTL for automatic cleanup
   - Cache cleanup function disabled in production

2. **Lambda Optimizations**
   - Reduced retry count from 3 to 1 for all external API calls
   - Reduced scheduled function frequency (cache warming: 1h → 6h)
   - Optimized function memory allocations

3. **CloudWatch Logs Optimizations**
   - Production log level set to WARN (reduced from INFO)
   - Minimized debug logging in production
   - Structured logging to reduce log volume

4. **Secrets Manager Optimizations**
   - Extended cache TTL from 5 minutes to 24 hours
   - Reduced API calls for secret retrieval

5. **API Gateway Optimizations**
   - Proper CORS configuration to avoid unnecessary preflight requests
   - Batch API support to reduce number of requests
   - Cookie settings with SameSite=None and Secure for cross-origin requests

### Free Data Sources Implementation

1. **Yahoo Finance2 (npm package)**
   - No API key required
   - Supports US stocks, Japanese stocks, ETFs, exchange rates
   - Real-time data
   - Implementation: `src/services/sources/yahooFinance2Service.js`

2. **JPX CSV Data**
   - Official data from Japan Exchange Group
   - 20-minute delayed data
   - Free and reliable
   - Implementation: `src/services/sources/jpxCsvService.js`

3. **Data Source Priority**
   - Always check free sources first
   - Fall back to paid APIs only when necessary
   - Use caching aggressively to minimize external calls