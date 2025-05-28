/**
 * Google統合認証ハンドラー - ログインとDrive連携を1回の認証で実行
 * 
 * @file src/function/auth/googleLoginWithDrive.js
 * @author Portfolio Manager Team
 * @created 2025-05-27
 */
'use strict';

const { google } = require('googleapis');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { getApiKeys } = require('../../utils/secretsManager');
const { getCorsHeaders, getCorsOptionsHeaders } = require('../../utils/corsHeaders');

/**
 * OAuth2クライアントの初期化
 */
const getOAuth2Client = async () => {
  const apiKeys = await getApiKeys();
  const clientId = apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = apiKeys.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  
  let redirectUri = apiKeys.googleRedirectUri;
  if (!redirectUri) {
    const stage = process.env.STAGE || 'dev';
    const apiId = 'x4scpbsuv2';
    const region = process.env.AWS_REGION || 'us-west-2';
    redirectUri = stage === 'prod' 
      ? `https://api.portfoliomanager.com/auth/google/callback`
      : `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/callback`;
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  return oauth2Client;
};

/**
 * 統合認証URL生成ハンドラー
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.initiateAuth = async (event) => {
  try {
    // OPTIONSリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      const headers = getCorsOptionsHeaders(event);
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    console.log('Google Login with Drive initiate request');

    // 統合スコープ（ログイン + Drive）
    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.file', // アプリが作成・開いたファイルへのアクセス
      'https://www.googleapis.com/auth/drive.appdata' // アプリ専用フォルダへのアクセス
    ];

    // OAuth2クライアントを取得
    const oauth2Client = await getOAuth2Client();

    // 認証URLを生成
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // リフレッシュトークンを取得
      scope: scopes,
      prompt: 'select_account consent', // アカウント選択と権限承認
      include_granted_scopes: true
    });

    console.log('Generated unified auth URL');

    const corsHeaders = getCorsHeaders(event);
    
    // リダイレクトまたはURLを返す
    const isDirectRedirect = event.queryStringParameters?.redirect === 'true';
    
    if (isDirectRedirect) {
      // 直接リダイレクト
      return {
        statusCode: 302,
        headers: {
          Location: authUrl,
          ...corsHeaders
        },
        body: ''
      };
    } else {
      // URLをJSONで返す
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          authUrl,
          message: 'Googleアカウントでログインし、同時にDrive連携を行います'
        })
      };
    }
  } catch (error) {
    console.error('統合認証URL生成エラー:', error);
    const corsHeaders = getCorsHeaders(event);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: {
          code: 'AUTH_URL_ERROR',
          message: '認証URLの生成に失敗しました',
          details: error.message
        }
      })
    };
  }
};

/**
 * 統合認証コールバックハンドラー
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.callback = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    const { code, error } = queryParams;

    if (error) {
      console.error('OAuth認証エラー:', error);
      const errorRedirectUrl = process.env.DRIVE_AUTH_SUCCESS_URL || 'http://localhost:3001/drive-success';
      const errorParams = new URLSearchParams({
        error: 'oauth_error',
        message: 'Google認証がキャンセルされました',
        details: error
      });
      
      return {
        statusCode: 302,
        headers: {
          Location: `${errorRedirectUrl}?${errorParams.toString()}`
        },
        body: ''
      };
    }

    if (!code) {
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: '認証コードが不足しています'
      });
    }

    // OAuth2クライアントを取得
    const oauth2Client = await getOAuth2Client();

    // 認証コードをトークンに交換
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('Unified auth tokens obtained:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasIdToken: !!tokens.id_token,
      expiryDate: tokens.expiry_date
    });

    // ユーザー情報を取得
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });

    const userInfoResponse = await oauth2.userinfo.get();
    const userInfo = userInfoResponse.data;

    // 新しいセッションを作成
    const { createUserSession } = require('../../services/googleAuthService');
    
    const session = await createUserSession({
      googleId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      // Drive連携も完了
      driveAccessToken: tokens.access_token,
      driveRefreshToken: tokens.refresh_token,
      driveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      requiresOAuth: false
    });

    // セッションCookieを作成
    const { createSessionCookie } = require('../../utils/cookieParser');
    const cookieHeader = createSessionCookie(session.sessionId, 2592000); // 30日間

    // 成功リダイレクト
    const redirectUrl = process.env.DRIVE_AUTH_SUCCESS_URL || 'http://localhost:3001/drive-success';
    const successParams = new URLSearchParams({
      success: 'true',
      message: 'ログインとGoogle Drive連携が完了しました',
      unified: 'true'
    });

    return {
      statusCode: 302,
      headers: {
        Location: `${redirectUrl}?${successParams.toString()}`,
        'Set-Cookie': cookieHeader
      },
      body: ''
    };
  } catch (error) {
    console.error('統合認証コールバックエラー:', error);
    
    const errorRedirectUrl = process.env.DRIVE_AUTH_SUCCESS_URL || 'http://localhost:3001/drive-success';
    const errorParams = new URLSearchParams({
      error: 'auth_failed',
      message: '認証処理に失敗しました',
      details: error.message || 'Unknown error'
    });
    
    return {
      statusCode: 302,
      headers: {
        Location: `${errorRedirectUrl}?${errorParams.toString()}`
      },
      body: ''
    };
  }
};