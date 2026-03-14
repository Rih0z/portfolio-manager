# Backend API Catalog

> 自動生成日: 2026-03-13
> ソース: `backend/serverless.yml` + 各ハンドラー/サービス/ミドルウェアのソースコード

---

## Lambda Functions

### admin/ — 管理エンドポイント

管理者専用 API。API Gateway `private: true` による API Key 認証 + IP 制限付き。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| getStatus | GET | `admin/status` | `src/function/admin/getStatus.handler` | API 使用状況（日次・月次使用量）とキャッシュ情報を取得する管理者向けエンドポイント。API Key + IP ホワイトリスト認証。 |
| resetUsage | POST | `admin/reset` | `src/function/admin/resetUsage.handler` | API 使用量カウンター（日次・月次・全体）を 0 にリセットする。API Key 認証必須。 |
| getBudgetStatus | GET | `admin/getBudgetStatus` | `src/function/admin/getBudgetStatus.handler` | AWS 予算情報を取得し、現在の予算使用状況と警告レベルを返す。API Key 認証必須。 |
| manageFallbacks | *(未登録)* | *(未登録)* | `src/function/admin/manageFallbacks.handler` | フォールバックデータの取得・エクスポート・統計情報の管理。ハンドラーは存在するが serverless.yml には未登録。 |

### alerts/ — アラートルール管理

価格アラートルールの CRUD。全エンドポイント JWT 認証必須。ルールタイプ: `price_above`, `price_below`, `percent_change`, `volume_spike`。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| getAlertRules | GET | `api/alert-rules` | `src/function/alerts/getAlertRules.handler` | ユーザーのアラートルール一覧を取得する。 |
| createAlertRule | POST | `api/alert-rules` | `src/function/alerts/createAlertRule.handler` | 新しいアラートルールを作成する。リクエストボディで type/ticker/targetValue/enabled を指定。 |
| updateAlertRule | PUT | `api/alert-rules/{id}` | `src/function/alerts/updateAlertRule.handler` | 既存のアラートルールを更新する。 |
| deleteAlertRule | DELETE | `api/alert-rules/{id}` | `src/function/alerts/deleteAlertRule.handler` | 指定 ID のアラートルールを削除する。 |

### auth/ — 認証エンドポイント

Google OAuth + JWT デュアルモード認証。Access Token (HS256, 24h) はメモリ保存、Refresh Token は httpOnly Cookie (7日間)。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| googleLogin | POST | `auth/google/login` | `src/function/auth/googleLogin.handler` | Google 認証コードを受け取り、ID トークン検証後にユーザーセッションを作成。JWT Access Token + Refresh Token (httpOnly Cookie) を発行。 |
| getSession | GET | `auth/session` | `src/function/auth/getSession.handler` | Cookie または JWT Authorization ヘッダーからセッション情報を取得。JWT がある場合は DynamoDB 不要でデコードのみ。 |
| generateCSRFToken | POST | `auth/csrf-token` | `src/function/auth/generateCSRFToken.handler` | CSRF トークンを生成する。AWS Secrets Manager から APP_SECRET/CSRF_SECRET を取得して署名。 |
| refreshToken | POST | `auth/refresh` | `src/function/auth/refreshToken.handler` | httpOnly Cookie の Refresh Token を検証し、新しい Access Token と Refresh Token を発行。Origin 必須化による CSRF 保護。Token Reuse Detection 対応。 |
| logout | POST | `auth/logout` | `src/function/auth/logout.handler` | セッションを無効化し、Cookie（session + refresh_token）を削除する。リダイレクト URL のホワイトリスト検証付き。 |
| googleDriveAuthInitiate | GET | `auth/google/drive/initiate` | `src/function/auth/googleDriveAuth.initiateAuth` | Google Drive OAuth2 認証フローを開始。drive.file スコープの認可 URL を返す。 |
| googleDriveAuthCallback | GET | `auth/google/drive/callback` | `src/function/auth/googleDriveAuth.callback` | Google Drive OAuth2 コールバック。認証コードをトークンに交換し、セッションに Drive トークンを保存。 |

### common/ — 共通エンドポイント

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| healthCheck | GET | `health` | `src/function/common/health.handler` | DynamoDB 接続確認を含むアプリケーション状態チェック。内部情報（テーブル名・リージョン等）は外部に公開しない。 |
| options | *(共通)* | *(各パス)* | `src/function/common/options.handler` | CORS プリフライトリクエスト対応の共通 OPTIONS ハンドラー。 |

