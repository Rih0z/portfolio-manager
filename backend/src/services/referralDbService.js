'use strict';

const { GetCommand, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { getDynamoDb } = require('../utils/awsConfig');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const REFERRALS_TABLE = process.env.REFERRALS_TABLE || 'pfwise-api-dev-referrals';
const REFERRAL_EVENTS_TABLE = process.env.REFERRAL_EVENTS_TABLE || 'pfwise-api-dev-referral-events';

/**
 * 8文字のリファラルコードを生成する
 * @returns {string} 英数字のリファラルコード
 */
const generateReferralCode = () =>
  Math.random().toString(36).toUpperCase().slice(2, 10);

/**
 * ユーザーのリファラルコードを取得または新規作成する
 * userId-index でまず検索し、存在しなければ新規作成する
 *
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} リファラルコード情報
 */
const getOrCreateReferralCode = async (userId) => {
  const db = getDynamoDb();

  // userId-index で既存のコードを検索
  const queryCommand = new QueryCommand({
    TableName: REFERRALS_TABLE,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
  });

  const result = await withRetry(() => db.send(queryCommand));

  if (result.Items && result.Items.length > 0) {
    return result.Items[0];
  }

  // 新しいリファラルコードを生成
  const referralCode = generateReferralCode();
  const now = new Date().toISOString();

  const item = {
    referralCode,
    userId,
    createdAt: now,
    totalReferrals: 0,
    successfulConversions: 0,
    rewardMonths: 0,
  };

  const putCommand = new PutCommand({
    TableName: REFERRALS_TABLE,
    Item: item,
    ConditionExpression: 'attribute_not_exists(referralCode)',
  });

  await withRetry(() => db.send(putCommand));
  logger.info(`Referral code created: ${referralCode} for user ${userId}`);
  return item;
};

/**
 * リファラルコードでリファラル情報を取得する
 *
 * @param {string} code - リファラルコード
 * @returns {Promise<Object|null>} リファラル情報
 */
const getReferralByCode = async (code) => {
  const db = getDynamoDb();

  const command = new GetCommand({
    TableName: REFERRALS_TABLE,
    Key: { referralCode: code },
  });

  const result = await withRetry(() => db.send(command));
  return result.Item || null;
};

/**
 * ユーザーのリファラル統計を取得する
 *
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} リファラル統計
 */
const getReferralStats = async (userId) => {
  const db = getDynamoDb();

  // userId-index でリファラルコードを取得
  const queryCommand = new QueryCommand({
    TableName: REFERRALS_TABLE,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
  });

  const result = await withRetry(() => db.send(queryCommand));

  if (!result.Items || result.Items.length === 0) {
    return {
      totalReferrals: 0,
      successfulConversions: 0,
      rewardMonths: 0,
      maxRewardMonths: 12,
    };
  }

  const referral = result.Items[0];

  // イベントテーブルからイベント数をカウント
  const eventsCommand = new QueryCommand({
    TableName: REFERRAL_EVENTS_TABLE,
    KeyConditionExpression: 'referralCode = :code',
    ExpressionAttributeValues: { ':code': referral.referralCode },
  });

  const eventsResult = await withRetry(() => db.send(eventsCommand));
  const events = eventsResult.Items || [];

  const totalReferrals = events.length;
  const successfulConversions = events.filter(
    (e) => e.eventType === 'conversion'
  ).length;
  // 1コンバージョン = 1ヶ月無料、最大12ヶ月
  const rewardMonths = Math.min(successfulConversions, 12);

  return {
    totalReferrals,
    successfulConversions,
    rewardMonths,
    maxRewardMonths: 12,
  };
};

/**
 * リファラルイベントを作成する
 *
 * @param {string} referralCode - リファラルコード
 * @param {Object} params - イベントパラメータ
 * @param {string} params.refereeUserId - 紹介されたユーザーID
 * @param {string} params.eventType - イベントタイプ（'signup' | 'conversion'）
 * @returns {Promise<Object>} 作成されたイベント
 */
const createReferralEvent = async (referralCode, { refereeUserId, eventType }) => {
  const db = getDynamoDb();
  const now = new Date().toISOString();
  const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const item = {
    referralCode,
    eventId,
    refereeUserId,
    eventType,
    createdAt: now,
  };

  const putCommand = new PutCommand({
    TableName: REFERRAL_EVENTS_TABLE,
    Item: item,
  });

  await withRetry(() => db.send(putCommand));
  logger.info(
    `Referral event created: ${eventId} (type: ${eventType}) for code ${referralCode}`
  );
  return item;
};

/**
 * ユーザーが既にリファラルコードを適用済みか確認する
 * referral-events テーブルから refereeUserId で検索
 *
 * @param {string} referralCode - リファラルコード
 * @param {string} userId - 被紹介者のユーザーID
 * @returns {Promise<boolean>} 適用済みなら true
 */
const hasUserAppliedCode = async (referralCode, userId) => {
  const db = getDynamoDb();

  const command = new QueryCommand({
    TableName: REFERRAL_EVENTS_TABLE,
    KeyConditionExpression: 'referralCode = :code',
    FilterExpression: 'refereeUserId = :uid',
    ExpressionAttributeValues: {
      ':code': referralCode,
      ':uid': userId,
    },
    Limit: 1,
  });

  const result = await withRetry(() => db.send(command));
  return (result.Items && result.Items.length > 0);
};

/**
 * リファラルレコードの totalReferrals をインクリメントする
 *
 * @param {string} referralCode - リファラルコード
 * @returns {Promise<void>}
 */
const incrementReferralCount = async (referralCode) => {
  const db = getDynamoDb();

  const command = new UpdateCommand({
    TableName: REFERRALS_TABLE,
    Key: { referralCode },
    UpdateExpression: 'SET totalReferrals = if_not_exists(totalReferrals, :zero) + :one',
    ExpressionAttributeValues: {
      ':zero': 0,
      ':one': 1,
    },
  });

  await withRetry(() => db.send(command));
};

/**
 * リファラルコードが有効かどうかを検証する
 *
 * @param {string} code - リファラルコード
 * @returns {Promise<boolean>} 有効であれば true
 */
const validateCode = async (code) => {
  const referral = await getReferralByCode(code);
  return !!referral;
};

module.exports = {
  getOrCreateReferralCode,
  getReferralByCode,
  getReferralStats,
  createReferralEvent,
  hasUserAppliedCode,
  incrementReferralCount,
  validateCode,
  // テスト用エクスポート
  REFERRALS_TABLE,
  REFERRAL_EVENTS_TABLE,
};
