# 市場データ取得API仕様書（リファクタリング版）

**最終更新日時:** 2025-05-12 14:30

## 1. 概要

この仕様書は、ポートフォリオマネージャーアプリケーションで使用する市場データ取得APIおよび関連機能について定義します。リファクタリングに伴い、すべての市場データ取得機能は単一の市場データAPIサーバー（`REACT_APP_MARKET_DATA_API_URL`）に集約されました。以前のスクレイピング機能やマルチソース対応は削除され、シンプルで統一されたAPIアクセスに変更されています。

## 2. 環境設定

### 2.1 環境変数
- **`REACT_APP_MARKET_DATA_API_URL`**: 市場データAPIサーバーのベースURL（株価、為替、投資信託情報取得用）
- **`REACT_APP_API_STAGE`**: APIのステージ環境（'dev'、'prod'など）
- **`REACT_APP_ADMIN_API_KEY`**: 管理者API用認証キー

## 3. APIエンドポイント構造

APIエンドポイントは以下の形式で構築されます：
```
${REACT_APP_MARKET_DATA_API_URL}/${REACT_APP_API_STAGE}/api/${path}
```

例えば、市場データを取得するエンドポイントは次のようになります：
```
${REACT_APP_MARKET_DATA_API_URL}/dev/api/market-data
```

管理者用APIエンドポイントは以下の形式となります：
```
${REACT_APP_MARKET_DATA_API_URL}/${REACT_APP_API_STAGE}/admin/${path}
```

## 4. 市場データ取得API

### 4.1 株価データ取得

#### 4.1.1 単一銘柄データ取得
- **パス**: `/api/market-data`
- **メソッド**: GET
- **パラメーター**:
  - `type`: 銘柄タイプ（'us-stock'、'jp-stock'、'mutual-fund'）
  - `symbols`: ティッカーシンボルまたは証券コード
  - `refresh`: データを強制更新するかどうか（'true'/'false'）

- **リクエスト例**:
```javascript
const response = await axios.get(`${apiEndpoint}`, {
  params: {
    type: 'us-stock',
    symbols: 'AAPL',
    refresh: 'false'
  },
  timeout: 10000
});
```

- **レスポンス例**:
```json
{
  "success": true,
  "data": {
    "ticker": "AAPL",
    "price": 174.79,
    "name": "Apple Inc.",
    "currency": "USD",
    "isStock": true,
    "isMutualFund": false,
    "dividendYield": 0.5,
    "hasDividend": true,
    "dividendFrequency": "quarterly",
    "source": "Market Data API",
    "lastUpdated": "2025-05-12T14:23:45.678Z"
  },
  "message": "データを取得しました"
}
```

#### 4.1.2 複数銘柄一括取得
- **パス**: `/api/market-data`
- **メソッド**: GET
- **パラメーター**:
  - `type`: 銘柄タイプ（'us-stock'、'jp-stock'、'mutual-fund'）
  - `symbols`: カンマ区切りのティッカーシンボルまたは証券コード
  - `refresh`: データを強制更新するかどうか（'true'/'false'）

- **リクエスト例**:
```javascript
const response = await axios.get(`${apiEndpoint}`, {
  params: {
    type: 'us-stock',
    symbols: 'AAPL,MSFT,GOOG',
    refresh: 'false'
  },
  timeout: 10000
});
```

- **レスポンス例**:
```json
{
  "success": true,
  "data": [
    {
      "ticker": "AAPL",
      "price": 174.79,
      "name": "Apple Inc.",
      "currency": "USD",
      "isStock": true,
      "isMutualFund": false,
      "lastUpdated": "2025-05-12T14:23:45.678Z"
    },
    {
      "ticker": "MSFT",
      "price": 342.50,
      "name": "Microsoft Corporation",
      "currency": "USD",
      "isStock": true,
      "isMutualFund": false,
      "lastUpdated": "2025-05-12T14:23:45.678Z"
    },
    {
      "ticker": "GOOG",
      "price": 2785.65,
      "name": "Alphabet Inc. Class C",
      "currency": "USD",
      "isStock": true,
      "isMutualFund": false,
      "lastUpdated": "2025-05-12T14:23:45.678Z"
    }
  ],
  "message": "データを取得しました"
}
```

### 4.2 為替レート取得

- **パス**: `/api/market-data`
- **メソッド**: GET
- **パラメーター**:
  - `type`: 'exchange-rate'
  - `base`: 基準通貨（例: 'USD'）
  - `target`: 対象通貨（例: 'JPY'）
  - `refresh`: データを強制更新するかどうか（'true'/'false'）

- **リクエスト例**:
```javascript
const response = await axios.get(`${apiEndpoint}`, {
  params: {
    type: 'exchange-rate',
    base: 'USD',
    target: 'JPY',
    refresh: 'false'
  },
  timeout: 5000
});
```

- **レスポンス例**:
```json
{
  "success": true,
  "data": {
    "rate": 150.25,
    "source": "Market Data API",
    "base": "USD",
    "target": "JPY",
    "lastUpdated": "2025-05-12T14:20:30.123Z"
  },
  "message": "為替レートを取得しました"
}
```

