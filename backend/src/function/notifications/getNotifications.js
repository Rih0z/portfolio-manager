'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const notificationDbService = require('../../services/notificationDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * 通知一覧取得ハンドラー
 * GET /api/notifications?limit=20&lastKey=...
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
    const queryParams = event.queryStringParameters || {};

    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 20, 1), 100);

    let lastKey = null;
    if (queryParams.lastKey) {
      try {
        lastKey = JSON.parse(decodeURIComponent(queryParams.lastKey));
      } catch {
        return await formatErrorResponse({
          statusCode: 400,
          code: ERROR_CODES.INVALID_PARAMS,
          message: 'Invalid lastKey parameter',
          event
        });
      }
    }

    const result = await notificationDbService.getNotifications(userId, { limit, lastKey });

    return await formatResponse({
      statusCode: 200,
      data: {
        notifications: result.items,
        lastKey: result.lastKey ? encodeURIComponent(JSON.stringify(result.lastKey)) : null,
        count: result.items.length
      },
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('getNotifications error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch notifications',
      event
    });
  }
};

module.exports = { handler };
