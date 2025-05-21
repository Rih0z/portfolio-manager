# モジュール構造と関数インターフェース概要

**ファイルパス:** document/structure-and-modules.md
**最終更新日時:** 2025-05-21

このドキュメントでは、`src/` 以下の JavaScript/JSX モジュールに含まれる主要なエクスポートとそのインターフェースを簡潔にまとめます。React コンポーネントやユーティリティ関数の役割、引数、戻り値の概要を把握する際の参考にしてください。

## 1. ルートレベル

- `src/App.jsx`
  - `App()` – ルーティングと各ページをまとめる最上位の React コンポーネント。戻り値は JSX 要素。
- `src/index.js`
  - アプリケーションのエントリーポイント。エクスポートはありません。
- `src/setupProxy.js`
  - 開発時の API プロキシ設定を行うスクリプト。エクスポートなし。
- `src/setupTests.js`
  - テスト実行前の環境設定。エクスポートなし。
- `src/reportWebVitals.js`
  - `reportWebVitals(onPerfEntry)` – 測定関数を受け取り、web vitals を報告します。戻り値なし。
- `src/craco.config.js`
  - CRA の設定拡張用ファイル。エクスポートは設定オブジェクトのみ。

## 2. コンテキスト

- `src/context/AuthContext.js`
  - `AuthContext` – 認証情報を共有する React Context。
  - `AuthProvider({ children })` – 認証状態を管理するプロバイダー。戻り値は `<AuthContext.Provider>` 要素。
  - `AuthConsumer` – `AuthContext` の Consumer。デフォルトエクスポートは `AuthContext`。
- `src/context/PortfolioContext.js`
  - `PortfolioContext` – ポートフォリオデータを保持する Context。
  - `PortfolioProvider({ children })` – 資産・目標配分・AI 設定などを管理。各種更新関数やデータ同期関数を Context 値として返します。
  - デフォルトエクスポートは `PortfolioContext`。

## 3. カスタムフック

- `src/hooks/useAuth.js`
  - `useAuth()` – `AuthContext` を取得して返すフック。
- `src/hooks/useGoogleDrive.js`
  - `useGoogleDrive()` – `listFiles()`, `saveFile(data)`, `loadFile(id)` などの Google Drive 操作関数を提供。認証状態を確認しながら結果を返します。
- `src/hooks/usePortfolioContext.js`
  - `usePortfolioContext()` – `PortfolioContext` を取得して返すフック。

## 4. サービス

- `src/services/api.js`
  - `getApiEndpoint(type)` – `'market-data'`, `'auth'`, `'drive'` などを指定して基底 URL を返します。
  - `fetchTickerData(ticker, refresh)` – 市場データ API から単一銘柄を取得。
  - `fetchExchangeRate(from, to, refresh)` – 為替レートを取得。
  - `fetchMultipleTickerData(tickers, refresh)` – 複数銘柄をまとめて取得。
  - `fetchApiStatus()` – API サーバーのステータス取得。
  - 旧互換用の `initGoogleDriveAPI()` など複数の非推奨関数もエクスポート。
- `src/services/marketDataService.js`
  - `fetchExchangeRate(from, to, refresh)` – 為替レート取得。
  - `fetchStockData(ticker, refresh)` – 銘柄単体データ取得。
  - `fetchMultipleStocks(tickers, refresh)` – 複数銘柄データを種類別にまとめて取得。
  - `fetchApiStatus()` – 管理者用のステータス取得。
- `src/services/adminService.js`
  - `getStatus()` – 管理 API のステータス情報取得。
  - `resetUsage()` – API 使用量のリセットを実行。
  - `setAdminApiKey(key)` – 管理者 API キーを設定。

## 5. ユーティリティ

