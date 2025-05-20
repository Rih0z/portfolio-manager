/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/utils/envUtils.js
 * 
 * 作成者: System Admin
 * 作成日: 2025-05-19 11:30:00 
 * 更新日: 2025-05-21 16:30:00
 * 
 * 更新履歴: 
 * - 2025-05-19 11:30:00 System Admin 初回作成
 * - 2025-05-21 16:30:00 System Admin リダイレクトURI生成機能を追加
 * 
 * 説明: 
 * 環境に応じたAPI設定を提供するユーティリティ関数。
 * 開発環境または本番環境の判定および環境に応じたAPIエンドポイントURLの
 * 生成機能を提供します。
 */

// 環境の判定
export const isDevelopment = process.env.NODE_ENV === 'development';

// ローカル開発環境かどうかの判定（ローカルホストの場合true）
export const isLocalDevelopment = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// 環境に応じたベースURLの取得
export const getBaseApiUrl = () => {
  // ローカル開発環境の場合はローカルURLを返す
  if (isLocalDevelopment()) {
    return process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:3000';
  }
  // それ以外の場合はAWS URLを返す
  return process.env.REACT_APP_AWS_API_URL || '';
};

// 環境に応じたAPIステージの取得
export const getApiStage = () => {
  return process.env.REACT_APP_API_STAGE || 'dev';
};

// 完全なエンドポイントURLの生成
export const getApiEndpoint = (path) => {
  const baseUrl = getBaseApiUrl();
  const stage = getApiStage();
  
  // パスが既にスラッシュで始まる場合は削除
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // ローカル開発環境でプロキシを使用する場合
  if (isLocalDevelopment() && process.env.REACT_APP_USE_PROXY === 'true') {
    // プロキシではシンプルなパスを使用
    return `/${stage}/${cleanPath}`;
  }
  
  // ベースURLが/で終わる場合は調整
  if (baseUrl.endsWith('/')) {
    return `${baseUrl}${stage}/${cleanPath}`;
  }
  
  // 通常のURL構築
  return `${baseUrl}/${stage}/${cleanPath}`;
};

// Google認証用のクライアントIDを取得
export const getGoogleClientId = () => {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.warn('REACT_APP_GOOGLE_CLIENT_ID が設定されていません。Google認証が機能しない可能性があります。');
  }
  return clientId || '';
};

// 現在のWebアプリケーションの完全なオリジンを取得
export const getOrigin = () => {
  return window.location.origin;
};

// リダイレクトURIを生成
export const getRedirectUri = () => {
  return `${getOrigin()}/auth/callback`;
};

// デフォルト為替レートを取得
export const getDefaultExchangeRate = () => {
  const defaultRate = parseFloat(process.env.REACT_APP_DEFAULT_EXCHANGE_RATE);
  return isNaN(defaultRate) ? 150.0 : defaultRate;
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
  getDefaultExchangeRate
};
