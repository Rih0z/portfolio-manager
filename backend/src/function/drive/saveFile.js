/**
 * Google Driveファイル保存ハンドラー - ポートフォリオデータの保存
 * 
 * @file src/function/drive/saveFile.js
 * @author Portfolio Manager Team
 * @created 2025-05-12
 * @updated 2025-05-13
 * @updated 2025-05-20 改善: エラーハンドリング強化と共通関数の活用
 * @updated 2025-05-23 修正: テストケースに合わせてundefinedをnullに変換
 */
'use strict';

const { getSession, refreshSessionToken } = require('../../services/googleAuthService');
const { savePortfolioToDrive } = require('../../services/googleDriveService');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { parseCookies } = require('../../utils/cookieParser');

/**
 * Google Driveデータ保存ハンドラー
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
    
    // リクエストボディを解析
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_REQUEST_BODY',
        message: 'リクエストボディのJSONが不正です'
      });
    }
    
    const { portfolioData, fileId, createBackup = true } = requestBody;
    
    if (!portfolioData) {
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: 'ポートフォリオデータが不足しています'
      });
    }
    
    // データの基本検証（必須フィールド）
    if (!portfolioData.name) {
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_PORTFOLIO_DATA',
        message: 'ポートフォリオ名は必須です'
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
    
    // データを保存する前にユーザー情報を追加
    const enhancedPortfolioData = {
      ...portfolioData,
      lastUpdated: new Date().toISOString(),
      updatedBy: {
        userId: session.googleId,
        email: session.email,
        name: session.name
      }
    };
    
    // Google Driveにデータを保存
    // fileIdがundefinedの場合はnullに変換して渡す（テストケースに合わせるため）
    const result = await savePortfolioToDrive(accessToken, enhancedPortfolioData, fileId || null, createBackup);
    
    // レスポンスを整形
    return formatResponse({
      statusCode: 200,
      data: {
        file: {
          id: result.fileId,
          name: result.fileName,
          url: result.webViewLink,
          createdAt: result.createdTime,
          modifiedAt: result.modifiedTime
        }
      },
      message: 'ポートフォリオデータをGoogle Driveに保存しました'
    });
  } catch (error) {
    console.error('Drive保存エラー:', error);
    
    // エラーの種類に応じたメッセージを設定
    let statusCode = 500;
    let code = 'DRIVE_SAVE_ERROR';
    let message = 'Google Driveへの保存に失敗しました';
    
    if (error.message?.includes('quota')) {
      statusCode = 403;
      code = 'QUOTA_EXCEEDED';
      message = 'Google Driveの容量制限を超えました';
    } else if (error.message?.includes('Permission')) {
      statusCode = 403;
      code = 'PERMISSION_DENIED';
      message = 'ファイルへの書き込み権限がありません';
    }
    
    return formatErrorResponse({
      statusCode,
      code,
      message,
      details: error.message
    });
  }
};
