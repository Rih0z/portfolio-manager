/**
 * APIシークレット検証ミドルウェア
 * Cloudflare経由のリクエストのみを許可
 */

const logger = require('../utils/logger');
const { getCorsHeaders } = require('../utils/corsHeaders');

// AWS Secrets Managerから取得
const { getApiSecret } = require('../utils/secretsManager');
let API_SECRET = null;
const SKIP_VALIDATION_PATHS = [
  '/auth/google/login',  // Google認証は直接アクセス必要
  '/auth/google/callback',
  '/auth/google/drive/callback'
];

const validateApiSecret = async (event) => {
  try {
    const path = event.path;
    
    // 特定のパスはスキップ
    if (SKIP_VALIDATION_PATHS.some(skipPath => path.includes(skipPath))) {
      return null;
    }
    
    // API_SECRETを遅延ロード（エラーが起きても処理を続行）
    if (!API_SECRET) {
      try {
        API_SECRET = await getApiSecret();
      } catch (error) {
        logger.warn('API Secret取得でエラー、フォールバックを使用:', error.message);
        // セキュリティのため、フォールバック値は環境変数のみ使用
        API_SECRET = process.env.API_SECRET;
        if (!API_SECRET) {
          throw new Error('API_SECRET not available from both Secrets Manager and environment variables');
        }
      }
    }
    
    // X-API-Secretヘッダーの検証
    const apiSecret = event.headers['X-API-Secret'] || event.headers['x-api-secret'];
    
    if (!apiSecret || apiSecret !== API_SECRET) {
      logger.warn('Invalid API secret attempt', {
        path,
        ip: event.headers['X-Forwarded-For'] || event.requestContext?.identity?.sourceIp,
        userAgent: event.headers['User-Agent']
      });
      
      return {
        statusCode: 403,
        headers: getCorsHeaders(event),
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'Direct API access is not allowed'
        })
      };
    }
    
    return null;
  } catch (error) {
    logger.error('API secret validation error:', error);
    // エラーの場合はリクエストを拒否
    return {
      statusCode: 500,
      headers: getCorsHeaders(event),
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
};

module.exports = {
  validateApiSecret,
  API_SECRET
};