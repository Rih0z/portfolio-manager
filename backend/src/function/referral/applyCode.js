'use strict';

const { authenticateJwt } = require('../../middleware/jwtAuth');
const referralDbService = require('../../services/referralDbService');
const { formatResponse, formatErrorResponse, formatOptionsResponse } = require('../../utils/responseUtils');
const { ERROR_CODES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * POST /api/referral/apply
 * リファラルコードを適用する
 * JWT認証必須
 *
 * Body: { code: string }
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

    // リクエストボディの解析
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_JSON,
        message: 'Invalid JSON in request body',
        event,
      });
    }

    const { code } = body || {};

    if (!code || typeof code !== 'string') {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.MISSING_PARAMS,
        message: 'Referral code is required',
        event,
      });
    }

    // コードの正規化
    const normalizedCode = code.trim().toUpperCase();

    // コードが存在するか検証
    const referral = await referralDbService.getReferralByCode(normalizedCode);
    if (!referral) {
      return await formatErrorResponse({
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Invalid referral code',
        event,
      });
    }

    // 自分のコードは適用不可
    if (referral.userId === userId) {
      return await formatErrorResponse({
        statusCode: 400,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'Cannot apply your own referral code',
        event,
      });
    }

    // 重複適用チェック（同一ユーザーが同じコードを2回適用するのを防止）
    const alreadyApplied = await referralDbService.hasUserAppliedCode(normalizedCode, userId);
    if (alreadyApplied) {
      return await formatErrorResponse({
        statusCode: 409,
        code: ERROR_CODES.INVALID_PARAMS,
        message: 'Referral code already applied',
        event,
      });
    }

    // イベントを作成（signup）
    await referralDbService.createReferralEvent(normalizedCode, {
      refereeUserId: userId,
      eventType: 'signup',
    });

    // 紹介者の totalReferrals カウンターを更新
    await referralDbService.incrementReferralCount(normalizedCode);

    // 報酬付与:
    // 被紹介者 → 7日間 Standard 体験（subscriptionDbService で planType を一時変更）
    // 紹介者 → Standard 1ヶ月無料延長（Stripe Coupon API 経由 — 要 Stage 2 実装）
    // 現在は DynamoDB ベースの仮付与。Stripe 統合は Stage 2 で実装。
    // TODO: Stage 2 — Stripe Coupon API による正式報酬付与
    logger.info(`Referral code ${normalizedCode} applied by user ${userId}. Reward pending Stage 2 Stripe integration.`);

    return await formatResponse({
      statusCode: 200,
      data: { success: true, message: 'Referral code applied successfully' },
      event,
      skipBudgetWarning: true,
    });
  } catch (error) {
    logger.error('applyReferralCode error:', error.message);
    return await formatErrorResponse({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'Failed to apply referral code',
      event,
    });
  }
};

module.exports = { handler };
