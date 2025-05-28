/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/matrics.js
 * 
 * 説明: 
 * データソースのパフォーマンスとプロパティを追跡するためのメトリクスサービス。
 * 成功率、応答時間、エラーの統計情報を収集し、データソースの優先順位の動的調整に使用します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */
'use strict';

const { getDynamoDb } = require('../utils/awsConfig');
const { GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { DATA_SOURCES } = require('../config/constants');

// ソース名を正規化して比較するためのユーティリティ
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// 環境変数からの設定
const tablePrefix = (process.env.DYNAMODB_TABLE_PREFIX || 'portfolio-market-data')
  .replace(/-+$/, '');
const METRICS_TABLE = process.env.METRICS_TABLE || `${tablePrefix}-metrics`;

// メトリクス集計の期間（秒単位）
const AGGREGATION_PERIODS = {
  RECENT: 3600,      // 直近1時間
  HOURLY: 3600,      // 1時間
  DAILY: 86400,      // 1日
  WEEKLY: 604800     // 1週間
};

// DynamoDBから読み込んだ際にキーを正規化するマッピング
const TYPE_KEY_MAP = {
  'jp-stock': 'JP_STOCK',
  'us-stock': 'US_STOCK',
  'mutual-fund': 'MUTUAL_FUND',
  'exchange-rate': 'EXCHANGE_RATE'
};

const normalizePriorityKeys = (priorities) => {
  const normalized = {};
  for (const [key, value] of Object.entries(priorities)) {
    const mapped = TYPE_KEY_MAP[key] || key;
    normalized[mapped] = value;
  }
  return normalized;
};

// データソースの優先順位の内部管理
let sourcePriorities = {};

// テーブル初期化フラグ
let isTableInitialized = false;

/**
 * データソース優先順位を初期化する
 */
const initializeSourcePriorities = () => {
  // 各データタイプのデフォルト優先順位を設定
  for (const [dataType, config] of Object.entries(DATA_SOURCES)) {
    if (!sourcePriorities[dataType]) {
      sourcePriorities[dataType] = [...config.DEFAULT_PRIORITY];
    }
  }

  // 初期化のみ担当するためフラグ設定は呼び出し側で行う
}; 

/**
 * メトリクス用DynamoDBテーブルを初期化する
 * @returns {Promise<boolean>} 成功したらtrue
 */
const initializeMetricsTable = async () => {
  try {
    initializeSourcePriorities();

    // 既存データソース優先順位を取得
    await loadSourcePriorities();

    isTableInitialized = true;
    return true;
  } catch (error) {
    console.error('Error initializing metrics table:', error);
    initializeSourcePriorities(); // フォールバックとして初期値を設定
    isTableInitialized = true;
    return false;
  }
};

/**
 * データソース優先順位をロードする
 * @returns {Promise<Object>} 優先順位データ
 */
const loadSourcePriorities = async () => {
  const dynamoDb = getDynamoDb();
    
    const params = {
      TableName: METRICS_TABLE,
      Key: { 
        metricType: 'SOURCE_PRIORITIES',
        metricKey: 'current' 
      }
    };
    
  const result = await dynamoDb.send(new GetCommand(params));

  if (result.Item && result.Item.priorities) {
    // DynamoDB上ではデータタイプキーが小文字で保存されていることがあるため
    // 読み込み時にキーを正規化する
    sourcePriorities = normalizePriorityKeys(result.Item.priorities);
    return sourcePriorities;
  }

  // 存在しない場合は初期値をそのまま返す
  return sourcePriorities;
};

/**
 * データソース優先順位を保存する
 * @returns {Promise<boolean>} 成功したらtrue
 */
const saveSourcePriorities = async () => {
  try {
    const dynamoDb = getDynamoDb();
    
    const params = {
      TableName: METRICS_TABLE,
      Item: {
        metricType: 'SOURCE_PRIORITIES',
        metricKey: 'current',
        priorities: sourcePriorities,
        updatedAt: new Date().toISOString()
      }
    };
    
    await dynamoDb.send(new PutCommand(params));
    return true;
  } catch (error) {
    console.error('Error saving source priorities:', error);
    return false;
  }
};

/**
 * データソースの優先順位を取得する
 * @param {string} dataType - データタイプ (jp-stock, us-stock など)
 * @returns {Array<string>} ソース優先順位の配列
 */
const getSourcePriority = async (dataType) => {
  // テーブル初期化確認
  if (!isTableInitialized) {
    await initializeMetricsTable();
  }

  // データタイプに対する優先順位を返す
  // データタイプによってマッピング処理
  let mappedType = dataType;
  if (dataType === 'jp-stock') mappedType = 'JP_STOCK';
  if (dataType === 'us-stock') mappedType = 'US_STOCK';
  if (dataType === 'mutual-fund') mappedType = 'MUTUAL_FUND';
  if (dataType === 'exchange-rate') mappedType = 'EXCHANGE_RATE';

  return sourcePriorities[mappedType] || DATA_SOURCES[mappedType]?.DEFAULT_PRIORITY || [];
};

/**
 * データソースの優先順位を更新する
 * @param {string} dataType - データタイプ
 * @param {string} source - データソース名
 * @param {number} adjustment - 優先順位調整値（正:上げる、負:下げる）
 * @returns {Promise<boolean>} 成功したらtrue
 */
const updateSourcePriority = async (dataType, source, adjustment) => {
  // テーブル初期化確認
  if (!isTableInitialized) {
    await initializeMetricsTable();
  } else {
    // 最新の優先順位を取得しておく
    try {
      await loadSourcePriorities();
    } catch (e) {
      console.error('Error reloading source priorities:', e);
    }
  }

  // データタイプによってマッピング処理
  let mappedType = dataType;
  if (dataType === 'jp-stock') mappedType = 'JP_STOCK';
  if (dataType === 'us-stock') mappedType = 'US_STOCK';
  if (dataType === 'mutual-fund') mappedType = 'MUTUAL_FUND';
  if (dataType === 'exchange-rate') mappedType = 'EXCHANGE_RATE';

  try {
    // 現在の優先順位配列
    const currentOrder =
      sourcePriorities[mappedType] || [...DATA_SOURCES[mappedType]?.DEFAULT_PRIORITY];

    // ソースのインデックスを取得（スラッグ名でも検索可能）
    const sourceSlug = slugify(source);
    const currentIndex = currentOrder.findIndex((s) => slugify(s) === sourceSlug);
    if (currentIndex === -1) return false; // ソースが存在しない
    
    // 新しいインデックスを計算
    let newIndex = currentIndex;
    if (adjustment > 0) {
      // 優先順位を上げる（インデックスを下げる）
      newIndex = Math.max(0, currentIndex - 1);
    } else if (adjustment < 0) {
      // 優先順位を下げる（インデックスを上げる）
      newIndex = Math.min(currentOrder.length - 1, currentIndex + 1);
    }
    
    // 変更がない場合はスキップ
    if (newIndex === currentIndex) return true;
    
    // 配列を再構成
    const canonicalName = currentOrder[currentIndex];
    const newOrder = [...currentOrder];
    newOrder.splice(currentIndex, 1); // 現在の位置から削除
    newOrder.splice(newIndex, 0, canonicalName); // 新しい位置に挿入
    
    // 更新を保存
    sourcePriorities[mappedType] = newOrder;
    const saveOk = await saveSourcePriorities();
    if (!saveOk) {
      return false;
    }
    
    console.log(`Updated ${mappedType} source priority: ${source} moved from ${currentIndex} to ${newIndex}`);
    return true;
  } catch (error) {
    console.error(`Error updating source priority for ${dataType}/${source}:`, error);
    return false;
  }
};

/**
 * データソースリクエストの開始を記録する
 * @param {string} source - データソース名
 * @param {string} symbol - 銘柄コード
 * @param {string} dataType - データタイプ
 * @returns {Promise<void>}
 */
const startDataSourceRequest = async (source, symbol, dataType) => {
  // テーブル初期化確認
  if (!isTableInitialized) {
    await initializeMetricsTable();
  }

  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const hourKey = timestamp.substring(0, 13); // YYYY-MM-DDTHH
    
    // リクエスト開始をインメモリに記録（データベース書き込みなし）
    if (!global._metricsRequestsInProgress) {
      global._metricsRequestsInProgress = {};
    }
    
    const requestId = `${source}:${symbol}:${Date.now()}`;
    global._metricsRequestsInProgress[requestId] = {
      source,
      symbol,
      dataType,
      startTime: Date.now()
    };
    
    return requestId;
  } catch (error) {
    console.error(`Error starting metrics for ${source}/${symbol}:`, error);
  }
};

