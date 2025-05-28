/**
 * レート制限サービス
 * 
 * APIキー別、IP別のレート制限を管理し、DynamoDBで使用量を追跡する
 */
'use strict';

const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const logger = require('../utils/logger');

// DynamoDBクライアント
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-1'
});

const RATE_LIMIT_TABLE = process.env.RATE_LIMIT_TABLE || 'pfwise-api-dev-rate-limits';

// レート制限設定
const RATE_LIMITS = {
  public: {
    hourly: 20,
    daily: 100
  },
  user: {
    hourly: 100,
    daily: 1000
  },
  admin: {
    hourly: 1000,
    daily: 10000
  }
};

/**
 * レート制限をチェックする
 * @param {string} identifier - 識別子（IPアドレスまたはAPIキー）
 * @param {string} type - レート制限タイプ ('public', 'user', 'admin')
 * @param {string} window - 時間窓 ('hour', 'day')
 * @returns {Promise<Object>} {allowed: boolean, remaining: number, resetTime: Date}
 */
const checkRateLimit = async (identifier, type = 'public', window = 'hour') => {
  try {
    const now = new Date();
    const windowKey = getWindowKey(now, window);
    const key = `${identifier}:${window}:${windowKey}`;
    
    // 現在の使用量を取得
    const usage = await getUsage(key);
    const limit = RATE_LIMITS[type]?.[`${window}ly`] || RATE_LIMITS.public[`${window}ly`];
    
    const allowed = usage.count < limit;
    const remaining = Math.max(0, limit - usage.count);
    const resetTime = getResetTime(now, window);
    
    return {
      allowed,
      remaining,
      resetTime,
      limit,
      current: usage.count
    };
    
  } catch (error) {
    logger.error('Rate limit check error:', error);
    // エラー時は制限を適用
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(),
      limit: 0,
      current: 0
    };
  }
};

/**
 * 使用量を記録する
 * @param {string} identifier - 識別子
 * @param {string} type - レート制限タイプ
 * @param {string} window - 時間窓
 * @param {Object} metadata - 追加メタデータ
 */
const recordUsage = async (identifier, type = 'public', window = 'hour', metadata = {}) => {
  try {
    const now = new Date();
    const windowKey = getWindowKey(now, window);
    const key = `${identifier}:${window}:${windowKey}`;
    
    await incrementUsage(key, {
      identifier,
      type,
      window,
      timestamp: now.toISOString(),
      ...metadata
    });
    
  } catch (error) {
    logger.error('Usage recording error:', error);
    // 使用量記録エラーは処理を停止しない
  }
};

/**
 * APIキーの使用量を記録する
 * @param {string} apiKey - APIキー
 * @param {Object} metadata - リクエストメタデータ
 */
const recordApiKeyUsage = async (apiKey, metadata) => {
  const hashedKey = hashApiKey(apiKey);
  
  // 時間別と日別の両方を記録
  await Promise.all([
    recordUsage(hashedKey, metadata.keyType || 'user', 'hour', metadata),
    recordUsage(hashedKey, metadata.keyType || 'user', 'day', metadata)
  ]);
};

/**
 * 時間窓のキーを生成
 */
const getWindowKey = (date, window) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const hour = date.getHours();
  
  if (window === 'hour') {
    return `${year}-${month}-${day}-${hour}`;
  } else if (window === 'day') {
    return `${year}-${month}-${day}`;
  }
  
  throw new Error(`Unknown window: ${window}`);
};

/**
 * リセット時刻を計算
 */
const getResetTime = (date, window) => {
  const resetTime = new Date(date);
  
  if (window === 'hour') {
    resetTime.setHours(resetTime.getHours() + 1, 0, 0, 0);
  } else if (window === 'day') {
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);
  }
  
  return resetTime;
};

/**
 * 使用量を取得
 */
const getUsage = async (key) => {
  try {
    const command = new GetItemCommand({
      TableName: RATE_LIMIT_TABLE,
      Key: marshall({ id: key })
    });
    
    const response = await dynamoDBClient.send(command);
    
    if (response.Item) {
      const item = unmarshall(response.Item);
      return {
        count: item.count || 0,
        lastUpdated: item.lastUpdated
      };
    }
    
    return { count: 0 };
    
  } catch (error) {
    logger.error('Get usage error:', error);
    return { count: 0 };
  }
};

/**
 * 使用量をインクリメント
 */
const incrementUsage = async (key, metadata) => {
  try {
    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + (7 * 24 * 60 * 60); // 7日後に削除
    
    const command = new UpdateItemCommand({
      TableName: RATE_LIMIT_TABLE,
      Key: marshall({ id: key }),
      UpdateExpression: 'ADD #count :inc SET #lastUpdated = :timestamp, #ttl = :ttl, #metadata = :metadata',
      ExpressionAttributeNames: {
        '#count': 'count',
        '#lastUpdated': 'lastUpdated',
        '#ttl': 'ttl',
        '#metadata': 'metadata'
      },
      ExpressionAttributeValues: marshall({
        ':inc': 1,
        ':timestamp': now.toISOString(),
        ':ttl': ttl,
        ':metadata': metadata
      })
    });
    
    await dynamoDBClient.send(command);
    
  } catch (error) {
    logger.error('Increment usage error:', error);
    throw error;
  }
};

/**
 * APIキーをハッシュ化（セキュリティのため）
 */
const hashApiKey = (apiKey) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
};

/**
 * レート制限情報をレスポンスヘッダー用に取得
 */
const getRateLimitHeaders = async (identifier, type = 'public') => {
  const hourlyLimit = await checkRateLimit(identifier, type, 'hour');
  const dailyLimit = await checkRateLimit(identifier, type, 'day');
  
  return {
    'X-RateLimit-Limit-Hour': hourlyLimit.limit.toString(),
    'X-RateLimit-Remaining-Hour': hourlyLimit.remaining.toString(),
    'X-RateLimit-Reset-Hour': Math.floor(hourlyLimit.resetTime.getTime() / 1000).toString(),
    'X-RateLimit-Limit-Day': dailyLimit.limit.toString(),
    'X-RateLimit-Remaining-Day': dailyLimit.remaining.toString(),
    'X-RateLimit-Reset-Day': Math.floor(dailyLimit.resetTime.getTime() / 1000).toString()
  };
};

/**
 * レート制限統計の取得（管理者用）
 */
const getRateLimitStats = async (identifier, type) => {
  const now = new Date();
  const stats = {};
  
  // 過去24時間の統計
  for (let i = 0; i < 24; i++) {
    const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const windowKey = getWindowKey(hour, 'hour');
    const key = `${identifier}:hour:${windowKey}`;
    const usage = await getUsage(key);
    
    stats[windowKey] = usage.count;
  }
  
  return stats;
};

module.exports = {
  checkRateLimit,
  recordUsage,
  recordApiKeyUsage,
  getRateLimitHeaders,
  getRateLimitStats,
  RATE_LIMITS
};