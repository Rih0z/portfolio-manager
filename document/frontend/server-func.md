# ポートフォリオマネージャーAWS移行実装計画

提供された文書を詳しく分析し、AWSに移行したサーバー機能とGoogleログイン機能を使用できるようにするための具体的な計画を作成しました。開発環境と本番環境の切り替えにも対応します。

## 1. 現状と目標

**現状**：
- サーバー機能とGoogleログイン機能がAWSに移行済み
- how-to-call-api.mdでAPI呼び出し方法が詳細に説明されている
- アプリケーションコードは古いエンドポイントを使用している

**目標**：
- マーケットデータAPI呼び出しをAWS環境に対応させる
- 開発環境ではローカルホスト、本番環境ではAWSエンドポイントを自動的に使用するよう設定する
- Google認証をAWS環境と連携させる
- Google Drive連携機能をAWS環境用に更新する
- エラーハンドリングを強化し、信頼性を向上させる

## 2. 主要な変更点

### 2.1 環境に応じたエンドポイント切り替え
```
// 開発環境
http://localhost:3000/dev/api/market-data

// 本番環境
https://[api-id].execute-api.ap-northeast-1.amazonaws.com/[stage]/api/market-data
```

### 2.2 API呼び出し方法の変更
- クエリパラメータの形式が変更（例：`refresh: true`→`refresh: 'true'`）
- データ取得のパスとパラメータ構造の変更
- 認証関連のエンドポイントとパラメータの変更
- Google Drive連携エンドポイントの追加

### 2.3 認証フロー更新
- Cookieベースの認証に対応するための設定変更
- `withCredentials: true` フラグの追加
- Google OAuth認証フローの更新

## 3. 実装計画

### Phase 1: 環境変数設定とユーティリティ関数作成（1日）

1. **環境変数の更新**
   ```
   # .env.development
   REACT_APP_ENV=development
   REACT_APP_LOCAL_API_URL=http://localhost:3000
   REACT_APP_AWS_API_URL=https://[dev-api-id].execute-api.ap-northeast-1.amazonaws.com
   REACT_APP_API_STAGE=dev
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
   
   # .env.production
   REACT_APP_ENV=production
   REACT_APP_LOCAL_API_URL=http://localhost:3000
   REACT_APP_AWS_API_URL=https://[prod-api-id].execute-api.ap-northeast-1.amazonaws.com
   REACT_APP_API_STAGE=prod
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
   ```

2. **環境設定ユーティリティの作成**
   ```javascript
   // src/utils/envUtils.js
   
   // 環境の判定
   export const isDevelopment = process.env.REACT_APP_ENV === 'development';
   
   // ローカル開発環境かどうかの判定（ローカルホストの場合true）
   export const isLocalDevelopment = () => {
     return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
   };
   
   // 環境に応じたベースURLの取得
   export const getBaseApiUrl = () => {
     // ローカル開発環境の場合はローカルURLを返す
     if (isLocalDevelopment()) {
       return process.env.REACT_APP_LOCAL_API_URL;
     }
     // それ以外の場合はAWS URLを返す
     return process.env.REACT_APP_AWS_API_URL;
   };
   
   // 環境に応じたAPIステージの取得
   export const getApiStage = () => {
     return process.env.REACT_APP_API_STAGE;
   };
   
   // 完全なエンドポイントURLの生成
   export const getApiEndpoint = (path) => {
     const baseUrl = getBaseApiUrl();
     const stage = getApiStage();
     
     // ローカル開発環境の場合はパスの形式が異なる
     if (isLocalDevelopment()) {
       // ローカル環境では /dev/api/market-data のような形式
       return `${baseUrl}/${stage}/${path}`;
     }
     
     // AWS環境ではAPIゲートウェイの形式に合わせる
     return `${baseUrl}/${stage}/${path}`;
   };
   ```