/**
 * データソースリクエストの結果を記録する
 * @param {string} source - データソース名
 * @param {boolean} success - 成功したかどうか
 * @param {number} responseTime - 応答時間（ミリ秒）
 * @param {string} dataType - データタイプ
 * @param {string} symbol - 銘柄コード
 * @param {string} [errorMessage] - エラーメッセージ（失敗時）
 * @returns {Promise<void>}
 */
const recordDataSourceResult = async (source, success, responseTime, dataType, symbol, errorMessage = null) => {
  // テーブル初期化確認
  if (!isTableInitialized) {
    await initializeMetricsTable();
  }

  try {
    const dynamoDb = getDynamoDb();
    const now = new Date();
    const timestamp = now.toISOString();
    const hourKey = timestamp.substring(0, 13); // YYYY-MM-DDTHH
    
    // 時間単位のメトリクス更新
    await updateMetrics(dynamoDb, {
      metricType: 'SOURCE_HOURLY',
      metricKey: `${source}:${hourKey}`,
      dataType,
      success,
      responseTime,
      timestamp,
      errorMessage
    });
    
    // ソース全体のメトリクス更新
    await updateMetrics(dynamoDb, {
      metricType: 'SOURCE_TOTAL',
      metricKey: source,
      dataType,
      success,
      responseTime,
      timestamp,
      errorMessage
    });
    
    // 銘柄単位のメトリクス更新（最新の結果のみ）
    await recordSymbolResult(dynamoDb, {
      source,
      symbol,
      dataType,
      success,
      responseTime,
      timestamp,
      errorMessage
    });
  } catch (error) {
    console.error(`Error recording metrics for ${source}/${symbol}:`, error);
  }
};

