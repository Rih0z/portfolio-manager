/**
 * Stripe Webhook ハンドラー
 *
 * Stripe からのイベント通知を受信し、サブスクリプション状態を
 * DynamoDB に同期する。署名検証により改ざんを防止。
 *
 * セキュリティ:
 * - Stripe-Signature ヘッダーによる署名検証（改ざん防止）
 * - イベント ID ベースの冪等性保証（重複処理防止）
 * - 処理済みイベントは 24 時間 TTL で DynamoDB に記録
 *
 * エラーハンドリング方針:
 * - 署名検証失敗 → 400（不正リクエスト）
 * - イベント処理失敗 → 200 を返し Stripe のリトライを停止
 *   （回復不能なエラーで無限リトライを防止）
 * - 一時的障害（DynamoDB タイムアウト等） → 500 で Stripe にリトライを許可
 *
 * @file src/function/stripe/webhook.js
 */
'use strict';

const { verifyWebhookSignature } = require('../../services/stripeService');
const { updateUserPlan, getUserByStripeCustomerId } = require('../../services/userService');
const { PLAN_TYPES } = require('../../config/planLimits');
const logger = require('../../utils/logger');

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-west-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE || 'pfwise-api-dev-subscriptions';
const CACHE_TABLE = process.env.CACHE_TABLE || 'pfwise-api-dev-cache';

/** 冪等性チェック用 TTL: 24 時間 */
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/**
 * 一時的な障害かどうかを判定する
 * @param {Error} error
 * @returns {boolean}
 */
const isTransientError = (error) => {
  // DynamoDB のスロットリング・タイムアウト
  if (error.name === 'ProvisionedThroughputExceededException') return true;
  if (error.name === 'ThrottlingException') return true;
  if (error.name === 'RequestLimitExceeded') return true;
  if (error.name === 'InternalServerError') return true;
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') return true;
  return false;
};

/**
 * 冪等性チェック: イベントが既に処理済みか確認
 * @param {string} eventId Stripe イベント ID
 * @returns {Promise<boolean>} true = 処理済み
 */
const isEventProcessed = async (eventId) => {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: CACHE_TABLE,
      Key: { key: `webhook-event:${eventId}` },
    }));
    return !!result.Item;
  } catch (error) {
    // 冪等性チェック失敗は安全側に倒す（処理を続行）
    logger.warn('Idempotency check failed, proceeding with processing', {
      eventId,
      error: error.message,
    });
    return false;
  }
};

/**
 * イベントを処理済みとしてマーク
 * @param {string} eventId
 * @param {string} eventType
 * @param {'succeeded'|'failed'|'skipped'} status
 * @param {string} [errorMessage]
 */
const markEventProcessed = async (eventId, eventType, status, errorMessage) => {
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + IDEMPOTENCY_TTL_SECONDS;

  try {
    await docClient.send(new PutCommand({
      TableName: CACHE_TABLE,
      Item: {
        key: `webhook-event:${eventId}`,
        eventId,
        eventType,
        status,
        processedAt: now,
        ...(errorMessage && { errorMessage }),
        ttl,
      },
    }));
  } catch (error) {
    // マーク失敗はログに記録するが処理自体は成功とする
    logger.error('Failed to mark event as processed', {
      eventId,
      eventType,
      error: error.message,
    });
  }
};

/**
 * Webhook メインハンドラー
 */
module.exports.handler = async (event) => {
  const signature = event.headers?.['Stripe-Signature'] || event.headers?.['stripe-signature'];
  if (!signature) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing Stripe-Signature header' }) };
  }

  let stripeEvent;
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    stripeEvent = await verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    logger.error('Webhook signature verification failed', { error: error.message });
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  // 冪等性チェック
  if (await isEventProcessed(stripeEvent.id)) {
    logger.info('Duplicate event skipped', { eventId: stripeEvent.id, type: stripeEvent.type });
    return { statusCode: 200, body: JSON.stringify({ received: true, duplicate: true }) };
  }

  try {
    await handleStripeEvent(stripeEvent);
    await markEventProcessed(stripeEvent.id, stripeEvent.type, 'succeeded');
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    logger.error('Webhook event processing failed', {
      type: stripeEvent.type,
      eventId: stripeEvent.id,
      error: error.message,
    });

    // 一時的障害 → 500 で Stripe にリトライを許可
    if (isTransientError(error)) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Temporary failure, please retry' }) };
    }

    // 回復不能なエラー → 200 を返し Stripe のリトライを停止、エラーを記録
    await markEventProcessed(stripeEvent.id, stripeEvent.type, 'failed', error.message);
    return { statusCode: 200, body: JSON.stringify({ received: true, error: 'Event processing failed' }) };
  }
};

