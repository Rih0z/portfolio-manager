/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/services/adminService.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-11 16:30:00 
 * 更新日: 2025-05-27
 * 
 * 更新履歴: 
 * - 2025-05-11 16:30:00 Koki Riho 初回作成
 * - 2025-05-12 11:00:00 外部APIサーバー利用に修正
 * - 2025-05-27 System Admin AWS動的設定に対応
 * 
 * 説明: 
 * 管理者向けAPI呼び出しをまとめたサービスファイル。
 * APIステータスの取得、使用量リセットなどの管理者専用機能を提供する。
 */

import axios from 'axios';
import { getApiEndpoint } from '../utils/envUtils';

// 管理者APIの設定
const ADMIN_API_TIMEOUT = 5000; // 5秒

// 管理者APIクライアント（遅延生成）
let adminClient = null;

export const createAdminClient = () => {
  adminClient = axios.create({
    timeout: ADMIN_API_TIMEOUT,
    headers: {
      // APIキーはAWSから動的に取得されるため、ここでは設定しない
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
    const endpoint = await getApiEndpoint('admin/status');
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
    const endpoint = await getApiEndpoint('admin/reset');
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

// デフォルトエクスポート
export default {
  getStatus,
  resetUsage,
  createAdminClient
};