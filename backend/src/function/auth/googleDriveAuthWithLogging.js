/**
 * Google Drive OAuth2認証ハンドラー - Enhanced with detailed logging
 */
'use strict';

const { google } = require('googleapis');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { getSession, updateSession } = require('../../services/googleAuthService');
const { parseCookies } = require('../../utils/cookieParser');
const { getCorsHeaders, getCorsOptionsHeaders } = require('../../utils/corsHeaders');
const { getSessionFromRequest } = require('../../utils/sessionHelper');
const { getApiKeys } = require('../../utils/secretsManager');

// OAuth2 クライアントの遅延初期化
let oauth2Client = null;

/**
 * OAuth2クライアントを取得（遅延初期化）
 * @returns {Promise<OAuth2Client>} OAuth2クライアント
 */
const getOAuth2Client = async () => {
  if (!oauth2Client) {
    console.log('Initializing OAuth2Client with enhanced logging...');
    const apiKeys = await getApiKeys();
    const clientId = apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const clientSecret = apiKeys.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    
    // Build redirect URI with detailed logging
    const stage = process.env.STAGE || 'dev';
    const apiId = 'x4scpbsuv2';
    const region = process.env.AWS_REGION || 'us-west-2';
    
    console.log('Building redirect URI:', {
      stage,
      apiId,
      region,
      envRedirectUri: process.env.GOOGLE_REDIRECT_URI
    });
    
    const defaultRedirectUri = stage === 'prod' 
      ? `https://api.portfoliomanager.com/auth/google/drive/callback`
      : `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback`;
    
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri;
    
    console.log('OAuth configuration details:', {
      hasClientId: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'missing',
      redirectUri: redirectUri,
      redirectUriLength: redirectUri.length,
      redirectUriEncoded: encodeURIComponent(redirectUri)
    });
    
    // Check for common issues
    if (redirectUri.endsWith('/')) {
      console.warn('WARNING: Redirect URI ends with a trailing slash!');
    }
    if (redirectUri.includes(' ')) {
      console.warn('WARNING: Redirect URI contains whitespace!');
    }
    if (!redirectUri.startsWith('https://') && !redirectUri.startsWith('http://')) {
      console.warn('WARNING: Redirect URI does not start with http:// or https://');
    }
    
    if (!clientId || !clientSecret) {
      throw new Error('Google Client ID/Secret not configured');
    }
    
    oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    console.log('OAuth2Client initialized successfully');
    
    // Log the auth URL that would be generated
    const testAuthUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      state: 'test',
      prompt: 'consent'
    });
    
    const testUrl = new URL(testAuthUrl);
    console.log('Test auth URL redirect_uri parameter:', testUrl.searchParams.get('redirect_uri'));
  }
  return oauth2Client;
};

