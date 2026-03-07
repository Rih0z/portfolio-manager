'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const notificationDbService = require('../../services/notificationDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * アラートルール削除ハンドラー
 * DELETE /api/alert-rules/{id}
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

    await notificationDbService.deleteAlertRule(userId, ruleId);

    return await formatResponse({
      statusCode: 200,
      data: { ruleId, deleted: true },
      message: 'Alert rule deleted',
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

    logger.error('deleteAlertRule error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to delete alert rule',
      event
    });
  }
};

module.exports = { handler };
