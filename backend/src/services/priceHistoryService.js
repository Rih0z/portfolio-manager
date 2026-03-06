'use strict';

const { PutCommand, QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { getDynamoDb } = require('../utils/awsConfig');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const PRICE_HISTORY_TABLE = process.env.PRICE_HISTORY_TABLE || 'pfwise-api-dev-price-history';
const TWO_YEARS_IN_SECONDS = 2 * 365 * 24 * 60 * 60;
const BATCH_WRITE_CHUNK_SIZE = 25;

/**
 * 日次価格データを一括書込する
 * @param {Array<{ticker: string, date: string, close: number, source: string, currency: string, isUserInput?: boolean}>} items
 * @returns {Promise<{written: number, failed: number}>}
 */
const putDailyPrices = async (items) => {
  if (!items || items.length === 0) {
    return { written: 0, failed: 0 };
  }

  const db = getDynamoDb();
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + TWO_YEARS_IN_SECONDS;
  let written = 0;
  let failed = 0;

  // 25件ずつチャンク分割してBatchWrite
  for (let i = 0; i < items.length; i += BATCH_WRITE_CHUNK_SIZE) {
    const chunk = items.slice(i, i + BATCH_WRITE_CHUNK_SIZE);
    const requestItems = chunk.map(item => ({
      PutRequest: {
        Item: {
          ticker: item.ticker,
          date: item.date,
          close: item.close,
          source: item.source,
          currency: item.currency,
          isUserInput: item.isUserInput || false,
          ttl,
          createdAt: new Date().toISOString()
        }
      }
    }));

    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [PRICE_HISTORY_TABLE]: requestItems
        }
      });
      const result = await withRetry(() => db.send(command), { maxRetries: 2 });

      // 未処理アイテムのリトライ
      const unprocessed = result.UnprocessedItems?.[PRICE_HISTORY_TABLE];
      if (unprocessed && unprocessed.length > 0) {
        logger.warn(`BatchWrite: ${unprocessed.length} unprocessed items, retrying`);
        const retryCommand = new BatchWriteCommand({
          RequestItems: { [PRICE_HISTORY_TABLE]: unprocessed }
        });
        await withRetry(() => db.send(retryCommand), { maxRetries: 1 });
      }

      written += chunk.length;
    } catch (error) {
      logger.error(`BatchWrite failed for chunk starting at index ${i}:`, error.message);
      failed += chunk.length;
    }
  }

  return { written, failed };
};

/**
 * 指定ティッカーの日付範囲の価格データを取得する
 * @param {string} ticker
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<Array<{date: string, close: number, source: string, currency: string}>>}
 */
const getPriceRange = async (ticker, startDate, endDate) => {
  const db = getDynamoDb();
  const command = new QueryCommand({
    TableName: PRICE_HISTORY_TABLE,
    KeyConditionExpression: 'ticker = :t AND #d BETWEEN :s AND :e',
    ExpressionAttributeNames: { '#d': 'date', '#src': 'source' },
    ExpressionAttributeValues: {
      ':t': ticker,
      ':s': startDate,
      ':e': endDate
    },
    ProjectionExpression: '#d, close, #src, currency'
  });

  const result = await withRetry(() => db.send(command));
  return result.Items || [];
};

/**
 * 指定ティッカーの最新価格データを取得する
 * @param {string} ticker
 * @returns {Promise<{date: string, close: number, source: string, currency: string}|null>}
 */
const getLatestPrice = async (ticker) => {
  const db = getDynamoDb();
  const command = new QueryCommand({
    TableName: PRICE_HISTORY_TABLE,
    KeyConditionExpression: 'ticker = :t',
    ExpressionAttributeNames: { '#d': 'date', '#src': 'source' },
    ExpressionAttributeValues: { ':t': ticker },
    ProjectionExpression: '#d, close, #src, currency',
    ScanIndexForward: false,
    Limit: 1
  });

  const result = await withRetry(() => db.send(command));
  return result.Items?.[0] || null;
};

module.exports = {
  putDailyPrices,
  getPriceRange,
  getLatestPrice,
  PRICE_HISTORY_TABLE
};
