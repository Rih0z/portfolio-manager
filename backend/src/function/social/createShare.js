'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const socialDbService = require('../../services/socialDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * POST /api/social/share — ポートフォリオ共有を作成
 * JWT 認証必須
 */
const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return formatOptionsResponse();
  }

  // JWT認証
  const authError = await authenticateJwt(event);
  if (authError) return authError;

  try {
    const { userId, planType } = event.user;

    // リクエストボディのパース
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_JSON,
        message: 'Invalid JSON in request body',
        event
      });
    }

    const { displayName, ageGroup, allocationSnapshot, portfolioScore, assetCount } = body;

    // バリデーション
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'displayName is required',
        event
      });
    }

    if (displayName.trim().length > 30) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'displayName must be 30 characters or less',
        event
      });
    }

    const validAgeGroups = ['20s', '30s', '40s', '50s', '60s+'];
    if (!ageGroup || !validAgeGroups.includes(ageGroup)) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: `ageGroup must be one of: ${validAgeGroups.join(', ')}`,
        event
      });
    }

    if (!Array.isArray(allocationSnapshot) || allocationSnapshot.length === 0) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'allocationSnapshot must be a non-empty array',
        event
      });
    }

    if (typeof portfolioScore !== 'number' || portfolioScore < 0 || portfolioScore > 100) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'portfolioScore must be a number between 0 and 100',
        event
      });
    }

    if (typeof assetCount !== 'number' || assetCount < 0) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'assetCount must be a non-negative number',
        event
      });
    }

    // プラン制限チェック
    const isPremium = planType === 'standard';
    const maxShares = isPremium ? 5 : 1;
    const ttlDays = isPremium ? 30 : 7;

    const existingShares = await socialDbService.getUserShares(userId);
    if (existingShares.length >= maxShares) {
      return await formatErrorResponse({
        statusCode: 403,
        code: ERROR_CODES.LIMIT_EXCEEDED,
        message: isPremium
          ? `Standard plan allows up to ${maxShares} shared portfolios`
          : 'Free plan allows 1 shared portfolio. Upgrade to Standard for more.',
        event
      });
    }

    // 共有作成
    const share = await socialDbService.createShare(userId, {
      displayName: displayName.trim(),
      ageGroup,
      allocationSnapshot,
      portfolioScore,
      assetCount,
      ttlDays
    });

    // userId は返さない（セキュリティ）
    const { userId: _uid, ...shareData } = share;

    return await formatResponse({
      statusCode: 201,
      data: shareData,
      message: 'Portfolio shared successfully',
      event,
      skipBudgetWarning: true
    });
  } catch (error) {
    logger.error('createShare error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to create share',
      event
    });
  }
};

module.exports = { handler };