/**
 * バッチデータソースリクエストの開始を記録する
 * @param {string} source - データソース名
 * @param {number} count - リクエスト数
 * @param {string} dataType - データタイプ
 * @returns {Promise<string>} リクエストID
 */
const startBatchDataSourceRequest = async (source, count, dataType) => {
  // テーブル初期化確認
  if (!isTableInitialized) {
    await initializeMetricsTable();
  }

  try {
    // バッチリクエスト開始をインメモリに記録
    if (!global._metricsBatchRequestsInProgress) {
      global._metricsBatchRequestsInProgress = {};
    }
    
    const requestId = `${source}:batch:${Date.now()}`;
    global._metricsBatchRequestsInProgress[requestId] = {
      source,
      count,
      dataType,
      startTime: Date.now()
    };
    
    return requestId;
  } catch (error) {
    console.error(`Error starting batch metrics for ${source}:`, error);
    return null;
  }
};

/**
 * バッチデータソースリクエストの結果を記録する
 * @param {string} source - データソース名
 * @param {number} successCount - 成功した数
 * @param {number} failCount - 失敗した数
 * @param {number} totalTime - 合計処理時間（ミリ秒）
 * @param {string} dataType - データタイプ
 * @param {string} [errorMessage] - エラーメッセージ（全体失敗時）
 * @returns {Promise<void>}
 */
