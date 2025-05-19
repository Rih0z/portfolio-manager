/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/utils/envUtils.js
 * 
 * 作成者: System Admin
 * 作成日: 2025-05-19 11:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-19 11:30:00 System Admin 初回作成
 * 
 * 説明: 
 * 環境に応じたAPI設定を提供するユーティリティ関数。
 * 開発環境または本番環境の判定および環境に応じたAPIエンドポイントURLの
 * 生成機能を提供します。
 */

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
