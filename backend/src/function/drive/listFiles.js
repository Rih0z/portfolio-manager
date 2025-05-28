/**
 * Google Driveファイル一覧取得ハンドラー - ポートフォリオデータファイル一覧
 * 
 * @file src/function/drive/listFiles.js
 * @author Koki Riho
 * @created 2025-05-12
 * @updated 2025-05-13
 * @updated 2025-05-20 改善: エラーハンドリング強化とモジュール参照の統一
 */
'use strict';

const { getSession, refreshSessionToken } = require('../../services/googleAuthService');
const { listPortfolioFiles } = require('../../services/googleDriveService');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { parseCookies } = require('../../utils/cookieParser');
const { getDriveAccessToken } = require('../../utils/driveTokenHelper');

/**
 * Google Driveファイル一覧取得ハンドラー
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.handler = async (event) => {
  try {
    // Cookieからセッションを取得
    const cookies = parseCookies(event.headers || {});
    const sessionId = cookies.session;
    
    if (!sessionId) {
      return formatErrorResponse({
        statusCode: 401,
        code: 'NO_SESSION',
        message: 'セッションが存在しません'
      });
    }
    
    // セッション情報を取得
    const session = await getSession(sessionId);
    
    if (!session) {
      return formatErrorResponse({
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'セッションが無効です'
      });
    }
    
    // Drive APIアクセストークンの取得
    const tokenResult = await getDriveAccessToken(session, sessionId);
    
    if (!tokenResult.success) {
      if (tokenResult.needsStandardAuth) {
        // 標準的なOAuth2フローでログインした場合
        try {
          const refreshResult = await refreshSessionToken(sessionId);
          var accessToken = refreshResult.accessToken;
        } catch (tokenError) {
          console.error('トークン更新エラー:', tokenError);
          return formatErrorResponse({
            statusCode: 401,
            code: 'TOKEN_REFRESH_ERROR',
            message: 'アクセストークンの更新に失敗しました',
            details: tokenError.message
          });
        }
      } else {
        // エラーレスポンスを返す
        return tokenResult.error;
      }
    } else {
      var accessToken = tokenResult.accessToken;
    }
    
    // クエリパラメータ取得
    const queryParams = event.queryStringParameters || {};
    const { maxResults, orderBy, nameFilter } = queryParams;
    
    // カスタム検索オプション
    const searchOptions = {};
    if (maxResults) searchOptions.maxResults = parseInt(maxResults, 10);
    if (orderBy) searchOptions.orderBy = orderBy;
    if (nameFilter) searchOptions.nameFilter = nameFilter;
    
    // Google Driveのファイル一覧を取得
    const files = await listPortfolioFiles(accessToken, searchOptions);
    
    // ファイル情報を整形
    const formattedFiles = files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size ? parseInt(file.size, 10) : 0,
      mimeType: file.mimeType,
      createdAt: file.createdTime,
      modifiedAt: file.modifiedTime,
      webViewLink: file.webViewLink
    }));
    
    // レスポンスを整形
    return formatResponse({
      statusCode: 200,
      data: {
        files: formattedFiles,
        count: formattedFiles.length
      }
    });
  } catch (error) {
    console.error('Driveファイル一覧取得エラー:', error);
    
    // エラーの種類に応じた適切なレスポンス
    if (error.code === 403 || error.message?.includes('insufficient')) {
      return formatErrorResponse({
        statusCode: 403,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Google Driveへのアクセス権限が不足しています',
        details: 'Drive API用の再認証が必要です',
        authUrl: '/api/auth/google/drive/initiate'
      });
    } else if (error.code === 401 || error.message?.includes('invalid_token')) {
      return formatErrorResponse({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Google Driveトークンが無効です',
        details: 'Drive API用の再認証が必要です',
        authUrl: '/api/auth/google/drive/initiate'
      });
    } else if (error.code === 429 || error.message?.includes('quota')) {
      return formatErrorResponse({
        statusCode: 429,
        code: 'QUOTA_EXCEEDED',
        message: 'Google Drive APIの利用制限に達しました',
        details: 'しばらく時間をおいてから再度お試しください'
      });
    }
    
    return formatErrorResponse({
      statusCode: 500,
      code: 'DRIVE_LIST_ERROR',
      message: 'Google Driveのファイル一覧取得に失敗しました',
      details: error.message
    });
  }
};