3. **API呼び出しユーティリティの作成**
   ```javascript
   // src/utils/apiUtils.js
   
   import axios from 'axios';
   import { getApiEndpoint } from './envUtils';
   
   // リトライ設定
   export const RETRY = {
     MAX_ATTEMPTS: 2,
     INITIAL_DELAY: 500,
     BACKOFF_FACTOR: 2
   };
   
   // タイムアウト設定
   export const TIMEOUT = {
     DEFAULT: 10000,        // 10秒
     EXCHANGE_RATE: 5000,   // 5秒
     US_STOCK: 10000,       // 10秒
     JP_STOCK: 20000,       // 20秒
     MUTUAL_FUND: 20000     // 20秒
   };
   
   // Axiosインスタンスの作成
   export const createApiClient = (withAuth = false) => {
     const client = axios.create({
       timeout: TIMEOUT.DEFAULT,
       withCredentials: withAuth // 認証が必要な場合はクッキーを送信
     });
     
     // インターセプターの設定（必要に応じて）
     client.interceptors.request.use(
       config => {
         console.log(`API Request: ${config.url}`);
         return config;
       },
       error => {
         console.error('Request Error:', error);
         return Promise.reject(error);
       }
     );
     
     return client;
   };
   
   // マーケットデータAPI用のクライアント
   export const marketDataClient = createApiClient(false);
   
   // 認証が必要なAPI用のクライアント
   export const authApiClient = createApiClient(true);
   
   // リトライ付きフェッチ関数
   export const fetchWithRetry = async (url, params = {}, timeout = TIMEOUT.DEFAULT, maxRetries = RETRY.MAX_ATTEMPTS) => {
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
   
   // エラーレスポンスをフォーマットする関数
   export const formatErrorResponse = (error, ticker) => {
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
   
   // フォールバックデータを生成する関数
   export const generateFallbackData = (ticker) => {
     // 銘柄のタイプを判定
     const isJPStock = /^\d{4}(\.T)?$/.test(ticker);
     const isMutualFund = /^\d{7}C(\.T)?$/.test(ticker);
     
     // デフォルト値
     return {
       ticker: ticker,
       price: isJPStock ? 1000 : isMutualFund ? 10000 : 100,
       name: `${ticker} (フォールバック)`,
       currency: isJPStock || isMutualFund ? 'JPY' : 'USD',
       lastUpdated: new Date().toISOString(),
       source: 'Fallback',
       isStock: !isMutualFund,
       isMutualFund: isMutualFund
     };
   };
   ```

### Phase 2: マーケットデータサービスの更新（1.5日）