/**
 * Stripe イベントを処理する
 * @param {Object} stripeEvent
 */
const handleStripeEvent = async (stripeEvent) => {
  const { type, data } = stripeEvent;
  logger.info('Processing Stripe event', { type, eventId: stripeEvent.id });

  switch (type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(data.object);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(data.object);
      break;

    default:
      logger.info('Unhandled Stripe event type', { type });
  }
};

/**
 * checkout.session.completed — サブスクリプション有効化
 */
const handleCheckoutCompleted = async (session) => {
  const userId = session.metadata?.userId;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!userId || !subscriptionId) {
    logger.warn('Checkout session missing userId or subscriptionId', { sessionId: session.id });
    return;
  }

  const now = new Date().toISOString();

  await docClient.send(new PutCommand({
    TableName: SUBSCRIPTIONS_TABLE,
    Item: {
      subscriptionId,
      userId,
      stripeCustomerId: customerId,
      status: 'active',
      planType: PLAN_TYPES.STANDARD,
      createdAt: now,
      updatedAt: now,
    },
  }));

  await updateUserPlan(userId, PLAN_TYPES.STANDARD);
  logger.info('Subscription activated via checkout', { userId, subscriptionId });
};

/**
 * customer.subscription.updated — プラン変更反映
 */
const handleSubscriptionUpdated = async (subscription) => {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    const user = await getUserByStripeCustomerId(subscription.customer);
    if (!user) {
      logger.warn('Cannot find user for subscription update', { subscriptionId: subscription.id });
      return;
    }
    await syncSubscriptionState(user.userId, subscription);
    return;
  }

  await syncSubscriptionState(userId, subscription);
};

/**
 * customer.subscription.deleted — Free 降格
 */
const handleSubscriptionDeleted = async (subscription) => {
  const userId = subscription.metadata?.userId;
  let targetUserId = userId;

  if (!targetUserId) {
    const user = await getUserByStripeCustomerId(subscription.customer);
    if (!user) {
      logger.warn('Cannot find user for subscription deletion', { subscriptionId: subscription.id });
      return;
    }
    targetUserId = user.userId;
  }

  const now = new Date().toISOString();

  await docClient.send(new UpdateCommand({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { subscriptionId: subscription.id },
    UpdateExpression: 'SET #status = :status, #updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':status': 'canceled', ':now': now },
  }));

  await updateUserPlan(targetUserId, PLAN_TYPES.FREE);
  logger.info('Subscription deleted, downgraded to free', { userId: targetUserId, subscriptionId: subscription.id });
};

/**
 * invoice.payment_succeeded — 更新確認
 */
const handlePaymentSucceeded = async (invoice) => {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { subscriptionId },
    UpdateExpression: 'SET #status = :status, lastPaymentAt = :now, #updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':status': 'active', ':now': now },
  }));

  logger.info('Payment succeeded', { subscriptionId, invoiceId: invoice.id });
};

/**
 * invoice.payment_failed — past_due 設定
 */
const handlePaymentFailed = async (invoice) => {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { subscriptionId },
    UpdateExpression: 'SET #status = :status, #updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':status': 'past_due', ':now': now },
  }));

  logger.warn('Payment failed', { subscriptionId, invoiceId: invoice.id });
};

/**
 * サブスクリプション状態を同期
 */
const syncSubscriptionState = async (userId, subscription) => {
  const now = new Date().toISOString();
  const status = subscription.status;

  await docClient.send(new UpdateCommand({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { subscriptionId: subscription.id },
    UpdateExpression: 'SET #status = :status, userId = :uid, #updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':status': status, ':uid': userId, ':now': now },
  }));

  const planType = status === 'active' ? PLAN_TYPES.STANDARD : PLAN_TYPES.FREE;
  await updateUserPlan(userId, planType);
  logger.info('Subscription state synced', { userId, subscriptionId: subscription.id, status, planType });
};
