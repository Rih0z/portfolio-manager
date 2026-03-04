/**
 * セッション管理ヘルパー
 * 
 * @file src/utils/sessionHelper.js
 * @author Portfolio Manager Team
 * @created 2025-05-27
 */
'use strict';

const { getSession } = require('../services/googleAuthService');
const { parseCookies } = require('./cookieParser');
const { verifyIdToken } = require('./tokenManager');
const { verifyAccessToken } = require('./jwtUtils');

/**
 * リクエストからセッション情報を取得する
 * CookieまたはAuthorizationヘッダーから認証情報を取得
 * 
 * @param {Object} event - API Gatewayイベント
 * @returns {Promise<Object>} セッション情報またはエラー
 */
const getSessionFromRequest = async (event) => {
  const headers = event.headers || {};
  
  // デバッグ: ヘッダーキーのみ出力（認証情報はマスク）
  console.log('Headers received (keys):', Object.keys(headers));
  
  // 1. まずCookieからセッションIDを探す（大文字小文字の両方をチェック）
  const cookieHeader = headers.Cookie || headers.cookie || headers.COOKIE;
  console.log('Cookie header present:', !!cookieHeader);
  
  const cookies = parseCookies(headers);
  const sessionId = cookies.session;
  
  if (sessionId) {
    console.log('Session ID found in cookie:', sessionId.substring(0, 8) + '...');
    try {
      const session = await getSession(sessionId);
      if (session) {
        return {
          success: true,
          session,
          source: 'cookie'
        };
      }
    } catch (error) {
      console.error('Cookie session lookup error:', error);
    }
  }
  
  // 2. Authorization: Bearer {JWT} → pfwise JWT Access Token を優先検証
  const authHeader = headers.Authorization || headers.authorization || headers.AUTHORIZATION;
  console.log('Authorization header present:', !!authHeader);

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('Bearer token found in Authorization header (length:', token.length, ')');

    // 2a. pfwise JWT Access Token として検証（DynamoDB不要）
    try {
      const decoded = await verifyAccessToken(token);
      console.log('JWT Access Token verified successfully for:', decoded.email);
      return {
        success: true,
        session: {
          sessionId: decoded.sessionId,
          googleId: decoded.sub,
          email: decoded.email,
          name: decoded.name || '',
          picture: decoded.picture || '',
          hasDriveAccess: decoded.hasDriveAccess || false,
          requiresOAuth: false,
          isTemporary: false
        },
        source: 'jwt',
        authMethod: 'jwt'
      };
    } catch (jwtError) {
      // JWT検証失敗 → Google ID Token としてフォールバック
      console.log('JWT verification failed, trying Google ID token:', jwtError.message);
    }

    // 2b. Google ID Token としてフォールバック検証
    try {
      const userInfo = await verifyIdToken(token);

      return {
        success: true,
        session: {
          googleId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          requiresOAuth: true,
          isTemporary: true
        },
        source: 'bearer'
      };
    } catch (error) {
      console.error('Bearer token validation error:', error);
    }
  }
  
  // 3. どちらからも認証情報が取得できない場合
  return {
    success: false,
    error: 'NO_AUTH',
    message: '認証情報が見つかりません',
    details: {
      hasCookie: !!sessionId,
      hasAuthHeader: !!authHeader,
      hasCookieHeader: !!(headers.Cookie || headers.cookie),
      authHeaderType: authHeader ? authHeader.split(' ')[0] : 'none'
    }
  };
};

module.exports = {
  getSessionFromRequest
};