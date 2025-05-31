/**
 * Google Driveファイルバージョン履歴ハンドラー - ポートフォリオデータのバージョン管理
 * 
 * @file src/function/drive/fileVersions.js
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */
'use strict';

const { getSession, refreshSessionToken } = require('../../services/googleAuthService');
const { getPortfolioVersionHistory, getFileWithMetadata } = require('../../services/googleDriveService');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { parseCookies } = require('../../utils/cookieParser');

/**
 * Google Driveファイルバージョン履歴ハンドラー
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
    
    // クエリパラメータからファイルIDを取得
    const queryParams = event.queryStringParameters || {};
    const { fileId, versionId } = queryParams;
    
    if (!fileId) {
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: 'ファイルIDが不足しています'
      });
    }
    
    // トークンを検証・更新
    let accessToken;
    try {
      const tokenResult = await refreshSessionToken(sessionId);
      accessToken = tokenResult.accessToken;
    } catch (tokenError) {
      console.error('トークン更新エラー:', tokenError);
      return formatErrorResponse({
        statusCode: 401,
        code: 'TOKEN_REFRESH_ERROR',
        message: 'アクセストークンの更新に失敗しました',
        details: tokenError.message
      });
    }
    
    // 特定のバージョンの取得リクエストの場合
    if (versionId) {
      // 指定されたバージョンのファイルとメタデータを取得
      const versionFile = await getFileWithMetadata(versionId, accessToken);
      
      // レスポンスを整形
      return formatResponse({
        statusCode: 200,
        data: {
          file: {
            id: versionFile.metadata.id,
            name: versionFile.metadata.name,
            createdAt: versionFile.metadata.createdTime,
            modifiedAt: versionFile.metadata.modifiedTime,
            isVersion: true,
            originalFileId: fileId
          },
          data: typeof versionFile.content === 'string' 
            ? JSON.parse(versionFile.content) 
            : versionFile.content
        },
        message: 'ポートフォリオデータのバージョンを取得しました'
      });
    }
    
    // バージョン履歴を取得
    const versionHistory = await getPortfolioVersionHistory(fileId, accessToken);
    
    // 履歴情報を整形
    const formattedVersions = versionHistory.map(version => ({
      id: version.id,
      name: version.name,
      createdAt: version.createdTime,
      size: version.size ? parseInt(version.size, 10) : 0
    }));
    
    // レスポンスを整形
    return formatResponse({
      statusCode: 200,
      data: {
        fileId,
        versions: formattedVersions,
        count: formattedVersions.length
      },
      message: `ポートフォリオデータのバージョン履歴を取得しました (${formattedVersions.length}件)`
    });
  } catch (error) {
    console.error('バージョン履歴取得エラー:', error);
    
    // エラーの種類に応じたメッセージを設定
    let statusCode = 500;
    let code = 'VERSION_HISTORY_ERROR';
    let message = 'バージョン履歴の取得に失敗しました';
    
    if (error.message?.includes('file not found')) {
      statusCode = 404;
      code = 'FILE_NOT_FOUND';
      message = '指定されたファイルが見つかりません';
    } else if (error.message?.includes('Invalid')) {
      statusCode = 400;
      code = 'INVALID_DATA_FORMAT';
      message = 'データ形式が無効です';
    } else if (error.message?.includes('Permission')) {
      statusCode = 403;
      code = 'PERMISSION_DENIED';
      message = 'ファイルへのアクセス権限がありません';
    }
    
    return formatErrorResponse({
      statusCode,
      code,
      message,
      details: error.message
    });
  }
};
