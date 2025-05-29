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
  : null; // 環境変数が設定されていない場合はnull

// デバッグ用
console.log('ConfigService initialization:', {
  CONFIG_ENDPOINT,
  REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV
});

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
    .catch(error => {
      console.error('API設定の取得エラー:', error);
      // フォールバック設定を返す
      configCache = {
        marketDataApiUrl: process.env.REACT_APP_API_BASE_URL || '',
        apiStage: 'dev',
        googleClientId: '', // Google Client IDは環境変数または設定APIから取得すべき
        features: {
          useProxy: false,
          useMockApi: false,
          useDirectApi: true
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