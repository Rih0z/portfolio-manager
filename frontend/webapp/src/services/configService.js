/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/services/configService.js
 * 
 * 作成者: System Admin
 * 作成日: 2025-05-27
 * 
 * 説明: 
 * AWS から API 設定を動的に取得するサービス。
 * クライアントに API URL やキーを保存せずに、
 * すべての設定を AWS から取得します。
 */

import axios from 'axios';

// 設定をキャッシュ
let configCache = null;
let configFetchPromise = null;

// AWS設定エンドポイント
const CONFIG_ENDPOINT = process.env.REACT_APP_API_BASE_URL 
  ? `${process.env.REACT_APP_API_BASE_URL}/config/client`
  : '/api-proxy/config/client'; // フォールバックとしてプロキシを使用

// デバッグ用（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  console.log('ConfigService initialization:', {
    CONFIG_ENDPOINT,
    REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV
  });
}

/**
 * AWS から API 設定を取得
 * @returns {Promise<Object>} API設定オブジェクト
 */
export const fetchApiConfig = async () => {
  // キャッシュがある場合は返す
  if (configCache) {
    return configCache;
  }

  // 既に取得中の場合は同じPromiseを返す
  if (configFetchPromise) {
    return configFetchPromise;
  }

  // CONFIG_ENDPOINTが設定されていない場合はエラー
  if (!CONFIG_ENDPOINT) {
    console.error('REACT_APP_API_BASE_URL が設定されていません。.env ファイルを確認してください。');
    console.error('Current env:', {
      REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      allEnvVars: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'))
    });
    return {
      marketDataApiUrl: '',
      apiStage: 'dev',
      googleClientId: '',
      features: {
        useProxy: false,
        useMockApi: false,
        useDirectApi: true
      }
    };
  }

  // 新しく取得を開始
  configFetchPromise = axios.get(CONFIG_ENDPOINT)
    .then(response => {
      if (response.data && response.data.success) {
        configCache = response.data.data;
        return configCache;
      }
      throw new Error('設定の取得に失敗しました');
    })
    .catch(async error => {
      // エラーの詳細をログに記録
      console.warn('API設定の取得エラー:', error.message);
      
      // 本番環境ではプロキシ経由で再試行
      if (process.env.NODE_ENV === 'production' && CONFIG_ENDPOINT.includes('execute-api')) {
        try {
          const proxyResponse = await axios.get('/api-proxy/config/client');
          if (proxyResponse.data && proxyResponse.data.success) {
            configCache = proxyResponse.data.data;
            return configCache;
          }
        } catch (proxyError) {
          console.warn('プロキシ経由でもAPI設定の取得に失敗:', proxyError.message);
        }
      }
      
      // フォールバック設定を返す
      const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
      configCache = {
        marketDataApiUrl: baseUrl,
        apiStage: baseUrl.includes('/prod') ? 'prod' : 'dev',
        googleClientId: '', // Google Client IDは環境変数または設定APIから取得すべき
        features: {
          useProxy: process.env.NODE_ENV === 'production', // 本番環境ではプロキシを使用
          useMockApi: false,
          useDirectApi: process.env.NODE_ENV !== 'production'
        }
      };
      return configCache;
    })
    .finally(() => {
      configFetchPromise = null;
    });

  return configFetchPromise;
};

/**
 * API エンドポイント URL を取得
 * @returns {Promise<string>} API URL
 */
export const getApiUrl = async () => {
  const config = await fetchApiConfig();
  return config.marketDataApiUrl || '';
};

/**
 * API ステージを取得
 * @returns {Promise<string>} APIステージ
 */
export const getApiStage = async () => {
  const config = await fetchApiConfig();
  return config.apiStage || 'dev';
};

/**
 * Google Client ID を取得
 * @returns {Promise<string>} Google Client ID
 */
export const getGoogleClientId = async () => {
  const config = await fetchApiConfig();
  return config.googleClientId || '';
};

/**
 * 機能フラグを取得
 * @returns {Promise<Object>} 機能フラグ
 */
export const getFeatureFlags = async () => {
  const config = await fetchApiConfig();
  return config.features || {};
};

/**
 * 設定キャッシュをクリア
 */
export const clearConfigCache = () => {
  configCache = null;
  configFetchPromise = null;
};

export default {
  fetchApiConfig,
  getApiUrl,
  getApiStage,
  getGoogleClientId,
  getFeatureFlags,
  clearConfigCache
};