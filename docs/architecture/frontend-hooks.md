# Frontend Hooks Reference

This document catalogs all custom React hooks in `frontend/webapp/src/hooks/`, organized by directory.

---

## Root Hooks (`src/hooks/`)

### useAuth

**File:** `src/hooks/useAuth.ts`

**Purpose:** Selector hook for Zustand authStore; replaces deprecated AuthContext.

**Parameters:** None

**Return type:** `AuthStoreValue`
```ts
{
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  hasDriveAccess: boolean;
  googleClientId: string;
  loginWithGoogle: (credentialResponse: any) => Promise<any>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  initiateDriveAuth: () => Promise<boolean>;
  handleLogout: () => Promise<void>;
  login: (credentialResponse: any) => Promise<any>;
  authorizeDrive: () => Promise<boolean>;
  setPortfolioContextRef?: (context: any) => void; // noop, backward compat
}
```

**Store/Service used:** `authStore`

---

### usePortfolioContext

**File:** `src/hooks/usePortfolioContext.ts`

**Purpose:** Unified selector hook combining portfolioStore and uiStore; replaces deprecated PortfolioContext. Provides all portfolio state, actions, cloud sync, server sync, computed totals, and backward-compatible aliases.

**Parameters:** None

**Return type:** `PortfolioContextValue` -- a large interface containing:
- **State:** `baseCurrency`, `exchangeRate`, `lastUpdated`, `isLoading`, `currentAssets`, `targetPortfolio`, `additionalBudget`, `totalAssets`, `annualFees`, `annualDividends`, `dataSource`, `lastSyncTime`, `aiPromptTemplate`, `initialized`, `currentUser`, `notifications`, `serverVersion`, `syncStatus`, `lastServerSync`
- **Actions:** `toggleCurrency`, `refreshMarketPrices`, `addTicker`, `updateTargetAllocation`, `updateHoldings`, `updatePurchasePrice`, `updateAnnualFee`, `updateDividendInfo`, `removeTicker`, `setAdditionalBudget`, `calculateSimulation`, `executePurchase`, `executeBatchPurchase`, `importData`, `exportData`, `addNotification`, `removeNotification`, `convertCurrency`, `calculatePurchaseShares`, `updateExchangeRate`, `resetExchangeRate`, `updateAiPromptTemplate`, `setBaseCurrency`, `setAiPromptTemplate`
- **Cloud sync:** `saveToLocalStorage`, `loadFromLocalStorage`, `clearLocalStorage`, `saveToGoogleDrive`, `loadFromGoogleDrive`, `handleAuthStateChange`, `initializeData`, `validateAssetTypes`, `syncToServer`, `syncFromServer`, `resolveConflict`
- **Aliases:** `totalAnnualFees`, `totalAnnualDividends`, `refreshMarketData`, `updateHolding`, `removeAsset`, `runSimulation`
- **Diagnostics:** `debugLocalStorage()`

**Store/Service used:** `portfolioStore` (via `usePortfolioStore` + `selectTotalAssets`, `selectAnnualFees`, `selectAnnualDividends`), `uiStore`

---

### useGoogleDrive

**File:** `src/hooks/useGoogleDrive.ts`

**Purpose:** Google Drive file operations (list, save, load) with 5-minute file list cache and debounced saves.

**Parameters:** None

**Return type:** `UseGoogleDriveReturn`
```ts
{
  listFiles: (forceRefresh?: boolean) => Promise<DriveFile[] | null>;
  saveFile: (...args: any[]) => any;  // debounced (2s)
  loadFile: (fileId: string) => Promise<any | null>;
  loading: boolean;
  error: string | null;
}
```

**Store/Service used:** `useAuth` hook (for `isAuthenticated`), `googleDriveService` (`fetchDriveFiles`, `saveToDrive`, `loadFromDrive`)

---

### useAlertEvaluation

**File:** `src/hooks/useAlertEvaluation.ts`

**Purpose:** Watches `portfolioStore.lastUpdated` changes and triggers alert rule evaluation against current portfolio data. On authentication, fetches server notifications and alert rules.

**Parameters:** None

**Return type:** `void`

**Store/Service used:** `authStore` (`isAuthenticated`), `portfolioStore` (`lastUpdated`, `currentAssets`, `targetPortfolio`, `baseCurrency`, `exchangeRate`), `goalStore` (`goals`), `notificationStore` (`evaluateAlerts`, `fetchNotifications`, `fetchAlertRules`)

---

### useInstallPrompt

**File:** `src/hooks/useInstallPrompt.ts`