- `src/utils/envUtils.js`
  - `isDevelopment` – `process.env.NODE_ENV` が `development` かどうかの真偽値。
  - `isLocalDevelopment()` – ホスト名からローカル環境か判定して boolean を返す。
  - `getBaseApiUrl()` – 環境変数から API 基底 URL を返す。
  - `getApiStage()` – API ステージ文字列を返す。
  - `getApiEndpoint(path)` – ベース URL とステージを組み合わせ完全なエンドポイントを返す。
  - `getGoogleClientId()` – Google OAuth クライアント ID を取得。
  - `getOrigin()` – ブラウザの origin を返す。
  - `getRedirectUri()` – 認証用リダイレクト URI を生成。
  - `getDefaultExchangeRate()` – 既定の為替レートを取得。
- `src/utils/formatters.js`
  - `formatCurrency(amount, currency)` – 金額を通貨表記に変換して返す。
  - `formatPercent(value, digits)` – 値を百分率文字列に変換。
  - `formatDate(date)` – 日付を `ja-JP` 形式で文字列化。
- `src/utils/apiUtils.js`
  - `createApiClient(withAuth)` – Axios クライアントを生成。
  - `marketDataClient` / `authApiClient` – 上記クライアントのインスタンス。
  - `fetchWithRetry(endpoint, params, timeout, maxRetries)` – リトライ付きの GET リクエスト。レスポンスデータを返す。
  - `authFetch(endpoint, method, data, config)` – 認証付きリクエストを実行しレスポンスデータを返す。
  - `formatErrorResponse(error, ticker)` – エラーデータを整形して返す。
  - `generateFallbackData(ticker)` – 取得失敗時のフォールバックデータを作成。
  - `setAuthToken(token)`, `getAuthToken()`, `clearAuthToken()` – メモリ上のトークン操作。
  - 定数 `TIMEOUT`, `RETRY` をエクスポート。
- `src/utils/fundUtils.js`
  - 各種定数 (`FUND_TYPES`, `US_ETF_LIST` など) をエクスポート。
  - `guessFundType(ticker, name)` – 銘柄名からタイプを推定して返す。
  - `estimateAnnualFee(ticker, name)` – 年間手数料率と情報源を返す。
  - `extractFundInfo(ticker, name)` – 名称から分類情報を抽出。
  - `estimateDividendYield(ticker, name)` – 配当利回りなどを推定。

## 6. フロントエンドコンポーネント

多数の React コンポーネントファイルは主にデフォルトエクスポートとして関数コンポーネントを提供します。主なものを以下に挙げます。

- `src/components/auth/LoginButton.jsx` – Google OAuth ログインボタン。
- `src/components/auth/UserProfile.jsx` – ユーザープロフィール表示。
- `src/components/common/ErrorBoundary.jsx` – 子コンポーネントのエラーハンドラ。
- `src/components/common/ToastNotification.jsx` – 通知表示用トースト。
- `src/components/dashboard/PortfolioSummary.jsx` – ポートフォリオ概要の指標表示。
- `src/components/dashboard/AssetsTable.jsx`、`DifferenceChart.jsx`、`PortfolioCharts.jsx` – ダッシュボード表示用各種チャート。
- `src/components/settings/*` – 銘柄検索や保有・配分編集、AI プロンプト設定等の編集 UI。
- `src/components/data/*` – インポート／エクスポートや Google Drive 連携 UI。
- `src/components/simulation/*` – 予算入力やAI分析プロンプト生成、シミュレーション結果表示。
- これらのコンポーネントはすべて `props` を受け取り JSX を返します。

## 7. ページコンポーネント

- `src/pages/Dashboard.jsx` – ダッシュボード画面。
- `src/pages/Settings.jsx` – 設定画面。
- `src/pages/DataIntegration.jsx` – データ連携画面。
- `src/pages/Simulation.jsx` – シミュレーション画面。

各ページは上記コンポーネントを組み合わせて UI を構成し、デフォルトエクスポートとして関数コンポーネントを返します。

---

以上が `src/` 配下のモジュールと主な関数インターフェースの概要です。より詳細な実装は各ファイルを参照してください。
