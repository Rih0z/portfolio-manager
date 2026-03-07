'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const referralDbService = require('../../services/referralDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * GET /api/referral/code
 * ユーザーのリファラルコードを取得（存在しない場合は新規作成）
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
    const referral = await referralDbService.getOrCreateReferralCode(userId);

    // userId は返さない（セキュリティ）
    const { userId: _uid, ...referralData } = referral;

    return await formatResponse({
      statusCode: 200,
      data: referralData,
      event,
      skipBudgetWarning: true,
    });
  } catch (error) {
    logger.error('getReferralCode error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch referral code',
      event,
    });
  }
};

module.exports = { handler };
