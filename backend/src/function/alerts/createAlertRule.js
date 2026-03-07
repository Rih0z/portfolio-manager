'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const notificationDbService = require('../../services/notificationDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/** 許可されるルールタイプ */
const VALID_RULE_TYPES = ['price_above', 'price_below', 'percent_change', 'volume_spike'];

/**
 * アラートルール作成ハンドラー
 * POST /api/alert-rules
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

    // リクエストボディのパース
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_JSON,
        message: 'Invalid JSON in request body',
        event
      });
    }

    if (!body) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'Request body is required',
        event
      });
    }

    const { type, ticker, targetValue, enabled } = body;

    // バリデーション
    if (!type || !VALID_RULE_TYPES.includes(type)) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: `type must be one of: ${VALID_RULE_TYPES.join(', ')}`,
        event
      });
    }

    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'ticker is required and must be a non-empty string',
        event
      });
    }

    if (targetValue === undefined || targetValue === null || typeof targetValue !== 'number' || isNaN(targetValue)) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'targetValue is required and must be a number',
        event
      });
    }

    const rule = await notificationDbService.createAlertRule(userId, {
      type,
      ticker: ticker.trim().toUpperCase(),
      targetValue,
      enabled: enabled !== false // デフォルトtrue
    });

    return await formatResponse({
      statusCode: 201,
      data: rule,
      message: 'Alert rule created successfully',
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('createAlertRule error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to create alert rule',
      event
    });
  }
};

module.exports = { handler };
