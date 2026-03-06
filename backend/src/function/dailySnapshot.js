'use strict';

const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { getDynamoDb } = require('../utils/awsConfig');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');
const priceHistoryService = require('../services/priceHistoryService');
const { PREWARM_SYMBOLS, DATA_TYPES } = require('../config/constants');

const PORTFOLIOS_TABLE = process.env.PORTFOLIOS_TABLE || 'pfwise-api-dev-portfolios';

// ティッカー種別判定パターン（既存パターン踏襲）
const isJpStock = (ticker) => /^\d{4}(\.T)?$/.test(ticker);
const isMutualFund = (ticker) => /^(\d{8}|\d{7}[A-Z]|[A-Z0-9]{8})$/i.test(ticker);

/**
 * 全ユーザーのポートフォリオから保有ティッカーをユニーク集計する
 * @returns {Promise<Set<string>>}
 */
const collectAllTickers = async () => {
  const db = getDynamoDb();
  const tickers = new Set();
  let lastEvaluatedKey = undefined;

  do {
    const command = new ScanCommand({
      TableName: PORTFOLIOS_TABLE,
      ProjectionExpression: 'currentAssets',
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
    });

    const result = await withRetry(() => db.send(command));

    for (const item of (result.Items || [])) {
      if (Array.isArray(item.currentAssets)) {
        for (const asset of item.currentAssets) {
          if (asset.ticker) {
            tickers.add(asset.ticker);
          }
        }
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return tickers;
};

/**
 * ティッカーを種別ごとに分類する
 * @param {Set<string>} tickers
 * @returns {{usStocks: string[], jpStocks: string[], mutualFunds: string[], exchangeRates: string[]}}
 */
const classifyTickers = (tickers) => {
  const usStocks = [];
  const jpStocks = [];
  const mutualFunds = [];

  for (const ticker of tickers) {
    if (isJpStock(ticker)) {
      jpStocks.push(ticker);
    } else if (isMutualFund(ticker)) {
      mutualFunds.push(ticker);
    } else {
      usStocks.push(ticker);
    }
  }

  // PREWARM_SYMBOLS の為替レートを含める
  const exchangeRates = [...(PREWARM_SYMBOLS['exchange-rate'] || ['USD-JPY'])];

  return { usStocks, jpStocks, mutualFunds, exchangeRates };
};

/**
 * 市場データを取得して価格履歴に保存する
 * @param {string[]} symbols
 * @param {string} dataType
 * @param {Function} fetchFn
 * @returns {Promise<{success: number, failed: number}>}
 */
const fetchAndStore = async (symbols, dataType, fetchFn) => {
  if (symbols.length === 0) return { success: 0, failed: 0 };

  const today = new Date().toISOString().split('T')[0];
  const items = [];

  try {
    const results = await fetchFn(symbols, true); // refresh=true

    if (results && typeof results === 'object') {
      // バッチ結果はオブジェクト形式 { AAPL: { price, ... }, MSFT: { price, ... } }
      // またはdata配列形式
      const entries = results.data
        ? (Array.isArray(results.data) ? results.data : [results.data])
        : Object.entries(results).map(([ticker, data]) => ({ ticker, ...data }));

      for (const entry of entries) {
        const ticker = entry.ticker || entry.symbol;
        const close = entry.price || entry.close || entry.regularMarketPrice;
        const currency = entry.currency || (isJpStock(ticker) ? 'JPY' : 'USD');

        if (ticker && close && typeof close === 'number') {
          items.push({
            ticker,
            date: today,
            close,
            source: entry.source || dataType,
            currency
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to fetch ${dataType} data:`, error.message);
  }

  if (items.length === 0) {
    return { success: 0, failed: symbols.length };
  }

  const result = await priceHistoryService.putDailyPrices(items);
  return { success: result.written, failed: result.failed + (symbols.length - items.length) };
};

/**
 * 日次スナップショット Lambda ハンドラー
 */
const handler = async (event) => {
  const startTime = Date.now();
  logger.info('Daily snapshot started');

  try {
    // 1. 全ユーザーの保有ティッカーを集計
    const userTickers = await collectAllTickers();
    logger.info(`Collected ${userTickers.size} unique tickers from portfolios`);

    // 2. PREWARM_SYMBOLSと統合
    for (const type of [DATA_TYPES.US_STOCK, DATA_TYPES.JP_STOCK, DATA_TYPES.MUTUAL_FUND]) {
      const symbols = PREWARM_SYMBOLS[type] || [];
      for (const s of symbols) {
        userTickers.add(s);
      }
    }

    // 3. 種別ごとに分類
    const { usStocks, jpStocks, mutualFunds, exchangeRates } = classifyTickers(userTickers);
    logger.info(`Classified: US=${usStocks.length}, JP=${jpStocks.length}, Fund=${mutualFunds.length}, FX=${exchangeRates.length}`);

    // 4. enhancedMarketDataService のバッチ取得を遅延ロード
    const enhancedService = require('../services/sources/enhancedMarketDataService');
    const exchangeRateService = require('../services/sources/exchangeRate');

    // 5. 並列フェッチ
    const [usResult, jpResult, fundResult] = await Promise.all([
      fetchAndStore(usStocks, DATA_TYPES.US_STOCK, enhancedService.getUsStocksData),
      fetchAndStore(jpStocks, DATA_TYPES.JP_STOCK, enhancedService.getJpStocksData),
      fetchAndStore(mutualFunds, DATA_TYPES.MUTUAL_FUND, enhancedService.getMutualFundsData)
    ]);

    // 6. 為替レートのスナップショット保存
    let fxSuccess = 0;
    let fxFailed = 0;
    const today = new Date().toISOString().split('T')[0];
    for (const pair of exchangeRates) {
      try {
        const [base, target] = pair.split('-');
        const rateData = await enhancedService.getExchangeRateData(base, target, true);
        if (rateData && rateData.rate) {
          await priceHistoryService.putDailyPrices([{
            ticker: pair,
            date: today,
            close: rateData.rate,
            source: rateData.source || 'exchange-rate',
            currency: target
          }]);
          fxSuccess++;
        }
      } catch (error) {
        logger.warn(`FX snapshot failed for ${pair}:`, error.message);
        fxFailed++;
      }
    }

    // 7. サマリーログ
    const elapsed = Date.now() - startTime;
    const summary = {
      elapsed: `${elapsed}ms`,
      us: usResult,
      jp: jpResult,
      fund: fundResult,
      fx: { success: fxSuccess, failed: fxFailed },
      totalSuccess: usResult.success + jpResult.success + fundResult.success + fxSuccess,
      totalFailed: usResult.failed + jpResult.failed + fundResult.failed + fxFailed
    };
    logger.info('Daily snapshot completed:', JSON.stringify(summary));

    return { statusCode: 200, body: JSON.stringify(summary) };
  } catch (error) {
    logger.error('Daily snapshot failed:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

module.exports = { handler, collectAllTickers, classifyTickers };
