'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const notificationDbService = require('../../services/notificationDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * 通知削除ハンドラー
 * DELETE /api/notifications/{id}
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
    const notificationId = event.pathParameters?.id;

    if (!notificationId) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'Notification ID is required',
        event
      });
    }

    await notificationDbService.deleteNotification(userId, notificationId);

    return await formatResponse({
      statusCode: 200,
      data: { notificationId, deleted: true },
      message: 'Notification deleted',
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return await formatErrorResponse({
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Notification not found',
        event
      });
    }

    logger.error('deleteNotification error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to delete notification',
      event
    });
  }
};

module.exports = { handler };
