'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const notificationDbService = require('../../services/notificationDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/** 許可されるルールタイプ */
const VALID_RULE_TYPES = ['price_above', 'price_below', 'percent_change', 'volume_spike'];

/**
 * アラートルール更新ハンドラー
 * PUT /api/alert-rules/{id}
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
    const ruleId = event.pathParameters?.id;

    if (!ruleId) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'Rule ID is required',
        event
      });
    }

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

    // タイプのバリデーション（指定された場合のみ）
    if (body.type !== undefined && !VALID_RULE_TYPES.includes(body.type)) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: `type must be one of: ${VALID_RULE_TYPES.join(', ')}`,
        event
      });
    }

    // ティッカーのバリデーション（指定された場合のみ）
    if (body.ticker !== undefined) {
      if (typeof body.ticker !== 'string' || body.ticker.trim().length === 0) {
        return await formatErrorResponse({
          statusCode: 400,
          code: ERROR_CODES.INVALID_PARAMS,
          message: 'ticker must be a non-empty string',
          event
        });
      }
      body.ticker = body.ticker.trim().toUpperCase();
    }

    // targetValueのバリデーション（指定された場合のみ）
    if (body.targetValue !== undefined) {
      if (typeof body.targetValue !== 'number' || isNaN(body.targetValue)) {
        return await formatErrorResponse({
          statusCode: 400,
          code: ERROR_CODES.INVALID_PARAMS,
          message: 'targetValue must be a number',
          event
        });
      }
    }

    const updated = await notificationDbService.updateAlertRule(userId, ruleId, body);

    return await formatResponse({
      statusCode: 200,
      data: updated,
      message: 'Alert rule updated successfully',
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return await formatErrorResponse({
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Alert rule not found',
        event
      });
    }

    if (error.message === 'No valid fields to update') {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'No valid fields provided for update',
        event
      });
    }

    logger.error('updateAlertRule error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to update alert rule',
      event
    });
  }
};

module.exports = { handler };
