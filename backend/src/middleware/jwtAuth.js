'use strict';

const { verifyAccessToken } = require('../utils/jwtUtils');
const { formatErrorResponse } = require('../utils/responseUtils');
const { ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * JWT認証ミドルウェア
 * Authorization ヘッダーから Bearer トークンを抽出・検証し、
 * event.user にデコード済みユーザー情報をアタッチする
 *
 * @param {Object} event - Lambda event
 * @returns {Promise<Object|null>} 認証失敗時はエラーレスポンスを返す。成功時はnull
 */
const authenticateJwt = async (event) => {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return await formatErrorResponse({
        statusCode: 401,
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authorization header with Bearer token is required',
        event
      });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyAccessToken(token);

    // event.user にユーザー情報をアタッチ
    event.user = {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      planType: decoded.planType || 'free',
      sessionId: decoded.sessionId
    };

    return null; // 認証成功
  } catch (error) {
    logger.warn('JWT authentication failed:', error.message);

    const isExpired = error.message?.includes('expired');

    return await formatErrorResponse({
      statusCode: 401,
      code: ERROR_CODES.UNAUTHORIZED,
      message: isExpired ? 'Access token has expired' : 'Invalid access token',
      event
    });
  }
};

module.exports = { authenticateJwt };