1. **marketDataService.jsの更新**
   ```javascript
   // src/services/marketDataService.js
   
   import { getApiEndpoint } from '../utils/envUtils';
   import { fetchWithRetry, formatErrorResponse, generateFallbackData, TIMEOUT } from '../utils/apiUtils';
   
   // 通貨換算レート取得
   export const fetchExchangeRate = async (fromCurrency = 'USD', toCurrency = 'JPY', refresh = false) => {
     try {
       const endpoint = getApiEndpoint('api/market-data');
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
   
   // 単一銘柄データ取得
   export const fetchStockData = async (ticker, refresh = false) => {
     // 銘柄タイプに基づくタイムアウト設定
     let type = 'us-stock';
     let timeout = TIMEOUT.US_STOCK;
     
     // 日本株判定（数字4桁 + オプションの.T）
     if (/^\d{4}(\.T)?$/.test(ticker)) {
       type = 'jp-stock';
       timeout = TIMEOUT.JP_STOCK;
     }
     // 投資信託判定（数字7桁 + C + オプションの.T）
     else if (/^\d{7}C(\.T)?$/.test(ticker)) {
       type = 'mutual-fund';
       timeout = TIMEOUT.MUTUAL_FUND;
     }
     
     try {
       console.log(`Attempting to fetch data for ${ticker} from Market Data API`);
       const endpoint = getApiEndpoint('api/market-data');
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
       console.error(`Error fetching ${ticker} from Market Data API:`, {
         message: error.message,
         status: error.response?.status,
         data: error.response?.data,
         code: error.code
       });
       
       // フォールバック処理
       return {
         success: false,
         ...formatErrorResponse(error, ticker),
         // フォールバックデータも含める
         data: {
           [ticker]: generateFallbackData(ticker)
         },
         source: 'Fallback'
       };
     }
   };
   
   // 複数銘柄データ一括取得
   export const fetchMultipleStocks = async (tickers, refresh = false) => {
     if (!tickers || tickers.length === 0) {
       return { success: true, data: {} };
     }
     
     // 銘柄をタイプ別に分類
     const jpStocks = tickers.filter(ticker => /^\d{4}(\.T)?$/.test(ticker));
     const mutualFunds = tickers.filter(ticker => /^\d{7}C(\.T)?$/.test(ticker));
     const usStocks = tickers.filter(ticker => 
       !(/^\d{4}(\.T)?$/.test(ticker)) && !(/^\d{7}C(\.T)?$/.test(ticker))
     );
     
     const results = {
       success: true,
       data: {},
       errors: [],
       sources: {}
     };
     
     // 並列にAPI呼び出し
     const requests = [];
     
     if (usStocks.length > 0) {
       requests.push(
         fetchStockBatch('us-stock', usStocks, refresh, TIMEOUT.US_STOCK)
         .then(data => {
           Object.assign(results.data, data.data || {});
           if (data.errors) results.errors = [...results.errors, ...data.errors];
           if (data.source) {
             results.sources[data.source] = (results.sources[data.source] || 0) + Object.keys(data.data || {}).length;
           }
         })
         .catch(error => {
           console.error('Error fetching US stocks:', error);
           // フォールバック処理
           usStocks.forEach(ticker => {
             results.data[ticker] = generateFallbackData(ticker);
             results.sources['Fallback'] = (results.sources['Fallback'] || 0) + 1;
           });
         })
       );
     }
     
     if (jpStocks.length > 0) {
       requests.push(
         fetchStockBatch('jp-stock', jpStocks, refresh, TIMEOUT.JP_STOCK)
         .then(data => {
           Object.assign(results.data, data.data || {});
           if (data.errors) results.errors = [...results.errors, ...data.errors];
           if (data.source) {
             results.sources[data.source] = (results.sources[data.source] || 0) + Object.keys(data.data || {}).length;
           }
         })
         .catch(error => {
           console.error('Error fetching JP stocks:', error);
           // フォールバック処理
           jpStocks.forEach(ticker => {
             results.data[ticker] = generateFallbackData(ticker);
             results.sources['Fallback'] = (results.sources['Fallback'] || 0) + 1;
           });
         })
       );
     }
     
     if (mutualFunds.length > 0) {
       requests.push(
         fetchStockBatch('mutual-fund', mutualFunds, refresh, TIMEOUT.MUTUAL_FUND)
         .then(data => {
           Object.assign(results.data, data.data || {});
           if (data.errors) results.errors = [...results.errors, ...data.errors];
           if (data.source) {
             results.sources[data.source] = (results.sources[data.source] || 0) + Object.keys(data.data || {}).length;
           }
         })
         .catch(error => {
           console.error('Error fetching mutual funds:', error);
           // フォールバック処理
           mutualFunds.forEach(ticker => {
             results.data[ticker] = generateFallbackData(ticker);
             results.sources['Fallback'] = (results.sources['Fallback'] || 0) + 1;
           });
         })
       );
     }
     
     // すべてのリクエストが完了するのを待つ
     await Promise.all(requests);
     
     // 結果をソースごとに集計
     results.sourcesSummary = Object.entries(results.sources)
       .map(([source, count]) => `${source}: ${count}件`)
       .join(', ');
     
     return results;
   };
   
   // バッチでのデータ取得（内部関数）
   const fetchStockBatch = async (type, symbols, refresh, timeout) => {
     try {
       const endpoint = getApiEndpoint('api/market-data');
       return await fetchWithRetry(
         endpoint,
         {
           type,
           symbols: symbols.join(','),
           refresh: refresh ? 'true' : 'false'
         },
         timeout
       );
     } catch (error) {
       console.error(`Error in fetchStockBatch (${type}):`, error);
       throw error;
     }
   };
   
   // ステータス取得（管理者用）
   export const fetchApiStatus = async () => {
     try {
       const endpoint = getApiEndpoint('admin/status');
       const response = await fetchWithRetry(
         endpoint,
         {
           apiKey: process.env.REACT_APP_ADMIN_API_KEY
         }
       );
       return response;
     } catch (error) {
       console.error('Error fetching API status:', error);
       return { success: false, error: formatErrorResponse(error) };
     }
   };
   ```

### Phase 3: 認証機能の更新（1.5日）

