'use strict';

const { GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { getDynamoDb } = require('../utils/awsConfig');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || 'pfwise-api-dev-notifications';
const ALERT_RULES_TABLE = process.env.ALERT_RULES_TABLE || 'pfwise-api-dev-alert-rules';

/**
 * 簡易ユニークID生成（外部依存なし）
 * @returns {string}
 */
const generateId = () => Math.random().toString(36).slice(2, 8);

// ========================================
// 通知 (Notifications)
// ========================================

/**
 * ユーザーの通知一覧を取得する（新しい順）
 * @param {string} userId
 * @param {Object} options - { limit, lastKey }
 * @param {number} options.limit - 取得件数（デフォルト: 20）
 * @param {Object|null} options.lastKey - ページネーション用の排他開始キー
 * @returns {Promise<{ items: Array, lastKey: Object|null }>}
 */
const getNotifications = async (userId, { limit = 20, lastKey = null } = {}) => {
  const db = getDynamoDb();

  const params = {
    TableName: NOTIFICATIONS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false, // 新しい順
    Limit: limit
  };

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  const command = new QueryCommand(params);
  const result = await withRetry(() => db.send(command));

  return {
    items: result.Items || [],
    lastKey: result.LastEvaluatedKey || null
  };
};

/**
 * 通知を作成する
 * @param {string} userId
 * @param {Object} data - { type, title, message, metadata }
 * @param {string} data.type - 通知タイプ（例: 'price_alert', 'system', 'portfolio'）
 * @param {string} data.title - 通知タイトル
 * @param {string} data.message - 通知メッセージ
 * @param {Object} [data.metadata] - 追加メタデータ
 * @returns {Promise<Object>} 作成された通知
 */
const createNotification = async (userId, { type, title, message, metadata = {} }) => {
  const db = getDynamoDb();
  const now = new Date();
  const notificationId = `notif-${Date.now()}-${generateId()}`;

  // TTL: 90日後
  const ttl = Math.floor(now.getTime() / 1000) + (90 * 24 * 60 * 60);

  const item = {
    userId,
    notificationId,
    type,
    title,
    message,
    metadata,
    read: false,
    createdAt: now.toISOString(),
    ttl
  };

  const command = new PutCommand({
    TableName: NOTIFICATIONS_TABLE,
    Item: item
  });

  await withRetry(() => db.send(command));
  logger.info(`Notification created: ${notificationId} for user ${userId}`);
  return item;
};

/**
 * 通知を既読にする
 * @param {string} userId
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
const markNotificationRead = async (userId, notificationId) => {
  const db = getDynamoDb();

  const command = new UpdateCommand({
    TableName: NOTIFICATIONS_TABLE,
    Key: { userId, notificationId },
    UpdateExpression: 'SET #r = :val',
    ExpressionAttributeNames: { '#r': 'read' },
    ExpressionAttributeValues: { ':val': true },
    ConditionExpression: 'attribute_exists(userId)'
  });

  await withRetry(() => db.send(command));
};

/**
 * ユーザーの全未読通知を既読にする
 * @param {string} userId
 * @returns {Promise<number>} 既読にした件数
 */
const markAllRead = async (userId) => {
  const db = getDynamoDb();

  // 未読通知を取得
  const queryCommand = new QueryCommand({
    TableName: NOTIFICATIONS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    FilterExpression: '#r = :unread',
    ExpressionAttributeNames: { '#r': 'read' },
    ExpressionAttributeValues: {
      ':uid': userId,
      ':unread': false
    }
  });

  const result = await withRetry(() => db.send(queryCommand));
  const unreadItems = result.Items || [];

  if (unreadItems.length === 0) {
    return 0;
  }

  // 各未読通知を既読に更新
  const updatePromises = unreadItems.map((item) => {
    const updateCommand = new UpdateCommand({
      TableName: NOTIFICATIONS_TABLE,
      Key: { userId, notificationId: item.notificationId },
      UpdateExpression: 'SET #r = :val',
      ExpressionAttributeNames: { '#r': 'read' },
      ExpressionAttributeValues: { ':val': true }
    });
    return withRetry(() => db.send(updateCommand));
  });

  await Promise.all(updatePromises);
  logger.info(`Marked ${unreadItems.length} notifications as read for user ${userId}`);
  return unreadItems.length;
};

/**
 * 通知を削除する
 * @param {string} userId
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
const deleteNotification = async (userId, notificationId) => {
  const db = getDynamoDb();

  const command = new DeleteCommand({
    TableName: NOTIFICATIONS_TABLE,
    Key: { userId, notificationId },
    ConditionExpression: 'attribute_exists(userId)'
  });

  await withRetry(() => db.send(command));
  logger.info(`Notification deleted: ${notificationId} for user ${userId}`);
};

// ========================================
// アラートルール (Alert Rules)
// ========================================

/**
 * ユーザーのアラートルール一覧を取得する
 * @param {string} userId
 * @returns {Promise<Array>}
 */
const getAlertRules = async (userId) => {
  const db = getDynamoDb();

  const command = new QueryCommand({
    TableName: ALERT_RULES_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId }
  });

  const result = await withRetry(() => db.send(command));
  return result.Items || [];
};

