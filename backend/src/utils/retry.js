/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/retry.js
 * 
 * 説明: 
 * 指数バックオフ戦略を用いた関数実行の再試行を行うユーティリティ。
 * ネットワーク接続やAPIリクエスト失敗時の堅牢性を高めます。
 *
 * @author Portfolio Manager Team
 * @created 2025-05-13
 */
'use strict';

/**
 * 指数バックオフを使用して非同期関数を再試行する
 * @param {Function} fn - 実行する非同期関数
 * @param {Object} options - 再試行オプション
 * @param {number} [options.maxRetries=3] - 最大再試行回数
 * @param {number} [options.baseDelay=100] - 基本遅延時間（ミリ秒）
 * @param {number} [options.maxDelay=10000] - 最大遅延時間（ミリ秒）
 * @param {Function} [options.shouldRetry] - 再試行判定関数
 * @param {Function} [options.onRetry] - 再試行前に実行する関数
 * @returns {Promise<any>} - fnの結果
 */
const withRetry = async (fn, options = {}) => {
  const {
    maxRetries = 1, // コスト削減のため、デフォルトを3から1に削減
    baseDelay = 100,
    maxDelay = 10000,
    shouldRetry = () => true,
    onRetry = null
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 関数を実行
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 最大再試行回数に達したか再試行すべきでないエラーの場合は例外をスロー
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // 指数バックオフ遅延を計算（ジッタを追加）
      const delay = Math.min(
        maxDelay,
        baseDelay * Math.pow(2, attempt) * (1 + Math.random() * 0.2)
      );
      
      // console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms - ${error.message}`);
      
      // 再試行前コールバック関数を実行
      if (typeof onRetry === 'function') {
        await onRetry(error, attempt, delay);
      }
      
      // 計算した時間だけ待機
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * 一般的なAPIリクエストのための再試行判定関数
 * @param {Error} error - 発生したエラー
 * @returns {boolean} - 再試行すべきかどうか
 */
const isRetryableApiError = (error) => {
  if (!error) return false;
  
  // ネットワークエラーの場合
  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.message?.includes('Network Error')
  ) {
    return true;
  }
  
  // レスポンスエラーの場合
  if (error.response) {
    const status = error.response.status;
    // 500番台のエラーまたは429（レート制限）は再試行
    return status >= 500 || status === 429;
  }
  
  // AWS SDK特有のエラー
  if (
    error.code === 'ProvisionedThroughputExceededException' ||
    error.code === 'ThrottlingException' ||
    error.code === 'RequestLimitExceeded' ||
    error.code === 'TooManyRequestsException'
  ) {
    return true;
  }
  
  return false;
};

/**
 * 簡易的な待機関数
 * @param {number} ms - 待機時間（ミリ秒）
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  withRetry,
  isRetryableApiError,
  sleep
};