1. **AuthContext.jsの更新**
   ```javascript
   // src/context/AuthContext.js
   
   import { createContext, useState, useEffect, useCallback, useRef } from 'react';
   import { getApiEndpoint } from '../utils/envUtils';
   import { authApiClient } from '../utils/apiUtils';
   import jwtDecode from 'jwt-decode';
   
   const AuthContext = createContext();
   
   export const AuthProvider = ({ children }) => {
     // 状態管理
     const [user, setUser] = useState(null);
     const [isAuthenticated, setIsAuthenticated] = useState(false);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
     const portfolioContextRef = useRef(null);
     
     // セッション確認
     const checkSession = useCallback(async () => {
       try {
         setLoading(true);
         const response = await authApiClient.get(
           getApiEndpoint('auth/session')
         );
         
         if (response.data.success && response.data.isAuthenticated) {
           setUser(response.data.user);
           setIsAuthenticated(true);
           setError(null);
           
           // ポートフォリオコンテキストに認証状態変更を通知
           if (portfolioContextRef.current?.handleAuthStateChange) {
             portfolioContextRef.current.handleAuthStateChange(true, response.data.user);
           }
         } else {
           setUser(null);
           setIsAuthenticated(false);
         }
       } catch (error) {
         console.error('セッション確認エラー:', error);
         setUser(null);
         setIsAuthenticated(false);
         setError('セッション確認中にエラーが発生しました');
       } finally {
         setLoading(false);
       }
     }, []);
     
     // ポートフォリオコンテキスト参照の設定
     const setPortfolioContextRef = useCallback((context) => {
       portfolioContextRef.current = context;
     }, []);
     
     // Googleログイン
     const loginWithGoogle = async (credentialResponse) => {
       try {
         setLoading(true);
         setError(null);
         
         const response = await authApiClient.post(
           getApiEndpoint('auth/google/login'),
           {
             code: credentialResponse.code,
             redirectUri: window.location.origin + '/auth/callback'
           }
         );
         
         if (response.data.success) {
           setUser(response.data.user);
           setIsAuthenticated(true);
           
           // ポートフォリオコンテキストに認証状態変更を通知
           if (portfolioContextRef.current?.handleAuthStateChange) {
             portfolioContextRef.current.handleAuthStateChange(true, response.data.user);
           }
           
           return true;
         } else {
           setError(response.data.message || 'ログインに失敗しました');
           return false;
         }
       } catch (error) {
         console.error('Google認証エラー:', error);
         setError(error.response?.data?.message || 'ログイン処理中にエラーが発生しました');
         return false;
       } finally {
         setLoading(false);
       }
     };
     
     // ログアウト
     const logout = async () => {
       try {
         setLoading(true);
         await authApiClient.post(getApiEndpoint('auth/logout'));
         
         setUser(null);
         setIsAuthenticated(false);
         
         // ポートフォリオコンテキストに認証状態変更を通知
         if (portfolioContextRef.current?.handleAuthStateChange) {
           portfolioContextRef.current.handleAuthStateChange(false, null);
         }
         
         return true;
       } catch (error) {
         console.error('ログアウトエラー:', error);
         setError('ログアウト処理中にエラーが発生しました');
         return false;
       } finally {
         setLoading(false);
       }
     };
     
     // 初期ロード時のセッション確認
     useEffect(() => {
       checkSession();
     }, [checkSession]);
     
     // コンテキスト値の提供
     const value = {
       user,
       isAuthenticated,
       loading,
       error,
       loginWithGoogle,
       logout,
       checkSession,
       setPortfolioContextRef
     };
     
     return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
   };
   
   export default AuthContext;
   export const AuthConsumer = AuthContext.Consumer;
   ```

2. **LoginButton.jsxの更新**
   ```javascript
   // src/components/auth/LoginButton.jsx
   
   import React, { useState } from 'react';
   import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
   import { useAuth } from '../../hooks/useAuth';
   
   const LoginButton = () => {
     const { loginWithGoogle, loading, error } = useAuth();
     const [loginError, setLoginError] = useState(null);
     
     const handleGoogleLoginSuccess = async (credentialResponse) => {
       if (!credentialResponse.code) {
         setLoginError('認証コードが取得できませんでした');
         return;
       }
       
       const success = await loginWithGoogle(credentialResponse);
       if (!success) {
         setLoginError('ログインに失敗しました');
       }
     };
     
     const handleGoogleLoginError = () => {
       setLoginError('Google認証中にエラーが発生しました');
     };
     
     return (
       <div className="login-container">
         <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
           <GoogleLogin
             flow="auth-code"
             onSuccess={handleGoogleLoginSuccess}
             onError={handleGoogleLoginError}
             useOneTap
             shape="pill"
             text="continue_with"
             disabled={loading}
           />
         </GoogleOAuthProvider>
         
         {(loginError || error) && (
           <p className="error-message">{loginError || error}</p>
         )}
         
         {loading && <p className="loading-text">認証処理中...</p>}
       </div>
     );
   };
   
   export default LoginButton;
   ```

