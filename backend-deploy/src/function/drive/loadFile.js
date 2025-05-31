/**
 * Google Driveファイル読み込みハンドラー - ポートフォリオデータの読み込み
 * 
 * @file src/function/drive/loadFile.js
 * @author Portfolio Manager Team
 * @created 2025-05-13
 * @updated 2025-05-20 改善: エラーハンドリング強化と共通関数の活用
 */
'use strict';

const { getSession, refreshSessionToken } = require('../../services/googleAuthService');
const { loadPortfolioFromDrive } = require('../../services/googleDriveService');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { parseCookies } = require('../../utils/cookieParser');

/**
 * Google Driveデータ読み込みハンドラー
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
    const { fileId } = queryParams;
    
    if (!fileId) {
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: 'ファイルIDが不足しています'
      });
    }
    
    // Drive APIアクセストークンの確認
    let accessToken;
    
    // Drive API用のアクセストークンがあるか確認
    if (session.driveAccessToken) {
      accessToken = session.driveAccessToken;
      console.log('Using Drive API access token from session');
    } else if (session.requiresOAuth) {
      // Google One Tapでログインした場合、Drive API用のOAuth認証が必要
      console.log('Drive API OAuth required for this session');
      return formatErrorResponse({
        statusCode: 403,
        code: 'DRIVE_OAUTH_REQUIRED',
        message: 'Google Drive APIへのアクセス権限が必要です',
        details: 'Drive API用のOAuth認証を完了してください',
        authUrl: '/api/auth/google/drive/initiate'
      });
    } else {
      // 通常のOAuth2フローでログインした場合
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
    }
    
    // 拡張オプションの取得
    const includeHistory = queryParams.includeHistory === 'true';
    
    // Google Driveからデータを読み込み
    const result = await loadPortfolioFromDrive(accessToken, fileId);
    
    // バージョン履歴を取得（オプション）
    let history = [];
    if (includeHistory) {
      try {
        const { getPortfolioVersionHistory } = require('../../services/googleDriveService');
        history = await getPortfolioVersionHistory(fileId, accessToken);
      } catch (historyError) {
        console.warn('バージョン履歴取得エラー:', historyError);
        // バージョン履歴のエラーは無視して処理を続行
      }
    }
    
    // レスポンスを整形
    return formatResponse({
      statusCode: 200,
      data: {
        file: {
          id: result.fileId,
          name: result.fileName,
          createdAt: result.createdTime,
          modifiedAt: result.modifiedTime,
          webViewLink: result.webViewLink
        },
        data: result.data,
        ...(includeHistory && { versions: history.map(v => ({
          id: v.id,
          name: v.name,
          createdAt: v.createdTime
        })) })
      },
      message: 'ポートフォリオデータをGoogle Driveから読み込みました'
    });
  } catch (error) {
    console.error('Drive読み込みエラー:', error);
    
    // エラーの種類に応じたメッセージを設定
    let statusCode = 500;
    let code = 'DRIVE_LOAD_ERROR';
    let message = 'Google Driveからの読み込みに失敗しました';
    
    if (error.message?.includes('file not found')) {
      statusCode = 404;
      code = 'FILE_NOT_FOUND';
      message = '指定されたファイルが見つかりません';
    } else if (error.message?.includes('Invalid portfolio data')) {
      statusCode = 400;
      code = 'INVALID_DATA_FORMAT';
      message = 'ポートフォリオデータの形式が無効です';
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
