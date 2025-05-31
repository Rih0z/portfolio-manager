/**
 * 公開APIのための基本的な保護ミドルウェア
 * リクエストヘッダーやUser-Agentをチェックして基本的な保護を提供
 */

const { createResponse } = require('../utils/response');
const logger = require('../utils/logger');

const ALLOWED_USER_AGENTS = [
  'Mozilla', // ブラウザ
  'Chrome',
  'Safari',
  'Firefox',
  'Edge'
];

const BLOCKED_USER_AGENTS = [
  'curl',
  'wget',
  'python',
  'java',
  'go-http',
  'ruby',
  'perl',
  'libwww-perl'
];

const publicApiProtection = async (event) => {
  try {
    const userAgent = event.headers['User-Agent'] || event.headers['user-agent'] || '';
    const origin = event.headers.origin || event.headers.Origin || '';
    const referer = event.headers.referer || event.headers.Referer || '';
    
    // User-Agentのチェック
    const userAgentLower = userAgent.toLowerCase();
    const isBlockedUA = BLOCKED_USER_AGENTS.some(blocked => 
      userAgentLower.includes(blocked.toLowerCase())
    );
    
    if (isBlockedUA) {
      logger.warn('Blocked request with User-Agent:', { userAgent, origin });
      return createResponse(403, {
        error: 'Access denied'
      });
    }
    
    // 空のUser-Agentを拒否
    if (!userAgent || userAgent.length < 10) {
      logger.warn('Blocked request with empty or short User-Agent');
      return createResponse(403, {
        error: 'Invalid request'
      });
    }
    
    // Originが設定されている場合はCORS設定と照合
    if (origin) {
      const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
      if (!allowedOrigins.some(allowed => origin.includes(allowed))) {
        logger.warn('Blocked request with invalid origin:', { origin });
        return createResponse(403, {
          error: 'Origin not allowed'
        });
      }
    }
    
    // 成功
    return null;
  } catch (error) {
    logger.error('Public API protection error:', error);
    // エラーの場合は通過させる（サービスを止めないため）
    return null;
  }
};

module.exports = {
  publicApiProtection
};