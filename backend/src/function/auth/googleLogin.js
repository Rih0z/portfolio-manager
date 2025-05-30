/**
 * Google認証ログインハンドラー - 認証コードを受け取りセッションを作成する
 * 
 * @file src/function/auth/googleLogin.js
 * @author Portfolio Manager Team
 * @created 2025-05-12
 * @updated 2025-05-13 新規追加: 基本的なログイン処理実装
 * @updated 2025-05-15 バグ修正: Cookie設定を強化
 * @updated 2025-05-16 バグ修正: テスト互換性を向上
 */
'use strict';

const { 
  exchangeCodeForTokens, 
  verifyIdToken, 
  createUserSession 
} = require('../../services/googleAuthService');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { createSessionCookie } = require('../../utils/cookieParser');

/**
 * Google認証処理ハンドラー
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.handler = async (event) => {
  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    const { getCorsHeaders } = require('../../utils/corsHeaders');
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: ''
    };
  }
  
  try {
    // テスト用のフックとロガー
    const testLogger = event._testLogger || console;
    
    // デバッグ情報をログ出力
    console.log('Google Login request received:', {
      httpMethod: event.httpMethod,
      headers: event.headers ? Object.keys(event.headers) : 'none',
      body: event.body ? 'present' : 'missing',
      clientIP: event.requestContext?.identity?.sourceIp || 'unknown'
    });
    
    // リクエストボディをパース（ボディが存在しない場合は空オブジェクトを使用）
    let requestBody;
    try {
      console.log('Body type:', typeof event.body);
      console.log('Body length:', event.body ? event.body.length : 0);
      console.log('Body first 100 chars:', event.body ? event.body.substring(0, 100) : 'null');
      
      requestBody = JSON.parse(event.body || '{}');
      console.log('Parsed successfully, keys:', Object.keys(requestBody));
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('Invalid body:', event.body);
      
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_JSON',
        message: 'リクエストボディの解析に失敗しました',
        details: parseError.message,
        event
      });
    }
    
    const { code, redirectUri, credential } = requestBody;
    console.log('Extracted fields:', {
      hasCode: !!code,
      hasCredential: !!credential,
      hasRedirectUri: !!redirectUri,
      credentialLength: credential ? credential.length : 0
    });
    
    // テスト情報出力
    if (event._testMode) {
      testLogger.debug('Login request received:', { 
        code: code ? '[REDACTED]' : undefined, 
        credential: credential ? '[REDACTED]' : undefined,
        redirectUri 
      });
    }
    
    // Google One Tap (credential) または OAuth flow (code) のいずれかが必要
    if (!code && !credential) {
      // テスト用のフックが指定されていたら呼び出し
      if (typeof event._formatErrorResponse === 'function') {
        event._formatErrorResponse({
          statusCode: 400,
          code: 'INVALID_PARAMS',
          message: '認証コードが不足しています'
        });
      }
      
      return formatErrorResponse({
        statusCode: 400,
        code: 'INVALID_PARAMS',
        message: '認証コードが不足しています',
        event
      });
    }
    
    console.log('Processing Google authentication:', {
      code: code ? `${code.substring(0, 10)}...` : 'missing',
      credential: credential ? `${credential.substring(0, 10)}...` : 'missing',
      redirectUri
    });
    
    let tokens, userInfo;
    
    if (credential) {
      // Google One Tap: credentialは既にIDトークン
      console.log('Using Google One Tap credential (ID token)');
      userInfo = await verifyIdToken(credential);
      
      // Google One TapではDrive APIアクセストークンが取得できないため、
      // OAuth2フローにリダイレクトする必要があることを示す
      console.warn('Google One Tap login detected - Drive API access will require OAuth2 flow');
      
      // One TapではDriveスコープを取得できないため、エラーを返す
      console.error('Google One Tap does not support Drive scopes');
      return formatErrorResponse({
        statusCode: 400,
        code: 'ONE_TAP_NOT_SUPPORTED',
        message: 'Google One Tap認証ではGoogle Driveのアクセス権限を取得できません。通常のログイン方法を使用してください。',
        event
      });
    } else {
      // OAuth flow: 認証コードをトークンに交換（Google DriveスコープをInclude）
      console.log('Using OAuth authorization code flow with Drive scopes');
      
      // 注意: スコープはフロントエンドのOAuth URLで指定される必要があります
      // ここでは認証コードをトークンに交換するだけです
      tokens = await exchangeCodeForTokens(code, redirectUri);
      console.log('Token exchange successful, tokens received:', {
        hasAccessToken: !!tokens.access_token,
        hasIdToken: !!tokens.id_token,
        hasRefreshToken: !!tokens.refresh_token,
        scope: tokens.scope // 実際に許可されたスコープを確認
      });
      
      // IDトークンを検証してユーザー情報を取得
      userInfo = await verifyIdToken(tokens.id_token);
    }
    console.log('ID token verification successful:', {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name
    });
    
    // Google Driveスコープが含まれているかチェック
    const hasDriveScope = tokens.scope && (
      tokens.scope.includes('drive.file') || 
      tokens.scope.includes('drive.appdata')
    );
    
    // Driveスコープが含まれていない場合はエラーを返す
    if (!hasDriveScope && !credential) {
      console.error('Drive scope not included in OAuth flow');
      return formatErrorResponse({
        statusCode: 400,
        code: 'MISSING_DRIVE_SCOPE',
        message: '認証にGoogle Driveのアクセス権限が含まれていません。ログイン時に必ずDriveのアクセスを許可してください。',
        event
      });
    }
    
    // セッションを作成（Drive APIトークンも保存）
    const sessionData = {
      googleId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      requiresOAuth: tokens.requires_oauth || false
    };
    
    // Drive スコープが許可されている場合、Drive トークンも保存
    if (hasDriveScope && tokens.access_token) {
      sessionData.driveAccessToken = tokens.access_token;
      sessionData.driveRefreshToken = tokens.refresh_token;
      sessionData.driveTokenExpiry = sessionData.tokenExpiry;
      console.log('Google Drive access granted during login');
    }
    
    const session = await createUserSession(sessionData);
    
    // セッションCookieを作成（7日間有効）
    const maxAge = 60 * 60 * 24 * 7; // 7日間（秒単位）
    const sessionCookie = createSessionCookie(session.sessionId, maxAge);
    
    // テスト用のフックが指定されていたら呼び出し
    if (typeof event._formatResponse === 'function') {
      event._formatResponse({
        success: true,
        isAuthenticated: true,
        user: {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        }
      }, { 'Set-Cookie': sessionCookie });
    }
    
    // レスポンスを整形 - テストが期待する形式に合わせる
    return formatResponse({
      statusCode: 200,
      data: {
        success: true,
        isAuthenticated: true,
        user: {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        },
        requiresOAuth: tokens.requires_oauth || false,
        hasDriveAccess: hasDriveScope || false,
        // フロントエンドがトークンを期待している場合のため、セッションIDも返す
        sessionId: session.sessionId,
        token: session.sessionId // 互換性のため
      },
      headers: {
        'Set-Cookie': sessionCookie
      },
      event // eventオブジェクトを渡してCORSヘッダーを適切に設定
    });
  } catch (error) {
    console.error('Google認証エラー詳細:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errorType: error.constructor.name
    });
    
    // エラーの種類に応じて適切なレスポンスを返す
    let statusCode = 401;
    let errorCode = 'AUTH_ERROR';
    let errorMessage = '認証に失敗しました';
    
    if (error.message?.includes('認証コードが無効')) {
      statusCode = 400;
      errorCode = 'INVALID_AUTH_CODE';
      errorMessage = '認証コードが無効または期限切れです';
    } else if (error.message?.includes('リダイレクトURI')) {
      statusCode = 400;
      errorCode = 'REDIRECT_URI_MISMATCH';
      errorMessage = 'リダイレクトURIが一致しません';
    } else if (error.message?.includes('Google Client')) {
      statusCode = 500;
      errorCode = 'CONFIG_ERROR';
      errorMessage = 'サーバー設定エラー';
    }
    
    // テスト用のフックが指定されていたら呼び出し
    if (typeof event._formatErrorResponse === 'function') {
      event._formatErrorResponse({
        statusCode,
        code: errorCode,
        message: '認証に失敗しました',
        details: error.message
      });
    }
    
    return formatErrorResponse({
      statusCode,
      code: errorCode,
      message: errorMessage,
      details: error.message,
      event
    });
  }
};

