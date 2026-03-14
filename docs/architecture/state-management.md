# State Management Architecture

This document describes all 8 Zustand stores in the PFWise frontend application. Each store manages a distinct domain of state with cross-store communication via `getState()`.

---

## 1. authStore (`src/stores/authStore.ts`)

**Purpose:** Authentication state management including Google OAuth, JWT token management, session persistence, and Google Drive authorization.

**Persistence:** Manual localStorage (`pfwise_session`) for session data. JWT tokens stored in-memory only (never localStorage).

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `user` | `UserData \| null` | Authenticated user (`{ id, email, name, picture }`) |
| `isAuthenticated` | `boolean` | Whether the user is currently authenticated |
| `loading` | `boolean` | Authentication operation in progress |
| `error` | `string \| null` | Last authentication error message |
| `hasDriveAccess` | `boolean` | Whether user has authorized Google Drive |
| `googleClientId` | `string` | Google OAuth Client ID (fetched from AWS at runtime) |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `loginWithGoogle` | `(credentialResponse: any) => Promise<LoginResult>` | Authenticate via Google OAuth credential or authorization code |
| `logout` | `() => Promise<void>` | Log out, clear tokens, session, and TanStack Query cache |
| `checkSession` | `() => Promise<boolean>` | 3-tier session validation: JWT local decode, refresh token, legacy session API, localStorage fallback |
| `initiateDriveAuth` | `() => Promise<boolean>` | Redirect to Google Drive OAuth authorization URL |
| `initializeAuth` | `() => void` | Fetch Google Client ID, restore session from localStorage, run checkSession |
| `setupSessionInterval` | `() => () => void` | Start 30-minute periodic session checks; returns cleanup function |
| `setupVisibilityHandler` | `() => () => void` | Re-check session on tab visibility change (debounced, with failure cooldown) |
| `handleLogout` | alias for `logout` | Backward compatibility alias |
| `login` | alias for `loginWithGoogle` | Backward compatibility alias |
| `authorizeDrive` | alias for `initiateDriveAuth` | Backward compatibility alias |

### Cross-Store Dependencies

- **portfolioStore** -- calls `usePortfolioStore.getState().handleAuthStateChange()` on login/logout, and `loadFromGoogleDrive()` after login with Drive access.
- **TanStack Query** -- sets `subscriptionKeys.status()` cache from JWT `planType` claim on login; clears all subscription queries on logout.

---

## 2. portfolioStore (`src/stores/portfolioStore.ts`)

**Purpose:** Core portfolio data management including asset CRUD, target allocations, currency settings, market data refresh, simulation, import/export, Google Drive sync, and server sync with optimistic concurrency control.