/**
 * アラートルールを作成する
 * @param {string} userId
 * @param {Object} data - { type, ticker, targetValue, enabled }
 * @param {string} data.type - ルールタイプ（例: 'price_above', 'price_below', 'percent_change'）
 * @param {string} data.ticker - 銘柄ティッカー
 * @param {number} data.targetValue - ターゲット値
 * @param {boolean} [data.enabled=true] - 有効/無効
 * @returns {Promise<Object>} 作成されたルール
 */
const createAlertRule = async (userId, { type, ticker, targetValue, enabled = true }) => {
  const db = getDynamoDb();
  const now = new Date().toISOString();
  const ruleId = `rule-${Date.now()}-${generateId()}`;

  const item = {
    userId,
    ruleId,
    type,
    ticker,
    targetValue,
    enabled,
    createdAt: now,
    updatedAt: now
  };

  const command = new PutCommand({
    TableName: ALERT_RULES_TABLE,
    Item: item
  });

  await withRetry(() => db.send(command));
  logger.info(`Alert rule created: ${ruleId} for user ${userId}`);
  return item;
};

/**
 * アラートルールを更新する
 * @param {string} userId
 * @param {string} ruleId
 * @param {Object} updates - 更新するフィールド
 * @returns {Promise<Object>} 更新結果
 */
const updateAlertRule = async (userId, ruleId, updates) => {
  const db = getDynamoDb();

  // 許可するフィールドのみ更新
  const allowedFields = ['type', 'ticker', 'targetValue', 'enabled'];
  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  // updatedAt を自動追加
  filteredUpdates.updatedAt = new Date().toISOString();

  // UpdateExpression を動的に構築
  const expressionParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.entries(filteredUpdates).forEach(([key, value], index) => {
    const attrName = `#f${index}`;
    const attrValue = `:v${index}`;
    expressionParts.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = value;
  });

  const command = new UpdateCommand({
    TableName: ALERT_RULES_TABLE,
    Key: { userId, ruleId },
    UpdateExpression: `SET ${expressionParts.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: 'attribute_exists(userId)',
    ReturnValues: 'ALL_NEW'
  });

  const result = await withRetry(() => db.send(command));
  logger.info(`Alert rule updated: ${ruleId} for user ${userId}`);
  return result.Attributes;
};

/**
 * アラートルールを削除する
 * @param {string} userId
 * @param {string} ruleId
 * @returns {Promise<void>}
 */
const deleteAlertRule = async (userId, ruleId) => {
  const db = getDynamoDb();

  const command = new DeleteCommand({
    TableName: ALERT_RULES_TABLE,
    Key: { userId, ruleId },
    ConditionExpression: 'attribute_exists(userId)'
  });

  await withRetry(() => db.send(command));
  logger.info(`Alert rule deleted: ${ruleId} for user ${userId}`);
};

module.exports = {
  // Notifications
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  // Alert Rules
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  // Tables (for testing)
  NOTIFICATIONS_TABLE,
  ALERT_RULES_TABLE
};
