/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/utils/apiUtils.js
 * 
 * 作成者: System Admin
 * 作成日: 2025-05-19 11:45:00 
 * 更新日: 2025-05-23 10:00:00
 * 
 * 更新履歴: 
 * - 2025-05-19 11:45:00 System Admin 初回作成
 * - 2025-05-21 16:45:00 System Admin 認証関連の改善
 * - 2025-05-23 10:00:00 System Admin ヘッダーサイズの最適化対応
 * 
 * 説明: 
 * API呼び出しに関する共通機能を提供するユーティリティ。
 * API呼び出し用のクライアント生成、リトライ機能付きフェッチ、エラー処理、
 * フォールバックデータ生成などの機能を提供します。
 */

import axios from 'axios';
import { getApiEndpoint, isLocalDevelopment } from './envUtils';
import csrfManager from './csrfManager';
import { handleApiError } from './errorHandler';

// リトライ設定
export const RETRY = {
  MAX_ATTEMPTS: 2,
  INITIAL_DELAY: 500,
  BACKOFF_FACTOR: 2,
  MAX_DELAY: 60000, // 最大遅延時間: 60秒
  CIRCUIT_BREAKER_THRESHOLD: 5, // サーキットブレーカー発動闾値
  CIRCUIT_BREAKER_TIMEOUT: 300000 // サーキットブレーカータイムアウト: 5分
};

// タイムアウト設定
export const TIMEOUT = {
  DEFAULT: 10000,        // 10秒
  EXCHANGE_RATE: 5000,   // 5秒
  US_STOCK: 10000,       // 10秒
  JP_STOCK: 20000,       // 20秒
  MUTUAL_FUND: 20000     // 20秒
};

// 認証トークンの保存（メモリ内）
let authToken = null;

// サーキットブレーカーの状態管理
const circuitBreakers = new Map();