3. **useAuth.jsの更新**
   ```javascript
   // src/hooks/useAuth.js
   
   import { useContext } from 'react';
   import AuthContext from '../context/AuthContext';
   
   export const useAuth = () => {
     return useContext(AuthContext);
   };
   
   export default useAuth;
   ```

### Phase 4: Google Drive連携機能の更新（1.5日）

1. **useGoogleDriveフックの作成**
   ```javascript
   // src/hooks/useGoogleDrive.js
   
   import { useState, useCallback } from 'react';
   import { getApiEndpoint } from '../utils/envUtils';
   import { authApiClient } from '../utils/apiUtils';
   import { useAuth } from './useAuth';
   
   export const useGoogleDrive = () => {
     const { isAuthenticated } = useAuth();
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState(null);
     
     // ファイル一覧取得
     const listFiles = useCallback(async () => {
       if (!isAuthenticated) {
         setError('認証が必要です');
         return null;
       }
       
       try {
         setLoading(true);
         setError(null);
         
         const response = await authApiClient.get(
           getApiEndpoint('drive/files')
         );
         
         if (response.data.success) {
           return response.data.files;
         } else {
           setError(response.data.message || '不明なエラー');
           return null;
         }
       } catch (error) {
         console.error('Google Driveファイル一覧取得エラー:', error);
         setError(error.response?.data?.message || 'ファイル一覧取得エラー');
         return null;
       } finally {
         setLoading(false);
       }
     }, [isAuthenticated]);
     
     // ファイル保存
     const saveFile = useCallback(async (portfolioData) => {
       if (!isAuthenticated) {
         setError('認証が必要です');
         return null;
       }
       
       try {
         setLoading(true);
         setError(null);
         
         const response = await authApiClient.post(
           getApiEndpoint('drive/save'),
           { portfolioData }
         );
         
         if (response.data.success) {
           return response.data.file;
         } else {
           setError(response.data.message || '不明なエラー');
           return null;
         }
       } catch (error) {
         console.error('Google Driveファイル保存エラー:', error);
         setError(error.response?.data?.message || 'ファイル保存エラー');
         return null;
       } finally {
         setLoading(false);
       }
     }, [isAuthenticated]);
     
     // ファイル読み込み
     const loadFile = useCallback(async (fileId) => {
       if (!isAuthenticated) {
         setError('認証が必要です');
         return null;
       }
       
       try {
         setLoading(true);
         setError(null);
         
         const response = await authApiClient.get(
           getApiEndpoint('drive/load'),
           { params: { fileId } }
         );
         
         if (response.data.success) {
           return response.data.data;
         } else {
           setError(response.data.message || '不明なエラー');
           return null;
         }
       } catch (error) {
         console.error('Google Driveファイル読み込みエラー:', error);
         setError(error.response?.data?.message || 'ファイル読み込みエラー');
         return null;
       } finally {
         setLoading(false);
       }
     }, [isAuthenticated]);
     
     return {
       listFiles,
       saveFile,
       loadFile,
       loading,
       error
     };
   };
   
   export default useGoogleDrive;
   ```

