/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/budgetCheck.js
 * 
 * 説明: 
 * AWS Lambda関数の無料枠使用量をモニタリングし、予算上限に達したときに
 * 警告を表示するためのユーティリティ。CloudWatchメトリクスを参照して
 * 使用状況を確認します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-10
 * @updated 2025-05-18 機能追加: レスポンスに予算警告を追加する関数を追加
 */
'use strict';

const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');
const logger = require('./logger');
const cacheService = require('../services/cache');

// 予算使用状況のキャッシュキー
const BUDGET_CACHE_KEY = 'system:budget-status';

// 予算使用状況のキャッシュ期間（10分）
const BUDGET_CACHE_TTL = 600;

// 臨界値の定義（例: 85%で警告開始）
const WARNING_THRESHOLD = 0.85;
const CRITICAL_THRESHOLD = 0.95;

/**
 * 予算が臨界値（95%）に達しているかどうかをチェックする
 * @returns {Promise<boolean>} 臨界値に達している場合はtrue
 */
const isBudgetCritical = async () => {
  try {
    // キャッシュから使用状況を取得
    const cachedStatus = await cacheService.get(BUDGET_CACHE_KEY);
    
    if (cachedStatus) {
      return cachedStatus.usage >= CRITICAL_THRESHOLD;
    }
    
    // 本番環境では実際のCloudWatchメトリクスを確認
    if (process.env.NODE_ENV === 'production') {
      const usage = await module.exports.getBudgetUsage();
      
      // キャッシュに保存
      await cacheService.set(BUDGET_CACHE_KEY, { 
        usage,
        timestamp: new Date().toISOString()
      }, BUDGET_CACHE_TTL);
      
      return usage >= CRITICAL_THRESHOLD;
    }
    
    // テストモードは強制的に設定
    if (process.env.TEST_BUDGET_CRITICAL === 'true') {
      return true;
    }
    
    // デフォルトでは安全
    return false;
  } catch (error) {
    logger.warn(`Failed to check budget status: ${error.message}`);
    // エラー時は安全側に倒す（falseを返す）
    return false;
  }
};

/**
 * 予算が警告値（85%）に達しているかどうかをチェックする
 * @returns {Promise<boolean>} 警告値に達している場合はtrue
 */
const isBudgetWarning = async () => {
  try {
    // キャッシュから使用状況を取得
    const cachedStatus = await cacheService.get(BUDGET_CACHE_KEY);
    
    if (cachedStatus) {
      return cachedStatus.usage >= WARNING_THRESHOLD;
    }
    
    // 本番環境では実際のCloudWatchメトリクスを確認
    if (process.env.NODE_ENV === 'production') {
      const usage = await module.exports.getBudgetUsage();
      
      // キャッシュに保存
      await cacheService.set(BUDGET_CACHE_KEY, { 
        usage,
        timestamp: new Date().toISOString()
      }, BUDGET_CACHE_TTL);
      
      return usage >= WARNING_THRESHOLD;
    }
    
    // テストモードは強制的に設定
    if (process.env.TEST_BUDGET_WARNING === 'true') {
      return true;
    }
    
    // デフォルトでは安全
    return false;
  } catch (error) {
    logger.warn(`Failed to check budget status: ${error.message}`);
    // エラー時は安全側に倒す（falseを返す）
    return false;
  }
};

/**
 * CloudWatchから予算使用率を取得する
 * @returns {Promise<number>} 使用率（0～1の範囲）
 */
