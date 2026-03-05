/**
 * Stripe サービス
 *
 * Stripe API との統合を一元管理する。
 * 秘密鍵は AWS Secrets Manager から遅延読込+キャッシュ。
 * Checkout Session / Customer Portal / Customer 管理を提供。
 *
 * @file src/services/stripeService.js
 */
'use strict';

const { getSecret } = require('../utils/secretsManager');
const logger = require('../utils/logger');

const STRIPE_SECRET_NAME = process.env.STRIPE_WEBHOOK_SECRET_NAME || 'pfwise-api/stripe';

// Stripe インスタンスキャッシュ
let stripeInstance = null;
let stripeSecrets = null;
let secretsCacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Stripe シークレットを取得（キャッシュ付き）
 * @returns {Promise<Object>} { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PRICE_STANDARD_MONTHLY, PRICE_STANDARD_ANNUAL }
 */
const getStripeSecrets = async () => {
  if (stripeSecrets && (Date.now() - secretsCacheTimestamp) < CACHE_TTL) {
    return stripeSecrets;
  }

  try {
    stripeSecrets = await getSecret(STRIPE_SECRET_NAME);
    secretsCacheTimestamp = Date.now();
    return stripeSecrets;
  } catch (error) {
    logger.error('Failed to get Stripe secrets:', error.message);
    throw new Error('Stripe configuration unavailable');
  }
};

/**
 * Stripe インスタンスを取得（遅延初期化）
 * @returns {Promise<Object>} Stripe SDK インスタンス
 */
const getStripe = async () => {
  if (stripeInstance) return stripeInstance;

  const secrets = await getStripeSecrets();
  const Stripe = require('stripe');
  stripeInstance = new Stripe(secrets.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
  return stripeInstance;
};

/**
 * Stripe Customer を取得または作成
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.name
 * @param {string} params.userId
 * @param {string} [params.existingCustomerId]
 * @returns {Promise<Object>} Stripe Customer
 */
const getOrCreateStripeCustomer = async ({ email, name, userId, existingCustomerId }) => {
  const stripe = await getStripe();

  // 既存の Customer ID がある場合はそれを返す
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return customer;
    } catch (error) {
      logger.warn('Existing Stripe customer not found, creating new', { existingCustomerId });
    }
  }

  // メールで既存顧客を検索
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0];
  }

  // 新規作成
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });

  logger.info('Stripe customer created', { customerId: customer.id, userId });
  return customer;
};

/**
 * Checkout Session を作成
 * @param {Object} params
 * @param {string} params.customerId - Stripe Customer ID
 * @param {string} params.priceId - Stripe Price ID
 * @param {string} params.userId
 * @param {string} params.successUrl
 * @param {string} params.cancelUrl
 * @returns {Promise<Object>} Checkout Session
 */
const createCheckoutSession = async ({ customerId, priceId, userId, successUrl, cancelUrl }) => {
  const stripe = await getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
    allow_promotion_codes: true,
  });

  logger.info('Checkout session created', { sessionId: session.id, userId });
  return session;
};

/**
 * Customer Portal Session を作成
 * @param {Object} params
 * @param {string} params.customerId - Stripe Customer ID
 * @param {string} params.returnUrl
 * @returns {Promise<Object>} Portal Session
 */
const createCustomerPortalSession = async ({ customerId, returnUrl }) => {
  const stripe = await getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
};

/**
 * サブスクリプションをキャンセル
 * @param {string} subscriptionId - Stripe Subscription ID
 * @returns {Promise<Object>}
 */
const cancelSubscription = async (subscriptionId) => {
  const stripe = await getStripe();

  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  logger.info('Subscription cancelled', { subscriptionId });
  return subscription;
};

/**
 * Stripe Webhook 署名を検証
 * @param {string} rawBody - リクエストの生ボディ
 * @param {string} signature - Stripe-Signature ヘッダー
 * @returns {Promise<Object>} 検証済みイベント
 */
const verifyWebhookSignature = async (rawBody, signature) => {
  const stripe = await getStripe();
  const secrets = await getStripeSecrets();

  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    secrets.STRIPE_WEBHOOK_SECRET
  );
};

/**
 * テスト用: キャッシュリセット
 */
const _resetCache = () => {
  stripeInstance = null;
  stripeSecrets = null;
  secretsCacheTimestamp = 0;
};

module.exports = {
  getStripe,
  getStripeSecrets,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createCustomerPortalSession,
  cancelSubscription,
  verifyWebhookSignature,
  _resetCache,
};
