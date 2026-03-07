'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const notificationDbService = require('../../services/notificationDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * アラートルール一覧取得ハンドラー
 * GET /api/alert-rules
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
    const rules = await notificationDbService.getAlertRules(userId);

    return await formatResponse({
      statusCode: 200,
      data: {
        rules,
        count: rules.length
      },
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('getAlertRules error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch alert rules',
      event
    });
  }
};

module.exports = { handler };