2. **GoogleDriveIntegration.jsxの更新**
   ```javascript
   // src/components/data/GoogleDriveIntegration.jsx
   
   import React, { useState, useEffect } from 'react';
   import { useGoogleDrive } from '../../hooks/useGoogleDrive';
   import { useAuth } from '../../hooks/useAuth';
   import { usePortfolioContext } from '../../hooks/usePortfolioContext';
   
   const GoogleDriveIntegration = () => {
     const { isAuthenticated, user } = useAuth();
     const { listFiles, saveFile, loadFile, loading, error } = useGoogleDrive();
     const { 
       currentAssets, 
       targetPortfolio, 
       baseCurrency, 
       additionalBudget,
       aiPromptTemplate,
       saveToLocalStorage
     } = usePortfolioContext();
     
     const [files, setFiles] = useState([]);
     const [syncStatus, setSyncStatus] = useState('idle');
     const [lastSync, setLastSync] = useState(null);
     const [operationResult, setOperationResult] = useState(null);
     
     // ファイル一覧を取得
     const fetchFiles = async () => {
       if (!isAuthenticated) return;
       
       const filesList = await listFiles();
       if (filesList) {
         setFiles(filesList);
       }
     };
     
     // 初期ロード時にファイル一覧を取得
     useEffect(() => {
       if (isAuthenticated) {
         fetchFiles();
       }
     }, [isAuthenticated]);
     
     // クラウドに保存
     const handleSaveToCloud = async () => {
       setSyncStatus('saving');
       setOperationResult(null);
       
       // ポートフォリオデータの構築
       const portfolioData = {
         baseCurrency,
         currentAssets,
         targetPortfolio,
         additionalBudget,
         aiPromptTemplate,
         timestamp: new Date().toISOString(),
         version: '6.0'
       };
       
       const result = await saveFile(portfolioData);
       if (result) {
         setSyncStatus('success');
         setLastSync(new Date());
         setOperationResult({
           success: true,
           message: 'Google Driveへの保存が完了しました',
           details: result
         });
       } else {
         setSyncStatus('error');
         setOperationResult({
           success: false,
           message: '保存中にエラーが発生しました',
           details: error
         });
       }
     };
     
     // ファイルから読み込み
     const handleLoadFile = async (fileId) => {
       setSyncStatus('loading');
       setOperationResult(null);
       
       const data = await loadFile(fileId);
       if (data) {
         // ポートフォリオコンテキストのデータを更新
         // 注：実際の実装ではportfolioContextのloadFromCloudのような関数を呼び出すべき
         
         setSyncStatus('success');
         setLastSync(new Date());
         setOperationResult({
           success: true,
           message: 'Google Driveからデータを読み込みました',
           details: {
             filename: files.find(f => f.id === fileId)?.name || 'Unknown file',
             timestamp: data.timestamp
           }
         });
         
         // ローカルストレージにも保存
         saveToLocalStorage();
       } else {
         setSyncStatus('error');
         setOperationResult({
           success: false,
           message: '読み込み中にエラーが発生しました',
           details: error
         });
       }
     };
     
     // 未認証時の表示
     if (!isAuthenticated) {
       return (
         <div className="google-drive-integration">
           <h2>Google Drive連携</h2>
           <p>Google Driveと連携するにはログインしてください。</p>
         </div>
       );
     }
     
     return (
       <div className="google-drive-integration">
         <h2>Google Drive連携</h2>
         
         {/* ユーザー情報 */}
         <div className="user-info">
           {user?.picture && <img src={user.picture} alt={user.name} className="user-avatar" />}
           <span>{user?.name || 'ユーザー'}としてログイン中</span>
         </div>
         
         {/* 操作ボタン */}
         <div className="drive-actions">
           <button 
             onClick={handleSaveToCloud} 
             disabled={loading || syncStatus === 'saving'}
             className="btn btn-primary"
           >
             {loading && syncStatus === 'saving' ? '保存中...' : 'Google Driveに保存'}
           </button>
           
           <button
             onClick={fetchFiles}
             disabled={loading}
             className="btn btn-secondary"
           >
             ファイル一覧更新
           </button>
         </div>
         
         {/* 同期ステータス */}
         {lastSync && (
           <div className="sync-status">
             <p>最終同期: {lastSync.toLocaleString()}</p>
           </div>
         )}
         
         {/* 操作結果 */}
         {operationResult && (
           <div className={`operation-result ${operationResult.success ? 'success' : 'error'}`}>
             <p>{operationResult.message}</p>
             {operationResult.details && (
               <pre>{JSON.stringify(operationResult.details, null, 2)}</pre>
             )}
           </div>
         )}
         
         {/* ファイル一覧 */}
         <div className="files-list">
           <h3>保存済みファイル</h3>
           {loading && syncStatus === 'loading' ? (
             <p>ファイル読み込み中...</p>
           ) : files.length === 0 ? (
             <p>保存されたファイルはありません</p>
           ) : (
             <ul>
               {files.map(file => (
                 <li key={file.id} className="file-item">
                   <div className="file-info">
                     <span className="file-name">{file.name}</span>
                     <span className="file-date">{new Date(file.createdAt).toLocaleString()}</span>
                   </div>
                   <div className="file-actions">
                     <button
                       onClick={() => handleLoadFile(file.id)}
                       disabled={loading}
                       className="btn btn-sm"
                     >
                       読み込む
                     </button>
                     {file.webViewLink && (
                       <a
                         href={file.webViewLink}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="btn btn-sm btn-link"
                       >
                         表示
                       </a>
                     )}
                   </div>
                 </li>
               ))}
             </ul>
           )}
         </div>
         
         {/* エラー表示 */}
         {error && (
           <div className="error-message">
             <p>エラー: {error}</p>
           </div>
         )}
       </div>
     );
   };
   
   export default GoogleDriveIntegration;
   ```

