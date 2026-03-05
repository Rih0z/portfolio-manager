/**
 * Stripe Checkout セッション作成ハンドラー
 *
 * POST /v1/subscription/checkout
 * 認証済みユーザーに Stripe Checkout URL を返す。
 *
 * @file src/function/stripe/checkout.js
 */
'use strict';

const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { getCorsHeaders } = require('../../utils/corsHeaders');
const { verifyAccessToken } = require('../../utils/jwtUtils');
const { getOrCreateStripeCustomer, createCheckoutSession, getStripeSecrets } = require('../../services/stripeService');
const { getUserById, updateStripeCustomerId } = require('../../services/userService');
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

    // リクエストボディ
    const body = JSON.parse(event.body || '{}');
    const { plan = 'monthly' } = body; // 'monthly' or 'annual'

    // Stripe シークレットから Price ID を取得
    const secrets = await getStripeSecrets();
    const priceId = plan === 'annual'
      ? secrets.PRICE_STANDARD_ANNUAL
      : secrets.PRICE_STANDARD_MONTHLY;

    if (!priceId) {
      return formatErrorResponse({ statusCode: 500, code: 'CONFIG_ERROR', message: 'Price ID が設定されていません', event });
    }

    // ユーザー情報取得
    const user = await getUserById(userId);
    if (!user) {
      return formatErrorResponse({ statusCode: 404, code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません', event });
    }

    // Stripe Customer を取得/作成
    const customer = await getOrCreateStripeCustomer({
      email: user.email,
      name: user.name,
      userId: user.userId,
      existingCustomerId: user.stripeCustomerId || undefined,
    });

    // stripeCustomerId をユーザーに紐付け
    if (!user.stripeCustomerId || user.stripeCustomerId !== customer.id) {
      await updateStripeCustomerId(userId, customer.id);
    }

    // Checkout Session 作成
    const origin = event.headers?.origin || event.headers?.Origin || 'https://portfolio-wise.com';
    const session = await createCheckoutSession({
      customerId: customer.id,
      priceId,
      userId,
      successUrl: `${origin}/settings?checkout=success`,
      cancelUrl: `${origin}/pricing?checkout=cancel`,
    });

    return formatResponse({
      statusCode: 200,
      data: { checkoutUrl: session.url, sessionId: session.id },
      event,
      skipBudgetWarning: true,
    });
  } catch (error) {
    logger.error('Checkout session creation failed', { error: error.message });

    if (error.message?.includes('token')) {
      return formatErrorResponse({ statusCode: 401, code: 'UNAUTHORIZED', message: '認証トークンが無効です', event });
    }

    return formatErrorResponse({ statusCode: 500, code: 'CHECKOUT_ERROR', message: 'チェックアウトの作成に失敗しました', event });
  }
};