/**
 * Google Drive OAuth2認証URLを生成する
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.initiateAuth = async (event) => {
  try {
    console.log('=== Drive Auth Request with Enhanced Logging ===');
    console.log('Request details:', {
      httpMethod: event.httpMethod,
      path: event.path,
      host: event.headers?.Host || event.headers?.host,
      stage: event.requestContext?.stage,
      apiId: event.requestContext?.apiId,
      domainName: event.requestContext?.domainName
    });
    
    // OPTIONSリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      const headers = getCorsOptionsHeaders(event);
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, X-Requested-With, Cookie, Authorization';
      headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // セッション情報を取得
    const sessionResult = await getSessionFromRequest(event);
    
    if (!sessionResult.success) {
      console.error('Session not found:', sessionResult);
      const corsHeaders = getCorsHeaders(event);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: sessionResult.error || 'NO_SESSION',
            message: sessionResult.message || 'セッションが存在しません',
            details: sessionResult.details
          }
        })
      };
    }
    
    const session = sessionResult.session;
    const sessionId = sessionResult.source === 'cookie' ? 
      parseCookies(event.headers || {}).session : 
      session.email;
    
    // Google Drive APIのスコープを指定
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.appdata'
    ];
    
    // OAuth2クライアントを取得
    const oauth2Client = await getOAuth2Client();
    
    // 認証URLを生成
    console.log('Generating auth URL with params:', {
      access_type: 'offline',
      scope: scopes,
      state: sessionId,
      prompt: 'consent'
    });
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: sessionId,
      prompt: 'consent'
    });
    
    // Extract and log the redirect_uri from the generated URL
    const generatedUrl = new URL(authUrl);
    const redirectUriInUrl = generatedUrl.searchParams.get('redirect_uri');
    
    console.log('Generated auth URL analysis:', {
      fullUrl: authUrl,
      redirectUriParam: redirectUriInUrl,
      redirectUriParamEncoded: encodeURIComponent(redirectUriInUrl || ''),
      clientId: generatedUrl.searchParams.get('client_id')?.substring(0, 20) + '...'
    });
    
    const corsHeaders = getCorsHeaders(event);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        authUrl,
        message: 'Google Drive認証のためにこのURLにアクセスしてください',
        debug: {
          redirectUri: redirectUriInUrl,
          stage: process.env.STAGE || 'dev',
          apiGatewayUrl: `https://${event.requestContext?.domainName}${event.path}`
        }
      })
    };
  } catch (error) {
    console.error('Drive認証URL生成エラー:', error);
    const corsHeaders = getCorsHeaders(event);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: {
          code: 'AUTH_URL_ERROR',
          message: 'Drive認証URLの生成に失敗しました',
          details: error.message
        }
      })
    };
  }
};

/**
 * Google Drive OAuth2コールバックハンドラー
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.callback = async (event) => {
  try {
    console.log('=== Drive Auth Callback with Enhanced Logging ===');
    console.log('Callback request:', {
      method: event.httpMethod,
      path: event.path,
      queryParams: event.queryStringParameters,
      fullCallbackUrl: `https://${event.requestContext?.domainName}${event.path}`,
      hasCode: !!event.queryStringParameters?.code,
      hasState: !!event.queryStringParameters?.state,
      hasError: !!event.queryStringParameters?.error
    });
    
    // OPTIONSリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request for callback');
      const headers = getCorsOptionsHeaders(event);
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, X-Requested-With, Cookie, Authorization';
      headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    const queryParams = event.queryStringParameters || {};
    const { code, state: sessionId, error, error_description } = queryParams;
    
    // エラーチェック
    if (error) {
      console.error('OAuth error received:', {
        error,
        error_description,
        fullUrl: event.headers?.referer || 'unknown'
      });
      
      return formatErrorResponse({
        statusCode: 400,
        code: 'OAUTH_ERROR',
        message: 'OAuth認証エラー',
        details: {
          error,
          error_description,
          hint: error === 'redirect_uri_mismatch' ? 
            'The redirect URI in the request does not match the authorized redirect URIs in Google Cloud Console' : 
            error_description
        }
      });
    }
    
    if (!code || !sessionId) {
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: '認証コードまたはセッションIDが不足しています'
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
    
    // OAuth2クライアントを取得
    const oauth2Client = await getOAuth2Client();
    
    console.log('Exchanging code for tokens...');
    
    // 認証コードをトークンに交換
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      console.log('Tokens obtained successfully:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date
      });
      
      // セッションを更新してDrive APIトークンを保存
      await updateSession(sessionId, {
        driveAccessToken: tokens.access_token,
        driveRefreshToken: tokens.refresh_token,
        driveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        requiresOAuth: false
      });
      
      // リダイレクト先URL
      const redirectUrl = process.env.DRIVE_AUTH_SUCCESS_URL || 'http://localhost:3001/drive-success';
      
      return formatResponse({
        statusCode: 302,
        headers: {
          Location: redirectUrl
        },
        body: {
          success: true,
          message: 'Google Drive認証が完了しました'
        }
      });
    } catch (tokenError) {
      console.error('Token exchange error:', {
        error: tokenError.message,
        response: tokenError.response?.data,
        config: {
          url: tokenError.config?.url,
          method: tokenError.config?.method,
          data: tokenError.config?.data
        }
      });
      
      throw tokenError;
    }
  } catch (error) {
    console.error('Drive認証コールバックエラー:', error);
    return formatErrorResponse({
      statusCode: 500,
      code: 'CALLBACK_ERROR',
      message: 'Drive認証の処理に失敗しました',
      details: error.message
    });
  }
};