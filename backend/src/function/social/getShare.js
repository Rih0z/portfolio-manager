'use strict';

const socialDbService = require('../../services/socialDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * GET /api/social/share/{shareId} — 共有ポートフォリオを取得（公開）
 * 認証不要 — 誰でも閲覧可能
 */
const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return formatOptionsResponse();
  }

  try {
    const shareId = event.pathParameters?.shareId;

    if (!shareId) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'shareId is required',
        event
      });
    }

    const share = await socialDbService.getShare(shareId);

    if (!share) {
      return await formatErrorResponse({
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Shared portfolio not found or has expired',
        event
      });
    }

    // userId は返さない（セキュリティ）
    const { userId: _uid, ttl: _ttl, ...shareData } = share;

    return await formatResponse({
      statusCode: 200,
      data: shareData,
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('getShare error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch shared portfolio',
      event
    });
  }
};

module.exports = { handler };
