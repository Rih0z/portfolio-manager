# 市場データ取得API仕様書（AWS環境移行対応版）

**ファイルパス:** document/API-specification.md  
**最終更新日時:** 2025-05-20 16:30

## 1. 概要

この仕様書は、ポートフォリオマネージャーアプリケーションで使用する市場データ取得APIおよび関連機能について定義します。リファクタリングに伴い、すべての市場データ取得機能は単一の市場データAPIサーバー（`REACT_APP_MARKET_DATA_API_URL`）に集約されました。加えて、Google認証およびGoogle Drive連携もバックエンドAPI経由に移行され、セキュリティと機能性が向上しています。AWS環境への移行に伴い、環境特性に最適化された処理を追加しました。

## 2. 環境設定

### 2.1 環境変数
- **`REACT_APP_MARKET_DATA_API_URL`**: 市場データAPIサーバーのベースURL（株価、為替、投資信託情報取得、認証連携用）
- **`REACT_APP_API_STAGE`**: APIのステージ環境（'dev'、'prod'など）
- **`REACT_APP_ADMIN_API_KEY`**: 管理者API用認証キー
- **`REACT_APP_GOOGLE_CLIENT_ID`**: Google OAuth認証用クライアントID（フロントエンド側で必要）

### 2.2 環境固有の設定ファイル
新たに環境固有の設定ファイルを導入し、環境に応じた最適化を実現します：

- **`.env.development`**: 開発環境用の環境変数を設定
  ```
  REACT_APP_MARKET_DATA_API_URL=https://dev-api.example.com
  REACT_APP_API_STAGE=dev
  REACT_APP_GOOGLE_CLIENT_ID=your_dev_client_id.apps.googleusercontent.com
  REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
  ```

- **`.env.production`**: 本番環境用の環境変数を設定
  ```
  REACT_APP_MARKET_DATA_API_URL=https://api.example.com
  REACT_APP_API_STAGE=prod
  REACT_APP_GOOGLE_CLIENT_ID=your_prod_client_id.apps.googleusercontent.com
  REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
  ```

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

### 3.1 認証関連エンドポイント（バックエンド連携）

```
# Google認証処理
${REACT_APP_MARKET_DATA_API_URL}/${REACT_APP_API_STAGE}/auth/google/login

# セッション情報取得
${REACT_APP_MARKET_DATA_API_URL}/${REACT_APP_API_STAGE}/auth/session

# ログアウト処理
${REACT_APP_MARKET_DATA_API_URL}/${REACT_APP_API_STAGE}/auth/logout
```

### 3.2 Google Drive連携エンドポイント（バックエンド連携）

