/**
 * Google Drive連携サービス
 * ポートフォリオデータの保存・読み込み機能を提供
 */

import { authFetch } from '../utils/apiUtils';
import { getApiEndpoint } from '../utils/envUtils';

// Google Driveファイル一覧取得
export const fetchDriveFiles = async () => {
  try {
    const endpoint = getApiEndpoint('drive/files');
    const response = await authFetch(endpoint, 'get', null);
    
    if (response && response.success) {
      return {
        success: true,
        files: response.files || [],
        count: response.count || 0
      };
    } else {
      return {
        success: false,
        error: response?.message || 'ファイル一覧の取得に失敗しました',
        files: []
      };
    }
  } catch (error) {
    console.error('Google Driveファイル一覧取得エラー:', error);
    return {
      success: false,
      error: error.message || 'Google Drive接続エラー',
      files: []
    };
  }
};

// ポートフォリオデータをGoogle Driveに保存
export const saveToDrive = async (portfolioData) => {
  try {
    const endpoint = getApiEndpoint('drive/save');
    const response = await authFetch(endpoint, 'post', {
      portfolioData: portfolioData
    });
    
    if (response && response.success) {
      return {
        success: true,
        file: response.file,
        message: response.message || 'Google Driveに保存しました'
      };
    } else {
      return {
        success: false,
        error: response?.message || '保存に失敗しました'
      };
    }
  } catch (error) {
    console.error('Google Drive保存エラー:', error);
    
    // 認証エラーの場合
    if (error.response && error.response.status === 401) {
      return {
        success: false,
        error: '認証が必要です。ログインしてください。',
        needsAuth: true
      };
    }
    
    return {
      success: false,
      error: error.message || 'Google Drive保存エラー'
    };
  }
};

// Google Driveからポートフォリオデータを読み込み
export const loadFromDrive = async (fileId) => {
  try {
    const endpoint = getApiEndpoint('drive/load');
    const response = await authFetch(endpoint, 'get', {
      fileId: fileId
    });
    
    if (response && response.success) {
      return {
        success: true,
        data: response.data,
        file: response.file,
        message: response.message || 'Google Driveから読み込みました'
      };
    } else {
      return {
        success: false,
        error: response?.message || '読み込みに失敗しました'
      };
    }
  } catch (error) {
    console.error('Google Drive読み込みエラー:', error);
    
    // 認証エラーの場合
    if (error.response && error.response.status === 401) {
      return {
        success: false,
        error: '認証が必要です。ログインしてください。',
        needsAuth: true
      };
    }
    
    return {
      success: false,
      error: error.message || 'Google Drive読み込みエラー'
    };
  }
};

export default {
  fetchDriveFiles,
  saveToDrive,
  loadFromDrive
};