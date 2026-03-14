# PortfolioWise - モノレポプロジェクト構造とファイル説明

## プロジェクト概要

PortfolioWiseは、フロントエンドとバックエンドを同一リポジトリで管理するモノレポ構造を採用した投資ポートフォリオ管理システムです。

- **フロントエンド**: React ベースのWebアプリケーション。ポートフォリオの視覚化、リバランス計算、AIプロンプト生成などの機能を提供
- **バックエンド**: AWS Lambda ベースのAPIサービス。金融データの取得、認証、データ管理などを担当

## プロジェクトルート構造

```
portfolio-manager/           # プロジェクトルート
├── frontend/               # フロントエンドアプリケーション
│   └── webapp/            # React Webアプリケーション
├── backend/               # バックエンドAPIサービス
├── document/              # プロジェクトドキュメント
│   ├── frontend/          # フロントエンド関連ドキュメント
│   └── backend/           # バックエンド関連ドキュメント
├── README.md              # プロジェクト全体のREADME
└── .gitignore            # Git無視ファイル設定
```

## フロントエンド構造（frontend/webapp/）

```
frontend/webapp/
├── src/                     # ソースコード
│   ├── components/          # Reactコンポーネント
│   │   ├── auth/           # 認証関連（LoginButton, UserProfile）
│   │   ├── common/         # 共通コンポーネント（ErrorBoundary, ToastNotification等）
│   │   ├── dashboard/      # ダッシュボード（PortfolioCharts, AssetsTable等）
│   │   ├── data/           # データ管理（ImportOptions, ExportOptions, GoogleDriveIntegration）
│   │   ├── layout/         # レイアウト（Header, TabNavigation, DataStatusBar）
│   │   ├── settings/       # 設定（AllocationEditor, HoldingsEditor, TickerSearch等）
│   │   └── simulation/     # シミュレーション（SimulationResult, AiAnalysisPrompt等）
│   ├── context/            # React Context
│   │   ├── AuthContext.js  # 認証状態管理
│   │   └── PortfolioContext.js # ポートフォリオデータ管理
│   ├── hooks/              # カスタムフック
│   ├── pages/              # ページコンポーネント
│   ├── services/           # APIクライアント
│   ├── utils/              # ユーティリティ関数
│   ├── App.jsx             # メインアプリケーション
│   └── index.js            # エントリーポイント
├── public/                  # 静的ファイル
├── __tests__/              # テストファイル
│   ├── unit/              # ユニットテスト
│   ├── integration/       # 統合テスト
│   └── e2e/               # E2Eテスト
├── scripts/                # ビルド・テストスクリプト
├── package.json            # 依存関係管理
└── README.md               # フロントエンドREADME
```

## バックエンド構造（backend/）

