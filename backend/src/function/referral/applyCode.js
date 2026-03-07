'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const referralDbService = require('../../services/referralDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * POST /api/referral/apply
 * リファラルコードを適用する
 * JWT認証必須
 *
 * Body: { code: string }
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

    // リクエストボディの解析
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_JSON,
        message: 'Invalid JSON in request body',
        event,
      });
    }

    const { code } = body || {};

    if (!code || typeof code !== 'string') {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'Referral code is required',
        event,
      });
    }

    // コードの正規化
    const normalizedCode = code.trim().toUpperCase();

    // コードが存在するか検証
    const referral = await referralDbService.getReferralByCode(normalizedCode);
    if (!referral) {
      return await formatErrorResponse({
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Invalid referral code',
        event,
      });
    }

    // 自分のコードは適用不可
    if (referral.userId === userId) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'Cannot apply your own referral code',
        event,
      });
    }

    // イベントを作成（signup）
    await referralDbService.createReferralEvent(normalizedCode, {
      refereeUserId: userId,
      eventType: 'signup',
    });

    logger.info(`Referral code ${normalizedCode} applied by user ${userId}`);

    return await formatResponse({
      statusCode: 200,
      data: { success: true, message: 'Referral code applied successfully' },
      event,
      skipBudgetWarning: true,
    });
  } catch (error) {
    logger.error('applyReferralCode error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to apply referral code',
      event,
    });
  }
};

module.exports = { handler };
