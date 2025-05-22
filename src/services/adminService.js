/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/services/adminService.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-11 16:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-11 16:30:00 Koki Riho 初回作成
 * - 2025-05-12 11:00:00 外部APIサーバー利用に修正
 * 
 * 説明: 
 * 管理者向けAPI呼び出しをまとめたサービスファイル。
 * APIステータスの取得、使用量リセットなどの管理者専用機能を提供する。
 */

import axios from 'axios';

// 環境変数からAPI設定を取得
const API_URL = process.env.REACT_APP_MARKET_DATA_API_URL || 'http://localhost:3000';
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';

// 管理者APIの設定
let ADMIN_API_KEY = process.env.REACT_APP_ADMIN_API_KEY || 'd41d8cd98f00b204e9800998ecf8427e'; // デフォルト値はサンプルです
const ADMIN_API_TIMEOUT = 5000; // 5秒

// APIエンドポイントを取得
const getBaseEndpoint = () => {
  return `${API_URL}/${API_STAGE}`;
};

// 管理者APIクライアント（遅延生成）
let adminClient = null;

export const createAdminClient = () => {
  adminClient = axios.create({
    timeout: ADMIN_API_TIMEOUT,
    headers: {
      'x-api-key': ADMIN_API_KEY
    }
  });
  return adminClient;
};

const getAdminClient = () => adminClient || createAdminClient();

/**
 * APIステータスを取得
 * @returns {Promise<Object>} ステータス情報
 */
export const getStatus = async () => {
  try {
    const endpoint = `${getBaseEndpoint()}/admin/status`;
    const response = await getAdminClient().get(endpoint);
    
    return {
      success: true,
      data: response.data,
      message: 'ステータス情報を取得しました'
    };
  } catch (error) {
    console.error('ステータス取得エラー:', error);
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      message: `ステータス取得に失敗しました: ${error.message}`
    };
  }
};

/**
 * 使用量をリセット
 * @returns {Promise<Object>} リセット結果
 */
export const resetUsage = async () => {
  try {
    const endpoint = `${getBaseEndpoint()}/admin/reset`;
    const response = await getAdminClient().post(endpoint);
    
    return {
      success: true,
      data: response.data,
      message: 'API使用量をリセットしました'
    };
  } catch (error) {
    console.error('使用量リセットエラー:', error);
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      message: `使用量のリセットに失敗しました: ${error.message}`
    };
  }
};

/**
 * API認証キーの設定
 * @param {string} apiKey - 管理者API認証キー
 */
export const setAdminApiKey = (apiKey) => {
  if (apiKey) {
    ADMIN_API_KEY = apiKey;
    const client = getAdminClient();
    if (client.defaults && client.defaults.headers) {
      client.defaults.headers['x-api-key'] = apiKey;
    }
    console.log('管理者API認証キーを設定しました');
    return true;
  }
  return false;
};

// デフォルトエクスポート
export default {
  getStatus,
  resetUsage,
  setAdminApiKey,
  createAdminClient
};
