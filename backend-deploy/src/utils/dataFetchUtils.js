/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/dataFetchUtils.js
 * 
 * 説明: 
 * データ取得に関連する共通ユーティリティ関数を提供します。
 * ランダムなユーザーエージェント生成、エラーハンドリング、
 * データソース間の共通処理を提供します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-15
 */
'use strict';

const { withRetry, isRetryableApiError } = require('./retry');
const blacklist = require('./scrapingBlacklist');
const alertService = require('../services/alerts');

/**
 * ランダムなユーザーエージェントを取得する
 * @returns {string} ユーザーエージェント
 */
const getRandomUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

/**
 * データ取得の失敗を記録し、必要に応じてアラートを送信する
 * @param {string} code - 証券コードまたはティッカーシンボル
 * @param {string} market - 市場種別（'jp', 'us', 'fund'）
 * @param {string} source - データソース名
 * @param {Error} error - 発生したエラー
 * @param {Object} options - 追加オプション
 * @returns {Promise<void>}
 */
const recordDataFetchFailure = async (code, market, source, error, options = {}) => {
  const { alertThreshold = 0.1, alertTitle, alertDetail = {} } = options;
  
  // 失敗を記録
  await blacklist.recordFailure(code, market, `${source}: ${error.message}`);
  
  // ログにエラーを記録
  console.error(`Error fetching data for ${market} ${code} from ${source}:`, error.message);
  
  // アラート通知（あまりに多いとスパムになるので条件付き）
  if (Math.random() < alertThreshold) {
    const title = alertTitle || `${source} Data Retrieval Failed`;
    await alertService.notifyError(
      title, 
      new Error(`Failed to get data for ${market} ${code} from ${source}`),
      { code, market, source, error: error.message, ...alertDetail }
    );
  }
};

/**
 * データ取得の成功を記録する
 * @param {string} code - 証券コードまたはティッカーシンボル
 * @returns {Promise<void>}
 */
const recordDataFetchSuccess = async (code) => {
  await blacklist.recordSuccess(code);
};

/**
 * ブラックリストチェックとフォールバックデータの取得
 * @param {string} code - 証券コードまたはティッカーシンボル
 * @param {string} market - 市場種別（'jp', 'us', 'fund'）
 * @param {Object} fallbackConfig - フォールバック設定
 * @returns {Promise<Object>} ブラックリスト状態とフォールバックデータ
 */
const checkBlacklistAndGetFallback = async (code, market, fallbackConfig) => {
  const {
    defaultPrice,
    currencyCode,
    name = code,
    isStock = true,
    isMutualFund = false,
    priceLabel
  } = fallbackConfig;
  
  // ブラックリストをチェック
  const isInBlacklist = await blacklist.isBlacklisted(code, market);
  
  // フォールバックデータを作成
  const fallbackData = {
    ticker: code,
    price: defaultPrice,
    change: 0,
    changePercent: 0,
    name: name,
    currency: currencyCode,
    lastUpdated: new Date().toISOString(),
    source: 'Blacklisted Fallback',
    isStock,
    isMutualFund,
    isBlacklisted: isInBlacklist
  };
  
  // 追加の価格ラベルが必要な場合（投資信託など）
  if (priceLabel) {
    fallbackData.priceLabel = priceLabel;
  }
  
  return {
    isBlacklisted: isInBlacklist,
    fallbackData
  };
};

module.exports = {
  getRandomUserAgent,
  recordDataFetchFailure,
  recordDataFetchSuccess,
  checkBlacklistAndGetFallback
};
