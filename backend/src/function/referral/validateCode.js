'use strict';

const referralDbService = require('../../services/referralDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * POST /api/referral/validate
 * リファラルコードの有効性を検証する（公開エンドポイント、認証不要）
 *
 * Body: { code: string }
 */
const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return formatOptionsResponse();
  }

  try {
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
    const valid = await referralDbService.validateCode(normalizedCode);

    return await formatResponse({
      statusCode: 200,
      data: { valid },
      event,
      skipBudgetWarning: true,
    });
  } catch (error) {
    logger.error('validateReferralCode error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to validate referral code',
      event,
    });
  }
};

module.exports = { handler };