**Purpose:** PWA install prompt management. Captures `beforeinstallprompt` event, tracks install status, and provides prompt/dismiss functions. Dismiss is remembered for 7 days in localStorage.

**Parameters:** None

**Return type:** `UseInstallPromptReturn`
```ts
{
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  dismissInstall: () => void;
}
```

**Store/Service used:** None (standalone browser API hook)

---

### useNPSSurvey

**File:** `src/hooks/useNPSSurvey.ts`

**Purpose:** NPS (Net Promoter Score) survey display logic. Shows survey after 7 days from first login, with 90-day cooldown after submission and 30-day cooldown after dismiss. One prompt per session.

**Parameters:** None

**Return type:** `UseNPSSurveyReturn`
```ts
{
  shouldShow: boolean;
  submit: (score: number, comment?: string) => void;
  dismiss: () => void;
}
```

**Store/Service used:** `authStore` (`isAuthenticated`), `analytics` (tracks `NPS_SUBMIT`, `NPS_DISMISS`)

---

### useOnlineStatus

**File:** `src/hooks/useOnlineStatus.ts`

**Purpose:** Network connectivity detection using `navigator.onLine` and `online`/`offline` events.

**Parameters:** None

**Return type:** `boolean` -- `true` if online, `false` if offline

**Store/Service used:** None (standalone browser API hook)

---

### usePWA

**File:** `src/hooks/usePWA.ts`

**Purpose:** Service Worker registration and update management. Wraps `vite-plugin-pwa`'s `useRegisterSW`. Checks for SW updates every 60 minutes (with 5-minute jitter). Notifies when offline-ready.

**Parameters:** None

**Return type:** `UsePWAReturn`
```ts
{
  needRefresh: boolean;
  updateServiceWorker: () => Promise<void>;
  dismissUpdate: () => void;
}
```

**Store/Service used:** `uiStore` (`addNotification`)

---

### useReferralCapture

**File:** `src/hooks/useReferralCapture.ts`

**Purpose:** Automatically captures referral code from URL `?ref=` parameter and applies it after user authentication. Uses sessionStorage for persistence across page navigations.

**Parameters:** None

**Return type:** `void`

**Store/Service used:** `authStore` (`isAuthenticated`), `useApplyReferral` mutation (from `queries/useReferral`), `analytics` (tracks `REFERRAL_SIGNUP`, `REFERRAL_CODE_APPLY`)

---

## Portfolio Hooks (`src/hooks/portfolio/`)

Thin selector hooks that expose focused slices of portfolioStore/uiStore for specific UI concerns.

### usePortfolioData

**File:** `src/hooks/portfolio/usePortfolioData.ts`

**Purpose:** Read-only portfolio data selector (assets, allocations, currency, totals, loading state).

**Parameters:** None

**Return type:**
```ts
{
  currentAssets: CurrentAsset[];
  targetPortfolio: TargetAllocation[];
  baseCurrency: string;
  exchangeRate: ExchangeRate;
  totalAssets: number;           // via selectTotalAssets
  totalAnnualFees: number;       // via selectAnnualFees
  totalAnnualDividends: number;  // via selectAnnualDividends
  additionalBudget: { amount: number; currency: string };
  aiPromptTemplate: string | null;
  isLoading: boolean;
  lastUpdated: string | null;
  initialized: boolean;
}
```

**Store/Service used:** `portfolioStore` (+ derived selectors), `uiStore` (`isLoading`)

---

### usePortfolioActions

**File:** `src/hooks/portfolio/usePortfolioActions.ts`

**Purpose:** Portfolio mutation actions selector (add/remove assets, update allocations, refresh data, import/export).

**Parameters:** None

**Return type:**
```ts
{
  addTicker: (ticker: string) => Promise<OperationResult>;
  updateHolding: (id: string, holdings: number | string) => void;
  removeAsset: (id: string) => void;
  updateTargetAllocation: (id: string, percentage: number | string) => void;
  setBaseCurrency: (currency: string) => void;
  setAdditionalBudget: (amount: number | string, currency?: string) => void;
  setAiPromptTemplate: (template: string | null) => void;
  refreshMarketData: () => Promise<OperationResult>;
  updateExchangeRate: (forceUpdate?: boolean) => Promise<void>;
  importData: (data: unknown) => OperationResult;
  exportData: () => PortfolioExport;
}
```

**Store/Service used:** `portfolioStore`

---

### useCloudSync

**File:** `src/hooks/portfolio/useCloudSync.ts`

**Purpose:** Cloud sync actions and state selector (Google Drive save/load, sync metadata).

**Parameters:** None