**Persistence:** Zustand `persist` middleware with localStorage (`portfolioData`). Custom storage adapter handles migration from legacy Base64/plain-JSON formats.

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `boolean` | Whether data has been loaded from storage |
| `baseCurrency` | `string` | Display currency (`'JPY'` or `'USD'`) |
| `exchangeRate` | `ExchangeRate` | Current exchange rate (`{ rate, source, lastUpdated }`) |
| `lastUpdated` | `string \| null` | ISO timestamp of last market data refresh |
| `currentAssets` | `CurrentAsset[]` | Array of held assets with price, holdings, fees, dividends |
| `targetPortfolio` | `TargetAllocation[]` | Array of target allocation entries with target percentages |
| `additionalBudget` | `{ amount: number; currency: string }` | Budget for next purchase (default 300,000 JPY) |
| `aiPromptTemplate` | `string \| null` | Custom AI analysis prompt template |
| `dataSource` | `string` | Data origin identifier (`'local'`, `'googleDrive'`, etc.) |
| `lastSyncTime` | `string \| null` | ISO timestamp of last Google Drive sync |
| `currentUser` | `UserData \| null` | Currently authenticated user reference |
| `serverVersion` | `number \| null` | Server-side version number for optimistic concurrency |
| `syncStatus` | `'idle' \| 'syncing' \| 'error' \| 'conflict'` | Server sync state |
| `lastServerSync` | `string \| null` | ISO timestamp of last server sync |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `addTicker` | `(ticker: string) => Promise<OperationResult>` | Add a new ticker with plan limit check, API data fetch, fund type classification |
| `removeTicker` | `(id: string) => void` | Remove asset from both currentAssets and targetPortfolio |
| `updateHoldings` | `(id: string, holdings: number \| string) => void` | Update holding quantity for an asset |
| `updatePurchasePrice` | `(id: string, price: number) => void` | Update purchase price for an asset (Standard plan only) |
| `updateTargetAllocation` | `(id: string, percentage: number \| string) => void` | Update target allocation percentage |
| `updateAnnualFee` | `(id: string, fee: number \| string) => void` | Update annual fee for a fund |
| `updateDividendInfo` | `(id: string, dividendYield: number \| string, hasDividend?, frequency?) => void` | Update dividend information |
| `setBaseCurrency` | `(currency: string) => void` | Set base display currency |
| `toggleCurrency` | `() => void` | Toggle between JPY and USD |
| `setAdditionalBudget` | `(amount: number \| string, currency?: string) => void` | Set purchase budget |
| `setAiPromptTemplate` | `(template: string \| null) => void` | Set AI prompt template |
| `updateAiPromptTemplate` | `(template: string \| null) => void` | Alias for setAiPromptTemplate |
| `updateExchangeRate` | `(forceUpdate?: boolean) => Promise<void>` | Fetch latest exchange rate with debounce |
| `resetExchangeRate` | `() => void` | Reset to default exchange rate (150.0) |
| `refreshMarketPrices` | `() => Promise<OperationResult>` | Batch refresh all asset prices via marketDataService |
| `calculateSimulation` | `() => SimulationItem[]` | Calculate rebalancing purchase simulation |
| `executePurchase` | `(tickerId: string, units: number \| string) => void` | Apply a simulated purchase to holdings |
| `executeBatchPurchase` | `(simulationResult: SimulationItem[]) => void` | Apply all simulated purchases at once |
| `importData` | `(data: unknown) => OperationResult` | Import portfolio from JSON/CSV with validation |
| `exportData` | `() => PortfolioExport` | Export portfolio data to JSON |
| `convertCurrency` | `(amount, fromCurrency, toCurrency, exchangeRateObj?) => number` | Currency conversion utility |
| `calculatePurchaseShares` | `(purchaseAmount, price) => number` | Calculate number of shares purchasable |
| `validateAssetTypes` | `(assets: CurrentAsset[]) => ValidateResult` | Validate/correct fund types, fees, dividends, currency for all assets |
| `saveToGoogleDrive` | `(userData?) => Promise<SyncResult>` | Save portfolio to Google Drive |
| `loadFromGoogleDrive` | `(userData?) => Promise<SyncResult>` | Load portfolio from Google Drive |
| `handleAuthStateChange` | `(isAuthenticated, user) => void` | Handle auth state changes from authStore |
| `saveToLocalStorage` | `() => boolean` | Save to localStorage (legacy format) |
| `loadFromLocalStorage` | `() => PortfolioExport \| null` | Load from localStorage (legacy format) |
| `clearLocalStorage` | `() => boolean` | Clear localStorage data |
| `initializeData` | `() => void` | Initialize portfolio data from storage |
| `syncToServer` | `() => Promise<void>` | Push portfolio to server with version control |
| `syncFromServer` | `() => Promise<void>` | Pull portfolio from server |
| `resolveConflict` | `(strategy: 'server' \| 'local') => Promise<void>` | Resolve version conflict |

### Derived Selectors (exported separately)

| Selector | Description |
|----------|-------------|
| `selectTotalAssets(state)` | Sum of all asset values in base currency |
| `selectAnnualFees(state)` | Sum of annual fees for non-stock assets in base currency |
| `selectAnnualDividends(state)` | Sum of annual dividends for dividend-paying assets in base currency |

### Cross-Store Dependencies

- **uiStore** -- calls `useUIStore.getState().addNotification()` for toast notifications and `setLoading()` for loading state.
- **engagementStore** -- reads `useEngagementStore.getState().isInTrialPeriod()` for trial period holding limits.
- **TanStack Query** -- reads `getIsPremiumFromCache()` for plan-based holding limits.