### 4.3 ファンド情報取得

- **パス**: `/api/market-data`
- **メソッド**: GET
- **パラメーター**:
  - `type`: 'fund-info'
  - `ticker`: ティッカーシンボルまたはファンドコード
  - `name`: 銘柄名（オプション）

- **リクエスト例**:
```javascript
const response = await axios.get(`${apiEndpoint}`, {
  params: {
    type: 'fund-info',
    ticker: '8630042C',
    name: 'ニッセイ 外国株式インデックスファンド'
  },
  timeout: 10000
});
```

- **レスポンス例**:
```json
{
  "success": true,
  "data": {
    "ticker": "8630042C",
    "name": "ニッセイ 外国株式インデックスファンド",
    "fundType": "index",
    "category": "international-equity",
    "annualFee": 0.22,
    "currency": "JPY",
    "establishedDate": "2016-02-25",
    "benchmark": "MSCI Kokusai Index",
    "assetSize": 1234567890,
    "lastUpdated": "2025-05-12T14:15:10.456Z"
  },
  "message": "ファンド情報を取得しました"
}
```

### 4.4 配当情報取得

- **パス**: `/api/market-data`
- **メソッド**: GET
- **パラメーター**:
  - `type`: 'dividend-info'
  - `ticker`: ティッカーシンボル

- **リクエスト例**:
```javascript
const response = await axios.get(`${apiEndpoint}`, {
  params: {
    type: 'dividend-info',
    ticker: 'AAPL'
  },
  timeout: 10000
});
```

- **レスポンス例**:
```json
{
  "success": true,
  "data": {
    "ticker": "AAPL",
    "dividendYield": 0.5,
    "annualDividend": 0.92,
    "payoutRatio": 14.8,
    "hasDividend": true,
    "dividendFrequency": "quarterly",
    "exDividendDate": "2025-05-09",
    "paymentDate": "2025-05-16",
    "dividendHistory": [
      {
        "date": "2025-02-14",
        "amount": 0.23
      },
      {
        "date": "2024-11-15",
        "amount": 0.23
      }
    ],
    "lastUpdated": "2025-05-12T14:10:25.789Z"
  },
  "message": "配当情報を取得しました"
}
```

## 5. 管理者API

### 5.1 APIステータス取得

- **パス**: `/admin/status`
- **メソッド**: GET
- **ヘッダー**:
  - `x-api-key`: 管理者API認証キー

- **リクエスト例**:
```javascript
const response = await axios.get(`${baseEndpoint}/admin/status`, {
  headers: {
    'x-api-key': ADMIN_API_KEY
  },
  timeout: 5000
});
```

- **レスポンス例**:
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "uptime": 1234567,
    "apiVersion": "1.2.3",
    "requestCount": {
      "total": 12345,
      "usStock": 5678,
      "jpStock": 3456,
      "mutualFund": 2345,
      "exchangeRate": 876
    },
    "lastUpdated": "2025-05-12T14:05:40.123Z"
  },
  "message": "APIステータスを取得しました"
}
```

### 5.2 API使用量リセット

- **パス**: `/admin/reset`
- **メソッド**: POST
- **ヘッダー**:
  - `x-api-key`: 管理者API認証キー

- **リクエスト例**:
```javascript
const response = await axios.post(`${baseEndpoint}/admin/reset`, {}, {
  headers: {
    'x-api-key': ADMIN_API_KEY
  },
  timeout: 5000
});
```

- **レスポンス例**:
```json
{
  "success": true,
  "data": {
    "resetTime": "2025-05-12T14:30:00.000Z",
    "previousCount": {
      "total": 12345,
      "usStock": 5678,
      "jpStock": 3456,
      "mutualFund": 2345,
      "exchangeRate": 876
    },
    "newCount": {
      "total": 0,
      "usStock": 0,
      "jpStock": 0,
      "mutualFund": 0,
      "exchangeRate": 0
    }
  },
  "message": "API使用量をリセットしました"
}
```

## 6. フロントエンドAPIクライアント

### 6.1 単一銘柄データ取得

```javascript
/**
 * 銘柄データを取得する
 * @param {string} ticker - ティッカーシンボル
 * @param {boolean} refresh - キャッシュを無視して最新データを取得するか
 * @returns {Promise<Object>} 銘柄データ
 */
