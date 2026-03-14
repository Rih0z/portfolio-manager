# Frontend Services & Utilities

Service layer and utility modules for the PortfolioWise frontend application (`frontend/webapp/src/`).

## Services (src/services/)

### Top-level Services

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| `api.ts` | API entry point that re-exports market data functions and provides deprecated Google Drive/auth compatibility shims | `getApiEndpoint`, `fetchTickerData`, `fetchExchangeRate`, `fetchMultipleTickerData`, `fetchApiStatus`, `fetchFundInfo`, `fetchDividendData`, `checkDataFreshness`, `initGoogleDriveAPI`, `setGoogleAccessToken`, `getGoogleAccessToken`, `saveToGoogleDrive`, `loadFromGoogleDrive` |
| `adminService.ts` | Admin-only API calls for system status retrieval and usage reset | `getStatus`, `resetUsage`, `createAdminClient` |
| `configService.ts` | Fetches and caches client-side API configuration (URLs, keys, feature flags) from AWS | `fetchApiConfig`, `getApiUrl`, `getApiStage`, `getGoogleClientId`, `getFeatureFlags`, `clearConfigCache` |
| `googleDriveService.ts` | Google Drive integration for portfolio data backup, restore, and file listing via backend API | `fetchDriveFiles`, `saveToDrive`, `loadFromDrive` |
| `marketDataService.ts` | Market data fetching for stock prices, exchange rates, and batch ticker queries with type-based routing (US stock, JP stock, mutual fund) | `fetchExchangeRate`, `fetchStockData`, `fetchMultipleStocks`, `fetchApiStatus` |
| `notificationService.ts` | Notification and alert rule CRUD operations via backend API | `fetchNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification`, `fetchAlertRules`, `createAlertRule`, `updateAlertRule`, `deleteAlertRule` |
| `portfolioSyncService.ts` | Server-side portfolio data sync with version conflict detection (optimistic locking) | `fetchServerPortfolio`, `saveServerPortfolio` |
| `priceHistoryService.ts` | Historical price data fetching for individual and multiple tickers with concurrency limiting | `fetchPriceHistory`, `fetchMultiplePriceHistories` |
| `PromptOrchestrationService.ts` | AI prompt generation engine that creates personalized investment analysis prompts based on user context, emotional state, and portfolio data | `PromptOrchestrationService` (class, singleton): `generatePersonalizedPrompt`, `generatePerspectivePrompt`, `generateDataImportPrompt`, `updateUserContext`, `startSession`, `analyzeEmotionalContext`, `recordPrompt`, `learnFromResponse`, `exportUserProfile`, `importUserProfile`, `reset` |
| `referralService.ts` | Referral program API calls for code generation, validation, application, and statistics | `getReferralCode`, `getReferralStats`, `applyReferralCode`, `validateReferralCode` |
| `socialService.ts` | Social portfolio sharing and peer comparison API calls | `createShareApi`, `getShareApi`, `deleteShareApi`, `getUserSharesApi`, `getPeerComparisonApi` |
| `subscriptionService.ts` | Stripe subscription management for checkout session creation, customer portal, and status retrieval | `createCheckoutSession`, `createPortalSession`, `getSubscriptionStatus` |

### Portfolio Services (src/services/portfolio/)

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| `CalculationService.ts` | Portfolio financial calculations including total assets, fees, dividends, currency conversion, and rebalance diffs | `PortfolioCalculationService` (static class): `calculateTotalAssets`, `calculateAnnualFees`, `calculateAnnualDividends`, `convertCurrency`, `calculateCurrentAllocations`, `calculateRebalanceDifferences` |
| `EncryptionService.ts` | Basic XOR-based data encryption/decryption with SHA-256 password hashing for local storage protection | `EncryptionService` (static class): `hasPassword`, `setPassword`, `verifyPassword`, `hashPassword`, `encrypt`, `decrypt` |
| `ModernEncryptionService.ts` | Web Crypto API-based encryption using AES-GCM with PBKDF2 key derivation (successor to EncryptionService) | `ModernEncryptionService` (static class): `hasPassword`, `setPassword`, `verifyPassword`, `encrypt`, `decrypt`, `isAvailable` |
| `NotificationService.ts` | Client-side toast notification manager with auto-dismiss and listener subscription pattern | `NotificationService` (class, singleton as `notificationService`): `add`, `remove`, `getAll`, `subscribe` |
| `SimulationService.ts` | Investment simulation engine that calculates optimal purchase plans based on target allocations and additional budget | `SimulationService` (static class): `runSimulation`, `executePurchases` |