---

## 3. uiStore (`src/stores/uiStore.ts`)

**Purpose:** UI state management including toast notifications, global loading state, and theme (light/dark/system) preferences with OS-level media query listening.

**Persistence:** Zustand `persist` middleware with localStorage (`pfwise-ui`). Only `theme` is persisted. Includes v0-to-v1 migration from legacy `pfwise-theme` key.

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `notifications` | `Notification[]` | Active toast notifications (`{ id, message, type }`) |
| `isLoading` | `boolean` | Global loading state |
| `theme` | `'light' \| 'dark' \| 'system'` | User's theme preference |
| `resolvedTheme` | `'light' \| 'dark'` | Actual applied theme (resolved from system preference when `theme === 'system'`) |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `addNotification` | `(message: string, type?: string) => string` | Add toast notification; non-error types auto-dismiss after 5 seconds; returns notification ID |
| `removeNotification` | `(id: string) => void` | Remove a notification by ID |
| `setLoading` | `(loading: boolean) => void` | Set global loading state |
| `setTheme` | `(theme: Theme) => void` | Set theme preference and apply to DOM |
| `initializeTheme` | `() => void` | Apply persisted theme on app startup; register OS dark mode change listener |

### Cross-Store Dependencies

None. This store is a dependency target -- other stores call into it via `getState()`.

---

## 4. engagementStore (`src/stores/engagementStore.ts`)

**Purpose:** User engagement tracking including visit streaks (with freeze/tolerance logic), portfolio score history, milestone events (score up, rank up, goal achieved, streak milestones), and initial trial period management.

**Persistence:** Zustand `persist` middleware with localStorage (`pfwise-engagement`). `pendingEvents` are intentionally not persisted (session-only).

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `lastVisitDate` | `string \| null` | Last visit date (YYYY-MM-DD, local timezone) |
| `currentStreak` | `number` | Current consecutive visit streak |
| `longestStreak` | `number` | All-time longest streak |
| `totalVisits` | `number` | Total visit count |
| `streakFreezeCount` | `number` | Streak freeze uses this month (Standard plan, max 3/month) |
| `streakFreezeMonth` | `string \| null` | Month of freeze counter (YYYY-MM) |
| `firstVisitDate` | `string \| null` | First-ever visit date (trial start date) |
| `previousScore` | `number \| null` | Previous portfolio score for change detection |
| `previousGrade` | `string \| null` | Previous portfolio grade (F/D/C/B/A/S) |
| `scoreHistory` | `ScoreSnapshot[]` | Up to 90 days of score snapshots (`{ date, score, grade }`) |
| `pendingEvents` | `MilestoneEvent[]` | Undismissed milestone events (`{ id, type, message, timestamp, dismissed }`) |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `recordVisit` | `(isPremium?: boolean) => void` | Record daily visit; update streak with 1-day tolerance for all users, 2-3 day freeze for Standard (3/month); fire streak milestones every 7 days |
| `updateScore` | `(score: number, grade: string) => void` | Update score history; fire score_up and rank_up events on change |
| `addMilestoneEvent` | `(type, message) => void` | Add a new milestone event to pending queue |
| `dismissEvent` | `(id: string) => void` | Remove a milestone event |
| `dismissAllEvents` | `() => void` | Clear all pending events |
| `isInTrialPeriod` | `() => boolean` | Check if within 7-day trial period from first visit |
| `getTrialDaysRemaining` | `() => number` | Days remaining in trial (0 if expired) |

### Cross-Store Dependencies

None directly. This store is consumed by portfolioStore for trial period checks.

### Exported Constants

- `TRIAL_MAX_HOLDINGS = 10` -- maximum holdings allowed during trial period.

---

## 5. goalStore (`src/stores/goalStore.ts`)

**Purpose:** Investment goal CRUD management with plan-based limits (Free: 1 goal, Standard: 5 goals) and input validation.

