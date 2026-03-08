/**
 * ユーザーサービス
 *
 * DynamoDB UsersTable を操作し、ユーザーの CRUD とプラン管理を提供する。
 * Google ログイン時に getOrCreateUser でユーザーレコードを確保し、
 * Stripe 連携時に stripeCustomerId を紐付ける。
 *
 * @file src/services/userService.js
 */
'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');
const { PLAN_TYPES } = require('../config/planLimits');
const logger = require('../utils/logger');

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-west-2',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE || 'pfwise-api-dev-users';

/**
 * デフォルトで Standard プランを付与するメールアドレス（管理者・テスト用）
 */
const PREMIUM_DEFAULT_EMAILS = [
  'riho.dare@gmail.com',
];

/**
 * メールアドレスに基づいて初期プランタイプを決定する
 * @param {string} email
 * @returns {string}
 */
const getInitialPlanType = (email) => {
  return PREMIUM_DEFAULT_EMAILS.includes(email)
    ? PLAN_TYPES.STANDARD
    : PLAN_TYPES.FREE;
};

/**
 * ユーザーを取得、存在しなければ作成する
 * Google ログイン時に呼び出される
 *
 * @param {Object} params
 * @param {string} params.userId - Google sub (一意ID)
 * @param {string} params.email
 * @param {string} params.name
 * @param {string} params.picture
 * @returns {Promise<Object>} ユーザーレコード
 */
const getOrCreateUser = async ({ userId, email, name, picture }) => {
  // 既存ユーザーを検索
  const existing = await getUserById(userId);
  if (existing) {
    // Premium デフォルトユーザーが Free のままの場合、自動昇格
    const shouldUpgrade = PREMIUM_DEFAULT_EMAILS.includes(email)
      && existing.planType === PLAN_TYPES.FREE;

    const now = new Date().toISOString();
    const updateExpression = shouldUpgrade
      ? 'SET #lastLoginAt = :now, #name = :name, #picture = :picture, #updatedAt = :now, #planType = :planType'
      : 'SET #lastLoginAt = :now, #name = :name, #picture = :picture, #updatedAt = :now';

    const expressionNames = {
      '#lastLoginAt': 'lastLoginAt',
      '#name': 'name',
      '#picture': 'picture',
      '#updatedAt': 'updatedAt',
      ...(shouldUpgrade && { '#planType': 'planType' }),
    };
    const expressionValues = {
      ':now': now,
      ':name': name,
      ':picture': picture,
      ...(shouldUpgrade && { ':planType': PLAN_TYPES.STANDARD }),
    };

    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    }));

    const updatedPlan = shouldUpgrade ? PLAN_TYPES.STANDARD : existing.planType;
    if (shouldUpgrade) {
      logger.info('Premium default user auto-upgraded', { userId, email, planType: PLAN_TYPES.STANDARD });
    }
    return { ...existing, lastLoginAt: now, name, picture, planType: updatedPlan };
  }

  // 新規ユーザー作成
  const now = new Date().toISOString();
  const initialPlanType = getInitialPlanType(email);
  const newUser = {
    userId,
    email,
    name,
    picture,
    planType: initialPlanType,
    stripeCustomerId: '',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: newUser,
    ConditionExpression: 'attribute_not_exists(userId)',
  }));

  logger.info('New user created', { userId, email, planType: initialPlanType });
  return newUser;
};

/**
 * ユーザーをIDで取得
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const getUserById = async (userId) => {
  const result = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));
  return result.Item || null;
};

/**
 * ユーザーをメールで取得
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
const getUserByEmail = async (email) => {
  const result = await docClient.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
    Limit: 1,
  }));
  return result.Items?.[0] || null;
};

/**
 * Stripe Customer ID でユーザーを取得
 * @param {string} stripeCustomerId
 * @returns {Promise<Object|null>}
 */
const getUserByStripeCustomerId = async (stripeCustomerId) => {
  const result = await docClient.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'stripeCustomerId-index',
    KeyConditionExpression: 'stripeCustomerId = :sid',
    ExpressionAttributeValues: { ':sid': stripeCustomerId },
    Limit: 1,
  }));
  return result.Items?.[0] || null;
};

/**
 * ユーザーのプランタイプを更新
 * @param {string} userId
 * @param {string} planType
 * @returns {Promise<void>}
 */
const updateUserPlan = async (userId, planType) => {
  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET planType = :plan, updatedAt = :now',
    ExpressionAttributeValues: {
      ':plan': planType,
      ':now': now,
    },
  }));
  logger.info('User plan updated', { userId, planType });
};

/**
 * ユーザーの planType を取得
 * @param {string} userId
 * @returns {Promise<string>}
 */
const getUserPlanType = async (userId) => {
  const user = await getUserById(userId);
  return user?.planType || PLAN_TYPES.FREE;
};

/**
 * Stripe Customer ID を紐付け
 * @param {string} userId
 * @param {string} stripeCustomerId
 * @returns {Promise<void>}
 */
const updateStripeCustomerId = async (userId, stripeCustomerId) => {
  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET stripeCustomerId = :sid, updatedAt = :now',
    ExpressionAttributeValues: {
      ':sid': stripeCustomerId,
      ':now': now,
    },
  }));
};

module.exports = {
  getOrCreateUser,
  getUserById,
  getUserByEmail,
  getUserByStripeCustomerId,
  updateUserPlan,
  getUserPlanType,
  updateStripeCustomerId,
};
