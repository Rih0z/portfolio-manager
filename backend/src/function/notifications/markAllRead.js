'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const notificationDbService = require('../../services/notificationDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * 全通知一括既読ハンドラー
 * POST /api/notifications/read-all
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
    const updatedCount = await notificationDbService.markAllRead(userId);

    return await formatResponse({
      statusCode: 200,
      data: { updatedCount },
      message: `${updatedCount} notifications marked as read`,
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('markAllRead error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to mark all notifications as read',
      event
    });
  }
};

module.exports = { handler };