**Persistence:** Zustand `persist` middleware with localStorage (`pfwise-goals`). Only `goals` array is persisted.

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `goals` | `InvestmentGoal[]` | Array of investment goals (`{ id, name, type, targetAmount, targetDate, createdAt, updatedAt }`) |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `addGoal` | `(input: GoalInput) => AddGoalResult` | Add goal with validation and plan limit check; returns `{ success, errors?, limitReached? }` |
| `updateGoal` | `(id: string, updates: Partial<...>) => void` | Update goal fields (except id, createdAt) |
| `removeGoal` | `(id: string) => void` | Delete a goal |
| `getGoalCount` | `() => number` | Return current number of goals |
| `getMaxGoals` | `() => number` | Return plan-based goal limit (1 or 5) |

### Cross-Store Dependencies

- **uiStore** -- calls `useUIStore.getState().addNotification()` for plan limit warning.
- **TanStack Query** -- reads `getIsPremiumFromCache()` for plan-based limits.

---

## 6. notificationStore (`src/stores/notificationStore.ts`)

**Purpose:** In-app notification management and alert rule engine. Handles server-synced notification CRUD, alert rule CRUD with plan limits, and real-time alert evaluation against current portfolio data (price alerts, rebalance drift, goal achievement).

**Persistence:** Zustand `persist` middleware with localStorage (`pfwise-notifications`). Persists `notifications`, `alertRules`, `unreadCount`.

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `notifications` | `AppNotification[]` | In-app notification history |
| `alertRules` | `AlertRule[]` | User-defined alert rules |
| `unreadCount` | `number` | Number of unread notifications |
| `loading` | `boolean` | Fetch/mutation in progress |
| `lastKey` | `string \| null` | Pagination cursor for server notifications |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `fetchNotifications` | `(reset?: boolean) => Promise<void>` | Fetch notifications from server (paginated, with silent failure fallback) |
| `addLocalNotification` | `({ type, title, message, metadata? }) => void` | Create local notification; also updates TanStack Query cache |
| `markRead` | `(notificationId: string) => Promise<void>` | Mark notification read (optimistic update with rollback) |
| `markAllRead` | `() => Promise<void>` | Mark all notifications read (optimistic update with rollback) |
| `removeNotification` | `(notificationId: string) => Promise<void>` | Delete notification (optimistic update with rollback) |
| `fetchAlertRules` | `() => Promise<void>` | Fetch alert rules from server |
| `addAlertRule` | `(input: AlertRuleInput) => Promise<AddAlertRuleResult>` | Create alert rule with plan limit check |
| `updateAlertRule` | `(ruleId, updates) => Promise<void>` | Update an alert rule |
| `removeAlertRule` | `(ruleId: string) => Promise<void>` | Delete alert rule (optimistic update) |
| `evaluateAlerts` | `({ currentAssets, targetPortfolio, goals, totalValue, exchangeRate, baseCurrency }) => void` | Evaluate all enabled alert rules against current portfolio data; generate price alerts, rebalance suggestions, goal achievement notifications. 1-hour cooldown per rule. |
| `getMaxAlertRules` | `() => number` | Plan-based alert rule limit |
| `getMaxHistory` | `() => number` | Plan-based notification history limit |
| `getRebalanceThreshold` | `() => number` | Plan-based rebalance drift threshold (%) |

### Cross-Store Dependencies

- **uiStore** -- calls `useUIStore.getState().addNotification()` for toast notifications on errors.
- **TanStack Query** -- reads `getIsPremiumFromCache()` for plan limits; updates `notificationKeys` cache on local notification creation.

---

## 7. referralStore (`src/stores/referralStore.ts`)

**Purpose:** Referral program state management including referral code retrieval, statistics, code application, and URL-based referral capture.

**Persistence:** Zustand `persist` middleware with **sessionStorage** (`pfwise-referral`). Only `capturedCode` and `applied` are persisted.

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `referralCode` | `ReferralCode \| null` | User's own referral code |
| `stats` | `ReferralStats \| null` | Referral statistics (signups, conversions, etc.) |
| `loading` | `boolean` | Fetch/mutation in progress |
| `applied` | `boolean` | Whether a referral code has been successfully applied |
| `capturedCode` | `string \| null` | Referral code captured from URL `?ref=` parameter |
| `_statsLastFetched` | `number \| null` | Timestamp for 5-minute stats cache |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `fetchCode` | `() => Promise<void>` | Fetch user's referral code from server |
| `fetchStats` | `() => Promise<void>` | Fetch referral statistics (5-minute cache) |
| `applyCode` | `(code: string) => Promise<{ success, message? }>` | Apply a referral code; clears captured code on success |
| `captureFromUrl` | `() => void` | Extract `?ref=` from URL, normalize to uppercase, save to state and sessionStorage |
| `getCapturedCode` | `() => string \| null` | Get captured code from state or sessionStorage fallback |
| `clearCapturedCode` | `() => void` | Clear captured code from state and sessionStorage |

