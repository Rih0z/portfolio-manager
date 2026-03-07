'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const referralDbService = require('../../services/referralDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * GET /api/referral/stats
 * ユーザーのリファラル統計を取得
 * JWT認証必須
 */
const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return formatOptionsResponse();
  }

  // JWT認証
  const authError = await authenticateJwt(event);
  if (authError) return authError;

  try {
    const { userId } = event.user;
    const stats = await referralDbService.getReferralStats(userId);

    return await formatResponse({
      statusCode: 200,
      data: stats,
      event,
      skipBudgetWarning: true,
    });
  } catch (error) {
    logger.error('getReferralStats error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch referral stats',
      event,
    });
  }
};

module.exports = { handler };
