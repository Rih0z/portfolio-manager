# ポートフォリオマネージャー コード規約書（AWS環境移行対応版）

**ファイルパス:** document/code-convention.md  
**最終更新日時:** 2025-05-20 15:30

## 1. 概要

このドキュメントは、ポートフォリオマネージャーアプリケーションの開発に関する一貫したコーディング規約を定義します。すべての貢献者は、コードの品質、一貫性、保守性を確保するためにこれらの規約に従うものとします。AWS環境対応のための新しい実装手法も含んでいます。

## 2. ファイル構造とプロジェクト編成

### 2.0 ファイルヘッダー

ファイルヘッダーコメントは現在のコードベースでは必須ではありません。既存の多くのファイルではヘッダーコメントは省略されています。

##### 新規ファイル追加時のヘッダー推奨形式
新しいファイルを追加する場合は、必要に応じて以下の形式のヘッダーコメントを含めることが推奨されます：

```javascript
// ファイルの目的と機能の簡潔な説明
```

より詳細なドキュメンテーションが必要な場合は、各関数やクラスのJSDocコメントを活用してください。

```javascript
/**
 * 関数の説明
 * @param {型} 引数名 - 引数の説明
 * @returns {型} - 戻り値の説明
 */
function exampleFunction(param) {
  // 実装
}
```

### 2.1 ディレクトリ構造

現在のコードベースの詳細な構造は以下の通りです（**プロジェクト内のすべてのファイルを網羅**）：

```
src/
├── App.css                    # アプリケーションのベーススタイル
├── App.jsx                    # アプリケーションルート
├── App.test.js                # Appコンポーネントのテスト
├── craco.config.js            # Create React App設定のオーバーライド
├── index.css                  # グローバルCSSスタイル
├── index.js                   # アプリケーションエントリーポイント
├── logo.svg                   # Reactロゴ
├── reportWebVitals.js         # パフォーマンス測定ユーティリティ
├── setupProxy.js              # 開発環境用プロキシ設定（AWS環境対応版）
├── setupTests.js              # テスト環境セットアップ
├── components/      # UIコンポーネント
│   ├── auth/        # 認証関連コンポーネント 
│   │   ├── LoginButton.jsx        # Google OAuth認証を使用したログインボタン
│   │   └── UserProfile.jsx        # ログインユーザーのプロフィール表示
│   ├── common/      # 共通UIコンポーネント
│   │   ├── ContextConnector.js    # コンテキスト間連携コネクタ
│   │   ├── DataSourceBadge.jsx    # データソース表示バッジ
│   │   ├── ErrorBoundary.jsx      # エラーバウンダリコンポーネント
│   │   └── ToastNotification.jsx  # トースト通知表示
│   ├── dashboard/   # ダッシュボード画面コンポーネント
│   │   ├── AssetsTable.jsx        # 資産一覧テーブル
│   │   ├── DifferenceChart.jsx    # 差異チャート
│   │   ├── PortfolioCharts.jsx    # ポートフォリオチャート
│   │   └── PortfolioSummary.jsx   # ポートフォリオサマリー
│   ├── data/        # データ連携コンポーネント
│   │   ├── ExportOptions.jsx      # エクスポートオプション
│   │   ├── GoogleDriveIntegration.jsx  # Google Drive連携（AWS環境対応版）
│   │   └── ImportOptions.jsx      # インポートオプション
│   ├── layout/      # レイアウト関連コンポーネント
│   │   ├── DataStatusBar.jsx      # データステータスバー
│   │   ├── Header.jsx             # ヘッダーコンポーネント
│   │   └── TabNavigation.jsx      # タブナビゲーション
│   ├── settings/    # 設定画面コンポーネント
│   │   ├── AiPromptSettings.jsx   # AI分析プロンプト設定
│   │   ├── AllocationEditor.jsx   # 配分編集
│   │   ├── HoldingsEditor.jsx     # 保有銘柄編集
│   │   ├── PopularTickers.jsx     # 人気銘柄
│   │   └── TickerSearch.jsx       # 銘柄検索
│   └── simulation/  # シミュレーション画面コンポーネント
│       ├── AiAnalysisPrompt.jsx   # AI分析プロンプト
│       ├── BudgetInput.jsx        # 予算入力
│       └── SimulationResult.jsx   # シミュレーション結果
├── context/         # React Context定義
│   ├── AuthContext.js           # 認証コンテキスト（AWS環境対応版）
│   └── PortfolioContext.js      # ポートフォリオコンテキスト
├── hooks/           # カスタムReact Hooks
│   ├── useAuth.js               # 認証フック
│   ├── useGoogleDrive.js        # Googleドライブ連携フック（新規追加）
│   └── usePortfolioContext.js   # ポートフォリオコンテキストフック
├── pages/           # ページコンポーネント
│   ├── Dashboard.jsx           # ダッシュボードページ
│   ├── DataIntegration.jsx     # データ連携ページ
│   ├── Settings.jsx            # 設定ページ
│   └── Simulation.jsx          # シミュレーションページ
├── services/        # APIサービスとデータ処理
│   ├── adminService.js         # 管理者向けAPIサービス
│   ├── api.js                   # API関連のエントリーポイント
│   └── marketDataService.js     # 市場データサービス（AWS環境対応版）
└── utils/           # ユーティリティ関数
    ├── apiUtils.js              # API連携ユーティリティ（新規追加）
    ├── envUtils.js              # 環境設定ユーティリティ（新規追加）
    ├── formatters.js           # フォーマット関数
    └── fundUtils.js            # ファンドユーティリティ
```

