'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const socialDbService = require('../../services/socialDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * GET /api/social/shares — ユーザーの全共有ポートフォリオを取得
 * JWT 認証必須
 */
const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return formatOptionsResponse();
  }

  // JWT認証
  const authError = await authenticateJwt(event);
  if (authError) return authError;

  try {
    const { userId, planType } = event.user;

    const shares = await socialDbService.getUserShares(userId);

    // userId を除外してレスポンス
    const sanitizedShares = shares.map(({ userId: _uid, ttl: _ttl, ...rest }) => rest);

    // プラン制限情報を付加
    const isPremium = planType === 'standard';
    const maxShares = isPremium ? 5 : 1;

    return await formatResponse({
      statusCode: 200,
      data: {
        shares: sanitizedShares,
        limits: {
          maxShares,
          currentCount: sanitizedShares.length
        }
      },
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('getUserShares error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch user shares',
      event
    });
  }
};

module.exports = { handler };