const recordBatchDataSourceResult = async (source, successCount, failCount, totalTime, dataType, errorMessage = null) => {
  // テーブル初期化確認
  if (!isTableInitialized) {
    await initializeMetricsTable();
  }

  try {
    const dynamoDb = getDynamoDb();
    const now = new Date();
    const timestamp = now.toISOString();
    const hourKey = timestamp.substring(0, 13); // YYYY-MM-DDTHH
    const dayKey = timestamp.substring(0, 10);  // YYYY-MM-DD
    
    const totalCount = successCount + failCount;
    const success = totalCount > 0 ? successCount / totalCount : 0;
    const avgResponseTime = totalCount > 0 ? totalTime / totalCount : totalTime;
    
    // 時間単位のメトリクス更新（バッチ用）
    await updateBatchMetrics(dynamoDb, {
      metricType: 'BATCH_SOURCE_HOURLY',
      metricKey: `${source}:${hourKey}`,
      dataType,
      successCount,
      failCount,
      totalTime,
      avgResponseTime,
      timestamp,
      errorMessage
    });
    
    // 日単位のメトリクス更新（バッチ用）
    await updateBatchMetrics(dynamoDb, {
      metricType: 'BATCH_SOURCE_DAILY',
      metricKey: `${source}:${dayKey}`,
      dataType,
      successCount,
      failCount,
      totalTime,
      avgResponseTime,
      timestamp,
      errorMessage
    });
    
    // ソース全体のメトリクス更新（バッチを個別リクエストに変換）
    for (let i = 0; i < successCount; i++) {
      await updateMetrics(dynamoDb, {
        metricType: 'SOURCE_TOTAL',
        metricKey: source,
        dataType,
        success: true,
        responseTime: avgResponseTime,
        timestamp,
        isBatch: true
      });
    }
    
    for (let i = 0; i < failCount; i++) {
      await updateMetrics(dynamoDb, {
        metricType: 'SOURCE_TOTAL',
        metricKey: source,
        dataType,
        success: false,
        responseTime: avgResponseTime,
        timestamp,
        errorMessage: errorMessage || 'Batch error',
        isBatch: true
      });
    }
  } catch (error) {
    console.error(`Error recording batch metrics for ${source}:`, error);
  }
};

/**
 * メトリクスを更新する（個別リクエスト用）
 * @param {AWS.DynamoDB.DocumentClient} dynamoDb - DynamoDBクライアント
 * @param {Object} data - メトリクスデータ
 * @returns {Promise<void>}
 */
