/**
 * APIキー認証ミドルウェア
 * 
 * パブリックAPIとプライベートAPIを区別し、適切な認証を要求する
 * - パブリックAPI: 基本的なレート制限のみ
 * - プライベートAPI: APIキー必須
 * - 管理者API: 管理者APIキー必須
 */
'use strict';

const { getApiKeys } = require('../utils/secretsManager');
const { formatErrorResponse } = require('../utils/responseUtils');
const logger = require('../utils/logger');

// createErrorResponse関数を定義
const createErrorResponse = (statusCode, errorCode, message) => {
  return formatErrorResponse({
    statusCode,
    message,
    error: {
      code: errorCode,
      message: message
    }
  });
};

// パブリックAPIのパス（認証不要）
const PUBLIC_PATHS = [
  '/api/market-data',
  '/auth/google/login',
  '/auth/session',
  '/auth/logout'
];

// 管理者専用APIのパス
const ADMIN_PATHS = [
  '/admin/status',
  '/admin/reset',
  '/admin/getBudgetStatus'
];

/**
 * APIキー認証を実行する
 * @param {Object} event - Lambda event
 * @param {string} requiredRole - 必要な権限 ('public', 'user', 'admin')
 * @returns {Object|null} エラーレスポンスまたはnull（認証成功）
 */
const authenticateApiKey = async (event, requiredRole = 'public') => {
  const path = event.path || event.rawPath;
  const method = event.httpMethod || event.requestContext?.http?.method;
  const clientIP = getClientIP(event);
  
  logger.info(`API access attempt: ${method} ${path} from ${clientIP}`);

  try {
    // パブリックAPIの場合は基本的なレート制限のみ
    if (requiredRole === 'public' && isPublicPath(path)) {
      const rateLimitResult = await checkPublicRateLimit(clientIP, path);
      if (!rateLimitResult.allowed) {
        return createErrorResponse(429, 'RATE_LIMIT_EXCEEDED', rateLimitResult.message);
      }
      return null; // 認証成功
    }

    // APIキーの取得
    const apiKey = extractApiKey(event);
    if (!apiKey) {
      logger.warn(`Missing API key for ${path} from ${clientIP}`);
      return createErrorResponse(401, 'MISSING_API_KEY', 'APIキーが必要です');
    }

    // APIキーの検証
    const keyValidation = await validateApiKey(apiKey, requiredRole);
    if (!keyValidation.valid) {
      logger.warn(`Invalid API key attempt for ${path} from ${clientIP}: ${keyValidation.reason}`);
      return createErrorResponse(401, 'INVALID_API_KEY', keyValidation.reason);
    }

    // 使用量とレート制限のチェック
    const usageCheck = await checkApiKeyUsage(apiKey, keyValidation.keyInfo);
    if (!usageCheck.allowed) {
      logger.warn(`API key usage limit exceeded for ${path} from ${clientIP}`);
      return createErrorResponse(429, 'USAGE_LIMIT_EXCEEDED', usageCheck.message);
    }

    // 使用量の記録
    await recordApiKeyUsage(apiKey, {
      path,
      method,
      clientIP,
      timestamp: new Date().toISOString(),
      keyType: keyValidation.keyInfo.type
    });

    logger.info(`API key authentication successful for ${path} from ${clientIP}`);
    return null; // 認証成功

  } catch (error) {
    logger.error(`API key authentication error for ${path}:`, error);
    return createErrorResponse(500, 'AUTH_ERROR', '認証処理中にエラーが発生しました');
  }
};

/**
 * クライアントIPアドレスを取得
 */
const getClientIP = (event) => {
  return event.requestContext?.identity?.sourceIp || 
         event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.headers?.['x-real-ip'] ||
         'unknown';
};

/**
 * パブリックAPIかどうかを判定
 */
const isPublicPath = (path) => {
  return PUBLIC_PATHS.some(publicPath => path.includes(publicPath));
};

/**
 * 管理者APIかどうかを判定
 */
const isAdminPath = (path) => {
  return ADMIN_PATHS.some(adminPath => path.includes(adminPath));
};

/**
 * APIキーをヘッダーから抽出
 */
const extractApiKey = (event) => {
  const headers = event.headers || {};
  
  // 複数のヘッダー形式をサポート
  return headers['x-api-key'] || 
         headers['X-API-Key'] || 
         headers['apikey'] ||
         headers['Authorization']?.replace(/^Bearer\s+/, '') ||
         event.queryStringParameters?.apikey;
};

/**
 * APIキーの検証
 */
