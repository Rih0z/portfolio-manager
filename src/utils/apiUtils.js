/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/utils/apiUtils.js
 * 
 * 作成者: System Admin
 * 作成日: 2025-05-19 11:45:00 
 * 
 * 更新履歴: 
 * - 2025-05-19 11:45:00 System Admin 初回作成
 * 
 * 説明: 
 * API呼び出しに関する共通機能を提供するユーティリティ。
 * API呼び出し用のクライアント生成、リトライ機能付きフェッチ、エラー処理、
 * フォールバックデータ生成などの機能を提供します。
 */

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
