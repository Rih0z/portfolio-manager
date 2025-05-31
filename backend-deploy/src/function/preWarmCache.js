/**
 * API キャッシュの予熱を行う Lambda 関数
 * 
 * @file src/function/preWarmCache.js
 * @author Portfolio Manager Team
 * @updated 2025-05-12 バグ修正: モジュールパスを修正
 */

const enhancedMarketDataService = require('../services/sources/enhancedMarketDataService');
const cache = require('../services/cache');
const alerts = require('../services/alerts');
const logger = require('../utils/logger');

// スクレイピング関連モジュールのインポートパスを修正
// 変更前: const scraping = require('../services/sources/scraping');
const scrapingBlacklist = require('../utils/scrapingBlacklist');

// 頻繁にアクセスされる銘柄のリスト
const PREWARM_SYMBOLS = {
  'us-stock': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'BRK-B', 'JPM', 'JNJ'],
  'jp-stock': ['7203', '9984', '6758', '8306', '9432', '6861', '7974', '6501', '8035', '9433'],
  'mutual-fund': ['2931113C', '0131103C', '0231303C', '0131423C', '2931333C'],
  'exchange-rate': ['USD-JPY', 'EUR-USD', 'EUR-JPY', 'GBP-USD', 'USD-CNY']
};

/**
 * キャッシュの予熱を行うメイン関数
 */
exports.handler = async (event, context) => {
  try {
    logger.info('Starting cache pre-warming process');
    
    // クリーンアップを最初に実行
    await cleanupExpiredData();
    
    // 各データタイプのキャッシュを予熱
    await prewarmUsStocks();
    await prewarmJpStocks();
    await prewarmMutualFunds();
    await prewarmExchangeRates();
    
    logger.info('Cache pre-warming completed successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cache pre-warming completed successfully'
      })
    };
  } catch (error) {
    logger.error('Error during cache pre-warming:', error);
    
    // アラートを送信
    await alerts.sendAlert({
      source: 'CachePrewarming',
      message: `Cache pre-warming failed: ${error.message}`,
      severity: 'ERROR',
      details: error.stack
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Cache pre-warming failed',
        error: error.message
      })
    };
  }
};

/**
 * 期限切れデータのクリーンアップ
 */
async function cleanupExpiredData() {
  try {
    logger.info('Cleaning up expired cache items');
    
    // キャッシュからTTL期限切れのアイテムを削除
    const cleanupResult = await cache.cleanup();
    logger.info(`Cleaned up ${cleanupResult.count} expired cache items`);
    
    // スクレイピングブラックリストの古いエントリーをクリーンアップ
    const blacklistCleanupResult = await scrapingBlacklist.cleanupBlacklist();
    logger.info(`Cleaned up ${blacklistCleanupResult.count} expired blacklist entries`);
    
    return {
      cacheItems: cleanupResult.count,
      blacklistEntries: blacklistCleanupResult.count
    };
  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
}

/**
 * 米国株のキャッシュを予熱
 */
async function prewarmUsStocks() {
  try {
    logger.info('Pre-warming US stocks cache');
    const symbols = PREWARM_SYMBOLS['us-stock'];
    const result = await enhancedMarketDataService.getUsStocksData(symbols, true);
    
    logger.info(`Successfully pre-warmed cache for ${Object.keys(result).length} US stocks`);
    return result;
  } catch (error) {
    logger.error('Error pre-warming US stocks cache:', error);
    throw error;
  }
}

/**
 * 日本株のキャッシュを予熱
 */
async function prewarmJpStocks() {
  try {
    logger.info('Pre-warming JP stocks cache');
    const symbols = PREWARM_SYMBOLS['jp-stock'];
    const result = await enhancedMarketDataService.getJpStocksData(symbols, true);
    
    logger.info(`Successfully pre-warmed cache for ${Object.keys(result).length} JP stocks`);
    return result;
  } catch (error) {
    logger.error('Error pre-warming JP stocks cache:', error);
    throw error;
  }
}

/**
 * 投資信託のキャッシュを予熱
 */
async function prewarmMutualFunds() {
  try {
    logger.info('Pre-warming mutual funds cache');
    const symbols = PREWARM_SYMBOLS['mutual-fund'];
    const result = await enhancedMarketDataService.getMutualFundsData(symbols, true);
    
    logger.info(`Successfully pre-warmed cache for ${Object.keys(result).length} mutual funds`);
    return result;
  } catch (error) {
    logger.error('Error pre-warming mutual funds cache:', error);
    throw error;
  }
}

/**
 * 為替レートのキャッシュを予熱
 */
async function prewarmExchangeRates() {
  try {
    logger.info('Pre-warming exchange rates cache');
    const results = {};
    
    for (const pair of PREWARM_SYMBOLS['exchange-rate']) {
      const [base, target] = pair.split('-');
      const result = await enhancedMarketDataService.getExchangeRateData(base, target, true);
      results[pair] = result;
    }
    
    logger.info(`Successfully pre-warmed cache for ${Object.keys(results).length} exchange rates`);
    return results;
  } catch (error) {
    logger.error('Error pre-warming exchange rates cache:', error);
    throw error;
  }
}