export const fetchTickerData = async (ticker, refresh = false) => {
  if (!ticker) {
    return {
      success: false,
      message: 'ティッカーシンボルが指定されていません',
      error: true
    };
  }
  
  try {
    const endpoint = getApiEndpoint('market-data');
    
    // 銘柄タイプを判定
    const isJapaneseStock = /^\d{4}(\.T)?$/.test(ticker);
    const isMutualFund = /^\d{7,8}C(\.T)?$/.test(ticker);
    
    // 銘柄タイプに応じたパラメータ設定
    const type = isJapaneseStock 
      ? 'jp-stock' 
      : isMutualFund 
        ? 'mutual-fund' 
        : 'us-stock';
    
    const timeout = isJapaneseStock 
      ? TIMEOUT.JP_STOCK 
      : isMutualFund 
        ? TIMEOUT.MUTUAL_FUND 
        : TIMEOUT.US_STOCK;
    
    // APIリクエスト
    const response = await fetchWithRetry(
      endpoint,
      {
        type,
        symbols: ticker,
        refresh: refresh ? 'true' : 'false'
      },
      timeout
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return {
      ...formatErrorResponse(error, ticker),
      // フォールバックデータも含める
      data: generateFallbackData(ticker)
    };
  }
};
```

### 6.2 為替レート取得

```javascript
/**
 * 為替レートを取得する
 * @param {string} fromCurrency - 変換元通貨
 * @param {string} toCurrency - 変換先通貨
 * @param {boolean} refresh - キャッシュを無視して最新データを取得するか
 * @returns {Promise<Object>} 為替レートデータ
 */
export const fetchExchangeRate = async (fromCurrency = 'USD', toCurrency = 'JPY', refresh = false) => {
  try {
    const endpoint = getApiEndpoint('market-data');
    
    const response = await fetchWithRetry(
      endpoint,
      {
        type: 'exchange-rate',
        base: fromCurrency,
        target: toCurrency,
        refresh: refresh ? 'true' : 'false'
      },
      TIMEOUT.EXCHANGE_RATE
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching exchange rate ${fromCurrency}/${toCurrency}:`, error);
    
    // フォールバック値を返す
    return {
      success: false,
      error: true,
      message: '為替レートの取得に失敗しました',
      ...formatErrorResponse(error),
      // デフォルト値も含める
      rate: fromCurrency === 'USD' && toCurrency === 'JPY' ? 150.0 : 
            fromCurrency === 'JPY' && toCurrency === 'USD' ? 1/150.0 : 1.0,
      source: 'Fallback',
      lastUpdated: new Date().toISOString()
    };
  }
};
```

## 7. エラーハンドリング

### 7.1 リトライ機構

```javascript
/**
 * リトライメカニズム付きのfetch関数
 * @param {string} url - APIエンドポイント
 * @param {Object} params - クエリパラメータ
 * @param {number} timeout - タイムアウト（ミリ秒）
 * @param {number} maxRetries - 最大リトライ回数
 * @returns {Promise<Object>} レスポンスデータ
 */
const fetchWithRetry = async (url, params = {}, timeout = TIMEOUT.DEFAULT, maxRetries = RETRY.MAX_ATTEMPTS) => {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      const response = await marketDataClient.get(url, {
        params,
        timeout: timeout + (retries * 2000) // リトライごとにタイムアウトを延長
      });
      
      // 成功したらレスポンスを返す
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
    }
  }
};
```

### 7.2 エラーメッセージ形式

```javascript
/**
 * エラーメッセージを整形する
 * @param {Error} error - エラーオブジェクト
 * @returns {Object} エラー情報
 */
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

### 7.3 フォールバックデータ生成

```javascript
/**
 * フォールバックデータを生成する
 * @param {string} ticker - ティッカーシンボル
 * @returns {Object} フォールバックデータ
 */
const generateFallbackData = (ticker) => {
  if (!ticker) return null;
  
  // 銘柄タイプを判定
  const isJapaneseStock = /^\d{4}(\.T)?$/.test(ticker);
  const isMutualFund = /^\d{7,8}C(\.T)?$/.test(ticker);
  
  // 通貨とデフォルト価格を設定
  const currency = isJapaneseStock || isMutualFund ? 'JPY' : 'USD';
  let price;
  
  if (isJapaneseStock) {
    price = 2500; // 日本株のデフォルト価格
  } else if (isMutualFund) {
    price = 10000; // 投資信託のデフォルト価格
  } else {
    price = 100; // 米国株のデフォルト価格
  }
  
  return {
    ticker: ticker,
    price: price,
    name: ticker,
    currency: currency,
    lastUpdated: new Date().toISOString(),
    source: 'Fallback',
    isStock: !isMutualFund,
    isMutualFund: isMutualFund,
    priceLabel: isMutualFund ? '基準価額' : '株価'
  };
};
```

## 8. 環境変数定義

プロジェクトで使用される環境変数の設定例:

```
# 市場データAPI URL（株価・為替レート・投資信託情報取得用）
REACT_APP_MARKET_DATA_API_URL=https://api.marketdata.example.com

# API実行環境
REACT_APP_API_STAGE=dev

# 管理者API認証キー
REACT_APP_ADMIN_API_KEY=your_admin_api_key_here

# フォールバック用デフォルト為替レート
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
```

## 改訂履歴

| バージョン | 日付 | 内容 | 担当者 |
|---|---|---|---|
| 1.0 | 2023-03-07 | 初版作成 |  |
| 2.0 | 2025-05-07 | ETF対応機能、Python yfinance連携、AIプロンプト生成機能、マルチ通貨対応を追加 |  |
| 3.0 | 2025-05-08 | 代替為替レートソース、株価スクレイピングプロキシ、Alpha Vantage API連携を追加 |  |
| 4.0 | 2025-05-12 | リファクタリング - スクレイピング機能を削除し、市場データAPIに集約。環境変数名を`REACT_APP_MARKET_DATA_API_URL`に変更 | Claude |
