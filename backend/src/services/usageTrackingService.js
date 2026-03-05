/**
 * 使用量追跡サービス
 *
 * DynamoDB UsageTable を操作し、プラン別の使用量制限チェックを提供する。
 * PK=userId, SK=date (例: "2026-03-05") でカウントを管理。
 * TTL: 90日で自動削除。
 *
 * @file src/services/usageTrackingService.js
 */
'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');
const { USAGE_TYPES, getUsageLimit } = require('../config/planLimits');
const logger = require('../utils/logger');

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-west-2',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USAGE_TABLE = process.env.USAGE_TABLE || 'pfwise-api-dev-usage';
const TTL_DAYS = 90;

/**
 * 日付文字列を生成 (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * 月キーを生成 (YYYY-MM)
 * @param {Date} date
 * @returns {string}
 */
const formatMonth = (date) => {
  return date.toISOString().slice(0, 7);
};

/**
 * 使用量を記録する
 *
 * @param {string} userId
 * @param {string} usageType - USAGE_TYPES のいずれか
 * @param {number} count - 増分 (デフォルト 1)
 * @returns {Promise<Object>} 更新後の使用量
 */
const recordUsage = async (userId, usageType, count = 1) => {
  const now = new Date();
  const dateKey = formatDate(now);
  const ttl = Math.floor(now.getTime() / 1000) + (TTL_DAYS * 24 * 60 * 60);
  const fieldName = `${usageType}Count`;

  try {
    const result = await docClient.send(new UpdateCommand({
      TableName: USAGE_TABLE,
      Key: { userId, date: dateKey },
      UpdateExpression: `ADD #field :inc SET #ttl = :ttl, #updatedAt = :now`,
      ExpressionAttributeNames: {
        '#field': fieldName,
        '#ttl': 'ttl',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':inc': count,
        ':ttl': ttl,
        ':now': now.toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));

    return result.Attributes;
  } catch (error) {
    logger.error('Failed to record usage', { userId, usageType, error: error.message });
    throw error;
  }
};

/**
 * 日次使用量を取得
 *
 * @param {string} userId
 * @param {string} usageType
 * @param {Date} date
 * @returns {Promise<number>}
 */
const getDailyUsage = async (userId, usageType, date = new Date()) => {
  const dateKey = formatDate(date);
  const fieldName = `${usageType}Count`;

  try {
    const result = await docClient.send(new GetCommand({
      TableName: USAGE_TABLE,
      Key: { userId, date: dateKey },
    }));

    return result.Item?.[fieldName] || 0;
  } catch (error) {
    logger.error('Failed to get daily usage', { userId, usageType, error: error.message });
    return 0;
  }
};

/**
 * 月次使用量を取得
 * 当月の全日レコードを集計する
 *
 * @param {string} userId
 * @param {string} usageType
 * @param {Date} date
 * @returns {Promise<number>}
 */
const getMonthlyUsage = async (userId, usageType, date = new Date()) => {
  const monthPrefix = formatMonth(date);
  const fieldName = `${usageType}Count`;
  let total = 0;

  // 月初から今日まで日別に取得（最大31回、Scanより効率的）
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = date.getDate();

  const promises = [];
  for (let day = 1; day <= Math.min(daysInMonth, today); day++) {
    const d = new Date(year, month, day);
    const dateKey = formatDate(d);
    promises.push(
      docClient.send(new GetCommand({
        TableName: USAGE_TABLE,
        Key: { userId, date: dateKey },
      })).then(result => result.Item?.[fieldName] || 0)
        .catch(() => 0)
    );
  }

  const counts = await Promise.all(promises);
  total = counts.reduce((sum, c) => sum + c, 0);
  return total;
};

/**
 * 使用量制限チェック
 *
 * @param {string} userId
 * @param {string} planType
 * @param {string} usageType - USAGE_TYPES のいずれか
 * @returns {Promise<Object>} { allowed, current, limit, remaining }
 */
const checkUsageLimit = async (userId, planType, usageType) => {
  const limitConfig = getUsageLimit(planType, usageType);

  if (!limitConfig) {
    return { allowed: true, current: 0, limit: Infinity, remaining: Infinity };
  }

  // daily 制限
  if (limitConfig.daily !== undefined) {
    const limit = limitConfig.daily;
    if (limit === Infinity) {
      return { allowed: true, current: 0, limit: Infinity, remaining: Infinity };
    }
    const current = await getDailyUsage(userId, usageType);
    return {
      allowed: current < limit,
      current,
      limit,
      remaining: Math.max(0, limit - current),
    };
  }

  // monthly 制限
  if (limitConfig.monthly !== undefined) {
    const limit = limitConfig.monthly;
    if (limit === Infinity) {
      return { allowed: true, current: 0, limit: Infinity, remaining: Infinity };
    }
    const current = await getMonthlyUsage(userId, usageType);
    return {
      allowed: current < limit,
      current,
      limit,
      remaining: Math.max(0, limit - current),
    };
  }

  return { allowed: true, current: 0, limit: Infinity, remaining: Infinity };
};

module.exports = {
  recordUsage,
  getDailyUsage,
  getMonthlyUsage,
  checkUsageLimit,
};