class CircuitBreaker {
  constructor(name, threshold = RETRY.CIRCUIT_BREAKER_THRESHOLD, timeout = RETRY.CIRCUIT_BREAKER_TIMEOUT) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.nextAttempt = Date.now();
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.log(`Circuit breaker ${this.name} is now OPEN. Will retry at ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  canAttempt() {
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      console.log(`Circuit breaker ${this.name} is now HALF_OPEN`);
      return true;
    }
    
    return this.state === 'HALF_OPEN';
  }

  getWaitTime() {
    if (this.state === 'OPEN') {
      return Math.max(0, this.nextAttempt - Date.now());
    }
    return 0;
  }
}

// サーキットブレーカーの取得または作成
function getCircuitBreaker(name) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name));
  }
  return circuitBreakers.get(name);
}

// サーキットブレーカーをリセット
export function resetCircuitBreaker(name) {
  if (circuitBreakers.has(name)) {
    circuitBreakers.delete(name);
  }
}

// すべてのサーキットブレーカーをリセット
export function resetAllCircuitBreakers() {
  circuitBreakers.clear();
}

// トークンを設定する関数
export const setAuthToken = (token) => {
  authToken = token;
};

// トークンを取得する関数
export const getAuthToken = () => {
  return authToken;
};

// トークンをクリアする関数
export const clearAuthToken = () => {
  authToken = null;
};

// Axiosインスタンスの作成
export const createApiClient = (withAuth = false) => {
  console.log(`Creating API client with auth: ${withAuth}, withCredentials: true`);
  
  const client = axios.create({
    timeout: TIMEOUT.DEFAULT,
    withCredentials: true, // Cookieを送信するために必要
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // CORSプリフライトを避けるため、カスタムヘッダーは最小限に
    }
  });
  
  // デフォルト設定の追加（念のため）
  client.defaults.withCredentials = true;
  
  // クライアント設定を確認
  console.log('API client defaults:', {
    withCredentials: client.defaults.withCredentials,
    timeout: client.defaults.timeout,
    headers: client.defaults.headers
  });
  
  // インターセプターの設定
  if (client.interceptors?.request?.use) {
    client.interceptors.request.use(
      async config => {
          if (process.env.NODE_ENV === 'development') {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      // CSRFトークンを追加（GETリクエスト以外）
      if (config.method !== 'get') {
        try {
          await csrfManager.addTokenToRequest(config);
        } catch (error) {
          console.warn('Failed to add CSRF token:', error);
        }
      }
      
      // 共通ヘッダーを設定（最小限に保つ）
      // Content-TypeとAcceptはデフォルトで設定済みなので、上書きしない
      // 必要に応じて追加のヘッダーのみ設定
      
      // POSTリクエストのデバッグ（開発環境のみ）
      if (process.env.NODE_ENV === 'development' && config.method === 'post' && config.data) {
        console.log('POST Request Body:', JSON.stringify(config.data, null, 2));
      }
      
      // 認証が必要な場合はAuthorizationヘッダーを追加
      if (withAuth) {
        if (authToken) {
          config.headers['Authorization'] = `Bearer ${authToken}`;
        } else {
          // トークンがない場合でも、セッションベース認証の可能性があるため
          // withCredentialsがtrueであることを確認
          // セッションベース認証でリクエストを試行
        }
      }
      
      // withCredentialsを確実に設定
      config.withCredentials = true;
      
      // デバッグ情報（本番環境では無効）
      if (process.env.NODE_ENV === 'development' && (withAuth || config.url.includes('/drive/') || config.url.includes('/auth/'))) {
        console.log('認証情報付きリクエスト:', {
          url: config.url,
          method: config.method,
          hasToken: !!authToken,
          withCredentials: config.withCredentials
        });
      }
      
      return config;
    },
      error => {
        console.error('Request Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // レスポンスインターセプター
  if (client.interceptors?.response?.use) {
    client.interceptors.response.use(
      response => {
      // 成功レスポンスを処理
      if (process.env.NODE_ENV === 'development') {
        console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`);
      }
      
      // トークンがレスポンスに含まれていれば保存（複数の可能な場所をチェック）
      const possibleToken = response.data?.token || 
                           response.data?.accessToken || 
                           response.data?.access_token ||
                           response.data?.authToken ||
                           response.data?.auth_token ||
                           response.data?.jwt ||
                           response.data?.jwtToken;
      
      if (possibleToken) {
        setAuthToken(possibleToken);
      }
      
      return response;
    },
      error => {
        // 認証エラーの詳細をログ出力
        if (error.response && error.response.status === 401) {
          console.error('認証エラー:', {
            status: error.response.status,
            data: error.response.data,
            url: error.config.url,
            method: error.config.method,
            hasToken: !!authToken
          });

          // Google Drive関連のエンドポイントの場合は、トークンをクリアしない
          // （Drive権限が不足している可能性があるため）
          const isDriveEndpoint = error.config.url && error.config.url.includes('/drive/');
          
          // セッション確認エンドポイントの場合のみトークンをクリア
          const isSessionEndpoint = error.config.url && error.config.url.includes('/auth/session');
          
          if (isSessionEndpoint || (!isDriveEndpoint && error.response.data?.message?.includes('Invalid token'))) {
            console.error('トークンが無効です。クリアします。');
            clearAuthToken();
          } else {
            console.log('Drive APIエンドポイントの401エラー。トークンは保持します。');
          }
        }
        
        // エラーをサニタイズして返す
        const sanitizedError = handleApiError(error);
        
        // 開発環境でのみ詳細をログ出力
        if (process.env.NODE_ENV === 'development') {
          console.error('API Error Details:', error);
        }

        return Promise.reject(sanitizedError);
      }
    );
  }
  
  return client;
};

// マーケットデータAPI用のクライアント
export const marketDataClient = createApiClient(false);

// 認証が必要なAPI用のクライアント
export const authApiClient = createApiClient(true);

// リトライ付きフェッチ関数
// 遅延用のヘルパー関数（テストでモック可能）
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchWithRetry = async (
  endpoint,
  params = {},
  timeout = TIMEOUT.DEFAULT,
  maxRetries = RETRY.MAX_ATTEMPTS,
  delayFn = wait
) => {
  let retries = 0;
  const circuitBreaker = getCircuitBreaker(endpoint);
  
  // サーキットブレーカーが開いている場合は待機
  if (!circuitBreaker.canAttempt()) {
    const waitTime = circuitBreaker.getWaitTime();
    throw new Error(`Circuit breaker is OPEN. Service unavailable for ${Math.round(waitTime / 1000)} seconds.`);
  }
  
  while (retries <= maxRetries) {
    try {
      // APIエンドポイントのURL生成
      const url = endpoint.startsWith('http') ? endpoint : await getApiEndpoint(endpoint);
      
      console.log(`[Attempt ${retries + 1}] 市場データ取得: ${url}`, params);
      
      // APIキーは AWS から動的に取得されるため、ここでは設定しない
      const headers = {};
      
      const response = await marketDataClient.get(url, {
        params,
        headers,
        timeout: timeout + (retries * 2000) // リトライごとにタイムアウトを延長
      });
      
      // 成功したらサーキットブレーカーをリセット
      circuitBreaker.recordSuccess();
      return response.data;
    } catch (error) {
      console.error(`API fetch error (attempt ${retries+1}/${maxRetries+1}):`, error.message);
      
      // エラーを記録
      circuitBreaker.recordFailure();
      
      // 最後の試行で失敗した場合はエラーを投げる
      if (retries === maxRetries) {
        throw error;
      }
      
      // リトライ前に遅延を入れる（指数バックオフ+ジッター）
      const baseDelay = RETRY.INITIAL_DELAY * Math.pow(RETRY.BACKOFF_FACTOR, retries);
      const jitteredDelay = baseDelay * (0.9 + Math.random() * 0.2);
      const delay = Math.min(jitteredDelay, RETRY.MAX_DELAY); // 最大遅延を制限
      console.log(`リトライ待機: ${Math.round(delay)}ms`);
      await delayFn(delay);
      
      // リトライカウントを増やす
      retries++;
    }
  }
};

