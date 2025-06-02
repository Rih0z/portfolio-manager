/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/utils/envUtils.js
 * 
 * 作成者: System Admin
 * 作成日: 2025-05-19 11:30:00 
 * 更新日: 2025-05-27
 * 
 * 更新履歴: 
 * - 2025-05-19 11:30:00 System Admin 初回作成
 * - 2025-05-21 16:30:00 System Admin リダイレクトURI生成機能を追加
 * - 2025-05-23 10:00:00 System Admin リダイレクトURI最適化
 * - 2025-05-27 System Admin AWS設定取得に変更
 * 
 * 説明: 
 * 環境に応じたAPI設定を提供するユーティリティ関数。
 * すべてのAPI設定はAWSから動的に取得されます。
 */

import { fetchApiConfig } from '../services/configService';

// 環境の判定
export const isDevelopment = () => process.env.NODE_ENV === 'development';

// ローカル開発環境かどうかの判定（ローカルホストの場合true）
export const isLocalDevelopment = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// API設定のキャッシュ
let apiConfigCache = null;

// AWS から API 設定を取得（内部使用）
const getApiConfig = async () => {
  if (!apiConfigCache) {
    try {
      apiConfigCache = await fetchApiConfig();
    } catch (error) {
      console.warn('API設定の取得に失敗しました（フォールバック設定を使用）:', error.message);
      // 403エラーの場合でもアプリを動作させるため、適切なフォールバック設定を提供
      apiConfigCache = {
        marketDataApiUrl: process.env.REACT_APP_API_BASE_URL || 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod',
        apiStage: 'prod',
        googleClientId: '', // 動的に設定される
        features: {
          useProxy: false,
          useMockApi: false,
          useDirectApi: true
        }
      };
    }
  }
  return apiConfigCache || {};
};

// 環境に応じたベースURLの取得（非同期）
export const getBaseApiUrl = async () => {
  const config = await getApiConfig();
  return config.marketDataApiUrl || '';
};

// 環境に応じたAPIステージの取得（非同期）
export const getApiStage = async () => {
  const config = await getApiConfig();
  return config.apiStage || 'dev';
};

// 完全なエンドポイントURLの生成（非同期）
export const getApiEndpoint = async (path) => {
  const config = await getApiConfig();
  const baseUrl = config.marketDataApiUrl || '';
  const stage = config.apiStage || 'dev';
  
  // パスが既にスラッシュで始まる場合は削除
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // プロダクション環境でCloudflare Pagesプロキシを使用
  if (process.env.NODE_ENV === 'production') {
    // プロダクション環境では全てプロキシ経由
    return `/api-proxy/${cleanPath}`;
  }
  
  // ローカル開発環境でプロキシを使用する場合
  if (isLocalDevelopment() && config.features?.useProxy) {
    // プロキシではシンプルなパスを使用
    return `/${stage}/${cleanPath}`;
  }
  
  // AWS APIのURLを使用
  if (baseUrl) {
    // baseUrlに既にステージが含まれているかチェック
    if (baseUrl.includes('/prod') || baseUrl.includes('/dev')) {
      return `${baseUrl}/${cleanPath}`;
    }
    return `${baseUrl}/${stage}/${cleanPath}`;
  }
  
  // フォールバック
  return `/${stage}/${cleanPath}`;
};

// Google認証用のクライアントIDを取得（非同期）
export const getGoogleClientId = async () => {
  try {
    const config = await getApiConfig();
    const clientId = config?.googleClientId;
    // フォールバック: 一般的な開発環境用のダミーGoogle Client ID
    if (!clientId) {
      console.warn('Google Client ID が取得できません。フォールバックIDを使用します。');
      return 'dummy-client-id-for-development';
    }
    return clientId;
  } catch (error) {
    console.warn('Google Client ID の取得に失敗しました（フォールバックを使用）:', error.message);
    return 'dummy-client-id-for-development';
  }
};

// 現在のWebアプリケーションの完全なオリジンを取得
export const getOrigin = () => {
  return window.location.origin;
};

// リダイレクトURIを生成
export const getRedirectUri = (path = '/auth/callback') => {
  const origin = getOrigin();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${origin}/${cleanPath}`;
};

// デフォルト為替レートを取得
export const getDefaultExchangeRate = () => {
  const defaultRate = parseFloat(process.env.REACT_APP_DEFAULT_EXCHANGE_RATE);
  return isNaN(defaultRate) ? 150.0 : defaultRate;
};

// 同期的に使用するための初期化関数
export const initializeApiConfig = async () => {
  await getApiConfig();
};

export default {
  isDevelopment,
  isLocalDevelopment,
  getBaseApiUrl,
  getApiStage,
  getApiEndpoint,
  getGoogleClientId,
  getOrigin,
  getRedirectUri,
  getDefaultExchangeRate,
  initializeApiConfig
};