**Return type:**
```ts
{
  saveToGoogleDrive: (userData?) => Promise<SyncResult>;
  loadFromGoogleDrive: (userData?) => Promise<SyncResult>;
  dataSource: string;
  lastSyncTime: string | null;
  currentUser: UserData | null;
  handleAuthStateChange: (isAuthenticated: boolean, user: UserData | null) => void;
}
```

**Store/Service used:** `portfolioStore`

---

### useNotifications (portfolio)

**File:** `src/hooks/portfolio/useNotifications.ts`

**Purpose:** Toast notification management selector (list, add, remove).

**Parameters:** None

**Return type:** `UseNotificationsReturn`
```ts
{
  notifications: any[];
  addNotification: (message: string, type?: string) => string;
  removeNotification: (id: string) => void;
}
```

**Store/Service used:** `uiStore`

---

### useSimulation

**File:** `src/hooks/portfolio/useSimulation.ts`

**Purpose:** Investment simulation selector (run simulation, execute purchase).

**Parameters:** None

**Return type:**
```ts
{
  runSimulation: () => SimulationItem[];
  executePurchase: (tickerId: string, units: number | string) => void;
  simulationResult: SimulationItem[] | null;  // always null (computed on demand)
  includeCurrentHoldings: boolean;             // always true (legacy compat)
  setIncludeCurrentHoldings: () => void;       // noop (legacy compat)
}
```

**Store/Service used:** `portfolioStore`

---

## Query Hooks (`src/hooks/queries/`)

TanStack Query hooks wrapping service layer API calls. Each provides caching, automatic refetch, and cache invalidation on mutations.

### useExchangeRate

**File:** `src/hooks/queries/useExchangeRate.ts`

**Purpose:** Fetch and cache exchange rates between currency pairs.

**Parameters:** `fromCurrency?: string` (default `'USD'`), `toCurrency?: string` (default `'JPY'`), `options?: { enabled?, refetchInterval? }`

**Return type:** `UseQueryResult<ExchangeRateData>` where `ExchangeRateData = { rate, source, lastUpdated, isDefault?, isStale? }`

**Cache:** staleTime 5 min, gcTime 30 min, retry 2

**Service used:** `marketDataService.fetchExchangeRate`

**Query key:** `exchangeRateKeys.pair(from, to)` = `['exchangeRate', from, to]`

---

### useStockPrices

**File:** `src/hooks/queries/useStockPrices.ts`

**Purpose:** Batch fetch and cache stock prices for multiple tickers.

**Parameters:** `tickers: string[]`, `options?: { enabled?, refetchInterval? }`

**Return type:** `UseQueryResult<StockPriceData>` where `StockPriceData` is a map of ticker to `{ price, source, lastUpdated, fundType?, annualFee?, feeSource?, region?, dividendYield?, ... }`

**Cache:** staleTime 1 min, gcTime 10 min, retry 2

**Service used:** `marketDataService.fetchMultipleStocks`

**Query key:** `stockPriceKeys.batch(tickers)` = `['stockPrices', ...tickers.sort()]`

---

### useSubscriptionStatus

**File:** `src/hooks/queries/useSubscription.ts`

**Purpose:** Fetch current subscription status from server.

**Parameters:** `options?: { enabled? }`

**Return type:** `UseQueryResult<SubscriptionStatus>`

**Cache:** staleTime 10 min, gcTime 30 min, retry 1

**Service used:** `subscriptionService.getSubscriptionStatus`

**Query key:** `subscriptionKeys.status()` = `['subscription', 'status']`

---

### useCreateCheckout

**File:** `src/hooks/queries/useSubscription.ts`

**Purpose:** Create a Stripe Checkout session for subscription upgrade.

**Parameters:** None (mutation hook)

**Mutation input:** `plan: 'monthly' | 'annual'` (default `'monthly'`)

**On success:** Invalidates `subscriptionKeys.all`

**Service used:** `subscriptionService.createCheckoutSession`

---

### useCreatePortal

**File:** `src/hooks/queries/useSubscription.ts`

**Purpose:** Create a Stripe Customer Portal session for subscription management.

**Parameters:** None (mutation hook)

**Service used:** `subscriptionService.createPortalSession`

---

### useIsPremium

**File:** `src/hooks/queries/useSubscription.ts`

**Purpose:** Convenience boolean hook returning whether the user is on the Standard (premium) plan.

**Parameters:** None

**Return type:** `boolean`

**Internally uses:** `useSubscriptionStatus`

---

### useCanUseFeature

**File:** `src/hooks/queries/useSubscription.ts`

**Purpose:** Check if a specific feature is available on the user's current plan.

