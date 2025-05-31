/**
 * Google Drive OAuth2認証ハンドラー（デバッグ版）
 * 
 * @file src/function/auth/googleDriveAuthDebug.js
 * @author Portfolio Manager Team
 * @created 2025-05-27
 */
'use strict';

const { google } = require('googleapis');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { getSession, updateSession } = require('../../services/googleAuthService');
const { parseCookies } = require('../../utils/cookieParser');
const { getApiKeys } = require('../../utils/secretsManager');

// OAuth2 クライアントの遅延初期化
let oauth2Client = null;

/**
 * OAuth2クライアントを取得（遅延初期化）
 * @returns {Promise<OAuth2Client>} OAuth2クライアント
 */
const getOAuth2Client = async () => {
  if (!oauth2Client) {
    console.log('Initializing Debug OAuth2Client...');
    const apiKeys = await getApiKeys();
    const clientId = apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const clientSecret = apiKeys.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/drive/callback';
    
    console.log('Debug OAuth configuration:', {
      hasClientId: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'missing',
      redirectUri: redirectUri
    });
    
    if (!clientId || !clientSecret) {
      throw new Error('Google Client ID/Secret not configured');
    }
    
    oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    console.log('Debug OAuth2Client initialized successfully');
  }
  return oauth2Client;
};

/**
 * Google Drive OAuth2認証URLを生成する（デバッグ版）
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.initiateAuth = async (event) => {
  try {
    // 詳細なデバッグ情報を出力
    console.log('=== Drive Auth Debug Info ===');
    console.log('Event object:', JSON.stringify({
      httpMethod: event.httpMethod,
      path: event.path,
      headers: event.headers,
      queryStringParameters: event.queryStringParameters,
      requestContext: {
        identity: event.requestContext?.identity,
        authorizer: event.requestContext?.authorizer
      }
    }, null, 2));
    
    // ヘッダーの詳細確認
    const headers = event.headers || {};
    console.log('Headers analysis:', {
      allHeaders: Object.keys(headers),
      cookie: headers.Cookie || headers.cookie || 'NOT_FOUND',
      authorization: headers.Authorization || headers.authorization || 'NOT_FOUND',
      contentType: headers['Content-Type'] || headers['content-type'] || 'NOT_FOUND'
    });
    
    // Cookieパース
    const cookies = parseCookies(headers);
    console.log('Parsed cookies:', cookies);
    
    const sessionId = cookies.session;
    
    if (!sessionId) {
      console.error('No session ID in cookies');
      return formatErrorResponse({
        statusCode: 401,
        code: 'NO_SESSION',
        message: 'セッションが存在しません',
        details: {
          message: 'Cookieにセッション情報が含まれていません',
          headers: Object.keys(headers),
          hasCookie: !!(headers.Cookie || headers.cookie)
        }
      });
    }
    
    console.log('Looking up session:', sessionId);
    
    // セッション情報を取得
    let session;
    try {
      session = await getSession(sessionId);
      console.log('Session lookup result:', {
        found: !!session,
        email: session?.email,
        requiresOAuth: session?.requiresOAuth,
        hasDriveToken: !!session?.driveAccessToken,
        expiresAt: session?.expiresAt
      });
    } catch (sessionError) {
      console.error('Session lookup error:', sessionError);
      return formatErrorResponse({
        statusCode: 500,
        code: 'SESSION_LOOKUP_ERROR',
        message: 'セッション取得エラー',
        details: sessionError.message
      });
    }
    
    if (!session) {
      return formatErrorResponse({
        statusCode: 401,
        code: 'INVALID_SESSION',
        message: 'セッションが無効です',
        details: 'セッションが見つからないか期限切れです'
      });
    }
    
    // Google Drive APIのスコープを指定
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata'
    ];
    
    // OAuth2クライアントを取得
    const oauth2Client = await getOAuth2Client();
    
    // 認証URLを生成
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: sessionId,
      prompt: 'consent'
    });
    
    console.log('Generated auth URL:', authUrl);
    
    return formatResponse({
      statusCode: 200,
      body: {
        authUrl,
        message: 'Google Drive認証のためにこのURLにアクセスしてください',
        debug: {
          sessionId: sessionId.substring(0, 8) + '...',
          userEmail: session.email
        }
      }
    });
  } catch (error) {
    console.error('Drive認証URL生成エラー:', error);
    return formatErrorResponse({
      statusCode: 500,
      code: 'AUTH_URL_ERROR',
      message: 'Drive認証URLの生成に失敗しました',
      details: {
        error: error.message,
        stack: error.stack
      }
    });
  }
};