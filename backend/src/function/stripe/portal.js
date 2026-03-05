/**
 * Stripe Customer Portal ハンドラー
 *
 * POST /v1/subscription/portal
 * 認証済みユーザーに Customer Portal URL を返す。
 *
 * @file src/function/stripe/portal.js
 */
'use strict';

const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { getCorsHeaders } = require('../../utils/corsHeaders');
const { verifyAccessToken } = require('../../utils/jwtUtils');
const { createCustomerPortalSession } = require('../../services/stripeService');
const { getUserById } = require('../../services/userService');
const logger = require('../../utils/logger');

module.exports.handler = async (event) => {
  // OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: getCorsHeaders(event), body: '' };
  }

  try {
    // 認証チェック
    const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return formatErrorResponse({ statusCode: 401, code: 'UNAUTHORIZED', message: '認証が必要です', event });
    }

    const decoded = await verifyAccessToken(token);
    const userId = decoded.sub;

    // ユーザー情報取得
    const user = await getUserById(userId);
    if (!user?.stripeCustomerId) {
      return formatErrorResponse({ statusCode: 400, code: 'NO_SUBSCRIPTION', message: 'サブスクリプションが見つかりません', event });
    }

    // Portal Session 作成
    const origin = event.headers?.origin || event.headers?.Origin || 'https://portfolio-wise.com';
    const session = await createCustomerPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: `${origin}/settings`,
    });

    return formatResponse({
      statusCode: 200,
      data: { portalUrl: session.url },
      event,
      skipBudgetWarning: true,
    });
  } catch (error) {
    logger.error('Portal session creation failed', { error: error.message });

    if (error.message?.includes('token')) {
      return formatErrorResponse({ statusCode: 401, code: 'UNAUTHORIZED', message: '認証トークンが無効です', event });
    }

    return formatErrorResponse({ statusCode: 500, code: 'PORTAL_ERROR', message: 'ポータルの作成に失敗しました', event });
  }
};
