/**
 * Yahoo Finance2 NPMパッケージを使用した株価データ取得サービス
 * 無料で利用可能、APIキー不要
 */
'use strict';

const logger = require('../../utils/logger');
const { withRetry } = require('../../utils/retry');
const cacheService = require('../cache');
const { DATA_TYPES } = require('../../config/constants');

// yahoo-finance2のインポート（パッケージがインストールされている場合のみ）
let yahooFinance;
try {
  yahooFinance = require('yahoo-finance2').default;
  logger.info('yahoo-finance2 package loaded successfully');
} catch (error) {
  logger.warn('yahoo-finance2 package not installed. Run: npm install yahoo-finance2');
}

/**
 * Yahoo Finance2を使用して株価データを取得
 * @param {string} symbol - 銘柄コード
 * @param {string} type - データタイプ (us-stock, jp-stock)
 * @returns {Promise<Object>} 株価データ
 */
const getStockDataFromYahooFinance2 = async (symbol, type) => {
  if (!yahooFinance) {
    throw new Error('yahoo-finance2 package not installed');
  }

  // 日本株の場合は.Tを追加
  const querySymbol = type === DATA_TYPES.JP_STOCK && !symbol.includes('.') 
    ? `${symbol}.T` 
    : symbol;

  try {
    const quote = await withRetry(
      async () => await yahooFinance.quote(querySymbol),
      { maxRetries: 2, delay: 1000 }
    );

    if (!quote || !quote.regularMarketPrice) {
      throw new Error('Invalid quote data received');
    }

    // 統一フォーマットに変換
    const data = {
      ticker: symbol,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      name: quote.longName || quote.shortName || symbol,
      currency: quote.currency || (type === DATA_TYPES.JP_STOCK ? 'JPY' : 'USD'),
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance2 (npm)',
      isStock: true,
      isMutualFund: false,
      volume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap || 0,
      previousClose: quote.regularMarketPreviousClose || quote.price,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      week52High: quote.fiftyTwoWeekHigh,
      week52Low: quote.fiftyTwoWeekLow
    };

    return data;
  } catch (error) {
    logger.error(`Yahoo Finance2 error for ${symbol}:`, error.message);
    throw error;
  }
};

/**
 * 複数銘柄の株価データを一括取得
 * @param {Array<string>} symbols - 銘柄コードの配列
 * @param {string} type - データタイプ
 * @returns {Promise<Object>} 銘柄コードをキーとした株価データ
 */
const getBatchStockData = async (symbols, type) => {
  if (!yahooFinance) {
    throw new Error('yahoo-finance2 package not installed');
  }

  const results = {};
  
  // Yahoo Finance2は内部でバッチ処理を最適化している
  const promises = symbols.map(async (symbol) => {
    try {
      const data = await getStockDataFromYahooFinance2(symbol, type);
      results[symbol] = data;
    } catch (error) {
      logger.warn(`Failed to fetch ${symbol}:`, error.message);
      results[symbol] = null;
    }
  });

  await Promise.all(promises);
  return results;
};

/**
 * 履歴データの取得
 * @param {string} symbol - 銘柄コード
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @returns {Promise<Array>} 履歴データの配列
 */
const getHistoricalData = async (symbol, startDate, endDate) => {
  if (!yahooFinance) {
    throw new Error('yahoo-finance2 package not installed');
  }

  try {
    const queryOptions = {
      period1: startDate,
      period2: endDate,
      interval: '1d' // 日次データ
    };

    const result = await yahooFinance.historical(symbol, queryOptions);
    
    return result.map(item => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      adjustedClose: item.adjClose
    }));
  } catch (error) {
    logger.error(`Historical data error for ${symbol}:`, error.message);
    throw error;
  }
};

/**
 * 為替レートの取得
 * @param {string} base - 基準通貨
 * @param {string} target - 対象通貨
 * @returns {Promise<Object>} 為替レートデータ
 */
const getExchangeRate = async (base, target) => {
  if (!yahooFinance) {
    throw new Error('yahoo-finance2 package not installed');
  }

  const symbol = `${base}${target}=X`;
  
  try {
    const quote = await yahooFinance.quote(symbol);
    
    return {
      pair: `${base}-${target}`,
      rate: quote.regularMarketPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance2 (npm)'
    };
  } catch (error) {
    logger.error(`Exchange rate error for ${base}/${target}:`, error.message);
    throw error;
  }
};

module.exports = {
  getStockDataFromYahooFinance2,
  getBatchStockData,
  getHistoricalData,
  getExchangeRate,
  isAvailable: () => !!yahooFinance
};