```
# ポートフォリオデータの保存
${REACT_APP_MARKET_DATA_API_URL}/${REACT_APP_API_STAGE}/drive/save

# ポートフォリオデータの読み込み
${REACT_APP_MARKET_DATA_API_URL}/${REACT_APP_API_STAGE}/drive/load

# ファイル一覧の取得
${REACT_APP_MARKET_DATA_API_URL}/${REACT_APP_API_STAGE}/drive/files
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
  timeout: 10000,
  withCredentials: true // Cookieベースの認証に必要
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

[以下、市場データ取得APIの部分は変更なし]

## 5. 認証API（バックエンド連携）

### 5.1 Google認証プロセス

#### 5.1.1 Google認証フロー初期化

- **パス**: `/auth/google/login`
- **メソッド**: POST
- **ヘッダー**: 
  - `Content-Type`: `application/json`
- **ボディ**:
  - `code`: Google OAuth認可コード
  - `redirectUri`: リダイレクトURI（通常は `${window.location.origin}/auth/callback`）
- **リクエスト例**:
```javascript
const response = await axios.post(
  `${apiBaseUrl}/${apiStage}/auth/google/login`,
  {
    code: credentialResponse.code,
    redirectUri: window.location.origin + '/auth/callback'
  },
  {
    withCredentials: true // Cookieを送受信するために必要
  }
);
```

- **レスポンス例**:
```json
{
  "success": true,
  "isAuthenticated": true,
  "user": {
    "id": "109476395873295845628",
    "email": "user@example.com",
    "name": "サンプルユーザー",
    "picture": "https://lh3.googleusercontent.com/a/..."
  },
  "session": {
    "expiresAt": "2025-05-18T12:34:56.789Z"
  }
}
```

#### 5.1.2 セッション確認

- **パス**: `/auth/session`
- **メソッド**: GET
- **ヘッダー**:
  - Cookie: セッションクッキー（自動送信）
- **リクエスト例**:
```javascript
const response = await axios.get(
  `${apiBaseUrl}/${apiStage}/auth/session`,
  { withCredentials: true }
);
```

- **レスポンス例**:
```json
{
  "success": true,
  "isAuthenticated": true,
  "user": {
    "id": "109476395873295845628",
    "email": "user@example.com",
    "name": "サンプルユーザー",
    "picture": "https://lh3.googleusercontent.com/a/..."
  },
  "session": {
    "expiresAt": "2025-05-18T12:34:56.789Z"
  }
}
```

#### 5.1.3 ログアウト処理

- **パス**: `/auth/logout`
- **メソッド**: POST
- **ヘッダー**:
  - Cookie: セッションクッキー（自動送信）
- **リクエスト例**:
```javascript
const response = await axios.post(
  `${apiBaseUrl}/${apiStage}/auth/logout`,
  {},
  { withCredentials: true }
);
```

- **レスポンス例**:
```json
{
  "success": true,
  "message": "ログアウトしました"
}
```

## 6. Google Drive連携API（バックエンド連携）

### 6.1 ポートフォリオデータの保存

- **パス**: `/drive/save`
- **メソッド**: POST
- **ヘッダー**:
  - `Content-Type`: `application/json`
  - Cookie: セッションクッキー（自動送信）
- **ボディ**:
  - `portfolioData`: 保存するポートフォリオデータ（JSONオブジェクト）
- **リクエスト例**:
```javascript
const response = await axios.post(
  `${apiBaseUrl}/${apiStage}/drive/save`,
  {
    portfolioData: portfolioData
  },
  { withCredentials: true }
);
```

- **レスポンス例**:
```json
{
  "success": true,
  "message": "ポートフォリオデータをGoogle Driveに保存しました",
  "file": {
    "id": "1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s",
    "name": "portfolio-data-2025-05-11T12-34-56-789Z.json",
    "url": "https://drive.google.com/file/d/1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s/view",
    "createdAt": "2025-05-11T12:34:56.789Z"
  }
}
```

### 6.2 ポートフォリオデータの読み込み

- **パス**: `/drive/load`
- **メソッド**: GET
- **ヘッダー**:
  - Cookie: セッションクッキー（自動送信）
- **パラメータ**:
  - `fileId`: 読み込むファイルのID（オプション、指定がない場合は最新ファイル）
- **リクエスト例**:
```javascript
const response = await axios.get(
  `${apiBaseUrl}/${apiStage}/drive/load`,
  {
    params: { fileId }, // fileIdがnullの場合は最新ファイルを取得
    withCredentials: true
  }
);
```

- **レスポンス例**:
```json
{
  "success": true,
  "message": "ポートフォリオデータをGoogle Driveから読み込みました",
  "file": {
    "name": "portfolio-data-2025-05-10T15-22-33-456Z.json",
    "createdAt": "2025-05-10T15:22:33.456Z",
    "modifiedAt": "2025-05-10T15:22:33.456Z"
  },
  "data": {
    "name": "マイポートフォリオ",
    "holdings": [
      {
        "ticker": "AAPL",
        "shares": 10,
        "costBasis": 150.25
      },
      {
        "ticker": "7203.T",
        "shares": 100,
        "costBasis": 2100
      }
    ],
    "createdAt": "2025-05-10T15:22:33.456Z"
  }
}
```

### 6.3 ファイル一覧の取得

- **パス**: `/drive/files`
- **メソッド**: GET
- **ヘッダー**:
  - Cookie: セッションクッキー（自動送信）
- **リクエスト例**:
```javascript
const response = await axios.get(
  `${apiBaseUrl}/${apiStage}/drive/files`,
  { withCredentials: true }
);
```

- **レスポンス例**:
```json
{
  "success": true,
  "files": [
    {
      "id": "1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s",
      "name": "portfolio-data-2025-05-11T12-34-56-789Z.json",
      "size": 1024,
      "mimeType": "application/json",
      "createdAt": "2025-05-11T12:34:56.789Z",
      "modifiedAt": "2025-05-11T12:34:56.789Z",
      "webViewLink": "https://drive.google.com/file/d/1Zt8jKX7H3gFzN9v2X5yM6fGhJkLpQr7s/view"
    },
    {
      "id": "2Ab9cDe3F4gHi5J6kLmN7oP8qRsT9uVw",
      "name": "portfolio-data-2025-05-10T15-22-33-456Z.json",
      "size": 980,
      "mimeType": "application/json",
      "createdAt": "2025-05-10T15:22:33.456Z",
      "modifiedAt": "2025-05-10T15:22:33.456Z",
      "webViewLink": "https://drive.google.com/file/d/2Ab9cDe3F4gHi5J6kLmN7oP8qRsT9uVw/view"
    }
  ],
  "count": 2
}
```

## 7. エラーハンドリング

### 7.1 基本的なエラーハンドリング

```javascript
const fetchMarketData = async (type, symbols) => {
  try {
    const response = await axios.get('${apiBaseUrl}/${apiStage}/api/market-data', {
      params: { type, symbols },
      withCredentials: true // 認証情報を送信するために必要
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      console.error('APIエラー:', response.data.error);
      return null;
    }
  } catch (error) {
    // ネットワークエラーや5xx系エラー
    if (error.response) {
      // サーバーからレスポンスがあった場合
      console.error('APIエラーレスポンス:', error.response.status, error.response.data);
      
      // 認証エラーの場合は適切に処理
      if (error.response.status === 401) {
        console.error('認証エラー - ログインが必要です');
        // 認証画面への遷移処理等
      }
    } else if (error.request) {
      // リクエストは送信されたがレスポンスがない場合
      console.error('APIレスポンスなし:', error.request);
    } else {
      // リクエスト設定エラー
      console.error('APIリクエストエラー:', error.message);
    }
    return null;
  }
};
```

### 7.2 認証エラーの処理

[既存の認証エラーの処理部分は変更なし]

### 7.3 使用量制限の処理

[既存の使用量制限の処理部分は変更なし]

## 8. React用フック（AWS移行対応版）

### 8.1 認証フック（更新版）

```javascript
import { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';
import { getApiBaseUrl, getApiStage } from '../utils/envUtils';

// 環境変数からAPIの設定を取得
const API_URL = getApiBaseUrl();
const API_STAGE = getApiStage();

// 認証コンテキストの作成
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // セッション確認
  const checkSession = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/${API_STAGE}/auth/session`,
        { withCredentials: true }
      );
      
      if (response.data.success && response.data.isAuthenticated) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };
  
  // [残りの部分は変更なし]
};

// カスタムフック
export const useAuth = () => {
  return useContext(AuthContext);
};
```

### 8.2 Google Drive連携フック（AWS移行対応版）

```javascript
import { useState } from 'react';
import { useAuth } from './useAuth';
import { fetchWithRetry } from '../utils/apiUtils';
import { getApiBaseUrl, getApiStage } from '../utils/envUtils';

// 環境に応じたAPIのベースURLとステージを取得
const API_URL = getApiBaseUrl();
const API_STAGE = getApiStage();

export const useGoogleDrive = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ファイル一覧取得
  const listFiles = async () => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 環境に応じたAPIエンドポイントを使用
      const endpoint = `${API_URL}/${API_STAGE}/drive/files`;
      const response = await fetchWithRetry(
        endpoint,
        'get',
        null,
        null,
        { withCredentials: true }
      );
      
      if (response.success) {
        return response.files;
      } else {
        setError(response.message || '不明なエラー');
        return null;
      }
    } catch (error) {
      setError(error.message || 'ファイル一覧取得エラー');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // ファイル保存
  const saveFile = async (portfolioData) => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 環境に応じたAPIエンドポイントを使用
      const endpoint = `${API_URL}/${API_STAGE}/drive/save`;
      const response = await fetchWithRetry(
        endpoint,
        'post',
        { portfolioData },
        null,
        { withCredentials: true }
      );
      
      if (response.success) {
        return response.file;
      } else {
        setError(response.message || '不明なエラー');
        return null;
      }
    } catch (error) {
      setError(error.message || 'ファイル保存エラー');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // ファイル読み込み
  const loadFile = async (fileId) => {
    if (!isAuthenticated) {
      setError('認証が必要です');
      return null;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 環境に応じたAPIエンドポイントを使用
      const endpoint = `${API_URL}/${API_STAGE}/drive/load`;
      const response = await fetchWithRetry(
        endpoint,
        'get',
        null,
        { fileId },
        { withCredentials: true }
      );
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.message || '不明なエラー');
        return null;
      }
    } catch (error) {
      setError(error.message || 'ファイル読み込みエラー');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    listFiles,
    saveFile,
    loadFile,
    loading,
    error
  };
};
```

## 9. 環境ユーティリティと共通API関数の使用例

### 9.1 環境ユーティリティの使用

```javascript
import { getApiBaseUrl, getApiStage, isDevEnvironment, isProdEnvironment } from '../utils/envUtils';

// API URLの構築
const buildApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  const stage = getApiStage();
  return `${baseUrl}/${stage}/${path}`;
};

// 環境に応じた処理
const performEnvironmentSpecificOperation = () => {
  if (isDevEnvironment()) {
    console.log('開発環境固有の処理を実行');
    // 開発環境固有の処理
  } else if (isProdEnvironment()) {
    // 本番環境固有の処理
  } else {
    // その他の環境の処理
  }
};
```

### 9.2 APIユーティリティの使用

```javascript
import { fetchWithRetry, formatErrorResponse, generateFallbackData } from '../utils/apiUtils';

// リトライ機能付きのAPI呼び出し
const fetchMarketData = async (ticker, type) => {
  try {
    const endpoint = buildApiUrl('api/market-data');
    const response = await fetchWithRetry(
      endpoint,
      'get',
      null,
      {
        type,
        symbols: ticker,
        refresh: 'false'
      },
      { withCredentials: true }
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
    
    // エラーレスポンスの整形とフォールバックデータの生成
    return {
      ...formatErrorResponse(error, ticker),
      data: generateFallbackData(ticker)
    };
  }
};
```

## 10. 改訂履歴

| バージョン | 日付 | 内容 | 担当者 |
|---|---|---|---|
| 1.0 | 2023-03-07 | 初版作成 |  |
| 2.0 | 2025-05-07 | ETF対応機能、Python yfinance連携、AIプロンプト生成機能、マルチ通貨対応を追加 |  |
| 3.0 | 2025-05-08 | 代替為替レートソース、株価スクレイピングプロキシ、Alpha Vantage API連携を追加 |  |
| 4.0 | 2025-05-12 | リファクタリング - スクレイピング機能を削除し、市場データAPIに集約。環境変数名を`REACT_APP_MARKET_DATA_API_URL`に変更 | Claude |
| 4.1 | 2025-05-12 | Google認証機能のバックエンド連携対応を追加。クライアントサイド完結型の認証から、認可コードフローを使用したセキュアなバックエンド連携型認証に移行 | Claude |
| 4.2 | 2025-05-20 | AWS環境対応 - 環境特性に最適化された処理を追加。環境固有設定ファイル、環境判定ユーティリティ、API共通関数の導入 | Claude |