### config/ — クライアント設定

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| getClientConfig | GET | `config/client` | `src/function/config/getClientConfig.handler` | フロントエンドに必要な設定情報を返す。API バージョン、機能フラグ、Google Client ID 等。API Secret 検証付き。 |

### debug/ — デバッグエンドポイント

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| debugGoogleConfig | *(無効)* | `debug/google-config` | `src/function/debug/googleConfig.handler` | Google OAuth 設定の診断情報を返す（Client ID/Secret の存在有無、取得元等）。本番環境ではコメントアウトされ無効化。 |

### drive/ — Google Drive 連携

Google Drive API を使用したポートフォリオデータの永続化。全エンドポイントでセッション Cookie 認証。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| saveFile | POST | `drive/save` | `src/function/drive/saveFile.handler` | ポートフォリオデータを Google Drive に保存する。 |
| loadFile | GET | `drive/load` | `src/function/drive/loadFile.handler` | Google Drive からポートフォリオデータを読み込む。 |
| listFiles | GET | `drive/files` | `src/function/drive/listFiles.handler` | Google Drive 上のポートフォリオデータファイル一覧を取得する。 |
| fileVersions | *(未登録)* | *(未登録)* | `src/function/drive/fileVersions.handler` | Google Drive ファイルのバージョン履歴を取得する。ハンドラーは存在するが serverless.yml には未登録。 |

### marketData — マーケットデータ取得

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| marketData | GET | `api/market-data` | `src/function/marketData.handler` | 株式・投資信託・為替レートのデータを取得する主要エンドポイント。複数データソースからのフォールバック付き取得、キャッシュ、レート制限、予算チェックを統合。クエリパラメータで type/ticker/tickers を指定。 |

### notifications/ — 通知管理

ユーザー通知の CRUD。全エンドポイント JWT 認証必須。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| getNotifications | GET | `api/notifications` | `src/function/notifications/getNotifications.handler` | ユーザーの通知一覧を取得する。`?limit=20&lastKey=...` でページネーション対応。 |
| markNotificationRead | PUT | `api/notifications/{id}/read` | `src/function/notifications/markRead.handler` | 指定 ID の通知を既読にする。 |
| markAllNotificationsRead | POST | `api/notifications/read-all` | `src/function/notifications/markAllRead.handler` | ユーザーの全通知を一括既読にする。 |
| deleteNotification | DELETE | `api/notifications/{id}` | `src/function/notifications/deleteNotification.handler` | 指定 ID の通知を削除する。 |

### portfolio/ — ポートフォリオ管理

DynamoDB 永続化のポートフォリオ CRUD。JWT 認証必須。Optimistic Locking 対応。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| getPortfolio | GET | `api/portfolio` | `src/function/portfolio/getPortfolio.handler` | JWT 認証済みユーザーのポートフォリオを DynamoDB から取得する。 |
| savePortfolio | PUT | `api/portfolio` | `src/function/portfolio/savePortfolio.handler` | JWT 認証済みユーザーのポートフォリオを DynamoDB に保存する。バージョンベースの楽観的ロック付き。 |

### priceHistory — 価格履歴

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| priceHistory | GET | `api/price-history` | `src/function/priceHistory.handler` | 銘柄の過去の価格データを取得する。`?ticker=&period=1w|1m|3m|6m|1y|ytd` で期間指定。JWT 認証必須。 |

### referral/ — リファラルプログラム

紹介コードの生成・検証・適用。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| getReferralCode | GET | `api/referral/code` | `src/function/referral/getCode.handler` | ユーザーのリファラルコードを取得（存在しない場合は 8 文字の英数字コードを新規作成）。JWT 認証必須。 |
| getReferralStats | GET | `api/referral/stats` | `src/function/referral/getStats.handler` | ユーザーのリファラル統計（紹介数・報酬等）を取得する。JWT 認証必須。 |
| applyReferralCode | POST | `api/referral/apply` | `src/function/referral/applyCode.handler` | リファラルコードを適用する。Body: `{ code: string }`。JWT 認証必須。 |
| validateReferralCode | POST | `api/referral/validate` | `src/function/referral/validateCode.handler` | リファラルコードの有効性を検証する（公開エンドポイント、認証不要）。IP ベースレート制限（60回/時間）。Body: `{ code: string }`。 |

### social/ — ソーシャル・共有