### Phase 5: PortfolioContextの更新（0.5日）

```javascript
// src/context/PortfolioContext.js の更新部分

// Google認証状態変更ハンドラ
const handleAuthStateChange = useCallback((isAuthenticated, user) => {
  if (isAuthenticated && user) {
    console.log('認証済みユーザー:', user.name);
    setIsAuthenticated(true);
    setUser(user);
    
    // 認証後に必要な初期化処理があれば実行
    // 例: 認証ユーザー固有のデータ読み込みなど
  } else {
    console.log('未認証状態に変更');
    setIsAuthenticated(false);
    setUser(null);
  }
}, []);

// クラウドからのデータ読み込み
const loadFromCloud = useCallback((cloudData) => {
  if (!cloudData) return false;
  
  try {
    // バージョンチェック
    const dataVersion = cloudData.version || '1.0';
    console.log(`クラウドデータのバージョン: ${dataVersion}`);
    
    // 互換性チェックとデータ変換処理（必要に応じて）
    
    // データをステートに設定
    setBaseCurrency(cloudData.baseCurrency || 'JPY');
    setCurrentAssets(cloudData.currentAssets || []);
    setTargetPortfolio(cloudData.targetPortfolio || []);
    setAdditionalBudget(cloudData.additionalBudget || { amount: 0, currency: 'JPY' });
    
    if (cloudData.aiPromptTemplate) {
      setAiPromptTemplate(cloudData.aiPromptTemplate);
    }
    
    // 読み込んだデータをローカルストレージにも保存
    setTimeout(() => saveToLocalStorage(), 100);
    
    return true;
  } catch (error) {
    console.error('クラウドデータ読み込みエラー:', error);
    addNotification('クラウドデータの読み込みに失敗しました', 'error');
    return false;
  }
}, [addNotification, saveToLocalStorage]);

// 提供するコンテキスト値にフックを追加
const value = {
  // 既存の値...
  handleAuthStateChange,
  loadFromCloud
};
```

### Phase 6: エラーハンドリングとテスト（2日）

1. **エラーハンドリングとリトライメカニズムの改善**
   - タイムアウト処理
   - 指数バックオフによるリトライ（Phase 1で実装済み）
   - ユーザーフレンドリーなエラー表示

2. **通知システムの統合**
   - API呼び出し結果に基づく通知表示
   - データソース情報の表示（Market Data API, Fallback）

3. **単体テスト**
   - 各機能の単体テスト（Jest + React Testing Library）
   ```javascript
   // src/__tests__/utils/envUtils.test.js
   
   import { getBaseApiUrl, isLocalDevelopment } from '../../utils/envUtils';
   
   describe('envUtils', () => {
     const originalEnv = process.env;
     
     beforeEach(() => {
       jest.resetModules();
       process.env = { ...originalEnv };
     });
     
     afterAll(() => {
       process.env = originalEnv;
     });
     
     test('isLocalDevelopment returns true for localhost', () => {
       // window.location.hostnameのモック
       Object.defineProperty(window, 'location', {
         value: { hostname: 'localhost' },
         writable: true
       });
       
       expect(isLocalDevelopment()).toBe(true);
     });
     
     test('getBaseApiUrl returns local URL for localhost', () => {
       // 環境変数の設定
       process.env.REACT_APP_LOCAL_API_URL = 'http://localhost:3000';
       process.env.REACT_APP_AWS_API_URL = 'https://api.example.com';
       
       // window.location.hostnameのモック
       Object.defineProperty(window, 'location', {
         value: { hostname: 'localhost' },
         writable: true
       });
       
       expect(getBaseApiUrl()).toBe('http://localhost:3000');
     });
     
     test('getBaseApiUrl returns AWS URL for non-localhost', () => {
       // 環境変数の設定
       process.env.REACT_APP_LOCAL_API_URL = 'http://localhost:3000';
       process.env.REACT_APP_AWS_API_URL = 'https://api.example.com';
       
       // window.location.hostnameのモック
       Object.defineProperty(window, 'location', {
         value: { hostname: 'app.example.com' },
         writable: true
       });
       
       expect(getBaseApiUrl()).toBe('https://api.example.com');
     });
   });
   ```

