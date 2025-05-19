# 市場データ取得API仕様書（認証バックエンド連携対応版）

**最終更新日時:** 2025-05-12 16:30

## 1. 概要

この仕様書は、ポートフォリオマネージャーアプリケーションで使用する市場データ取得APIおよび関連機能について定義します。リファクタリングに伴い、すべての市場データ取得機能は単一の市場データAPIサーバー（`REACT_APP_MARKET_DATA_API_URL`）に集約されました。加えて、Google認証およびGoogle Drive連携もバックエンドAPI経由に移行され、セキュリティと機能性が向上しています。

## 2. 環境設定

### 2.1 環境変数
- **`REACT_APP_MARKET_DATA_API_URL`**: 市場データAPIサーバーのベースURL（株価、為替、投資信託情報取得、認証連携用）
- **`REACT_APP_API_STAGE`**: APIのステージ環境（'dev'、'prod'など）
- **`REACT_APP_ADMIN_API_KEY`**: 管理者API用認証キー
- **`REACT_APP_GOOGLE_CLIENT_ID`**: Google OAuth認証用クライアントID（フロントエンド側で必要）

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

```javascript
const handleApiRequest = async (url, method = 'get', data = null, params = null) => {
  try {
    const config = {
      withCredentials: true // Cookie送受信のために必要
    };
    
    if (params) {
      config.params = params;
    }
    
    let response;
    if (method === 'get') {
      response = await axios.get(url, config);
    } else {
      response = await axios.post(url, data, config);
    }
    
    return response.data;
  } catch (error) {
    // 認証エラー（401）の場合はログイン画面にリダイレクト
    if (error.response && error.response.status === 401) {
      console.error('認証エラー - ログインが必要です');
      
      // 認証状態をクリア
      if (typeof onAuthChange === 'function') {
        onAuthChange(false);
      }
      
      // ログインページへリダイレクト
      window.location.href = '/login';
      return { success: false, error: 'ログインが必要です' };
    }
    
    // その他のエラー処理
    console.error('APIエラー:', error);
    return { success: false, error: error.message };
  }
};
```

### 7.3 使用量制限の処理

APIには日次と月次の使用量制限があります。制限に達した場合は`429 Too Many Requests`エラーが返されます。

```javascript
const fetchStockDataWithRateLimitHandling = async (ticker) => {
  try {
    const response = await axios.get('${apiBaseUrl}/${apiStage}/api/market-data', {
      params: { 
        type: 'us-stock', 
        symbols: ticker 
      },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    // 使用量制限エラーの処理
    if (error.response && error.response.status === 429) {
      console.warn('API使用量制限に達しました。ローカルデータを使用します。');
      
      // クライアント側でフォールバックデータを提供
      return {
        success: true,
        data: {
          [ticker]: {
            ticker: ticker,
            price: 100, // デフォルト値
            name: ticker,
            currency: 'USD',
            lastUpdated: new Date().toISOString(),
            source: 'Client Fallback',
            isStock: true,
            isMutualFund: false
          }
        }
      };
    }
    
    // その他のエラー処理
    console.error('APIエラー:', error);
    throw error;
  }
};
```

## 8. React用認証フック（更新版）

```javascript
import { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

// 環境変数からAPIの設定を取得
const API_URL = process.env.REACT_APP_MARKET_DATA_API_URL || 'http://localhost:3000';
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';

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
  
  // ログアウト処理
  const logout = async () => {
    try {
      await axios.post(
        `${API_URL}/${API_STAGE}/auth/logout`,
        {},
        { withCredentials: true }
      );
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };
  
  // Googleログイン処理
  const loginWithGoogle = async (credentialResponse) => {
    try {
      const response = await axios.post(
        `${API_URL}/${API_STAGE}/auth/google/login`,
        {
          code: credentialResponse.code,
          redirectUri: window.location.origin + '/auth/callback'
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return true;
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
    }
    return false;
  };
  
  // 初回マウント時にセッション確認
  useEffect(() => {
    checkSession();
  }, []);
  
  // 提供する値
  const value = {
    user,
    isAuthenticated,
    loading,
    loginWithGoogle,
    logout,
    checkSession
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// カスタムフック
export const useAuth = () => {
  return useContext(AuthContext);
};
```

## 9. Google Drive連携フック（更新版）

```javascript
import { useState } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';

// 環境変数からAPIの設定を取得
const API_URL = process.env.REACT_APP_MARKET_DATA_API_URL || 'http://localhost:3000';
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';

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
      
      const response = await axios.get(
        `${API_URL}/${API_STAGE}/drive/files`,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        return response.data.files;
      } else {
        setError(response.data.message || '不明なエラー');
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
      
      const response = await axios.post(
        `${API_URL}/${API_STAGE}/drive/save`,
        { portfolioData },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        return response.data.file;
      } else {
        setError(response.data.message || '不明なエラー');
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
      
      const response = await axios.get(
        `${API_URL}/${API_STAGE}/drive/load`,
        {
          params: { fileId },
          withCredentials: true
        }
      );
      
      if (response.data.success) {
        return response.data.data;
      } else {
        setError(response.data.message || '不明なエラー');
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

## 10. Googleログインボタン（認可コードフロー対応版）

```jsx
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';

const LoginButton = () => {
  const { loginWithGoogle, loading } = useAuth();
  
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    await loginWithGoogle(credentialResponse);
  };
  
  return (
    <div className="login-container">
      <GoogleLogin
        flow="auth-code" // 重要: 認可コードフローを使用
        onSuccess={handleGoogleLoginSuccess}
        onError={() => console.error('ログイン失敗')}
        useOneTap
        shape="pill"
        theme="filled_blue"
        text="continue_with"
        disabled={loading}
      />
      {loading && <div className="mt-2 text-sm text-gray-500">認証処理中...</div>}
    </div>
  );
};

export default LoginButton;
```

## 改訂履歴

| バージョン | 日付 | 内容 | 担当者 |
|---|---|---|---|
| 1.0 | 2023-03-07 | 初版作成 |  |
| 2.0 | 2025-05-07 | ETF対応機能、Python yfinance連携、AIプロンプト生成機能、マルチ通貨対応を追加 |  |
| 3.0 | 2025-05-08 | 代替為替レートソース、株価スクレイピングプロキシ、Alpha Vantage API連携を追加 |  |
| 4.0 | 2025-05-12 | リファクタリング - スクレイピング機能を削除し、市場データAPIに集約。環境変数名を`REACT_APP_MARKET_DATA_API_URL`に変更 | Claude |
| 4.1 | 2025-05-12 | Google認証機能のバックエンド連携対応を追加。クライアントサイド完結型の認証から、認可コードフローを使用したセキュアなバックエンド連携型認証に移行 | Claude |
