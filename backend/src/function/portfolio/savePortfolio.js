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

    const { currentAssets, targetPortfolio, baseCurrency, exchangeRate, additionalBudget, aiPromptTemplate, version } = body;

    // currentAssets は必須
    if (!currentAssets || !Array.isArray(currentAssets)) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'currentAssets must be an array',
        event
      });
    }

    // バージョンは数値またはnull
    const expectedVersion = typeof version === 'number' ? version : null;

    const saved = await portfolioDbService.savePortfolio(
      userId,
      { currentAssets, targetPortfolio, baseCurrency, exchangeRate, additionalBudget, aiPromptTemplate },
      expectedVersion
    );

    return await formatResponse({
      statusCode: 200,
      data: {
        version: saved.version,
        updatedAt: saved.updatedAt
      },
      message: 'Portfolio saved successfully',
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    if (error.code === 'VERSION_CONFLICT') {
      return await formatErrorResponse({
        statusCode: 409,
        code: 'VERSION_CONFLICT',
        message: 'Portfolio has been modified by another session. Please reload and try again.',
        details: { serverVersion: error.serverVersion },
        event
      });
    }

    logger.error('savePortfolio error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to save portfolio',
      event
    });
  }
};

module.exports = { handler };