ポートフォリオ共有とピア比較。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| createShare | POST | `api/social/share` | `src/function/social/createShare.handler` | ポートフォリオ共有を作成する。displayName, ageGroup, allocationSnapshot を指定。JWT 認証必須。 |
| getShare | GET | `api/social/share/{shareId}` | `src/function/social/getShare.handler` | 共有ポートフォリオを取得する（公開エンドポイント、認証不要）。IP ベースレート制限（60回/時間）。 |
| deleteShare | DELETE | `api/social/share/{shareId}` | `src/function/social/deleteShare.handler` | 共有ポートフォリオを削除する。JWT 認証必須、所有者のみ。 |
| getUserShares | GET | `api/social/shares` | `src/function/social/getUserShares.handler` | ユーザーの全共有ポートフォリオ一覧を取得する。プラン制限情報付き。JWT 認証必須。 |
| getPeerComparison | GET | `api/social/compare` | `src/function/social/getPeerComparison.handler` | 同年代のポートフォリオ比較データを取得する。`?ageGroup=` で指定。認証は任意（認証済みの場合はパーセンタイル付き）。 |

### stripe/ — Stripe 決済連携

Stripe Checkout/Customer Portal/Webhook によるサブスクリプション管理。

| Function | Method | Path | Handler | Description |
|----------|--------|------|---------|-------------|
| stripeCheckout | POST | `v1/subscription/checkout` | `src/function/stripe/checkout.handler` | Stripe Checkout セッションを作成し、チェックアウト URL を返す。JWT 認証必須。 |
| stripePortal | POST | `v1/subscription/portal` | `src/function/stripe/portal.handler` | Stripe Customer Portal セッションを作成し、ポータル URL を返す。JWT 認証必須。 |
| subscriptionStatus | GET | `v1/subscription/status` | `src/function/stripe/status.handler` | 認証済みユーザーの現在のプラン・サブスクリプション状態を返す。JWT 認証必須。 |
| stripeWebhook | POST | `v1/subscription/webhook` | `src/function/stripe/webhook.handler` | Stripe からの Webhook イベントを受信し、サブスクリプション状態を DynamoDB に同期する。Stripe-Signature ヘッダーによる署名検証。イベント ID ベースの冪等性保証（24h TTL）。CORS なし。 |

### scheduled — スケジュール実行

| Function | Trigger | Handler | Description |
|----------|---------|---------|-------------|
| preWarmCache | `rate(6 hours)` | `src/function/preWarmCache.handler` | 頻繁にアクセスされる銘柄（US株10種、JP株10種、投信5種、為替5ペア）のキャッシュを事前に温める。 |
| dailySnapshot | `cron(0 9 ? * MON-FRI *)` (UTC 09:00 = JST 18:00) | `src/function/dailySnapshot.handler` | 全ユーザーのポートフォリオに含まれる銘柄の日次終値スナップショットを取得し、PriceHistoryTable に記録する。memorySize: 512, timeout: 300。 |

---

## Backend Services

### コアサービス (`src/services/`)