**注記**: AWS環境対応のため、新たに環境ユーティリティ（`envUtils.js`）とAPI連携ユーティリティ（`apiUtils.js`）が追加されました。また、Google Drive連携のための専用フック（`useGoogleDrive.js`）も新規追加されています。

### 2.2 ファイル命名規則

- **コンポーネントファイル**: PascalCase を使用し、拡張子は `.js` または `.jsx` を使用（例: `PortfolioSummary.js`, `PortfolioSummary.jsx`）
- **ユーティリティファイル**: camelCase を使用（例: `formatters.js`, `fundUtils.js`）
- **テストファイル**: `.test.js` または `.spec.js` を追加（例: `PortfolioSummary.test.jsx`）
- **CSS/SCSS**: コンポーネントと同じ名前で `.module.css` サフィックス（例: `Button.module.css`）
- **サービスファイル**: camelCase を使用し、目的を表す名前に`Service`サフィックスを追加（例: `marketDataService.js`, `adminService.js`）

## 3. 命名規則

### 3.1 JSX コンポーネント

- **コンポーネント名**: PascalCase を使用
  ```jsx
  // 良い例
  function UserProfile() {...}
  const PortfolioChart = () => {...}
  
  // 悪い例
  function userProfile() {...}
  const portfolioChart = () => {...}
  ```

### 3.2 変数・関数名

- **変数・関数名**: camelCase を使用
  ```javascript
  // 良い例
  const userData = {...}
  function calculateTotal() {...}
  
  // 悪い例
  const UserData = {...}
  function CalculateTotal() {...}
  ```

- **boolean変数**: `is`, `has`, `should` などのプレフィックスを使用
  ```javascript
  // 良い例
  const isLoading = true;
  const hasError = false;
  const shouldRefresh = true;
  const isStock = true; // 個別株かどうかのフラグ
  const isMutualFund = true; // 投資信託かどうかのフラグ
  const isInitialized = true; // 初期化完了フラグ
  const hasDividend = true; // 配当があるかどうかのフラグ
  const isDividendEstimated = true; // 配当情報が推定値かどうか
  ```

### 3.3 定数

- **定数**: 大文字のSNAKE_CASEを使用
  ```javascript
  // 良い例
  const MAX_RETRY_COUNT = 3;
  const DEFAULT_CURRENCY = 'JPY';
  const MARKET_DATA_API_URL = process.env.REACT_APP_MARKET_DATA_API_URL;
  const FUND_TYPES = {
    STOCK: '個別株',
    ETF_JP: 'ETF（日本）',
    ETF_US: 'ETF（米国）',
    MUTUAL_FUND: '投資信託'
  };
  // 配当頻度定数
  const DIVIDEND_FREQUENCY = {
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    SEMI_ANNUAL: 'semi-annual',
    ANNUAL: 'annual',
    UNKNOWN: 'unknown'
  };
  // 通知タイプ定数
  const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
  };
  // 通知自動消去時間
  const NOTIFICATION_AUTO_DISMISS_TIME = 5000; // 5秒
  // データソース定数（更新）
  const DATA_SOURCES = {
    MARKET_DATA_API: 'Market Data API',
    FALLBACK: 'Fallback'
  };
  // API接続タイムアウト設定
  const TIMEOUT = {
    DEFAULT: 10000,        // 10秒
    EXCHANGE_RATE: 5000,   // 5秒
    US_STOCK: 10000,       // 10秒
    JP_STOCK: 20000,       // 20秒
    MUTUAL_FUND: 20000     // 20秒
  };
  // デフォルト為替レート（API障害時のフォールバック用）
  const DEFAULT_EXCHANGE_RATE = 150.0;
  ```

### 3.4 コンテキストとフック

- **コンテキスト**: `XxxContext` の形式を使用し、デフォルトエクスポート
  ```javascript
  // 良い例
  const AuthContext = createContext();
  export default AuthContext;
  export const AuthProvider = ({ children }) => {...};
  ```

- **カスタムフック**: `use` プレフィックスを使用し、両方のエクスポート形式を提供
  ```javascript
  // 良い例 - 両方のエクスポート形式
  export const useAuth = () => {...}
  export default useAuth;
  ```

