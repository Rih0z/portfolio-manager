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

/**
 * リクエストからセッション情報を取得する
 * CookieまたはAuthorizationヘッダーから認証情報を取得
 * 
 * @param {Object} event - API Gatewayイベント
 * @returns {Promise<Object>} セッション情報またはエラー
 */
const getSessionFromRequest = async (event) => {
  const headers = event.headers || {};
  
  // デバッグ: 全ヘッダーを出力
  console.log('All headers received:', JSON.stringify(headers, null, 2));
  
  // 1. まずCookieからセッションIDを探す（大文字小文字の両方をチェック）
  const cookieHeader = headers.Cookie || headers.cookie || headers.COOKIE;
  console.log('Cookie header search:', {
    'Cookie': headers.Cookie,
    'cookie': headers.cookie,
    'COOKIE': headers.COOKIE,
    'found': cookieHeader
  });
  
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
  
  // 2. AuthorizationヘッダーからBearerトークンを探す（大文字小文字の両方をチェック）
  const authHeader = headers.Authorization || headers.authorization || headers.AUTHORIZATION;
  console.log('Authorization header search:', {
    'Authorization': headers.Authorization,
    'authorization': headers.authorization,
    'AUTHORIZATION': headers.AUTHORIZATION,
    'found': authHeader
  });
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('Bearer token found in Authorization header');
    
    try {
      // JWTトークンを検証
      const userInfo = await verifyIdToken(token);
      
      // 仮のセッション情報を作成（実際のセッションではない）
      return {
        success: true,
        session: {
          googleId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          // Drive認証が必要であることを示す
          requiresOAuth: true,
          isTemporary: true // 一時的なセッションであることを示す
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
      cookieHeader: headers.Cookie || headers.cookie || 'none',
      authHeaderType: authHeader ? authHeader.split(' ')[0] : 'none'
    }
  };
};

module.exports = {
  getSessionFromRequest
};