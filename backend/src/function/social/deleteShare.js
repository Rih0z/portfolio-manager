'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const socialDbService = require('../../services/socialDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * DELETE /api/social/share/{shareId} — 共有ポートフォリオを削除
 * JWT 認証必須、所有者のみ
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
    const shareId = event.pathParameters?.shareId;

    if (!shareId) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'shareId is required',
        event
      });
    }

    await socialDbService.deleteShare(shareId, userId);

    return await formatResponse({
      statusCode: 200,
      data: { shareId },
      message: 'Share deleted successfully',
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return await formatErrorResponse({
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: error.message,
        event
      });
    }

    if (error.code === 'FORBIDDEN') {
      return await formatErrorResponse({
        statusCode: 403,
        code: ERROR_CODES.FORBIDDEN,
        message: error.message,
        event
      });
    }

    logger.error('deleteShare error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to delete share',
      event
    });
  }
};

module.exports = { handler };
