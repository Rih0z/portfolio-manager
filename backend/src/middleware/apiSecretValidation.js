/**
 * APIシークレット検証ミドルウェア
 * Cloudflare経由のリクエストのみを許可
 */

const { createResponse } = require('../utils/response');
const logger = require('../utils/logger');

const API_SECRET = process.env.API_SECRET || 'your-secret-key-here';
const SKIP_VALIDATION_PATHS = [
  '/auth/google/login',  // Google認証は直接アクセス必要
  '/auth/google/callback',
  '/auth/google/drive/callback'
];

const validateApiSecret = (event) => {
  try {
    const path = event.path;
    
    // 特定のパスはスキップ
    if (SKIP_VALIDATION_PATHS.some(skipPath => path.includes(skipPath))) {
      return null;
    }
    
    // X-API-Secretヘッダーの検証
    const apiSecret = event.headers['X-API-Secret'] || event.headers['x-api-secret'];
    
    if (!apiSecret || apiSecret !== API_SECRET) {
      logger.warn('Invalid API secret attempt', {
        path,
        ip: event.headers['X-Forwarded-For'] || event.requestContext?.identity?.sourceIp,
        userAgent: event.headers['User-Agent']
      });
      
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Direct API access is not allowed'
      });
    }
    
    return null;
  } catch (error) {
    logger.error('API secret validation error:', error);
    // エラーの場合はリクエストを拒否
    return createResponse(500, {
      error: 'Internal server error'
    });
  }
};

module.exports = {
  validateApiSecret,
  API_SECRET
};