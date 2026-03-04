/**
 * Refresh Token エンドポイント
 *
 * httpOnly Cookie に格納された JWT Refresh Token を検証し、
 * 新しい Access Token と Refresh Token を発行する。
 *
 * @file src/function/auth/refreshToken.js
 * @author Koki Riho
 * @created 2026-03-04
 */
'use strict';

const { getSession } = require('../../services/googleAuthService');
const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { parseCookies, createRefreshTokenCookie, createClearRefreshTokenCookie } = require('../../utils/cookieParser');
const { generateAccessToken, generateRefreshToken: generateNewRefreshToken, verifyRefreshToken } = require('../../utils/jwtUtils');
const { getCorsHeaders } = require('../../utils/corsHeaders');

/**
 * 許可されたOriginかどうかを検証する
 * @param {string} origin - リクエストのOriginヘッダー
 * @returns {boolean}
 */
const isAllowedOrigin = (origin) => {
  if (!origin) return false;

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(o => o);

  // 開発環境のlocalhost
  const defaultAllowed = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://portfolio-wise.com',
    'https://www.portfolio-wise.com',
    'https://app.portfolio-wise.com',
    'https://pfwise-portfolio-manager.pages.dev'
  ];

  const allAllowed = [...new Set([...defaultAllowed, ...allowedOrigins])];

  return allAllowed.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowed === origin;
  });
};

/**
 * Refresh Token ハンドラー
 * POST /auth/refresh
 *
 * @param {Object} event - API Gatewayイベント
 * @returns {Object} - API Gatewayレスポンス
 */
module.exports.handler = async (event) => {
  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event),
      body: ''
    };
  }

  // POSTリクエスト以外はエラー
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return formatErrorResponse({
      statusCode: 405,
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed',
      headers: { 'Allow': 'POST' },
      event
    });
  }

  try {
    const headers = event.headers || {};

    // Origin検証（CSRF防止）
    const origin = headers.Origin || headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      console.warn('Refresh token request from disallowed origin:', origin);
      return formatErrorResponse({
        statusCode: 403,
        code: 'FORBIDDEN_ORIGIN',
        message: '不正なオリジンからのリクエストです',
        event
      });
    }

    // refreshToken Cookie を取得
    const cookies = parseCookies(headers);
    const refreshTokenValue = cookies.refreshToken;

    if (!refreshTokenValue) {
      return formatErrorResponse({
        statusCode: 401,
        code: 'NO_REFRESH_TOKEN',
        message: 'Refresh tokenが見つかりません',
        event
      });
    }

    // JWT Refresh Token を検証
    let decoded;
    try {
      decoded = await verifyRefreshToken(refreshTokenValue);
    } catch (verifyError) {
      console.warn('Refresh token verification failed:', verifyError.message);

      // 期限切れの場合、Cookieをクリアして返す
      const clearCookie = createClearRefreshTokenCookie();
      return formatErrorResponse({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh tokenが無効または期限切れです',
        headers: { 'Set-Cookie': clearCookie },
        event
      });
    }

    // DynamoDB のセッション存在確認
    const session = await getSession(decoded.sessionId);
    if (!session) {
      console.warn('Session not found for refresh token:', decoded.sessionId);
      const clearCookie = createClearRefreshTokenCookie();
      return formatErrorResponse({
        statusCode: 401,
        code: 'SESSION_NOT_FOUND',
        message: 'セッションが存在しません',
        headers: { 'Set-Cookie': clearCookie },
        event
      });
    }

    // セッション期限チェック
    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      console.warn('Session expired for refresh token:', decoded.sessionId);
      const clearCookie = createClearRefreshTokenCookie();
      return formatErrorResponse({
        statusCode: 401,
        code: 'SESSION_EXPIRED',
        message: 'セッションが期限切れです',
        headers: { 'Set-Cookie': clearCookie },
        event
      });
    }

    // 新しい Access Token を生成
    const accessToken = await generateAccessToken({
      sub: session.googleId,
      email: session.email,
      name: session.name || '',
      picture: session.picture || '',
      sessionId: decoded.sessionId,
      hasDriveAccess: !!session.driveAccessToken
    });

    // Refresh Token ローテーション（新しいRefresh Tokenを発行）
    const newRefreshToken = await generateNewRefreshToken({
      sub: session.googleId,
      sessionId: decoded.sessionId
    });

    const maxAge = 60 * 60 * 24 * 7; // 7日
    const refreshTokenCookie = createRefreshTokenCookie(newRefreshToken, maxAge);

    return formatResponse({
      statusCode: 200,
      data: {
        accessToken,
        user: {
          id: session.googleId,
          email: session.email,
          name: session.name || '',
          picture: session.picture || ''
        },
        hasDriveAccess: !!session.driveAccessToken
      },
      headers: {
        'Set-Cookie': refreshTokenCookie
      },
      event
    });

  } catch (error) {
    console.error('Refresh token handler error:', error);
    return formatErrorResponse({
      statusCode: 500,
      code: 'SERVER_ERROR',
      message: 'トークンの更新中にエラーが発生しました',
      details: error.message,
      event
    });
  }
};
