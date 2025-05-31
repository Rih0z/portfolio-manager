/**
 * Google Drive OAuth2認証ハンドラー - Drive APIアクセス用の認証フロー
 * 
 * @file src/function/auth/googleDriveAuth.js
 * @author Portfolio Manager Team
 * @created 2025-05-26
 * @updated 2025-05-27 CORS対応とOPTIONSリクエスト処理を追加
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
    console.log('Initializing Drive OAuth2Client...');
    const apiKeys = await getApiKeys();
    const clientId = apiKeys.googleClientId || process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const clientSecret = apiKeys.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
    
    // Secrets Managerから取得したredirectUriを優先的に使用
    let redirectUri = apiKeys.googleRedirectUri;
    
    // Secrets Managerにない場合は環境変数またはデフォルト値を使用
    if (!redirectUri) {
      const stage = process.env.STAGE || 'dev';
      const apiId = 'x4scpbsuv2'; // API Gateway ID
      const region = process.env.AWS_REGION || 'us-west-2';
      const defaultRedirectUri = stage === 'prod' 
        ? `https://api.portfoliomanager.com/auth/google/drive/callback`
        : `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback`;
      
      redirectUri = process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri;
    }
    
    console.log('OAuth2Client redirect_uri configuration:', {
      fromSecretsManager: apiKeys.googleRedirectUri ? 'Yes' : 'No',
      finalUri: redirectUri ? redirectUri.replace(/https:\/\/[^\/]+/, 'https://[REDACTED]') : 'Not set'
    });
    
    console.log('Drive OAuth configuration:', {
      hasClientId: !!clientId,
      clientIdLength: clientId ? clientId.length : 0,
      hasClientSecret: !!clientSecret,
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      clientIdPrefix: clientId ? clientId.substring(0, 20) + '...' : 'missing',
      redirectUriSet: !!redirectUri
    });
    
    if (!clientId || !clientSecret) {
      throw new Error('Google Client ID/Secret not configured');
    }
    
    oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    console.log('Drive OAuth2Client initialized successfully');
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
    // セッションが既にDriveアクセスを持っているかチェック
    const sessionResult = await getSessionFromRequest(event);
    
    if (sessionResult.success && sessionResult.session.driveAccessToken) {
      console.log('Session already has Drive access, redirecting to success page');
      const redirectUrl = process.env.DRIVE_AUTH_SUCCESS_URL || 'http://localhost:3001/drive-success';
      const successParams = new URLSearchParams({
        success: 'true',
        message: 'Google Driveは既に連携されています'
      });
      
      return {
        statusCode: 302,
        headers: {
          Location: `${redirectUrl}?${successParams.toString()}`
        },
        body: ''
      };
    }
    
    // OPTIONSリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request for Drive Auth');
      const headers = getCorsOptionsHeaders(event);
      // 明示的に必要なヘッダーを追加
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept, X-Requested-With, Cookie, Authorization';
      headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      console.log('OPTIONS response headers:', headers);
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // デバッグ情報を出力
    console.log('Drive Auth Initiate Request:', {
      method: event.httpMethod,
      headers: event.headers ? Object.keys(event.headers) : [],
      hasAuthHeader: !!event.headers?.Authorization,
      hasCookieHeader: !!event.headers?.Cookie || !!event.headers?.cookie,
      path: event.path,
      requestContext: event.requestContext?.identity?.sourceIp,
      origin: event.headers?.origin || event.headers?.Origin
    });
    
    // 全てのヘッダーをログ出力（デバッグ用）
    console.log('All headers received:', JSON.stringify(event.headers, null, 2));
    
    // 重要なヘッダーの値を確認
    if (event.headers) {
      console.log('Header values:', {
        Cookie: event.headers.Cookie ? 'EXISTS' : 'MISSING',
        cookie: event.headers.cookie ? 'EXISTS' : 'MISSING',
        Authorization: event.headers.Authorization ? 'EXISTS' : 'MISSING',
        authorization: event.headers.authorization ? 'EXISTS' : 'MISSING',
        Origin: event.headers.origin || event.headers.Origin || 'MISSING'
      });
    }
    
    // 既に上でセッションを取得しているため、再度取得しない
    // const sessionResult = await getSessionFromRequest(event);
    
    if (!sessionResult.success) {
      console.error('Session not found, this should not happen as Drive access is required at login');
      const corsHeaders = getCorsHeaders(event);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: 'DRIVE_ACCESS_REQUIRED',
            message: 'Google Driveアクセスはログイン時に必須です。再度ログインしてください。',
            details: 'Drive access should be granted during initial login'
          }
        })
      };
    }
    
    const session = sessionResult.session;
    console.log('Session found:', {
      source: sessionResult.source,
      email: session.email,
      requiresOAuth: session.requiresOAuth,
      isTemporary: session.isTemporary
    });
    
    // セッションIDを取得（一時セッションの場合はemailを使用）
    const sessionId = sessionResult.source === 'cookie' ? 
      parseCookies(event.headers || {}).session : 
      session.email;
    
    // Google Drive APIのスコープを指定
    const scopes = [
      'https://www.googleapis.com/auth/drive.file', // アプリが作成・開いたファイルへのアクセス
      'https://www.googleapis.com/auth/drive.appdata' // アプリ専用フォルダへのアクセス
    ];
    
    // OAuth2クライアントを取得
    const oauth2Client = await getOAuth2Client();
    
    // Secrets Managerから認証情報を取得してredirectUriを使用
    const apiKeys = await getApiKeys();
    let redirectUri = apiKeys.googleRedirectUri;
    
    // Secrets Managerにない場合のフォールバック
    if (!redirectUri) {
      const stage = process.env.STAGE || 'dev';
      const apiId = 'x4scpbsuv2';
      const region = process.env.AWS_REGION || 'us-west-2';
      redirectUri = stage === 'prod' 
        ? `https://api.portfoliomanager.com/auth/google/drive/callback`
        : `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}/auth/google/drive/callback`;
    }
    
    console.log('Using redirect URI from:', apiKeys.googleRedirectUri ? 'Secrets Manager' : 'Default');
    
    // 認証URLを生成（redirect_uriを明示的に指定）
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // リフレッシュトークンを取得
      scope: scopes,
      state: sessionId, // セッションIDをstateパラメータに含める
      prompt: 'consent', // アカウント選択をスキップし、権限承認のみ表示
      login_hint: session.email, // ユーザーのメールアドレスをヒントとして渡す
      redirect_uri: redirectUri // 明示的にredirect_uriを指定
    });
    
    console.log('Generated OAuth URL with login_hint:', {
      hasLoginHint: !!session.email,
      userEmail: session.email ? session.email.substring(0, 3) + '***' : 'none',
      prompt: 'consent'
    });
    
    // CORSヘッダーを明示的に設定
    const corsHeaders = getCorsHeaders(event);
    console.log('GET response CORS headers:', corsHeaders);
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        authUrl,
        message: 'Google Drive認証のためにこのURLにアクセスしてください'
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
    // OPTIONSリクエストの処理
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling OPTIONS request for Drive Callback');
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
    const { code, state: sessionId, error } = queryParams;
    
    // エラーチェック
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
    
    if (!code || !sessionId) {
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: '認証コードまたはセッションIDが不足しています'
      });
    }
    
    // セッション情報を取得
    const session = await getSession(sessionId);
    
    // セッションが存在しない場合、emailをセッションIDとして使用している可能性がある（一時セッションの場合）
    let actualSessionId = sessionId;
    let isTemporarySession = false;
    
    if (!session) {
      // emailアドレスの形式かチェック
      if (sessionId.includes('@')) {
        console.log('Temporary session detected, creating permanent session for:', sessionId);
        isTemporarySession = true;
        // 一時セッションの場合は、新しい永続セッションを作成する必要がある
      } else {
        return formatErrorResponse({
          statusCode: 401,
          code: 'INVALID_SESSION',
          message: 'セッションが無効です'
        });
      }
    }
    
    // OAuth2クライアントを取得
    const oauth2Client = await getOAuth2Client();
    
    // 認証コードをトークンに交換
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    console.log('Drive API tokens obtained:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      isTemporarySession
    });
    
    if (isTemporarySession) {
      // 一時セッションの場合、新しい永続セッションを作成
      const { createUserSession } = require('../../services/googleAuthService');
      
      // Google OAuth2 APIを使用してユーザー情報を取得
      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
      });
      
      const userInfoResponse = await oauth2.userinfo.get();
      const userInfo = userInfoResponse.data;
      
      // 新しい永続セッションを作成
      const newSession = await createUserSession({
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        // Drive APIトークンも含める
        driveAccessToken: tokens.access_token,
        driveRefreshToken: tokens.refresh_token,
        driveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
      });
      
      actualSessionId = newSession.sessionId;
      
      // リダイレクトURLにセッションIDを含める（Cookieを設定するため）
      const redirectUrl = process.env.DRIVE_AUTH_SUCCESS_URL || 'http://localhost:3001/drive-success';
      const successParams = new URLSearchParams({
        sessionId: actualSessionId,
        setSession: 'true'
      });
      
      return {
        statusCode: 302,
        headers: {
          Location: `${redirectUrl}?${successParams.toString()}`,
          'Set-Cookie': `session=${actualSessionId}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000`
        },
        body: ''
      };
    } else {
      // 既存のセッションを更新してDrive APIトークンを保存
      await updateSession(actualSessionId, {
        driveAccessToken: tokens.access_token,
        driveRefreshToken: tokens.refresh_token,
        driveTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        requiresOAuth: false // OAuth認証が完了したのでフラグをクリア
      });
      
      // リダイレクト先URL（フロントエンドのDrive連携成功ページなど）
      const redirectUrl = process.env.DRIVE_AUTH_SUCCESS_URL || 'http://localhost:3001/drive-success';
      
      // 成功パラメータを追加
      const successParams = new URLSearchParams({
        success: 'true',
        message: 'Google Drive連携が完了しました'
      });
      
      // 既存セッションでもCookieを再設定（セッションを維持）
      const { createSessionCookie } = require('../../utils/cookieParser');
      const cookieHeader = createSessionCookie(actualSessionId, 2592000); // 30日間
      
      console.log('Existing session updated, setting cookie for session:', actualSessionId);
      
      return {
        statusCode: 302,
        headers: {
          Location: `${redirectUrl}?${successParams.toString()}`,
          'Set-Cookie': cookieHeader
        },
        body: ''
      };
    }
  } catch (error) {
    console.error('Drive認証コールバックエラー:', error);
    
    // エラー時もフロントエンドにリダイレクト（エラー情報をクエリパラメータで渡す）
    const errorRedirectUrl = process.env.DRIVE_AUTH_SUCCESS_URL || 'http://localhost:3001/drive-success';
    const errorParams = new URLSearchParams({
      error: 'auth_failed',
      message: 'Google Drive認証に失敗しました',
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