| Service | Purpose | Key Exports |
|---------|---------|-------------|
| `alerts.js` | アラート通知サービス — エラーや重要イベント発生時の通知管理（SNS/メール/Slack） | `notifyError`, `notifyUsage`, `notifyBudget`, `notifySystemEvent`, `sendAlert`, `throttledAlert` |
| `cache.js` | DynamoDB ベースのキャッシュサービス — TTL による自動期限管理、全データタイプ 1 時間統一 | `get`, `set`, `remove`, `getWithPrefix`, `clearCache`, `cleanup`, `getCacheStats`, `generateCacheKey` |
| `fallbackDataStore.js` | フォールバックデータ管理 — GitHub からのフォールバックデータ取得・更新、失敗記録・統計 | `getFallbackData`, `getFallbackForSymbol`, `recordFailedFetch`, `getFailedSymbols`, `exportCurrentFallbacksToGitHub`, `getFailureStatistics`, `getDefaultFallbackData`, `saveFallbackData`, `updateFallbackData` |
| `googleAuthService.js` | Google OAuth 認証とセッション管理 — 認証コード交換、ID トークン検証、セッション CRUD | `exchangeCodeForTokens`, `verifyIdToken`, `createUserSession`, `getSession`, `invalidateSession`, `updateSession`, `refreshSessionToken`, `refreshDriveToken` |
| `googleDriveService.js` | Google Drive ファイル操作 — ポートフォリオデータの保存/取得/一覧/バージョン管理 | `initDriveClient`, `savePortfolioToDrive`, `loadPortfolioFromDrive`, `listPortfolioFiles`, `getPortfolioVersionHistory`, `getFileWithMetadata` |
| `metrics.js` | データソースパフォーマンス追跡 — 成功率、応答時間、エラー統計の収集と優先順位の動的調整 | `initializeMetricsTable`, `getSourcePriority`, `updateSourcePriority`, `startDataSourceRequest`, `recordDataSourceResult`, `getDataSourceMetrics` |
| `notificationDbService.js` | 通知 + アラートルールの DynamoDB 操作 | `getNotifications`, `createNotification`, `markNotificationRead`, `markAllRead`, `deleteNotification`, `getAlertRules`, `createAlertRule`, `updateAlertRule`, `deleteAlertRule` |
| `portfolioDbService.js` | ポートフォリオの DynamoDB CRUD — Optimistic Locking 付き保存 | `getPortfolio`, `savePortfolio` |
| `portfolioService.js` | ポートフォリオデータ管理 — Google Drive 経由の保存/取得/一覧/削除、データ検証・正規化 | `savePortfolio`, `getPortfolio`, `listPortfolios`, `deletePortfolio`, `validatePortfolioData`, `convertLegacyPortfolio` |
| `priceHistoryService.js` | 日次価格履歴の DynamoDB 操作 — バッチ書込（25件チャンク）、2年 TTL | `putDailyPrices`, `getPriceRange`, `getLatestPrice` |
| `rateLimitService.js` | DynamoDB ベースのレート制限 — API キー別/IP 別の使用量追跡 | `checkRateLimit`, `recordUsage`, `recordApiKeyUsage`, `getRateLimitHeaders`, `getRateLimitStats` |
| `referralDbService.js` | リファラルコードの DynamoDB 操作 — コード生成(8文字英数字)、適用、統計 | `getOrCreateReferralCode`, `getReferralByCode`, `getReferralStats`, `createReferralEvent`, `hasUserAppliedCode`, `incrementReferralCount`, `validateCode` |
| `socialDbService.js` | ポートフォリオ共有の DynamoDB 操作 — 共有作成/取得/削除、ピア比較 | `createShare`, `getShare`, `deleteShare`, `getUserShares`, `getPeerComparison` |
| `stripeService.js` | Stripe API 統合 — Secrets Manager から秘密鍵取得+24hキャッシュ、Checkout/Portal/Webhook | `getStripe`, `getStripeSecrets`, `getOrCreateStripeCustomer`, `createCheckoutSession`, `createCustomerPortalSession`, `cancelSubscription`, `verifyWebhookSignature` |
| `usage.js` | **非推奨** — `fallbackDataStore.js` へのプロキシモジュール。v3.0.0 で削除予定。 | *(fallbackDataStore の全エクスポートを再エクスポート)* |
| `usageTrackingService.js` | プラン別使用量追跡 — DynamoDB UsageTable で日別カウント管理、90日 TTL | `recordUsage`, `getDailyUsage`, `getMonthlyUsage`, `checkUsageLimit` |
| `userService.js` | ユーザー CRUD とプラン管理 — Google ログイン時のユーザー確保、Stripe 連携 | `getOrCreateUser`, `getUserById`, `getUserByEmail`, `getUserByStripeCustomerId`, `updateUserPlan`, `getUserPlanType`, `updateStripeCustomerId` |

### データソースサービス (`src/services/sources/`)

| Service | Purpose | Key Exports |
|---------|---------|-------------|
| `enhancedMarketDataService.js` | フォールバック対応強化版マーケットデータサービス — 全データソースを統合し優先順位付きで取得 | `getUsStockData`, `getUsStocksData`, `getJpStockData`, `getJpStocksData`, `getMutualFundData`, `getMutualFundsData`, `getExchangeRateData`, `getMultipleExchangeRatesData` |
| `alphaVantageService.js` | Alpha Vantage API による米国株式データ取得 — 有料 API、Yahoo Finance の代替 | `getStockData`, `getStocksData`, `isAvailable` |
| `yahooFinance.js` | Yahoo Finance API (RapidAPI) による米国株式データ取得 — 単一・バッチ取得対応 | `getStockData`, `getStocksData` |
| `yahooFinance2Service.js` | Yahoo Finance2 npm パッケージによる株価データ取得 — 無料・APIキー不要 | `getStockDataFromYahooFinance2`, `getBatchStockData`, `getHistoricalData`, `getExchangeRate`, `isAvailable` |
| `jpxCsvService.js` | JPX (日本取引所グループ) CSV データによる日本株価取得 — 無料、20分遅延 | `getJPXStockData`, `getBatchJPXData`, `getTOPIXData`, `fetchJPXDailyData` |
| `fundDataService.js` | モーニングスター CSV ダウンロードによる投資信託データ取得 — ブラックリスト機能付き | `getMutualFundData`, `getMutualFundsParallel` |
| `marketDataProviders.js` | Web スクレイピングによる金融データ取得 — Minkabu/Kabutan/MarketWatch 等、cheerio ベース | `getJpStockData`, `getUsStockData`, `getMutualFundData`, `getJpStocksParallel`, `getUsStocksParallel`, `getMutualFundsParallel`, `cleanupBlacklist` |
| `exchangeRate.js` | 為替レートデータ取得 — 複数プロバイダ対応、フォールバック・レート制限対策 | `getExchangeRate`, `getBatchExchangeRates` |