- **useContext の使用**: コンテキストにアクセスする際は直接 useContext を使用することもできますが、可能であればラッパーフックを作成することを推奨します

  ```javascript
  // 許容される例 - 直接useContextを使用
  import React, { useContext } from 'react';
  import { PortfolioContext } from '../context/PortfolioContext';

  const Component = () => {
    const portfolioData = useContext(PortfolioContext);
    // ...
  };

  // 推奨される例 - カスタムフックを使用
  import { usePortfolioContext } from '../hooks/usePortfolioContext';

  const Component = () => {
    const portfolioData = usePortfolioContext();
    // ...
  };
  ```

### 3.5 イベントハンドラ

- **イベントハンドラ関数**: `handle` プレフィックスを使用
  ```javascript
  // 良い例
  const handleSubmit = () => {...}
  const handleInputChange = (e) => {...}
  const handleIncrementFee = (asset, amount) => {...}
  const handleSaveToLocalStorage = () => {...} // ローカルストレージ保存ハンドラ
  const handleUpdateDividendInfo = (asset, yield) => {...} // 配当情報更新ハンドラ
  const handleRemoveNotification = (id) => {...} // 通知削除ハンドラ
  const handleRefreshMarketPrices = () => {...} // 市場データ更新ハンドラ
  const handleAuthStateChange = (isAuthenticated, user) => {...} // 認証状態変更ハンドラ
  const handleEnvironmentCheck = () => {...} // 環境判定ハンドラ
  ```

### 3.6 ユーティリティ関数

- **ユーティリティ関数**: 目的が明確な名前を使用
  ```javascript
  // 良い例
  const formatCurrency = (amount, currency) => {...} // 通貨フォーマット
  const estimateAnnualFee = (ticker, name) => {...} // 年間手数料推定
  const guessFundType = (ticker, name) => {...} // ファンドタイプ推測
  
  // AWS環境対応関連
  const getApiBaseUrl = () => {...} // API基本URL取得
  const getApiStage = () => {...} // APIステージ取得
  const isDevEnvironment = () => {...} // 開発環境判定
  const isProdEnvironment = () => {...} // 本番環境判定
  const buildApiEndpoint = (path) => {...} // APIエンドポイント構築
  const fetchWithRetry = (url, method, data, params, config) => {...} // リトライ機能付きAPI呼び出し
  ```

### 3.7 データソース関連（更新）

- **データソース変数**: 明確な名前と意図を表す命名を使用
  ```javascript
  // 良い例
  const dataSource = 'Market Data API'; // データソースを文字列で表現
  const sourceCounts = { 'Market Data API': 8, 'Fallback': 2 }; // ソース別の統計
  const isFallback = result.data.source === 'Fallback'; // フォールバック値かどうか
  const isExchangeRateFallback = exchangeRate.source === 'Fallback'; // 為替レートがフォールバック値かどうか
  ```

- **エラー関連変数**: API接続エラー情報を追跡
  ```javascript
  // 良い例
  const marketDataErrors = []; // Market Data APIのエラー情報
  const exchangeRateError = null; // 為替レート取得時のエラー情報
  const errorSummary = {
    marketData: { count: 0, details: [] },
    exchangerate: { hasError: false, message: '' }
  }; // エラー情報のサマリー
  ```

## 4. コードフォーマット

### 4.1 基本ルール

- **インデント**: 2スペースを使用
- **行の長さ**: 最大100文字（例外：URLs、長い文字列）
- **セミコロン**: すべての文の末尾にセミコロンを使用
- **括弧のスタイル**: 開始括弧は同じ行に配置

### 4.2 JSX フォーマット

- **要素の属性が多い場合**: 複数行に分割
  ```jsx
  // 良い例 (少数の属性)
  <Button type="primary" onClick={handleClick}>提出</Button>
  
  // 良い例 (多数の属性)
  <Button
    type="button"
    className={`px-4 py-2 rounded-md ${
      importFormat === 'json' ? 'bg-primary text-white' : 'bg-gray-200'
    }`}
    onClick={() => setImportFormat('json')}
    role="radio"
    aria-checked={importFormat === 'json'}
    disabled={isStock} // 個別株の場合は無効化
  >
    JSON
  </Button>
  ```