const validateApiKey = async (apiKey, requiredRole) => {
  try {
    const secrets = await getApiKeys();
    
    // 管理者APIキーの検証
    if (requiredRole === 'admin') {
      if (apiKey === secrets.adminApiKey) {
        return {
          valid: true,
          keyInfo: {
            type: 'admin',
            permissions: ['read', 'write', 'admin'],
            rateLimit: 1000 // 管理者は高い制限
          }
        };
      }
      return { valid: false, reason: '管理者権限が必要です' };
    }

    // 一般ユーザーAPIキーの検証
    if (requiredRole === 'user') {
      if (apiKey === secrets.userApiKey || apiKey === secrets.adminApiKey) {
        return {
          valid: true,
          keyInfo: {
            type: apiKey === secrets.adminApiKey ? 'admin' : 'user',
            permissions: ['read', 'write'],
            rateLimit: apiKey === secrets.adminApiKey ? 1000 : 100
          }
        };
      }
      return { valid: false, reason: '有効なAPIキーが必要です' };
    }

    return { valid: false, reason: '不明な権限要求です' };

  } catch (error) {
    logger.error('API key validation error:', error);
    return { valid: false, reason: 'APIキー検証中にエラーが発生しました' };
  }
};

/**
 * APIキーの使用量チェック
 */
const checkApiKeyUsage = async (apiKey, keyInfo) => {
  try {
    const now = new Date();
    const hourKey = `${apiKey}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    
    // レート制限の確認（1時間あたり）
    const hourlyUsage = await getUsageCount(hourKey);
    if (hourlyUsage >= keyInfo.rateLimit) {
      return {
        allowed: false,
        message: `1時間あたりの制限（${keyInfo.rateLimit}回）に達しました`
      };
    }

    return { allowed: true };

  } catch (error) {
    logger.error('API key usage check error:', error);
    // エラー時は制限を適用
    return { 
      allowed: false, 
      message: '使用量確認中にエラーが発生しました' 
    };
  }
};

/**
 * APIキー使用量の記録
 */
const recordApiKeyUsage = async (apiKey, metadata) => {
  try {
    const now = new Date();
    const hourKey = `${apiKey}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    
    // 使用量をインクリメント
    await incrementUsageCount(hourKey);
    
    // ログ記録
    logger.info('API key usage recorded:', {
      apiKey: apiKey.substring(0, 8) + '...',
      ...metadata
    });
  } catch (error) {
    logger.error('Failed to record API key usage:', error);
    // 記録失敗は処理を中断しない
  }
};

/**
 * パブリックAPIのレート制限チェック
 */
const checkPublicRateLimit = async (clientIP, path) => {
  try {
    const now = new Date();
    const hourKey = `public:${clientIP}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    
    // パブリックAPIは1時間あたり20回まで
    const hourlyUsage = await getUsageCount(hourKey);
    const publicLimit = 20;
    
    if (hourlyUsage >= publicLimit) {
      return {
        allowed: false,
        message: `パブリックAPIの制限（1時間あたり${publicLimit}回）に達しました。APIキーの取得をご検討ください。`
      };
    }

    // 使用量を記録
    await incrementUsageCount(hourKey);

    return { allowed: true };

  } catch (error) {
    logger.error('Public rate limit check error:', error);
    // エラー時は制限を適用
    return { 
      allowed: false, 
      message: 'レート制限確認中にエラーが発生しました' 
    };
  }
};

/**
 * 使用量カウントの取得（簡易実装）
 */
const getUsageCount = async (key) => {
  // 実際の実装ではDynamoDBやRedisを使用
  // ここでは簡易的にメモリ内カウンターを使用
  if (!global.usageCounters) {
    global.usageCounters = {};
  }
  return global.usageCounters[key] || 0;
};

/**
 * 使用量カウントのインクリメント
 */
const incrementUsageCount = async (key) => {
  if (!global.usageCounters) {
    global.usageCounters = {};
  }
  global.usageCounters[key] = (global.usageCounters[key] || 0) + 1;
};

/**
 * 認証が必要かどうかを判定
 */
const requiresAuthentication = (path) => {
  // パブリックAPIは認証不要
  if (isPublicPath(path)) {
    return 'public';
  }
  
  // 管理者APIは管理者認証必要
  if (isAdminPath(path)) {
    return 'admin';
  }
  
  // その他は一般ユーザー認証必要
  return 'user';
};

/**
 * メイン認証関数
 */
const authenticate = async (event) => {
  const path = event.path || event.rawPath;
  const requiredRole = requiresAuthentication(path);
  
  return await authenticateApiKey(event, requiredRole);
};

module.exports = {
  authenticate,
  authenticateApiKey,
  requiresAuthentication,
  isPublicPath,
  isAdminPath,
  getClientIP,
  checkPublicRateLimit,
  recordApiKeyUsage
};