const updateMetrics = async (dynamoDb, data) => {
  try {
    const { 
      metricType, 
      metricKey, 
      dataType,
      success, 
      responseTime, 
      timestamp, 
      errorMessage 
    } = data;
    
    // 既存のメトリクスを取得
    const getParams = {
      TableName: METRICS_TABLE,
      Key: {
        metricType,
        metricKey
      }
    };
    
    const result = await dynamoDb.send(new GetCommand(getParams));
    const item = result.Item || {
      metricType,
      metricKey,
      dataType,
      requests: 0,
      successes: 0,
      failures: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      minResponseTime: null,
      maxResponseTime: null,
      successRate: 0,
      errorTypes: {},
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // メトリクスを更新
    item.requests += 1;
    if (success) {
      item.successes += 1;
    } else {
      item.failures += 1;
      
      // エラータイプの集計
      if (errorMessage) {
        const errorType = getErrorType(errorMessage);
        item.errorTypes[errorType] = (item.errorTypes[errorType] || 0) + 1;
      }
    }
    
    item.totalResponseTime += responseTime;
    item.avgResponseTime = item.totalResponseTime / item.requests;
    item.successRate = (item.successes / item.requests) * 100;
    
    if (item.minResponseTime === null || responseTime < item.minResponseTime) {
      item.minResponseTime = responseTime;
    }
    
    if (item.maxResponseTime === null || responseTime > item.maxResponseTime) {
      item.maxResponseTime = responseTime;
    }
    
    item.updatedAt = timestamp;
    
    // 更新を保存
    const putParams = {
      TableName: METRICS_TABLE,
      Item: item
    };
    
    await dynamoDb.send(new PutCommand(putParams));
  } catch (error) {
    console.error(`Error updating metrics:`, error);
  }
};

/**
 * バッチメトリクスを更新する
 * @param {AWS.DynamoDB.DocumentClient} dynamoDb - DynamoDBクライアント
 * @param {Object} data - メトリクスデータ
 * @returns {Promise<void>}
 */
const updateBatchMetrics = async (dynamoDb, data) => {
  try {
    const { 
      metricType, 
      metricKey, 
      dataType,
      successCount, 
      failCount, 
      totalTime,
      avgResponseTime,
      timestamp, 
      errorMessage 
    } = data;
    
    // 既存のメトリクスを取得
    const getParams = {
      TableName: METRICS_TABLE,
      Key: {
        metricType,
        metricKey
      }
    };
    
    const result = await dynamoDb.send(new GetCommand(getParams));
    const item = result.Item || {
      metricType,
      metricKey,
      dataType,
      batches: 0,
      totalRequests: 0,
      successCount: 0,
      failCount: 0,
      totalTime: 0,
      avgResponseTime: 0,
      successRate: 0,
      errorTypes: {},
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // メトリクスを更新
    item.batches += 1;
    item.totalRequests += (successCount + failCount);
    item.successCount += successCount;
    item.failCount += failCount;
    item.totalTime += totalTime;
    
    item.avgResponseTime = item.totalRequests > 0 ? 
      item.totalTime / item.totalRequests : 
      avgResponseTime;
    
    item.successRate = item.totalRequests > 0 ? 
      (item.successCount / item.totalRequests) * 100 : 0;
    
    // エラータイプの集計
    if (errorMessage) {
      const errorType = getErrorType(errorMessage);
      item.errorTypes[errorType] = (item.errorTypes[errorType] || 0) + 1;
    }
    
    item.updatedAt = timestamp;
    
    // 更新を保存
    const putParams = {
      TableName: METRICS_TABLE,
      Item: item
    };
    
    await dynamoDb.send(new PutCommand(putParams));
  } catch (error) {
    console.error(`Error updating batch metrics:`, error);
  }
};

/**
 * 銘柄単位の結果を記録する
 * @param {AWS.DynamoDB.DocumentClient} dynamoDb - DynamoDBクライアント
 * @param {Object} data - 結果データ
 * @returns {Promise<void>}
 */
const recordSymbolResult = async (dynamoDb, data) => {
  try {
    const { 
      source, 
      symbol, 
      dataType,
      success, 
      responseTime, 
      timestamp, 
      errorMessage 
    } = data;
    
    // 銘柄の最新結果を保存
    const putParams = {
      TableName: METRICS_TABLE,
      Item: {
        metricType: 'SYMBOL_RESULT',
        metricKey: `${symbol}:${dataType}`,
        source,
        success,
        responseTime,
        timestamp,
        errorMessage: errorMessage || null
      }
    };
    
    await dynamoDb.send(new PutCommand(putParams));
  } catch (error) {
    console.error(`Error recording symbol result:`, error);
  }
};

/**
 * エラーメッセージからエラータイプを抽出する
 * @param {string} errorMessage - エラーメッセージ
 * @returns {string} エラータイプ
 */
const getErrorType = (errorMessage) => {
  if (!errorMessage) return 'UNKNOWN';
  
  // エラーメッセージに基づいてタイプを判定
  if (errorMessage.includes('timeout')) return 'TIMEOUT';
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) return 'RATE_LIMIT';
  if (errorMessage.includes('network') || errorMessage.includes('ECONNRESET')) return 'NETWORK';
  if (errorMessage.includes('permission') || errorMessage.includes('403')) return 'PERMISSION';
  if (errorMessage.includes('not found') || errorMessage.includes('404')) return 'NOT_FOUND';
  if (errorMessage.includes('validation')) return 'VALIDATION';
  
  return 'OTHER';
};

/**
 * データソースのメトリクスを取得する
 * @param {string} source - データソース名
 * @param {string} dataType - データタイプ
 * @returns {Promise<Object>} メトリクスデータ
 */
const getDataSourceMetrics = async (source, dataType) => {
  // テーブル初期化確認
  if (!isTableInitialized) {
    await initializeMetricsTable();
  }

  try {
    const dynamoDb = getDynamoDb();
    
    // ソース全体のメトリクスを取得
    const params = {
      TableName: METRICS_TABLE,
      Key: {
        metricType: 'SOURCE_TOTAL',
        metricKey: source
      }
    };
    
    const result = await dynamoDb.send(new GetCommand(params));
    
    if (!result.Item) {
      return null;
    }
    
    // 特定のデータタイプのみフィルタリング
    if (dataType && result.Item.dataType !== dataType) {
      return null;
    }
    
    return result.Item;
  } catch (error) {
    console.error(`Error getting data source metrics for ${source}:`, error);
    return null;
  }
};

module.exports = {
  initializeMetricsTable,
  getSourcePriority,
  updateSourcePriority,
  startDataSourceRequest,
  recordDataSourceResult,
  startBatchDataSourceRequest,
  recordBatchDataSourceResult,
  getDataSourceMetrics,
  getErrorType,
  ...(process.env.NODE_ENV === 'test' ? { slugify, normalizePriorityKeys } : {})
};