- **バッジコンポーネント**:
  ```jsx
  // ファンドタイプバッジ
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    asset.fundType === FUND_TYPES.STOCK
      ? 'bg-gray-100 text-gray-800'
      : asset.fundType === FUND_TYPES.MUTUAL_FUND
        ? 'bg-indigo-100 text-indigo-800'
        : 'bg-blue-100 text-blue-800'
  }`}>
    {asset.fundType}
  </span>
  
  // 手数料情報バッジ
  <span className={`text-xs px-1.5 py-0.5 rounded ${
    asset.feeSource === '個別株'
      ? 'bg-gray-100 text-gray-800'
      : asset.feeSource === '投資信託'
        ? 'bg-indigo-100 text-indigo-800'
        : asset.feeSource === 'ユーザー設定' 
          ? 'bg-purple-100 text-purple-800' 
          : asset.feeIsEstimated 
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-green-100 text-green-800'
  }`}>
    {asset.feeSource}
  </span>
  
  // データソースバッジ（更新）
  <span className={`text-xs px-1.5 py-0.5 rounded ${
    asset.source === 'Market Data API'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-yellow-100 text-yellow-800'
  }`}>
    {asset.source}
  </span>
  
  // 配当情報バッジ
  <span className={`text-xs px-1.5 py-0.5 rounded ${
    !asset.hasDividend
      ? 'bg-gray-100 text-gray-800'
      : asset.dividendIsEstimated 
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800'
  }`}>
    {!asset.hasDividend 
      ? '配当なし' 
      : formatDividendFrequency(asset.dividendFrequency) + (asset.dividendIsEstimated ? '（推定）' : '')}
  </span>
  ```

- **通知コンポーネント**:
  ```jsx
  // 通知メッセージ
  <div 
    key={notification.id}
    className={`p-3 rounded-md shadow-md text-sm ${
      notification.type === 'error' ? 'bg-red-100 text-red-700' :
      notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
      notification.type === 'success' ? 'bg-green-100 text-green-700' :
      'bg-blue-100 text-blue-700'
    }`}
  >
    <div className="flex justify-between items-start">
      <span>{notification.message}</span>
      <button 
        onClick={() => removeNotification(notification.id)}
        className="ml-2 text-gray-500 hover:text-gray-700"
      >
        &times;
      </button>
    </div>
  </div>
  ```

### 4.3 インポート文の整理

- **インポートの順序**:
  1. React関連（React, React Router）
  2. サードパーティライブラリ
  3. プロジェクト内モジュール（相対パス）
  4. ユーティリティとタイプ
  5. スタイル・アセット

  ```javascript
  // 良い例
  import React, { useState, useCallback, useRef } from 'react';
  import { useNavigate } from 'react-router-dom';
  
  import jwtDecode from 'jwt-decode';
  import { formatCurrency } from 'accounting';
  
  import { usePortfolioContext } from '../../hooks/usePortfolioContext';
  import Header from '../layout/Header';
  
  import { FUND_TYPES, DIVIDEND_FREQUENCY, NOTIFICATION_TYPES, DATA_SOURCES } from '../../utils/fundUtils';
  
  import './styles.css';
  ```

## 5. React固有の規則

### 5.1 コンポーネント定義

- **関数コンポーネント**: アロー関数よりも関数宣言を優先
  ```jsx
  // 推奨
  function MyComponent() {
    return <div>...</div>;
  }
  ```

- **Props分割代入**: コンポーネント内で使用
  ```jsx
  // 良い例
  function AssetCard({ name, ticker, price, currency, isStock, isMutualFund, hasDividend, source }) {
    return (
      <div>
        <h2>{name}</h2>
        <p>{ticker}</p>
        <p>{formatCurrency(price, currency)}</p>
        {isStock && <span className="badge">個別株</span>}
        {isMutualFund && <span className="badge">投資信託</span>}
        {hasDividend && <span className="badge">配当あり</span>}
        <span className="source-badge">{source}</span> {/* データソースを表示 */}
      </div>
    );
  }
  ```

### 5.2 Hooks の使用

- **useCallback, useMemo**: 適切に依存配列を定義
  ```jsx
  // 良い例
  const handleSubmit = useCallback(() => {
    submitData(formData);
  }, [formData, submitData]);
  
  // 良い例 - 初期化完了後のみ実行
  useEffect(() => {
    if (initialized) {
      updateExchangeRate();
    }
  }, [initialized, updateExchangeRate]);
  
  // 良い例 - 重複初期化防止
  const initializeData = useCallback(() => {
    // 既に初期化済みなら何もしない
    if (initialized) return;
    
    // 初期化処理...
    setInitialized(true);
  }, [loadFromLocalStorage, addNotification, validateAssetTypes, saveToLocalStorage, initialized]);
  ```

- **カスタムフックの命名**: 明確な目的を表す名前を使用
  ```javascript
  // 良い例
  export const usePortfolioContext = () => {...}
  export const useAuth = () => {...}
  export const useFundUtils = () => {...}
  export const useDividendCalculation = () => {...} // 配当計算フック
  export const useNotifications = () => {...} // 通知管理フック
  export const useDataSources = () => {...} // データソース管理フック
  export const useMarketData = () => {...} // 市場データ取得フック
  export const useErrorHandling = () => {...} // エラーハンドリングフック
  export const useGoogleDrive = () => {...} // Google Drive連携フック
  ```

### 5.3 環境依存のライブラリ対応

- **jwt-decode v4の対応**: デフォルトインポートを使用
  ```javascript
  // jwt-decode v3/v4対応
  import jwtDecode from 'jwt-decode';
  
  // 使用例
  const decodedToken = jwtDecode(token);
  ```

### 5.4 コンテキスト間の連携

- **循環参照の回避**: useRefを使用して一方向参照を実装
  ```javascript
  // 良い例
  const portfolioContextRef = useRef(null);
  
  // 参照設定関数
  const setPortfolioContextRef = useCallback((context) => {
    portfolioContextRef.current = context;
  }, []);
  
  // 参照使用
  if (portfolioContextRef.current?.handleAuthStateChange) {
    portfolioContextRef.current.handleAuthStateChange(isAuthenticated, user);
  }
  ```

### 5.5 エラーバウンダリの使用

- **アプリケーション全体を保護**: エラーバウンダリでラップしてクラッシュ耐性を向上
  ```javascript
  // 良い例
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    
    componentDidCatch(error, errorInfo) {
      console.error('アプリケーションエラー:', error, errorInfo);
    }
    
    render() {
      if (this.state.hasError) {
        return <エラー表示コンポーネント error={this.state.error} />;
      }
      return this.props.children;
    }
  }
  
  // 使用方法
  function App() {
    return (
      <ErrorBoundary>
        <アプリケーションコンポーネント />
      </ErrorBoundary>
    );
  }
  ```

## 6. 状態管理

### 6.1 Context API の使用

- **コンテキスト分離**: 関連する状態ごとに別々のコンテキストを使用
  - AuthContext: 認証関連
  - PortfolioContext: ポートフォリオデータ関連

- **Provider のカプセル化**: 専用のProviderコンポーネントを作成
  ```jsx
  export const AuthProvider = ({ children }) => {
    // 状態と関数の定義
    return (
      <AuthContext.Provider value={...}>
        {children}
      </AuthContext.Provider>
    );
  };
  ```

### 6.2 状態更新関数

- **イミュータブルな更新**: 常に新しいオブジェクトを返す
  ```javascript
  // 良い例
  setCurrentAssets(prev => 
    prev.map(item => 
      item.id === id 
      ? { ...item, holdings: parseFloat(parseFloat(holdings).toFixed(4)) || 0 } 
      : item
    )
  );
  ```

- **小数点位置の処理**: 数値の精度を保つために適切な方法を使用
  ```javascript
  // 小数点以下4桁まで保存するケース
  const value = parseFloat(parseFloat(rawValue).toFixed(4));
  
  // 小数点以下2桁まで保存するケース（手数料率など）
  const fee = parseFloat(parseFloat(rawValue).toFixed(2));
  
  // 小数点以下2桁まで保存するケース（配当利回りなど）
  const yield = parseFloat(parseFloat(rawValue).toFixed(2));
  ```

- **条件付き状態更新**: 条件に基づいて異なる更新を行う
  ```javascript
  // 銘柄タイプに基づく状態更新
  setCurrentAssets(prev => 
    prev.map(item => {
      if (item.id === id) {
        if (item.isStock) {
          // 個別株の場合は手数料を強制的に0に設定
          return {
            ...item,
            annualFee: 0,
            feeSource: '個別株',
            feeIsEstimated: false
          };
        } else if (item.isMutualFund) {
          // 投資信託の場合は信託報酬の設定
          return {
            ...item,
            annualFee: parseFloat(parseFloat(fee).toFixed(2)) || 0,
            feeSource: '投資信託',
            feeIsEstimated: !userSetFee
          };
        } else {
          // その他のファンドの場合はユーザー指定の値を使用
          return {
            ...item,
            annualFee: parseFloat(parseFloat(fee).toFixed(2)) || 0,
            userSetFee: true,
            feeSource: 'ユーザー設定',
            feeIsEstimated: false
          };
        }
      }
      return item;
    })
  );
  ```

- **状態更新後の処理**: setTimeout を使用して順序を確保
  ```javascript
  // 良い例
  setTargetPortfolio(prev => {
    const updated = prev.map(item => 
      item.id === id ? { ...item, targetPercentage: parseFloat(percentage) } : item
    );
    // 変更後に自動保存
    setTimeout(() => saveToLocalStorage(), 100);
    return updated;
  });
  ```

### 6.3 ローカルストレージとの連携

- **データの暗号化**: URIエンコーディングを含むBase64エンコーディングによる安全な暗号化
  ```javascript
  // 改良版 - 特殊文字にも対応
  const encryptData = (data) => {
    try {
      const jsonString = JSON.stringify(data);
      return btoa(encodeURIComponent(jsonString)); // URI化してからBase64エンコード
    } catch (error) {
      console.error('データの暗号化に失敗しました', error);
      return null;
    }
  };
  
  const decryptData = (encryptedData) => {
    try {
      const jsonString = decodeURIComponent(atob(encryptedData)); // Base64デコードしてからURI復号
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('データの復号化に失敗しました', error);
      // フォールバック処理 - 古い形式を試行
      try {
        const jsonString = atob(encryptedData);
        return JSON.parse(jsonString);
      } catch (fallbackError) {
        console.error('フォールバック復号化も失敗しました', fallbackError);
        return null;
      }
    }
  };
  ```

### 6.4 Google Drive連携

- **アクセストークン管理**: 認証トークンとアクセストークンの管理
  ```javascript
  // アクセストークンの保存用変数
  let accessToken = null;
  
  // アクセストークンを設定する関数
  export function setGoogleAccessToken(token) {
    console.log('[API] Setting Google access token');
    if (token) {
      accessToken = token;
      console.log('[API] Access token set successfully');
    }
  }
  
  // 新しいアクセストークンを取得する関数
  async function getGoogleAccessToken() {
    return new Promise((resolve, reject) => {
      try {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (tokenResponse) => {
              if (tokenResponse && tokenResponse.access_token) {
                console.log('[API] New access token acquired');
                resolve(tokenResponse.access_token);
              } else {
                console.warn('[API] No access token in response');
                resolve(null);
              }
            },
            error_callback: (error) => {
              console.error('[API] Error getting token:', error);
              reject(error);
            }
          });
          
          // トークンをリクエスト
          tokenClient.requestAccessToken({ prompt: '' });
        } else {
          console.warn('[API] Google OAuth API not available');
          resolve(null);
        }
      } catch (error) {
        console.error('[API] Error in getGoogleAccessToken:', error);
        reject(error);
      }
    });
  }
  ```

## 7. エラー処理

### 7.1 リトライ機構とフォールバック処理

- **APIリクエストのリトライ**: 改良版リトライメカニズム付きのfetch関数を定義
  ```javascript
  // リトライメカニズム付きのfetch関数（apiUtils.js）
  export const fetchWithRetry = async (url, method = 'get', data = null, params = null, config = {}, maxRetries = RETRY.MAX_ATTEMPTS) => {
    let retries = 0;
    
    // デフォルトのタイムアウト設定
    const timeout = config.timeout || TIMEOUT.DEFAULT;
    
    // デフォルトの設定をマージ
    const requestConfig = {
      ...config,
      timeout: timeout
    };
    
    // パラメータがある場合は設定に追加
    if (params) {
      requestConfig.params = params;
    }
    
    while (retries <= maxRetries) {
      try {
        let response;
        
        if (method.toLowerCase() === 'get') {
          response = await axios.get(url, requestConfig);
        } else if (method.toLowerCase() === 'post') {
          response = await axios.post(url, data, requestConfig);
        } else if (method.toLowerCase() === 'put') {
          response = await axios.put(url, data, requestConfig);
        } else if (method.toLowerCase() === 'delete') {
          response = await axios.delete(url, requestConfig);
        } else {
          throw new Error(`未対応のHTTPメソッド: ${method}`);
        }
        
        // 成功したらレスポンスデータを返す
        return response.data;
      } catch (error) {
        console.error(`API fetch error (attempt ${retries+1}/${maxRetries+1}):`, error.message);
        
        // 最後の試行で失敗した場合はエラーを投げる
        if (retries === maxRetries) {
          throw error;
        }
        
        // リトライ前に遅延を入れる（指数バックオフ+ジッター）
        const delay = RETRY.INITIAL_DELAY * Math.pow(RETRY.BACKOFF_FACTOR, retries) * (0.9 + Math.random() * 0.2);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // リトライカウントを増やす
        retries++;
        
        // タイムアウトを延長
        requestConfig.timeout = timeout + (retries * 2000);
      }
    }
  };
  ```

- **フォールバック値の生成**: API取得失敗時のデフォルト値を提供する関数を定義
  ```javascript
  // フォールバックデータ生成関数（apiUtils.js）
  export const generateFallbackData = (ticker) => {
    return {
      [ticker]: {
        ticker: ticker,
        price: 100, // デフォルト値
        name: ticker,
        currency: ticker.includes('.T') ? 'JPY' : 'USD',
        lastUpdated: new Date().toISOString(),
        source: 'Fallback',
        isStock: !ticker.includes('JP') && !ticker.includes('US'),
        isMutualFund: ticker.includes('JP') || ticker.includes('US')
      }
    };
  };
  
  // エラーレスポンス整形関数（apiUtils.js）
  export const formatErrorResponse = (error, ticker) => {
    const errorResponse = {
      success: false,
      error: true,
      message: 'データの取得に失敗しました',
      errorType: 'UNKNOWN',
      errorDetail: error.message
    };
    
    // エラーの種類に応じた情報を追加
    if (error.response) {
      errorResponse.status = error.response.status;
      errorResponse.errorType = error.response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR';
      errorResponse.message = error.response.data?.message || `API エラー (${error.response.status})`;
    } else if (error.code === 'ECONNABORTED') {
      errorResponse.errorType = 'TIMEOUT';
      errorResponse.message = 'リクエストがタイムアウトしました';
    } else if (error.message.includes('Network Error')) {
      errorResponse.errorType = 'NETWORK';
      errorResponse.message = 'ネットワーク接続に問題があります';
    }
    
    // 銘柄情報がある場合は追加
    if (ticker) {
      errorResponse.ticker = ticker;
    }
    
    return errorResponse;
  };
  ```

### 7.2 エラーキャッチと表示

- **try/catch**: 非同期処理では常に使用
  ```javascript
  try {
    const data = await fetchData();
    processData(data);
  } catch (error) {
    console.error('データ取得エラー:', error);
    setError('データの取得に失敗しました');
  }
  ```

- **ログ出力の強化**: デバッグ情報を十分に提供
  ```javascript
  try {
    console.log(`Attempting to fetch data for ${ticker} from Market Data API`);
    const response = await fetchWithRetry(
      endpoint,
      'get',
      null,
      {
        type,
        symbols: ticker,
        refresh: refresh ? 'true' : 'false'
      },
      { 
        timeout,
        withCredentials: true 
      }
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching ${ticker} from Market Data API:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
    
    // フォールバック処理
    return {
      ...formatErrorResponse(error, ticker),
      // フォールバックデータも含める
      data: generateFallbackData(ticker)
    };
  }
  ```

### 7.3 入力バリデーション

- **早期リターン**: エラーケースを最初に処理
  ```javascript
  const submitForm = (data) => {
    if (!data.email) {
      setError('メールアドレスは必須です');
      return;
    }
    
    // 正常処理を続行
  };
  ```

- **特殊条件のチェック**:
  ```javascript
  // 個別株と投資信託の手数料編集制御
  const handleIncrementFee = (asset, amount) => {
    // 個別株は手数料の変更不可
    if (asset.isStock) {
      showMessage('個別株の手数料率は変更できません（常に0%）', 'warning');
      return;
    }
    
    // 投資信託は信託報酬の変更
    if (asset.isMutualFund) {
      showMessage('投資信託の信託報酬を設定します', 'info');
      // 信託報酬の更新処理...
    }
    
    // 通常の処理を続行
    const newValue = Math.max(0, (asset.annualFee || 0) + amount);
    updateAnnualFee(asset.id, parseFloat(newValue.toFixed(2)));
  };
  ```

### 7.4 API呼び出しのエラー処理

- **エラーコード別処理**: エラーの種類に応じた適切なメッセージを生成
  ```javascript
  // エラーメッセージ整形関数
  const formatErrorResponse = (error, ticker) => {
    const errorResponse = {
      success: false,
      error: true,
      message: 'データの取得に失敗しました',
      errorType: 'UNKNOWN',
      errorDetail: error.message
    };
    
    if (error.response) {
      // サーバーからのレスポンスがある場合
      errorResponse.status = error.response.status;
      errorResponse.errorType = error.response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR';
      errorResponse.message = error.response.data?.message || `API エラー (${error.response.status})`;
    } else if (error.code === 'ECONNABORTED') {
      // タイムアウトの場合
      errorResponse.errorType = 'TIMEOUT';
      errorResponse.message = 'リクエストがタイムアウトしました';
    } else if (error.message.includes('Network Error')) {
      // ネットワークエラーの場合
      errorResponse.errorType = 'NETWORK';
      errorResponse.message = 'ネットワーク接続に問題があります';
    }
    
    if (ticker) {
      errorResponse.ticker = ticker;
    }
    
    return errorResponse;
  };
  ```

- **タイムアウト設定**:
  ```javascript
  // タイムアウト付きの呼び出し
  const response = await marketDataClient.get(url, {
    params,
    timeout: timeout + (retries * 2000) // リトライごとにタイムアウトを延長
  });
  ```

### 7.5 データ永続化エラー処理

- **暗号化/復号化エラー**:
  ```javascript
  // データの復号化 - 改良版エラーハンドリング
  const decryptData = (encryptedData) => {
    try {
      const jsonString = decodeURIComponent(atob(encryptedData));
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('データの復号化に失敗しました', error);
      
      // フォールバック処理 - 古い形式を試行
      try {
        const jsonString = atob(encryptedData);
        return JSON.parse(jsonString);
      } catch (fallbackError) {
        console.error('フォールバック復号化も失敗しました', fallbackError);
        return null;
      }
    }
  };
  ```

### 7.6 通知システムの実装

- **通知の追加と自動消去**:
  ```javascript
  // 通知を追加する関数（タイムアウト付き）
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // 情報・成功・警告通知は自動消去（5秒後）
    if (type !== 'error') {
      setTimeout(() => {
        removeNotification(id);
      }, NOTIFICATION_AUTO_DISMISS_TIME);
    }
    
    return id;
  }, [removeNotification]);
  
  // 通知を削除する関数
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  ```

### 7.7 エラーバウンダリの導入

- **コンポーネントレベルのエラー処理**:
  ```javascript
  // アプリケーション全体のエラーバウンダリ
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    
    componentDidCatch(error, errorInfo) {
      console.error('アプリケーションエラー:', error, errorInfo);
    }
    
    render() {
      if (this.state.hasError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
              <h2 className="text-red-600 text-xl mb-4">エラーが発生しました</h2>
              <p className="mb-2">申し訳ありませんが、アプリケーションにエラーが発生しました。</p>
              <p className="text-gray-700 mb-4">詳細: {this.state.error?.message || '不明なエラー'}</p>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                onClick={() => window.location.reload()}
              >
                リロードする
              </button>
            </div>
          </div>
        );
      }
      
      return this.props.children;
    }
  }
  ```

## 8. 環境変数設定

### 8.1 環境変数の定義

- **REACT_APP_MARKET_DATA_API_URL**: 市場データAPIサーバーのベースURL（株価、為替、投資信託情報取得用）
- **REACT_APP_API_STAGE**: APIのステージ環境（'dev'、'prod'など）
- **REACT_APP_ADMIN_API_KEY**: 管理者API用認証キー
- **REACT_APP_GOOGLE_CLIENT_ID**: Google OAuth認証用クライアントID
- **REACT_APP_DEFAULT_EXCHANGE_RATE**: フォールバック用デフォルト為替レート

### 8.2 環境変数の使用方法

```javascript
// 環境ユーティリティを使用した環境変数の取得
import { getApiBaseUrl, getApiStage, getAdminApiKey, getGoogleClientId, getDefaultExchangeRate } from '../utils/envUtils';

