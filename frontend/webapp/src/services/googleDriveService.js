/**
 * Google Drive連携サービス
 * ポートフォリオデータの保存・読み込み機能を提供
 */

import { authFetch } from '../utils/apiUtils';
import { getApiEndpoint } from '../utils/envUtils';

// Google Driveファイル一覧取得
export const fetchDriveFiles = async () => {
  try {
    const endpoint = await getApiEndpoint('drive/files');
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
        files: [],
        errorCode: response?.errorCode
      };
    }
  } catch (error) {
    console.error('Google Driveファイル一覧取得エラー:', error);
    
    // 401エラーでDrive OAuthが必要な場合
    if (error.response && error.response.status === 401) {
      const responseData = error.response.data;
      if (responseData.errorCode === 'DRIVE_OAUTH_REQUIRED' && responseData.authUrl) {
        return {
          success: false,
          error: responseData.message || 'Google Drive認証が必要です',
          files: [],
          needsDriveAuth: true,
          authUrl: responseData.authUrl
        };
      }
    }
    
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
    const endpoint = await getApiEndpoint('drive/save');
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
        error: response?.message || '保存に失敗しました',
        errorCode: response?.errorCode
      };
    }
  } catch (error) {
    console.error('Google Drive保存エラー:', error);
    
    // 401エラーでDrive OAuthが必要な場合
    if (error.response && error.response.status === 401) {
      const responseData = error.response.data;
      if (responseData.errorCode === 'DRIVE_OAUTH_REQUIRED' && responseData.authUrl) {
        return {
          success: false,
          error: responseData.message || 'Google Drive認証が必要です',
          needsDriveAuth: true,
          authUrl: responseData.authUrl
        };
      }
      
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
    const endpoint = await getApiEndpoint('drive/load');
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
        error: response?.message || '読み込みに失敗しました',
        errorCode: response?.errorCode
      };
    }
  } catch (error) {
    console.error('Google Drive読み込みエラー:', error);
    
    // 401エラーでDrive OAuthが必要な場合
    if (error.response && error.response.status === 401) {
      const responseData = error.response.data;
      if (responseData.errorCode === 'DRIVE_OAUTH_REQUIRED' && responseData.authUrl) {
        return {
          success: false,
          error: responseData.message || 'Google Drive認証が必要です',
          needsDriveAuth: true,
          authUrl: responseData.authUrl
        };
      }
      
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