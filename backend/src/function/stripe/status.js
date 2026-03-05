/**
 * サブスクリプションステータス取得ハンドラー
 *
 * GET /v1/subscription/status
 * 認証済みユーザーの現在のプラン・サブスクリプション状態を返す。
 *
 * @file src/function/stripe/status.js
 */
'use strict';

const { formatResponse, formatErrorResponse } = require('../../utils/responseUtils');
const { getCorsHeaders } = require('../../utils/corsHeaders');
const { verifyAccessToken } = require('../../utils/jwtUtils');
const { getUserById } = require('../../services/userService');
const { PLAN_TYPES, getPlanLimits } = require('../../config/planLimits');
const logger = require('../../utils/logger');

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-west-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE || 'pfwise-api-dev-subscriptions';

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
    const planType = user?.planType || PLAN_TYPES.FREE;
    const limits = getPlanLimits(planType);

    // アクティブなサブスクリプションを検索
    let subscription = null;
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: SUBSCRIPTIONS_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false,
        Limit: 1,
      }));
      subscription = result.Items?.[0] || null;
    } catch (queryError) {
      logger.warn('Subscription query failed', { userId, error: queryError.message });
    }

    return formatResponse({
      statusCode: 200,
      data: {
        planType,
        limits,
        subscription: subscription ? {
          id: subscription.subscriptionId,
          status: subscription.status,
          createdAt: subscription.createdAt,
          lastPaymentAt: subscription.lastPaymentAt,
        } : null,
        hasStripeCustomer: !!user?.stripeCustomerId,
      },
      event,
      skipBudgetWarning: true,
    });
  } catch (error) {
    logger.error('Subscription status fetch failed', { error: error.message });

    if (error.message?.includes('token')) {
      return formatErrorResponse({ statusCode: 401, code: 'UNAUTHORIZED', message: '認証トークンが無効です', event });
    }

    return formatErrorResponse({ statusCode: 500, code: 'STATUS_ERROR', message: 'ステータス取得に失敗しました', event });
  }
};
