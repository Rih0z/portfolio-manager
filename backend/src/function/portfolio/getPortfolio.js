'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const portfolioDbService = require('../../services/portfolioDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return formatOptionsResponse();
  }

  // JWT認証
  const authError = await authenticateJwt(event);
  if (authError) return authError;

  try {
    const { userId } = event.user;
    const portfolio = await portfolioDbService.getPortfolio(userId);

    if (!portfolio) {
      return await formatResponse({
        statusCode: 200,
        data: null,
        message: 'No portfolio found',
        event,
        skipBudgetWarning: true
      });
    }

    // userId は返さない（セキュリティ）
    const { userId: _uid, ...portfolioData } = portfolio;

    return await formatResponse({
      statusCode: 200,
      data: portfolioData,
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('getPortfolio error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to fetch portfolio',
      event
    });
  }
};

module.exports = { handler };
