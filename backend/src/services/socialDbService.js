'use strict';

const { GetCommand, PutCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { getDynamoDb } = require('../utils/awsConfig');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const SHARED_PORTFOLIOS_TABLE = process.env.SHARED_PORTFOLIOS_TABLE || 'pfwise-api-dev-shared-portfolios';

/**
 * nanoid 風の 12 文字ランダム ID を生成する
 * @returns {string}
 */
const generateShareId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = require('crypto').randomBytes(12);
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

/**
 * ポートフォリオ共有レコードを作成する
 * @param {string} userId
 * @param {Object} params
 * @param {string} params.displayName - 表示名
 * @param {string} params.ageGroup - 年代 (20s, 30s, 40s, 50s, 60s+)
 * @param {Array} params.allocationSnapshot - アロケーションスナップショット
 * @param {number} params.portfolioScore - ポートフォリオスコア
 * @param {number} params.assetCount - 資産数
 * @param {number} params.ttlDays - TTL（日数）
 * @returns {Promise<Object>} 作成された共有レコード
 */
const createShare = async (userId, { displayName, ageGroup, allocationSnapshot, portfolioScore, assetCount, ttlDays = 7 }) => {
  const db = getDynamoDb();
  const shareId = generateShareId();
  const now = new Date();
  const createdAt = now.toISOString();
  const ttl = Math.floor(now.getTime() / 1000) + (ttlDays * 24 * 60 * 60);
  const expiresAt = new Date(ttl * 1000).toISOString();

  const item = {
    shareId,
    userId,
    displayName,
    ageGroup,
    allocationSnapshot,
    portfolioScore,
    assetCount,
    createdAt,
    expiresAt,
    ttl
  };

  const command = new PutCommand({
    TableName: SHARED_PORTFOLIOS_TABLE,
    Item: item
  });

  await withRetry(() => db.send(command));
  logger.info(`Share created: ${shareId} by user ${userId}`);
  return item;
};

/**
 * 共有ポートフォリオを取得する（公開アクセス）
 * @param {string} shareId
 * @returns {Promise<Object|null>}
 */
const getShare = async (shareId) => {
  const db = getDynamoDb();
  const command = new GetCommand({
    TableName: SHARED_PORTFOLIOS_TABLE,
    Key: { shareId }
  });

  const result = await withRetry(() => db.send(command));
  return result.Item || null;
};

/**
 * 共有ポートフォリオを削除する（所有者チェック付き）
 * @param {string} shareId
 * @param {string} userId - リクエスト者のユーザーID
 * @returns {Promise<boolean>} 削除成功時 true
 * @throws {Error} FORBIDDEN: 所有者でない場合
 * @throws {Error} NOT_FOUND: 共有が存在しない場合
 */
const deleteShare = async (shareId, userId) => {
  const db = getDynamoDb();

  // 所有者チェック
  const existing = await getShare(shareId);
  if (!existing) {
    const error = new Error('Share not found');
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (existing.userId !== userId) {
    const error = new Error('Not authorized to delete this share');
    error.code = 'FORBIDDEN';
    throw error;
  }

  const command = new DeleteCommand({
    TableName: SHARED_PORTFOLIOS_TABLE,
    Key: { shareId }
  });

  await withRetry(() => db.send(command));
  logger.info(`Share deleted: ${shareId} by user ${userId}`);
  return true;
};

/**
 * ユーザーの全共有を取得する
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getUserShares = async (userId) => {
  const db = getDynamoDb();
  const command = new QueryCommand({
    TableName: SHARED_PORTFOLIOS_TABLE,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: {
      ':uid': userId
    }
  });

  const result = await withRetry(() => db.send(command));
  return result.Items || [];
};

/**
 * 同年代のポートフォリオ比較データを取得する
 * @param {string} ageGroup - 年代
 * @param {number} limit - 取得上限
 * @returns {Promise<Array>}
 */
const getPeerComparison = async (ageGroup, limit = 50) => {
  const db = getDynamoDb();
  const command = new QueryCommand({
    TableName: SHARED_PORTFOLIOS_TABLE,
    IndexName: 'ageGroup-index',
    KeyConditionExpression: 'ageGroup = :ag',
    ExpressionAttributeValues: {
      ':ag': ageGroup
    },
    ScanIndexForward: false, // newest first
    Limit: limit
  });

  const result = await withRetry(() => db.send(command));
  return result.Items || [];
};

module.exports = {
  createShare,
  getShare,
  deleteShare,
  getUserShares,
  getPeerComparison,
  generateShareId,
  SHARED_PORTFOLIOS_TABLE
};