// 認証が必要なリクエスト用のヘルパー関数
export const authFetch = async (endpoint, method = 'get', data = null, config = {}) => {
  const circuitBreaker = getCircuitBreaker(`auth-${endpoint}`);
  
  // サーキットブレーカーが開いている場合は待機
  if (!circuitBreaker.canAttempt()) {
    const waitTime = circuitBreaker.getWaitTime();
    throw new Error(`Circuit breaker is OPEN. Service unavailable for ${Math.round(waitTime / 1000)} seconds.`);
  }
  
  try {
    // APIエンドポイントのURL生成
    const url = endpoint.startsWith('http') ? endpoint : await getApiEndpoint(endpoint);
    
    console.log(`認証付きリクエスト: ${method.toUpperCase()} ${url}`);
    console.log('authFetch cookie debug:', {
      endpoint: endpoint,
      fullUrl: url,
      cookies: document.cookie,
      cookieList: document.cookie.split(';').map(c => c.trim()).filter(c => c),
      hasToken: !!authToken,
      isDriveEndpoint: endpoint.includes('drive'),
      config: config
    });
    
    // APIキーは AWS から動的に取得されるため、ここでは設定しない
    const headers = { ...config.headers };
    
    // HTTPメソッド別の処理（withCredentialsを確実に設定）
    let response;
    const requestConfig = {
      ...config,
      headers,
      withCredentials: true // 常にCookieを送信
    };
    
    if (method.toLowerCase() === 'get') {
      response = await authApiClient.get(url, {
        params: data,
        ...requestConfig
      });
    } else if (method.toLowerCase() === 'post') {
      response = await authApiClient.post(url, data, requestConfig);
    } else if (method.toLowerCase() === 'put') {
      response = await authApiClient.put(url, data, requestConfig);
    } else if (method.toLowerCase() === 'delete') {
      response = await authApiClient.delete(url, {
        data,
        ...requestConfig
      });
    } else {
      throw new Error(`未対応のHTTPメソッド: ${method}`);
    }
    
    // レスポンスデータの詳細をログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('APIレスポンス詳細:', {
        status: response.status,
        data: response.data
      });
    }
    
    // 成功したらサーキットブレーカーをリセット
    circuitBreaker.recordSuccess();
    return response.data;
  } catch (error) {
    // エラーを記録
    circuitBreaker.recordFailure();
    console.error(`Auth API error (${method} ${endpoint}):`, error.message);
    
    // エラーレスポンスがある場合は詳細を表示
    if (error.response) {
      console.error('エラーレスポンス詳細:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
      
      // 400エラーの場合、レスポンスデータを返す（エラー情報を含む）
      if (error.response.status === 400 && error.response.data) {
        return error.response.data;
      }
    }
    
    // Network Errorの詳細情報を出力
    if (error.message === 'Network Error') {
      console.error('Network Error詳細:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data,
        baseURL: error.config?.baseURL,
        withCredentials: error.config?.withCredentials
      });
      
      // CORSエラーの可能性を通知
      console.error('CORSエラーの可能性があります。以下を確認してください:');
      console.error('1. API Gatewayで正しいCORSヘッダーが設定されているか');
      console.error('2. プリフライトリクエスト(OPTIONS)が正しく処理されているか');
      console.error('3. Access-Control-Allow-Origin ヘッダーが適切に設定されているか');
    }
    
    throw error;
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

export default {
  createApiClient,
  marketDataClient,
  authApiClient,
  fetchWithRetry,
  authFetch,
  formatErrorResponse,
  generateFallbackData,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  TIMEOUT,
  RETRY
};
