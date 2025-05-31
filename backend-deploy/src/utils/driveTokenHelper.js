/**
 * Drive APIトークン管理ヘルパー
 * 
 * @file src/utils/driveTokenHelper.js
 * @author Portfolio Manager Team
 * @created 2025-05-26
 */
'use strict';

const { refreshDriveToken } = require('../services/googleAuthService');
const { formatErrorResponse } = require('./responseUtils');

/**
 * Drive APIアクセストークンを取得し、必要に応じてリフレッシュする
 * @param {Object} session - セッション情報
 * @param {string} sessionId - セッションID
 * @returns {Promise<Object>} トークン情報またはエラーレスポンス
 */
const getDriveAccessToken = async (session, sessionId) => {
  // Drive API用のアクセストークンがあるか確認
  if (session.driveAccessToken) {
    // トークンの有効期限を確認
    if (session.driveTokenExpiry) {
      const expiryDate = new Date(session.driveTokenExpiry);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5分のバッファー
      
      if (expiryDate.getTime() - now.getTime() < bufferTime) {
        // トークンが期限切れまたは期限切れ間近の場合はリフレッシュ
        console.log('Drive API token is expired or expiring soon, refreshing...');
        try {
          const refreshedToken = await refreshDriveToken(sessionId);
          console.log('Drive API token refreshed successfully');
          return {
            success: true,
            accessToken: refreshedToken.accessToken
          };
        } catch (refreshError) {
          console.error('Drive API token refresh failed:', refreshError);
          // リフレッシュに失敗した場合は再認証が必要
          return {
            success: false,
            error: formatErrorResponse({
              statusCode: 403,
              code: 'DRIVE_TOKEN_REFRESH_FAILED',
              message: 'Drive APIトークンの更新に失敗しました',
              details: '再度Drive API認証を行ってください',
              authUrl: '/api/auth/google/drive/initiate'
            })
          };
        }
      } else {
        console.log('Using valid Drive API access token from session');
        return {
          success: true,
          accessToken: session.driveAccessToken
        };
      }
    } else {
      // 有効期限情報がない場合はそのまま使用（リスクあり）
      console.log('Using Drive API access token without expiry check');
      return {
        success: true,
        accessToken: session.driveAccessToken
      };
    }
  } else if (session.requiresOAuth) {
    // Google One Tapでログインした場合、Drive API用のOAuth認証が必要
    console.log('Drive API OAuth required for this session');
    return {
      success: false,
      error: formatErrorResponse({
        statusCode: 403,
        code: 'DRIVE_OAUTH_REQUIRED',
        message: 'Google Drive APIへのアクセス権限が必要です',
        details: 'Drive API用のOAuth認証を完了してください',
        authUrl: '/api/auth/google/drive/initiate'
      })
    };
  } else {
    // 通常のOAuth2フローでログインした場合（Drive APIトークンなし）
    return {
      success: false,
      needsStandardAuth: true
    };
  }
};

module.exports = {
  getDriveAccessToken
};