const getBudgetUsage = async () => {
  // AWS SDK v3 の設定
  const cloudwatch = new CloudWatchClient({
    region: process.env.AWS_REGION || 'us-west-2'
  });
  
  // 現在の月の開始と終了を計算
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // CloudWatchメトリクスのパラメータ
  const params = {
    MetricName: 'Invocations',
    Namespace: 'AWS/Lambda',
    Period: 2592000, // 30日（1か月）
    StartTime: startOfMonth,
    EndTime: endOfMonth,
    Statistics: ['Sum'],
    Dimensions: [
      {
        Name: 'FunctionName',
        Value: process.env.AWS_LAMBDA_FUNCTION_NAME || 'portfolio-market-data-api'
      }
    ]
  };
  
  try {
    // メトリクスの取得
    const command = new GetMetricStatisticsCommand(params);
    const data = await cloudwatch.send(command);
    
    if (!data || !data.Datapoints || data.Datapoints.length === 0) {
      logger.warn('No CloudWatch datapoints found for Lambda usage');
      return 0;
    }
    
    // データポイントから最大値を取得
    const invocations = Math.max(...data.Datapoints.map(dp => dp.Sum));
    
    // 無料枠の制限（現在は100万リクエスト/月）
    const freeQuota = 1000000;
    
    // 使用率の計算
    const usageRate = invocations / freeQuota;
    
    logger.info(`Current Lambda budget usage: ${(usageRate * 100).toFixed(2)}%`);
    
    return usageRate;
  } catch (error) {
    logger.error(`Error getting CloudWatch metrics: ${error.message}`);
    throw error;
  }
};

/**
 * 予算警告メッセージを取得する
 * @returns {Promise<string>} 警告メッセージ
 */
const getBudgetWarningMessage = async () => {
  try {
    // キャッシュから使用状況を取得
    const cachedStatus = await cacheService.get(BUDGET_CACHE_KEY);
    let usage = 0;
    
    if (cachedStatus) {
      usage = cachedStatus.usage;
    } else if (process.env.NODE_ENV === 'production') {
      usage = await module.exports.getBudgetUsage();
    } else if (process.env.TEST_BUDGET_CRITICAL === 'true') {
      usage = 0.98; // テスト用に98%
    } else if (process.env.TEST_BUDGET_WARNING === 'true') {
      usage = 0.88; // テスト用に88%
    }
    
    // 使用率に応じてメッセージを変更
    if (usage >= CRITICAL_THRESHOLD) {
      return `CRITICAL: Free tier usage at ${(usage * 100).toFixed(1)}%. Cache refresh disabled.`;
    } else if (usage >= WARNING_THRESHOLD) {
      return `WARNING: Free tier usage at ${(usage * 100).toFixed(1)}%. Consider reducing refresh rate.`;
    }
    
    return '';
  } catch (error) {
    logger.warn(`Failed to get budget warning message: ${error.message}`);
    return 'WARNING: Unable to determine current budget usage.';
  }
};

/**
 * APIレスポンスに予算警告を追加する
 * レスポンスユーティリティから呼び出される関数
 * @param {Object} response - API Gateway形式のレスポンス
 * @returns {Promise<Object>} 予算警告が追加されたレスポンス
 */
const addBudgetWarningToResponse = async (response) => {
  try {
    // 予算警告をチェック
    const isCritical = await module.exports.isBudgetCritical();
    const isWarning = !isCritical && await module.exports.isBudgetWarning();

    // 警告メッセージを取得
    const warningMessage =
      isCritical || isWarning
        ? await module.exports.getBudgetWarningMessage()
        : '';

    // 警告がない場合はそのまま返す
    if (!warningMessage) {
      return response;
    }
    
    // パース済みのレスポンスボディ
    let responseBody = {};
    try {
      responseBody = JSON.parse(response.body);
    } catch (e) {
      // JSONでない場合は処理しない
      return response;
    }
    
    // ヘッダーに警告を追加
    const modifiedHeaders = {
      ...response.headers,
      'X-Budget-Warning': warningMessage
    };
    
    // レスポンスボディに警告を追加
    responseBody.budgetWarning = warningMessage;
    
    // 変更されたレスポンスを返す
    return {
      ...response,
      headers: modifiedHeaders,
      body: JSON.stringify(responseBody)
    };
  } catch (error) {
    logger.warn(`Failed to add budget warning to response: ${error.message}`);
    // エラー時は元のレスポンスをそのまま返す
    return response;
  }
};

module.exports = {
  isBudgetCritical,
  isBudgetWarning,
  getBudgetUsage,
  getBudgetWarningMessage,
  addBudgetWarningToResponse
};
