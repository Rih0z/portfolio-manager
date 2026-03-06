'use strict';

const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { getDynamoDb } = require('../utils/awsConfig');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const PORTFOLIOS_TABLE = process.env.PORTFOLIOS_TABLE || 'pfwise-api-dev-portfolios';

/**
 * ユーザーのポートフォリオをDynamoDBから取得する
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
const getPortfolio = async (userId) => {
  const db = getDynamoDb();
  const command = new GetCommand({
    TableName: PORTFOLIOS_TABLE,
    Key: { userId }
  });

  const result = await withRetry(() => db.send(command));
  return result.Item || null;
};

/**
 * ユーザーのポートフォリオをDynamoDBに保存する（Optimistic Locking付き）
 * @param {string} userId
 * @param {Object} data - { currentAssets, targetPortfolio, baseCurrency, exchangeRate, additionalBudget, aiPromptTemplate }
 * @param {number|null} expectedVersion - 既存データのバージョン（新規の場合はnull）
 * @returns {Promise<Object>} 保存されたデータ（新しいversion付き）
 * @throws {Error} VERSION_CONFLICT: バージョン不一致
 */
const savePortfolio = async (userId, data, expectedVersion) => {
  const db = getDynamoDb();
  const newVersion = (expectedVersion || 0) + 1;
  const now = new Date().toISOString();

  const item = {
    userId,
    currentAssets: data.currentAssets || [],
    targetPortfolio: data.targetPortfolio || [],
    baseCurrency: data.baseCurrency || 'JPY',
    exchangeRate: data.exchangeRate || null,
    additionalBudget: data.additionalBudget || null,
    aiPromptTemplate: data.aiPromptTemplate || null,
    version: newVersion,
    updatedAt: now
  };

  const params = {
    TableName: PORTFOLIOS_TABLE,
    Item: item
  };

  // Optimistic Locking: バージョンチェック
  if (expectedVersion !== null && expectedVersion !== undefined) {
    params.ConditionExpression = '#v = :ev';
    params.ExpressionAttributeNames = { '#v': 'version' };
    params.ExpressionAttributeValues = { ':ev': expectedVersion };
  } else {
    // 新規作成: アイテムが存在しないことを確認
    params.ConditionExpression = 'attribute_not_exists(userId)';
  }

  try {
    const command = new PutCommand(params);
    await withRetry(() => db.send(command));
    return item;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // バージョン競合 — 最新のバージョンを取得して返す
      const current = await getPortfolio(userId);
      const conflictError = new Error('VERSION_CONFLICT');
      conflictError.code = 'VERSION_CONFLICT';
      conflictError.serverVersion = current?.version || null;
      throw conflictError;
    }
    throw error;
  }
};

module.exports = {
  getPortfolio,
  savePortfolio,
  PORTFOLIOS_TABLE
};