**Parameters:** `feature: string` -- feature name (e.g., `'unlimitedHoldings'`, `'pdfExport'`, `'purchasePrice'`)

**Return type:** `boolean` -- `true` if premium or if feature is available on Free plan

**Internally uses:** `useIsPremium`

---

### getIsPremiumFromCache

**File:** `src/hooks/queries/useSubscription.ts`

**Purpose:** Non-React helper to check premium status from TanStack Query cache. Used by Zustand stores for plan-based limits.

**Parameters:** None

**Return type:** `boolean`

**Reads:** `queryClient.getQueryData(subscriptionKeys.status())`

---

### usePriceHistory

**File:** `src/hooks/queries/usePriceHistory.ts`

**Purpose:** Fetch price history for a single ticker over a given period.

**Parameters:** `ticker: string`, `period: PricePeriod` (default `'1m'`), `options?: { enabled? }`

**Return type:** `UseQueryResult<PriceHistoryResponse | null>`

**Cache:** staleTime 30 min, gcTime 1 hour, retry 1

**Service used:** `priceHistoryService.fetchPriceHistory`

**Query key:** `priceHistoryKeys.ticker(ticker, period)` = `['priceHistory', ticker, period]`

---

### usePriceHistories

**File:** `src/hooks/queries/usePriceHistory.ts`

**Purpose:** Parallel price history fetch for multiple tickers using `useQueries`.

**Parameters:** `tickers: string[]`, `period: PricePeriod` (default `'1m'`), `options?: { enabled? }`

**Return type:** `UseQueryResult<PriceHistoryResponse | null>[]` (array of query results)

**Cache:** Same as `usePriceHistory`

**Service used:** `priceHistoryService.fetchPriceHistory`

---

### useNotifications (queries)

**File:** `src/hooks/queries/useNotificationQueries.ts`

**Purpose:** Fetch paginated notification list from server.

**Parameters:** `limit: number` (default `20`), `options?: { enabled? }`

**Return type:** `UseQueryResult<{ notifications: AppNotification[]; lastKey?: string | null }>`

**Cache:** staleTime 5 min, gcTime 15 min, retry 1

**Service used:** `notificationService.fetchNotifications`

**Query key:** `notificationKeys.list(limit)` = `['notifications', 'list', limit]`

---

### useAlertRules

**File:** `src/hooks/queries/useNotificationQueries.ts`

**Purpose:** Fetch all alert rules from server.

**Parameters:** `options?: { enabled? }`

**Return type:** `UseQueryResult<AlertRule[]>`

**Cache:** staleTime 10 min, gcTime 30 min, retry 1

**Service used:** `notificationService.fetchAlertRules`

**Query key:** `notificationKeys.alertRules()` = `['notifications', 'alertRules']`

---

### useCreateAlertRule

**File:** `src/hooks/queries/useNotificationQueries.ts`

**Purpose:** Create a new alert rule (mutation).

**Mutation input:** `AlertRuleInput` (`{ type, ticker, targetValue, ... }`)

**On success:** Invalidates `notificationKeys.alertRules()`

**Service used:** `notificationService.createAlertRule`

---

### useUpdateAlertRule

**File:** `src/hooks/queries/useNotificationQueries.ts`

**Purpose:** Update an existing alert rule (mutation).

**Mutation input:** `{ ruleId: string; updates: Partial<AlertRuleInput> }`

**On success:** Invalidates `notificationKeys.alertRules()`

**Service used:** `notificationService.updateAlertRule`

---

### useDeleteAlertRule

**File:** `src/hooks/queries/useNotificationQueries.ts`

**Purpose:** Delete an alert rule (mutation).

**Mutation input:** `ruleId: string`

**On success:** Invalidates `notificationKeys.alertRules()`

**Service used:** `notificationService.deleteAlertRule`

---

### useMarkNotificationRead

**File:** `src/hooks/queries/useNotificationQueries.ts`

**Purpose:** Mark a single notification as read (mutation).

**Mutation input:** `notificationId: string`

**On success:** Invalidates `notificationKeys.all`

**Service used:** `notificationService.markNotificationRead`

---

### useMarkAllNotificationsRead

**File:** `src/hooks/queries/useNotificationQueries.ts`

**Purpose:** Mark all notifications as read (mutation).

**On success:** Invalidates `notificationKeys.all`

**Service used:** `notificationService.markAllNotificationsRead`

---

### useDeleteNotification

**File:** `src/hooks/queries/useNotificationQueries.ts`

**Purpose:** Delete a notification (mutation).

**Mutation input:** `notificationId: string`