### Storage Providers (src/services/portfolio/storage/)

| Provider | Purpose |
|----------|---------|
| `StorageInterface.ts` | Abstract base classes (`StorageProvider`, `CloudSyncProvider`) defining the storage contract with `save`, `load`, `clear`, and `checkSyncStatus` methods |
| `LocalStorageProvider.ts` | `StorageProvider` implementation backed by browser localStorage with optional XOR encryption support |
| `GoogleDriveProvider.ts` | `CloudSyncProvider` implementation that persists portfolio data to Google Drive via the backend API |

## Utilities (src/utils/)

| Utility | Purpose | Key Exports |
|---------|---------|-------------|
| `analytics.ts` | Google Analytics 4 event tracking with dynamic script injection (production only) | `AnalyticsEvents`, `initGA`, `trackEvent`, `trackPageView` |
| `apiUtils.ts` | Core API client factory with Axios interceptors, JWT auth, token refresh, circuit breakers, retry with exponential backoff, and fallback data generation | `createApiClient`, `marketDataClient`, `authApiClient`, `fetchWithRetry`, `authFetch`, `formatErrorResponse`, `generateFallbackData`, `setAuthToken`, `getAuthToken`, `clearAuthToken`, `refreshAccessToken`, `resetCircuitBreaker`, `resetAllCircuitBreakers`, `wait`, `TIMEOUT`, `RETRY` |
| `assetValidation.ts` | Asset data validation, sanitization, and fund type/fee auto-correction logic | `validatePortfolioData`, `sanitizeAssetData`, `validateAssetInput`, `validateTickerFormat`, `validateAssetName`, `validateNumericValue`, `validateAssetTypes` |
| `cookieDebugUtils.ts` | Debug utilities for inspecting browser cookies, CORS settings, and Google Drive auth flow | `analyzeCookies`, `logCookieStatus`, `debugDriveAuth`, `testCookieSettings`, `testCorsSettings` |
| `csrfManager.ts` | CSRF token manager that adds X-CSRF-Token headers to non-GET requests (currently returns dummy token) | `csrfManager` (singleton class): `getToken`, `refreshToken`, `clearToken`, `addTokenToRequest` |
| `csvParsers.ts` | Broker-specific CSV parsers for SBI, Rakuten, Monex, and generic formats with Shift-JIS auto-detection | `parseBrokerCSV`, `detectBrokerFormat`, `parseSBICSV`, `parseRakutenCSV`, `parseMonexCSV`, `parseGenericCSV`, `isLikelyShiftJIS`, `decodeCSVBuffer` |
| `envUtils.ts` | Environment-aware API endpoint resolution, Google Client ID fetching, and redirect URI generation using AWS-fetched config | `getApiEndpoint`, `getBaseApiUrl`, `getApiStage`, `getGoogleClientId`, `getOrigin`, `getRedirectUri`, `getDefaultExchangeRate`, `isDevelopment`, `isLocalDevelopment`, `initializeApiConfig` |
| `errorHandler.ts` | Production error handler that sanitizes errors, maps HTTP status codes to user-friendly Japanese messages, and sets up global error listeners with Sentry integration | `sanitizeError`, `handleApiError`, `setupGlobalErrorHandlers`, `logErrorToService` |
| `errorUtils.ts` | Type-safe error extraction helpers for `catch(e: unknown)` blocks | `getErrorMessage`, `isError`, `getErrorStatus` |
| `exchangeRateDebounce.ts` | Exchange rate update throttling with 1-hour minimum interval and cache clearing | `shouldUpdateExchangeRate`, `resetExchangeRateTimer`, `clearExchangeRateCache` |
| `fixExchangeRate.ts` | Browser console repair utility that fixes corrupted exchange rate data in localStorage | `fixExchangeRate` (also exposed as `window.fixExchangeRate`) |
| `formatters.ts` | Number, currency, percentage, and date formatting functions with JPY/USD and ja-JP locale support | `formatCurrency`, `formatPercent`, `formatDate`, `formatPercentage`, `formatNumber`, `formatDateIntl`, `formatDateRelative` |
| `fundUtils.ts` | Fund type classification engine with ticker-specific fee/dividend databases for ETFs, mutual funds, stocks, REITs, bonds, and crypto | `guessFundType`, `estimateAnnualFee`, `extractFundInfo`, `estimateDividendYield`, `FUND_TYPES`, `FUND_TYPE_FEES`, `TICKER_SPECIFIC_FEES`, `TICKER_SPECIFIC_DIVIDENDS`, `US_ETF_LIST`, `DATA_SOURCES` |
| `goalCalculations.ts` | Investment goal progress calculation, monthly contribution estimation, and completion date projection | `calculateGoalProgress`, `calculateMonthlyRequired`, `estimateCompletionDate`, `validateGoalInput` |
| `japaneseStockNames.ts` | Japanese stock and mutual fund name lookup from ticker codes (60+ stocks, 30+ funds) | `getJapaneseStockName`, `formatJapaneseStockDisplay`, `MUTUAL_FUND_NAMES`, `JAPAN_STOCK_NAMES` |
| `lazyWithRetry.tsx` | React.lazy wrapper that retries chunk loading up to 2 times before showing a reload fallback UI | `lazyWithRetry` |
| `logger.ts` | Secure logging utility that masks sensitive data (tokens, passwords, sessions) in all environments and suppresses logs in production | `logger` (default export with `log`, `info`, `warn`, `error`, `debug`), `replaceConsoleLog` |
| `monthlyReport.ts` | Monthly investment report generator with return calculations, top gainers/losers, and formatted summaries in Japanese/English | `calculateMonthlyReturn`, `generateMonthlyReport`, `formatReportSummary` |
| `pdfExport.ts` | PDF export of portfolio data (assets, P&L, score) using jsPDF + autotable with NotoSansJP font for Japanese support (Standard plan only) | `exportPortfolioPDF` |
| `plCalculation.ts` | Portfolio-wide profit/loss calculation with per-asset P&L, day-over-day change, and year-to-date performance using price history data | `calculatePortfolioPnL` |
| `portfolioDataEnricher.ts` | Aggregates portfolio score, P&L, holdings, and target deviation data into a single structured object for prompt generation and UI display | `enrichPortfolioData` (type: `EnrichedPortfolioData`) |
| `portfolioScore.ts` | 8-metric portfolio scoring engine (0-100) evaluating diversification, target alignment, cost efficiency, rebalance health, currency diversification, dividend health, asset type diversity, and data freshness | `calculatePortfolioScore` (type: `PortfolioScoreResult`, `ScoreMetric`) |
| `requestThrottle.ts` | Request queue, debounce, throttle, rate-limited request manager with exponential backoff, batch processing, and request deduplication | `debounce`, `throttle`, `requestManager` (singleton), `debouncedRefreshMarketData`, `batchRequests`, `requestDeduplicator` (singleton) |
| `resetCircuitBreaker.ts` | Debug utility that exposes `window.resetCircuitBreakers()` for manually resetting all circuit breakers | `resetAllCircuitBreakers` |
| `sentry.ts` | Sentry error monitoring integration with sensitive data scrubbing, noise filtering, and 10% trace sampling (production only) | `initSentry`, `setSentryUser`, `captureException`, `captureMessage`, `isSentryInitialized` |
| `seo.ts` | SEO metadata definitions (title, description, OGP) for each route, consumed by SEOHead component | `getSEOMeta`, `SEO_DEFAULTS`, `SEO_BY_ROUTE` |
| `webVitals.ts` | Core Web Vitals (CLS, INP, LCP, FCP, TTFB) measurement with GA4 reporting via dynamic import (production only) | `reportWebVitals` |