---

## Middleware

| Middleware | Purpose | Applied To |
|-----------|---------|------------|
| `jwtAuth.js` | JWT 認証 — Authorization ヘッダーから Bearer トークンを抽出・検証し、`event.user` にユーザー情報 (userId, email, name, planType, sessionId) をアタッチ | portfolio/, alerts/, notifications/, social/ (createShare, deleteShare, getUserShares), referral/ (getCode, getStats, applyCode), stripe/ (checkout, portal, status), priceHistory |
| `apiKeyAuth.js` | API Key 認証 — パブリック/プライベート/管理者 API を区別し適切な認証を要求。パブリック API はレート制限のみ、管理者 API は管理者 API Key 必須 | admin/ (getStatus), marketData (public path 判定) |
| `apiSecretValidation.js` | API Secret 検証 — Cloudflare 経由のリクエストのみを許可。Secrets Manager から取得した API_SECRET と照合。認証/ヘルスチェック等の特定パスはスキップ | config/client |
| `ipRestriction.js` | IP 制限 — ブラックリスト/ホワイトリストによるアクセス制御。管理者 API は ADMIN_IP_WHITELIST のみ許可 | admin/ (getStatus), marketData |
| `planLimitation.js` | プラン制限 — JWT からユーザーのプランタイプを特定し、使用量制限（日次/月次）をチェック | *(usageTrackingService 経由で利用可能、明示的な適用はハンドラー依存)* |
| `publicApiProtection.js` | 公開 API 保護 — User-Agent チェック（ブラウザ許可、curl/wget 等をブロック）、Origin/Referer 検証 | *(明示的な適用はハンドラー依存)* |
| `security.js` | セキュリティユーティリティ — インメモリレート制限 (100req/min)、入力サニタイズ、セキュリティヘッダー付与、API Key 検証、IP ホワイトリスト | *(ユーティリティとして各ハンドラーから個別に呼び出し可能)* |

---

## DynamoDB Tables

| Table | Key | Description |
|-------|-----|-------------|
| MarketDataCacheTable | `key` (S) | データキャッシュ（TTL 自動削除） |
| SessionsTable | `sessionId` (S) | ユーザーセッション管理 |
| ScrapingBlacklistTable | *(key)* | 失敗したスクレイピングシンボル追跡 |
| RateLimitTable | *(key)* | レート制限追跡 |
| UsersTable | *(key)* | ユーザー情報（プラン、Stripe Customer ID 等） |
| SubscriptionsTable | *(key)* | Stripe サブスクリプション状態 |
| UsageTable | `userId` + `date` | プラン別使用量カウント（90日 TTL） |
| PriceHistoryTable | `ticker` + `date` | 日次価格スナップショット（2年 TTL） |
| PortfoliosTable | `userId` | ポートフォリオデータ（Optimistic Locking） |
| NotificationsTable | *(key)* | ユーザー通知 |
| AlertRulesTable | *(key)* | 価格アラートルール |
| SharedPortfoliosTable | `shareId` | 共有ポートフォリオ（GSI: userId-index） |
| ReferralsTable | `code` | リファラルコード（GSI: userId-index） |
| ReferralEventsTable | *(key)* | リファラル適用イベント |

---

## データソース優先順位

マーケットデータ取得時の優先順位（無料ソース優先）:

1. **Yahoo Finance2 (npm)** — 無料、API キー不要、リアルタイム
2. **JPX CSV** — 日本取引所公式、無料、20分遅延
3. **Alpha Vantage** — API キー必要時のみ
4. **Web スクレイピング** — Yahoo Finance / Minkabu / Kabutan / MarketWatch
5. **フォールバックデータ** — GitHub リポジトリからの静的データ
