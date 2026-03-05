/**
 * Stripe Webhook ハンドラー
 *
 * Stripe からのイベント通知を受信し、サブスクリプション状態を
 * DynamoDB に同期する。署名検証により改ざんを防止。
 *
 * @file src/function/stripe/webhook.js
 */
'use strict';

const { verifyWebhookSignature } = require('../../services/stripeService');
const { updateUserPlan, getUserByStripeCustomerId } = require('../../services/userService');
const { PLAN_TYPES } = require('../../config/planLimits');
const logger = require('../../utils/logger');

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-west-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE || 'pfwise-api-dev-subscriptions';

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
    // API Gateway はデフォルトで body を文字列として渡す
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    stripeEvent = await verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    logger.error('Webhook signature verification failed', { error: error.message });
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  try {
    await handleStripeEvent(stripeEvent);
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    logger.error('Webhook event processing failed', { type: stripeEvent.type, error: error.message });
    return { statusCode: 500, body: JSON.stringify({ error: 'Event processing failed' }) };
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

  // Subscriptions テーブルにレコード作成
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

  // ユーザーのプランを Standard に更新
  await updateUserPlan(userId, PLAN_TYPES.STANDARD);
  logger.info('Subscription activated via checkout', { userId, subscriptionId });
};

/**
 * customer.subscription.updated — プラン変更反映
 */
const handleSubscriptionUpdated = async (subscription) => {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    // metadata がない場合は customerId から逆引き
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

  // Subscriptions テーブル更新
  await docClient.send(new UpdateCommand({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { subscriptionId: subscription.id },
    UpdateExpression: 'SET #status = :status, #updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':status': 'canceled', ':now': now },
  }));

  // Free プランに降格
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
  const status = subscription.status; // active, past_due, canceled, etc.

  await docClient.send(new UpdateCommand({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { subscriptionId: subscription.id },
    UpdateExpression: 'SET #status = :status, userId = :uid, #updatedAt = :now',
    ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':status': status, ':uid': userId, ':now': now },
  }));

  // active なら Standard、それ以外なら Free
  const planType = status === 'active' ? PLAN_TYPES.STANDARD : PLAN_TYPES.FREE;
  await updateUserPlan(userId, planType);
  logger.info('Subscription state synced', { userId, subscriptionId: subscription.id, status, planType });
};