### Cross-Store Dependencies

None. Uses `referralService` for API calls and `analytics` for event tracking.

---

## 8. socialStore (`src/stores/socialStore.ts`)

**Purpose:** Social portfolio sharing and peer comparison. Manages shared portfolio CRUD with plan-based limits (Free: 1 share, Standard: 5 shares) and age-group-based peer comparison data.

**Persistence:** Zustand `persist` middleware with localStorage (`pfwise-social`). Only `shares` array is persisted.

### State Fields

| Field | Type | Description |
|-------|------|-------------|
| `shares` | `SharedPortfolio[]` | User's shared portfolio entries |
| `peerComparison` | `PeerComparison \| null` | Peer comparison data for an age group |
| `loading` | `boolean` | Share operation in progress |
| `peerLoading` | `boolean` | Peer comparison fetch in progress |
| `error` | `string \| null` | Last error message |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `createShare` | `(input: CreateShareInput) => Promise<SharedPortfolio \| null>` | Create a portfolio share with plan limit check |
| `deleteShare` | `(shareId: string) => Promise<boolean>` | Delete a portfolio share |
| `fetchUserShares` | `() => Promise<void>` | Fetch all shares for the current user |
| `fetchPeerComparison` | `(ageGroup: string) => Promise<void>` | Fetch peer comparison by age group |
| `getShareCount` | `() => number` | Current number of shares |
| `getMaxShares` | `() => number` | Plan-based share limit |
| `canCreateShare` | `() => boolean` | Whether a new share can be created |
| `getTtlDays` | `() => number` | Plan-based share TTL (days before auto-expiry) |

### Cross-Store Dependencies

- **uiStore** -- calls `useUIStore.getState().addNotification()` for success/error toasts.
- **TanStack Query** -- reads `getIsPremiumFromCache()` for plan-based limits.

---

## Cross-Store Dependency Graph

```
authStore ──────> portfolioStore (handleAuthStateChange, loadFromGoogleDrive)
                       │
                       ├──> uiStore (addNotification, setLoading)
                       └──> engagementStore (isInTrialPeriod)

goalStore ──────> uiStore (addNotification)
notificationStore ─> uiStore (addNotification)
socialStore ────> uiStore (addNotification)

goalStore ──────> TanStack Query (getIsPremiumFromCache)
notificationStore ─> TanStack Query (getIsPremiumFromCache, notificationKeys cache)
socialStore ────> TanStack Query (getIsPremiumFromCache)
portfolioStore ──> TanStack Query (getIsPremiumFromCache)
authStore ──────> TanStack Query (subscriptionKeys cache)
```

## Persistence Summary

| Store | Storage | Key | Persisted Fields |
|-------|---------|-----|------------------|
| authStore | Manual localStorage | `pfwise_session` | `user`, `hasDriveAccess`, `timestamp` |
| portfolioStore | Zustand persist (localStorage) | `portfolioData` | All state fields (custom storage adapter for legacy migration) |
| uiStore | Zustand persist (localStorage) | `pfwise-ui` | `theme` only |
| engagementStore | Zustand persist (localStorage) | `pfwise-engagement` | All fields except `pendingEvents` |
| goalStore | Zustand persist (localStorage) | `pfwise-goals` | `goals` only |
| notificationStore | Zustand persist (localStorage) | `pfwise-notifications` | `notifications`, `alertRules`, `unreadCount` |
| referralStore | Zustand persist (**sessionStorage**) | `pfwise-referral` | `capturedCode`, `applied` |
| socialStore | Zustand persist (localStorage) | `pfwise-social` | `shares` only |