// 環境に応じたAPI基本URLの取得
const MARKET_DATA_API_URL = getApiBaseUrl();
// 環境に応じたAPIステージの取得
const API_STAGE = getApiStage();
// 管理者APIキーの取得
const ADMIN_API_KEY = getAdminApiKey();
// デフォルト為替レートの取得
const DEFAULT_EXCHANGE_RATE = getDefaultExchangeRate();
// Google Client IDの取得
const GOOGLE_CLIENT_ID = getGoogleClientId();
```

### 8.3 環境固有の設定ファイル

- **`.env.development`**: 開発環境用の環境変数設定
  ```
  REACT_APP_MARKET_DATA_API_URL=https://dev-api.example.com
  REACT_APP_API_STAGE=dev
  REACT_APP_ADMIN_API_KEY=dev_admin_api_key
  REACT_APP_GOOGLE_CLIENT_ID=your_dev_client_id.apps.googleusercontent.com
  REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
  ```

- **`.env.production`**: 本番環境用の環境変数設定
  ```
  REACT_APP_MARKET_DATA_API_URL=https://api.example.com
  REACT_APP_API_STAGE=prod
  REACT_APP_ADMIN_API_KEY=prod_admin_api_key
  REACT_APP_GOOGLE_CLIENT_ID=your_prod_client_id.apps.googleusercontent.com
  REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
  ```

## 9. 環境判定と最適化（AWS対応）

### 9.1 環境判定関数

```javascript
// 環境判定ユーティリティ（envUtils.js）
export const isDevEnvironment = () => {
  return process.env.NODE_ENV === 'development' || process.env.REACT_APP_API_STAGE === 'dev';
};