**On success:** Invalidates `notificationKeys.all`

**Service used:** `notificationService.deleteNotification`

---

### useUserShares

**File:** `src/hooks/queries/useUserShares.ts`

**Purpose:** Fetch the current user's shared portfolios.

**Parameters:** `options?: { enabled? }`

**Return type:** `UseQueryResult<{ shares: SharedPortfolio[] }>`

**Cache:** staleTime 1 min, gcTime 10 min, retry 1

**Service used:** `socialService.getUserSharesApi`

**Query key:** `userShareKeys.list()` = `['userShares', 'list']`

---

### useCreateShare

**File:** `src/hooks/queries/useUserShares.ts`

**Purpose:** Create a new portfolio share (mutation).

**Mutation input:** `{ displayName, ageGroup?, allocationSnapshot, portfolioScore, assetCount }`

**On success:** Invalidates `userShareKeys.all`

**Service used:** `socialService.createShareApi`

---

### useDeleteShare

**File:** `src/hooks/queries/useUserShares.ts`

**Purpose:** Delete a portfolio share (mutation).

**Mutation input:** `shareId: string`

**On success:** Invalidates `userShareKeys.all`

**Service used:** `socialService.deleteShareApi`

---

### usePeerComparison

**File:** `src/hooks/queries/usePeerComparison.ts`

**Purpose:** Fetch peer comparison data by age group.

**Parameters:** `ageGroup: string`, `options?: { enabled? }`

**Return type:** `UseQueryResult<PeerComparison>`

**Cache:** staleTime 10 min, gcTime 30 min, retry 1

**Service used:** `socialService.getPeerComparisonApi`

**Query key:** `peerComparisonKeys.byAge(ageGroup)` = `['peerComparison', ageGroup]`

---

### useReferralCode

**File:** `src/hooks/queries/useReferral.ts`

**Purpose:** Fetch the current user's referral code.

**Parameters:** `options?: { enabled? }`

**Return type:** `UseQueryResult<ReferralCode>`

**Cache:** staleTime Infinity (code is immutable), gcTime 1 hour, retry 1

**Service used:** `referralService.getReferralCode`

**Query key:** `referralKeys.code()` = `['referral', 'code']`

---

### useReferralStats

**File:** `src/hooks/queries/useReferral.ts`

**Purpose:** Fetch referral program statistics.

**Parameters:** `options?: { enabled? }`

**Return type:** `UseQueryResult<ReferralStats>`

**Cache:** staleTime 5 min, gcTime 15 min, retry 1

**Service used:** `referralService.getReferralStats`

**Query key:** `referralKeys.stats()` = `['referral', 'stats']`

---

### useApplyReferral

**File:** `src/hooks/queries/useReferral.ts`

**Purpose:** Apply a referral code (mutation).

**Mutation input:** `code: string`

**On success:** Invalidates `referralKeys.all`

**Service used:** `referralService.applyReferralCode`

---

### useServerPortfolio

**File:** `src/hooks/queries/useServerPortfolio.ts`

**Purpose:** Fetch portfolio data from server (for sync comparison).

**Parameters:** `options?: { enabled? }`

**Return type:** `UseQueryResult<ServerPortfolio>`

**Cache:** staleTime 5 min, gcTime 30 min, retry 1

**Service used:** `portfolioSyncService.fetchServerPortfolio`

**Query key:** `serverPortfolioKeys.data()` = `['serverPortfolio', 'data']`

---

### useSavePortfolio

**File:** `src/hooks/queries/useServerPortfolio.ts`

**Purpose:** Save portfolio to server with version control (mutation). Handles `VERSION_CONFLICT` errors by invalidating cache for caller to re-fetch.

**Mutation input:** `{ data: PortfolioData; version: number | null }`

**On success:** Invalidates `serverPortfolioKeys.all`

**Service used:** `portfolioSyncService.saveServerPortfolio`

---

## Hook Naming Conventions

| Pattern | Location | Purpose |
|---------|----------|---------|
| `use<Domain>` | Root `hooks/` | Standalone feature hooks (auth, PWA, NPS, etc.) |
| `use<Concern>` | `hooks/portfolio/` | Thin selectors over portfolioStore/uiStore |
| `use<Resource>` | `hooks/queries/` | TanStack Query wrappers over service API calls |
| `use<Action>` | `hooks/queries/` | TanStack Mutation wrappers (create/update/delete) |

## Barrel Export

All query hooks are re-exported from `src/hooks/queries/index.ts`, so consumers can import via:
```ts
import { useExchangeRate, useIsPremium, useStockPrices, ... } from '../hooks/queries';
```