```
backend/
├── src/                    # ソースコード
│   ├── constants.js   # 定数定義
│   └── envConfig.js   # 環境変数設定
├── function/          # Lambda関数ハンドラー
│   ├── admin/         # 管理者向けAPI
│   │   ├── getBudgetStatus.js
│   │   ├── getStatus.js
│   │   ├── manageFallbacks.js
│   │   └── resetUsage.js
│   ├── auth/          # 認証関連API
│   │   ├── getSession.js
│   │   ├── googleLogin.js
│   │   └── logout.js
│   ├── drive/         # Google Drive連携API
│   │   ├── listFiles.js
│   │   ├── loadFile.js
│   │   └── saveFile.js
│   ├── marketData.js  # 市場データAPI
│   └── preWarmCache.js # キャッシュ予熱
├── middleware/        # ミドルウェア
│   ├── apiKeyAuth.js  # APIキー認証
│   ├── ipRestriction.js # IP制限
│   └── security.js    # セキュリティヘッダー
├── services/          # サービスモジュール
│   ├── alerts.js      # アラート通知
│   ├── cache.js       # キャッシュ
│   ├── fallbackDataStore.js # フォールバックデータ
│   ├── googleAuthService.js # Google認証
│   ├── googleDriveService.js # Google Drive操作
│   ├── matrics.js     # メトリクス（注：正しい英語では "metrics" ですが、ファイル名はこのまま）
│   ├── portfolioService.js # ポートフォリオサービス
│   ├── rateLimitService.js # レート制限
│   ├── usage.js       # 使用量管理
│   └── sources/       # データソース別サービス
│       ├── alphaVantageService.js     # Alpha Vantage API
│       ├── enhancedMarketDataService.js # 強化データサービス
│       ├── exchangeRate.js            # 為替レート
│       ├── fundDataService.js         # 投資信託
│       ├── marketDataProviders.js     # マーケットデータ
│       └── yahooFinance.js            # Yahoo Finance
└── utils/             # ユーティリティ関数
    ├── auditLogger.js         # 監査ログ
    ├── awsConfig.js           # AWS設定
    ├── budgetCheck.js         # 予算確認
    ├── configManager.js       # 設定管理
    ├── cookieParser.js        # Cookie解析
    ├── cors.js                # CORS設定
    ├── dataFetchUtils.js      # データ取得
    ├── dataFetchWithFallback.js # フォールバック付きデータ取得
    ├── dataValidation.js      # データ検証
    ├── deprecation.js         # 非推奨機能の警告
    ├── dynamoDbService.js     # DynamoDB操作
    ├── errorHandler.js        # エラー処理
    ├── logger.js              # ロギング
    ├── responseUtils.js       # レスポンス処理
    ├── retry.js               # 再試行ロジック
    ├── scrapingBlacklist.js   # スクレイピングブラックリスト
    ├── secretsManager.js      # AWS Secrets Manager連携
    ├── secureAuth.js          # セキュアな認証ユーティリティ
    └── tokenManager.js        # OAuth トークン管理
```

## 設定ファイル (config/)

### constants.js

**説明**: アプリケーション全体で使用される定数値を定義します。

**エクスポート**:
- `DATA_TYPES`: データタイプ定義（US_STOCK, JP_STOCK, MUTUAL_FUND, EXCHANGE_RATE）
- `ERROR_CODES`: エラーコード定義（INVALID_PARAMS, SERVER_ERROR など）
- `CACHE_TIMES`: キャッシュ時間設定（秒単位）
- `RESPONSE_FORMATS`: レスポンス形式設定（JSON, CSV, TEXT）
- `BATCH_SIZES`: バッチ処理サイズ設定
- `DATA_SOURCES`: データソース定義とデフォルト優先順位
- `PREWARM_SYMBOLS`: キャッシュ予熱用の人気銘柄リスト
- `DEFAULT_EXCHANGE_RATE`: デフォルト為替レート（149.5）

### envConfig.js

**説明**: 環境変数の取得と管理を一元化するモジュール。

**関数**:
- `getNumberEnv(name, defaultValue)`: 数値型環境変数を取得
- `getStringEnv(name, defaultValue)`: 文字列型環境変数を取得
- `getBooleanEnv(name, defaultValue)`: ブール型環境変数を取得
- `getArrayEnv(name, defaultValue, separator)`: 配列型環境変数を取得
- `getJsonEnv(name, defaultValue)`: JSON型環境変数を取得

**エクスポート**:
- `ENV`: 全環境設定を含むオブジェクト
- `isDevelopment`: 開発環境かどうかのフラグ

## Lambda関数ハンドラー (function/)

### admin/getBudgetStatus.js

**説明**: AWS予算情報を取得する管理者向けAPIエンドポイント。

**関数**:
- `handler(event, context)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント、Lambdaコンテキスト
  - **出力**: 予算使用状況情報

### admin/getStatus.js

**説明**: API使用状況とキャッシュ情報を取得する管理者向けAPIエンドポイント。

**関数**:
- `handler(event, context)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント、Lambdaコンテキスト
  - **出力**: ステータス情報（使用量、キャッシュ統計など）

### admin/manageFallbacks.js

**説明**: 管理者向けフォールバックデータ管理APIエンドポイント。

**関数**:
- `handler(event, context)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント、Lambdaコンテキスト
  - **出力**: フォールバックデータ操作結果
- `handleGetFallbacks(headers, queryParams)`: フォールバックデータ取得処理
- `handleExportToGitHub(headers)`: GitHubエクスポート処理
- `handleGetStatistics(headers, days)`: 統計情報取得処理
- `handleGetFailedSymbols(headers, queryParams)`: 失敗シンボル取得処理

### admin/resetUsage.js

**説明**: API使用量カウンターをリセットする管理者向けAPIエンドポイント。

**関数**:
- `handler(event, context)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント、Lambdaコンテキスト
  - **出力**: リセット結果