export const isProdEnvironment = () => {
  return process.env.NODE_ENV === 'production' && process.env.REACT_APP_API_STAGE === 'prod';
};

export const isLocalDevelopment = () => {
  return process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost';
};
```

### 9.2 環境に応じたAPI URL生成

```javascript
// API URL生成ユーティリティ（envUtils.js）
export const getApiBaseUrl = () => {
  return process.env.REACT_APP_MARKET_DATA_API_URL || 'http://localhost:3000';
};

export const getApiStage = () => {
  return process.env.REACT_APP_API_STAGE || 'dev';
};

// APIエンドポイント構築関数
export const buildApiEndpoint = (path) => {
  const baseUrl = getApiBaseUrl();
  const stage = getApiStage();
  return `${baseUrl}/${stage}/${path}`;
};
```

## 改訂履歴

| バージョン | 日付 | 内容 | 担当者 |
|---|---|---|---|
| 1.0 | 2025-03-06 10:30 | 初版作成 |  |
| 1.1 | 2025-03-08 13:45 | jwt-decode対応、アクセシビリティ対応、ESLint設定更新 |  |
| 2.0 | 2025-03-17 18:45 | 暗号化/復号化処理の強化、エラーハンドリング改善、Google Drive API連携機能の実装 |  |
| 3.0 | 2025-03-18 16:00 | 配当情報関連の変数と関数の命名規則、通知システムの実装 |  |
| 4.0 | 2025-03-22 12:30 | マルチデータソース対応、フォールバック処理の標準化 |  |
| 5.0 | 2025-05-12 15:00 | リファクタリング - スクレイピング機能削除、環境変数名を`REACT_APP_MARKET_DATA_API_URL`に変更、市場データAPIへの一元化 | Claude |
| 5.1 | 2025-05-20 15:30 | AWS環境対応 - 環境変数管理の強化、API通信の共通化、Google Drive連携の最適化 | Claude |