4. **統合テスト**
   - 実際のAWS環境との連携テスト
   - エンドツーエンドテスト

## 4. CORS対応と注意点

1. **withCredentials設定の追加**
   ```javascript
   // src/utils/apiUtils.js の createApiClient 関数内
   
   export const createApiClient = (withAuth = false) => {
     const client = axios.create({
       timeout: TIMEOUT.DEFAULT,
       withCredentials: withAuth // 認証が必要な場合はクッキーを送信
     });
     
     // インターセプターの設定など
     
     return client;
   };
   ```

2. **セキュリティ考慮事項**
   - Cookie管理（HTTP Only, SameSiteなど）
   - アクセストークン処理
   - API使用量制限への対応

3. **setupProxy.js の確認（開発環境用）**
   ```javascript
   // src/setupProxy.js
   
   const { createProxyMiddleware } = require('http-proxy-middleware');
   
   module.exports = function(app) {
     // ローカル開発環境でのAPI呼び出しをプロキシ
     app.use(
       '/dev/api',
       createProxyMiddleware({
         target: 'http://localhost:3000',
         changeOrigin: true,
       })
     );
     
     // 認証関連のプロキシ
     app.use(
       '/dev/auth',
       createProxyMiddleware({
         target: 'http://localhost:3000',
         changeOrigin: true,
         cookieDomainRewrite: 'localhost',
       })
     );
     
     // Google Drive関連のプロキシ
     app.use(
       '/dev/drive',
       createProxyMiddleware({
         target: 'http://localhost:3000',
         changeOrigin: true,
       })
     );
   };
   ```

## 5. 想定されるリスクと対策

1. **API構造の変更による互換性問題**
   - 対策: 古いデータ構造をサポートするアダプターの実装

2. **認証フローの変更による不具合**
   - 対策: 段階的なテストとフォールバックメカニズム

3. **レート制限とコスト問題**
   - 対策: 適切なキャッシングと使用量モニタリング

4. **CORS関連の問題**
   - 対策: 開発環境でのCORS設定確認とプロキシ設定

5. **環境検出の誤判定**
   - 対策: ユーザーがAPI環境を手動で切り替えられるオプションの提供

## 6. スケジュール概要

| フェーズ | 作業内容 | 期間 |
|---------|---------|------|
| 環境設定 | 環境変数設定とユーティリティ関数作成 | 1.0日 |
| API更新 | マーケットデータサービスの更新 | 1.5日 |
| 認証機能 | Google認証とセッション管理の更新 | 1.5日 |
| Google Drive連携 | ファイル操作とデータ同期機能の更新 | 1.5日 |
| PortfolioContext更新 | 認証状態変更ハンドラとクラウドデータ連携 | 0.5日 |
| テスト・調整 | エラーハンドリング、テスト、バグ修正 | 2.0日 |
| **合計** | | **8.0日** |

## 7. 実装後の検証項目

- ローカル開発環境でAPI呼び出しが正常に機能するか
- 本番環境でAWS APIが正常に呼び出せるか
- Google認証が両環境で機能するか
- Google Drive連携が両環境で機能するか
- 環境切り替え時にエラーが発生しないか
- エラー発生時の処理が適切に機能するか
- 通知システムが適切に情報を表示するか

この計画に従って実装を進めることで、AWSに移行したバックエンド環境に対応したポートフォリオマネージャーアプリケーションを効率的に実装できます。またローカル開発環境と本番環境を自動的に切り替えることで、開発効率も向上します。