### auth/getSession.js

**説明**: ブラウザから送信されたCookieに基づいてセッション情報を取得する。

**関数**:
- `handler(event)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント
  - **出力**: セッション情報

### auth/googleLogin.js

**説明**: Google認証ログインハンドラー - Google One TapまたはOAuth flowの認証情報を受け取りセッションを作成する。

**関数**:
- `handler(event)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント
    - Google One Tap: `credential`（IDトークン）
    - OAuth flow: `code`（認証コード）と`redirectUri`
  - **出力**: セッション作成結果とユーザー情報
  - **プロセス**: 
    - One Tap: IDトークンを直接検証
    - OAuth: 認証コードをトークンに交換してからIDトークンを検証

### auth/logout.js

**説明**: セッションを無効化してCookieを削除するログアウトハンドラー。

**関数**:
- `handler(event)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント
  - **出力**: ログアウト処理結果

### drive/listFiles.js

**説明**: Google Driveのポートフォリオデータファイル一覧を取得する。

**関数**:
- `handler(event)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント
  - **出力**: ファイル一覧情報

### drive/loadFile.js

**説明**: Google Driveからポートフォリオデータを読み込む。

**関数**:
- `handler(event)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント（fileIdパラメータ含む）
  - **出力**: 読み込まれたファイルデータ

### drive/saveFile.js

**説明**: ポートフォリオデータをGoogle Driveに保存する。

**関数**:
- `handler(event)`: Lambda関数ハンドラー
  - **入力**: API Gatewayイベント（portfolioDataが含まれたbody）
  - **出力**: 保存結果

### marketData.js

**説明**: 市場データを取得するメインAPIハンドラー。

**関数**:
- `handler(event, context)`: メインLambda関数ハンドラー
  - **入力**: API Gatewayイベント、Lambdaコンテキスト
  - **出力**: 金融データ
- `validateParams(params)`: リクエストパラメータの検証
- `getUsStockData(symbols, refresh)`: 米国株データ取得
- `getJpStockData(codes, refresh)`: 日本株データ取得
- `getMutualFundData(codes, refresh)`: 投資信託データ取得
- `getExchangeRateData(base, target, refresh)`: 為替レートデータ取得
- `combinedDataHandler(event, context)`: 複合データ取得ハンドラー
- `highLatencyHandler(event, context)`: 高レイテンシーシミュレーション用ハンドラー

テスト時は内部関数を利用できるよう、`NODE_ENV=test` で読み込んだ場合に
`_testExports` オブジェクトとして `getUsStockData` などを公開しています。

### preWarmCache.js

**説明**: APIキャッシュの予熱を行うLambda関数。

**関数**:
- `handler(event, context)`: Lambda関数ハンドラー
  - **入力**: イベント、コンテキスト
  - **出力**: 予熱結果
- `cleanupExpiredData()`: 期限切れデータのクリーンアップ
- `prewarmUsStocks()`: 米国株キャッシュ予熱
- `prewarmJpStocks()`: 日本株キャッシュ予熱
- `prewarmMutualFunds()`: 投資信託キャッシュ予熱
- `prewarmExchangeRates()`: 為替レートキャッシュ予熱

## ミドルウェア (middleware/)

### apiKeyAuth.js

**説明**: APIキー認証を処理するミドルウェア。

**関数**:
- `authenticate(event)`: APIキー認証を実行
- `isPublicPath(path)`: パブリックパスかどうか判定
- `isAdminPath(path)`: 管理者パスかどうか判定
- `getClientIP(event)`: クライアントIPアドレスを取得

**機能**:
- 3段階のアクセスレベル（パブリック、ユーザー、管理者）
- X-API-KeyまたはAuthorizationヘッダーでの認証
- レート制限の適用

### ipRestriction.js

**説明**: IP制限を実装するミドルウェア。

**関数**:
- `checkIPRestrictions(event, options)`: IP制限をチェック
- `getClientIP(event)`: クライアントIPアドレスを取得
- `isBlacklisted(ip)`: IPがブラックリストに登録されているか確認
- `isAdminWhitelisted(ip)`: IPが管理者ホワイトリストに登録されているか確認

**機能**:
- IPブラックリスト/ホワイトリスト
- 疑わしいUser-Agentの検出
- 管理者APIへのIP制限

### security.js

**説明**: セキュリティヘッダーを設定するミドルウェア。

**関数**:
- `applySecurityHeaders(response)`: セキュリティヘッダーを適用

**機能**:
- CSPヘッダー
- X-Frame-Options
- X-Content-Type-Options
- その他のセキュリティヘッダー

## サービスモジュール (services/)

### alerts.js

**説明**: アラート通知サービス。エラーや重要なイベントが発生した際の通知を管理。

**関数**:
- `notifyError(title, error, context)`: エラー通知
- `notifyUsage(level, usageData)`: 使用量アラート通知
- `notifyBudget(level, budgetData)`: 予算アラート通知
- `notifySystemEvent(eventType, eventData)`: システムイベント通知
- `throttledAlert(options)`: スロットリングされたアラート通知

### cache.js

**説明**: APIキャッシュサービス。DynamoDBをバックエンドに使用してデータをキャッシュ。

**関数**:
- `get(key)`: キャッシュからデータを取得
- `set(key, data, ttl)`: データをキャッシュに保存
- `remove(key)`: キャッシュからデータを削除
- `clearCache(pattern)`: キャッシュを一括でクリア
- `getCacheStats()`: キャッシュのヒット統計を取得

### fallbackDataStore.js

**説明**: データ取得失敗時のフォールバックデータを管理するサービス。

**関数**:
- `getFallbackData(forceRefresh)`: GitHubからフォールバックデータを取得
- `getFallbackForSymbol(symbol, type)`: 特定の銘柄のフォールバックデータを取得
- `recordFailedFetch(symbol, type, reason)`: データ取得の失敗を記録
- `getFailedSymbols(dateKey, type)`: 失敗した銘柄の一覧を取得
- `exportCurrentFallbacksToGitHub()`: 現在のフォールバックデータをGitHubに書き出す
- `getFailureStatistics(days)`: 失敗記録の統計を取得

### googleAuthService.js

**説明**: Google認証サービス - OAuth認証とGoogleドライブ連携機能。

**関数**:
- `exchangeCodeForTokens(code, redirectUri)`: 認証コードをトークンと交換
- `verifyIdToken(idToken)`: IDトークンを検証してユーザー情報を取得
- `createUserSession(userData)`: ユーザーセッションを作成
- `getSession(sessionId)`: セッション情報を取得
- `invalidateSession(sessionId)`: セッションを無効化
- `refreshAccessToken(refreshToken)`: アクセストークンを更新
- `getOrCreateDriveFolder(accessToken)`: Google Driveのデータフォルダを検索または作成
- `savePortfolioToDrive(accessToken, portfolioData)`: ポートフォリオデータをDriveに保存
- `listPortfolioFiles(accessToken)`: Driveからファイル一覧を取得
- `loadPortfolioFromDrive(accessToken, fileId)`: Driveからポートフォリオデータを読み込む

### matrics.js

**説明**: データソースのパフォーマンスとプロパティを追跡するためのメトリクスサービス。（注：正しい英語では "metrics" ですが、ファイル名はこのまま）

**関数**:
- `initializeMetricsTable()`: メトリクス用DynamoDBテーブルを初期化
- `getSourcePriority(dataType)`: データソースの優先順位を取得
- `updateSourcePriority(dataType, source, adjustment)`: データソースの優先順位を更新
- `startDataSourceRequest(source, symbol, dataType)`: データソースリクエストの開始を記録
- `recordDataSourceResult(source, success, responseTime, dataType, symbol, errorMessage)`: リクエスト結果を記録
- `startBatchDataSourceRequest(source, count, dataType)`: バッチリクエストの開始を記録
- `recordBatchDataSourceResult(source, successCount, failCount, totalTime, dataType, errorMessage)`: バッチ結果を記録
- `getDataSourceMetrics(source, dataType)`: データソースのメトリクスを取得

### usage.js

**説明**: API使用量管理サービス。

**関数**:
- `recordUsage(user, dataType, count)`: 使用量を記録
- `checkAndUpdateUsage(params)`: 使用量を確認して更新
- `getUsageStats()`: 使用統計を取得
- `resetUsage(resetType)`: 使用量カウンターをリセット
- `getUserRate(userId, period)`: ユーザーごとの使用率を取得

### sources/enhancedMarketDataService.js

**説明**: フォールバック対応強化版のマーケットデータサービス。

**関数**:
- `getUsStockData(symbol, refresh)`: 米国株データを取得する（強化版）
- `getUsStocksData(symbols, refresh)`: 複数の米国株データを取得する（強化版）
- `getJpStockData(code, refresh)`: 日本株データを取得する（強化版）
- `getJpStocksData(codes, refresh)`: 複数の日本株データを取得する（強化版）
- `getMutualFundData(code, refresh)`: 投資信託データを取得する（強化版）
- `getMutualFundsData(codes, refresh)`: 複数の投資信託データを取得する（強化版）
- `getExchangeRateData(base, target, refresh)`: 為替レートデータを取得する（強化版）

### sources/exchangeRate.js

**説明**: 為替レートデータを取得するサービス。

**関数**:
- `getExchangeRate(base, target)`: 為替レートを取得する
- `createExchangeRateResponse(base, target, rate, change, changePercent, source, lastUpdated, isDefault, error)`: レスポンス作成
- `getExchangeRateFromExchangerateHost(base, target)`: exchangerate.hostからのデータ取得
- `getExchangeRateFromDynamicCalculation(base, target)`: 動的計算でのレート取得
- `getExchangeRateFromHardcodedValues(base, target)`: ハードコードされた値を使用
- `getBatchExchangeRates(pairs)`: 複数通貨ペアのレート取得

### sources/fundDataService.js

**説明**: モーニングスターのCSVダウンロード機能を用いて投資信託のデータを取得するサービス。

**関数**:
- `getMutualFundData(code)`: 投資信託のデータを取得する
- `getMorningstarCsvData(fundCode)`: モーニングスターからCSVデータを取得して解析
- `getMutualFundsParallel(codes)`: 複数の投資信託のデータを並列で取得

### sources/marketDataProviders.js

**説明**: 各種金融データを多様なソースから取得する統合サービス。

**関数**:
- `getJpStockData(code)`: 日本株のデータを取得
- `getUsStockData(symbol)`: 米国株・ETFのデータを取得
- `getMutualFundData(code)`: 投資信託のデータを取得
- `scrapeYahooFinanceJapan(stockCode)`: Yahoo Finance Japanからスクレイピング
- `scrapeMinkabu(stockCode)`: Minkabuからスクレイピング
- `scrapeKabutan(stockCode)`: Kabutanからスクレイピング
- `scrapeYahooFinance(symbol)`: Yahoo Financeからスクレイピング
- `scrapeMarketWatch(symbol)`: MarketWatchからスクレイピング
- `getJpStocksParallel(codes)`: 複数の日本株を並列で取得
- `getUsStocksParallel(symbols)`: 複数の米国株を並列で取得
- `getMutualFundsParallel(codes)`: 複数の投資信託を並列で取得
- `cleanupBlacklist()`: ブラックリストのクリーンアップ
- `getBlacklistedSymbols()`: ブラックリストされた銘柄の一覧を取得

### sources/yahooFinance.js

**説明**: Yahoo Finance APIを使用して米国株式のデータを取得するサービス。

**関数**:
- `buildApiUrl(path)`: Yahoo Finance APIのエンドポイントを構築
- `getStockData(symbol)`: 単一銘柄の株価データを取得
- `getStocksData(symbols)`: 複数銘柄の株価データを一括取得

## ユーティリティ関数 (utils/)

### awsConfig.js

**説明**: AWS SDKの初期化と各種クライアントの取得を一元管理するユーティリティ。

**関数**:
- `getAWSOptions(additionalOptions)`: AWS SDKの基本設定オプションを取得
- `getDynamoDbClient()`: DynamoDB クライアントインスタンスを取得
- `getDynamoDb()`: DynamoDB DocumentClient インスタンスを取得
- `getSNS()`: SNSクライアントインスタンスを取得
- `getSTS()`: STS クライアントインスタンスを取得
- `resetAWSConfig()`: AWS設定をリセットする（テスト用）

### budgetCheck.js

**説明**: 現在の予算使用状況を確認し、閾値を超えているかどうかを判定するユーティリティ。

**関数**:
- `getAccountId()`: AWS アカウント ID を取得
- `getBudgetStatus(forceRefresh)`: 現在の予算使用状況を取得
- `getBudgetWarningMessage(budgetStatus)`: 予算警告メッセージを取得
- `addBudgetWarningToResponse(response, budgetStatus)`: 予算警告をレスポンスに追加
- `isBudgetCritical()`: 予算制限が臨界値に達しているかどうかを確認

### cookieParser.js

**説明**: Cookie操作ユーティリティ。

**関数**:
- `parseCookies(cookieInput)`: Cookie文字列をパースしてオブジェクトに変換
- `createSessionCookie(sessionId, maxAge, secure, sameSite)`: セッションCookieを生成
- `createClearSessionCookie(secure)`: セッションCookieを削除するためのCookieを生成

### configManager.js

**説明**: 環境変数を読み込み、デフォルト値や環境別の設定を適用するユーティリティ。
機密情報をマスクした設定オブジェクトを取得できます。

**関数**:
- `loadConfig()`: 環境変数から設定を読み込む
- `getConfig(key)`: 設定値またはマスク済み設定全体を取得
- `sanitizeConfig(config)`: 機密情報をマスクしたオブジェクトを返す

### dataFetchUtils.js

**説明**: データ取得に関連する共通ユーティリティ関数を提供。

**関数**:
- `getRandomUserAgent()`: ランダムなユーザーエージェントを取得
- `recordDataFetchFailure(code, market, source, error, options)`: データ取得の失敗を記録
- `recordDataFetchSuccess(code)`: データ取得の成功を記録
- `checkBlacklistAndGetFallback(code, market, fallbackConfig)`: ブラックリストチェックとフォールバックデータの取得

### dataFetchWithFallback.js

**説明**: テスト失敗対応のためのデータフェッチユーティリティ。

**関数**:
- `generateMockData(symbol, dataType)`: テスト用モックデータの生成
- `generateBatchMockData(symbols, dataType)`: テスト期待値用のバッチデータ生成
- `fetchDataWithFallback(options)`: フォールバック機能付きのデータ取得
- `fetchBatchDataWithFallback(options)`: フォールバック機能付きのバッチデータ取得

### dataValidation.js

**説明**: データの整合性と異常値を検出するためのユーティリティ。

**関数**:
- `validateData(symbol, dataType, newData, previousData)`: データの異常値を検出
- `validatePriceChange(newData, previousData)`: 価格変動の異常を検出
- `validateMultiSourceData(symbol, dataArray)`: 複数ソースからのデータの整合性を検証
- `getMedian(arr)`: 配列の中央値を取得
- `notifyDataValidationIssue(symbol, dataType, validationResult)`: 異常値が検出された場合のアラート通知

### dynamoDbService.js

**説明**: DynamoDB操作のためのユーティリティサービス。

**関数**:
- `getDynamoDBClient()`: DynamoDBクライアントの初期化
- `getDynamoDBItem(params)`: DynamoDBからアイテムを取得
- `putDynamoDBItem(params)`: DynamoDBにアイテムを書き込む
- `updateDynamoDBItem(params)`: DynamoDBのアイテムを更新
- `deleteDynamoDBItem(params)`: DynamoDBからアイテムを削除
- `queryDynamoDB(params)`: DynamoDBに対してクエリを実行
- `scanDynamoDB(params)`: DynamoDBテーブルをスキャン
- `marshallItem(item)`: JavaScriptオブジェクトをDynamoDB形式に変換
- `unmarshallItem(item)`: DynamoDB形式のオブジェクトをJavaScriptオブジェクトに変換
- `unmarshallItems(items)`: 検索結果の全アイテムをアンマーシャル

### errorHandler.js

**説明**: エラー処理を一元化するユーティリティ。

**関数**:
- `handleError(error, type, context)`: エラーを一元的に処理
- `createErrorResponse(error, type, context)`: HTTP APIエラーレスポンスを生成
- `createSymbolNotFoundError(symbol)`: シンボルが見つからないエラーを作成
- `createValidationError(errors)`: リクエスト検証エラーを作成
- `createAuthError(message)`: 認証エラーを作成
- `createRateLimitError(usage, retryAfter)`: レート制限エラーを作成
- `createBudgetLimitError(usage)`: バジェット制限エラーを作成
- `createServerError(message, requestId)`: サーバーエラーを作成

**エクスポート**:
- `errorTypes`: エラータイプの定義
- `statusCodes`: エラーコードとHTTPステータスコードのマッピング

### logger.js

**説明**: ログ出力ユーティリティ。

**関数**:
- `debug(message, ...args)`: デバッグレベルのログを出力
- `info(message, ...args)`: 情報レベルのログを出力
- `warn(message, ...args)`: 警告レベルのログを出力
- `error(message, ...args)`: エラーレベルのログを出力
- `critical(message, ...args)`: 致命的なエラーレベルのログを出力
- `log(message, ...args)`: 標準形式でログ記録
- `getLogConfig()`: ログ設定を取得

**エクスポート**:
- `LOG_LEVELS`: ログレベル定義

### responseUtils.js

**説明**: API Gateway互換のレスポンスを標準化するユーティリティ。

**関数**:
- `formatResponse(options)`: 正常レスポンスを生成して返却
- `formatErrorResponse(options)`: エラーレスポンスを生成して返却
- `formatRedirectResponse(url, statusCode, headers)`: リダイレクトレスポンスを生成
- `formatOptionsResponse(headers)`: OPTIONSリクエストへのレスポンスを生成
- `methodHandler(event, handler)`: リクエストメソッドに応じたレスポンスハンドラー
- `handleOptions(event)`: OPTIONSリクエストのみを処理するハンドラー

### retry.js

**説明**: 指数バックオフ戦略を用いた関数実行の再試行を行うユーティリティ。

**関数**:
- `withRetry(fn, options)`: 指数バックオフを使用して非同期関数を再試行
- `isRetryableApiError(error)`: 一般的なAPIリクエストのための再試行判定関数
- `sleep(ms)`: 簡易的な待機関数

### scrapingBlacklist.js

**説明**: スクレイピングの失敗を追跡し、一定回数以上失敗した銘柄をスキップする機能。

**関数**:
- `isBlacklisted(symbol, market)`: 銘柄がブラックリストに登録されているか確認
- `recordFailure(symbol, market, reason)`: 失敗した銘柄の記録を更新
- `recordSuccess(symbol)`: 銘柄のスクレイピング成功を記録し、失敗カウントをリセット
- `removeFromBlacklist(symbol)`: 銘柄をブラックリストから削除
- `getBlacklistedSymbols()`: ブラックリストの全銘柄を取得
- `cleanupBlacklist()`: 期限切れのブラックリストエントリをクリーンアップ

## 主要な機能と特徴

1. **複数のデータソース対応**
   - Yahoo Finance API
   - スクレイピング（Yahoo Finance、Yahoo Finance Japan、Minkabu、Kabutan、MarketWatch）
   - モーニングスターCSVデータ
   - 為替レートAPI

2. **高い可用性**
   - キャッシュ機能
   - フォールバックデータ管理
   - 複数ソースからの段階的取得
   - スクレイピングブラックリスト

3. **認証とセキュリティ**
   - Google OAuth認証
   - セッション管理
   - API Keyベースの管理者認証

4. **Google Drive連携**
   - ポートフォリオデータの保存
   - ファイル一覧取得
   - データ読み込み

5. **運用監視機能**
   - アラート通知
   - 使用統計
   - 予算監視
   - パフォーマンスメトリクス

6. **エラー耐性**
   - 再試行ロジック
   - 指数バックオフ
   - 複数レイヤーのフォールバック
   - デフォルト値提供
