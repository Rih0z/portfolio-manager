/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/utils/apiUtils.js
 * 
 * 作成者: System Admin
 * 作成日: 2025-05-19 11:45:00 
 * 更新日: 2025-05-21 16:45:00
 * 
 * 更新履歴: 
 * - 2025-05-19 11:45:00 System Admin 初回作成
 * - 2025-05-21 16:45:00 System Admin 認証関連の改善
 * 
 * 説明: 
 * API呼び出しに関する共通機能を提供するユーティリティ。
 * API呼び出し用のクライアント生成、リトライ機能付きフェッチ、エラー処理、
 * フォールバックデータ生成などの機能を提供します。
 */

import axios from 'axios';
import { getApiEndpoint, isLocalDevelopment } from './envUtils';

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
  
  // インターセプターの設定
  client.interceptors.request.use(
    config => {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
      
      // 共通ヘッダーを設定
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // デバッグ情報
      if (withAuth) {
        console.log('認証情報付きリクエスト:', {
          url: config.url,
          withCredentials: config.withCredentials,
          method: config.method
        });
      }
      
      return config;
    },
    error => {
      console.error('Request Error:', error);
      return Promise.reject(error);
    }
  );
  
  // レスポンスインターセプター
  client.interceptors.response.use(
    response => {
      // 成功レスポンスを処理
      console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`);
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
          withCredentials: error.config.withCredentials,
          headers: error.config.headers
        });
      } else if (error.response) {
        // その他のエラーレスポンス
        console.error('API Error:', {
          status: error.response.status,
          data: error.response.data,
          url: error.config.url
        });
      } else if (error.request) {
        // リクエストは送信されたがレスポンスが返ってこなかった場合
        console.error('API Request Error (No Response):', {
          url: error.config.url,
          message: error.message
        });
      } else {
        // リクエスト設定中にエラーが発生
        console.error('API Error (Request Setup):', error.message);
      }
      
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
export const fetchWithRetry = async (endpoint, params = {}, timeout = TIMEOUT.DEFAULT, maxRetries = RETRY.MAX_ATTEMPTS) => {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      // APIエンドポイントのURL生成
      const url = endpoint.startsWith('http') ? endpoint : getApiEndpoint(endpoint);
      
      console.log(`[Attempt ${retries + 1}] 市場データ取得: ${url}`, params);
      
      const response = await marketDataClient.get(url, {
        params,
        timeout: timeout + (retries * 2000) // リトライごとにタイムアウトを延長
      });
      
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
      console.log(`リトライ待機: ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // リトライカウントを増やす
      retries++;
    }
  }
};

// 認証が必要なリクエスト用のヘルパー関数
export const authFetch = async (endpoint, method = 'get', data = null, config = {}) => {
  try {
    // APIエンドポイントのURL生成
    const url = endpoint.startsWith('http') ? endpoint : getApiEndpoint(endpoint);
    
    console.log(`認証付きリクエスト: ${method.toUpperCase()} ${url}`);
    
    // HTTPメソッド別の処理
    let response;
    
    if (method.toLowerCase() === 'get') {
      response = await authApiClient.get(url, {
        params: data,
        ...config
      });
    } else if (method.toLowerCase() === 'post') {
      response = await authApiClient.post(url, data, config);
    } else if (method.toLowerCase() === 'put') {
      response = await authApiClient.put(url, data, config);
    } else if (method.toLowerCase() === 'delete') {
      response = await authApiClient.delete(url, {
        data,
        ...config
      });
    } else {
      throw new Error(`未対応のHTTPメソッド: ${method}`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Auth API error (${method} ${endpoint}):`, error.message);
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
  TIMEOUT,
  RETRY
};
