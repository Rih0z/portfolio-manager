/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/utils/dataFetchWithFallback.js
 * 
 * 説明: 
 * 複数のデータソースからのフェッチとフォールバック処理を提供するユーティリティ。
 * データ取得に失敗した場合、代替データソースを順に試行します。
 * キャッシュ機能や失敗時のデフォルト値提供も含まれます。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-16
 */
'use strict';

const cacheService = require('../services/cache');
const alertService = require('../services/alerts');
const logger = require('./logger');
const { sleep } = require('./retry');

/**
 * 単一銘柄のデータをフォールバック機能付きで取得する
 * @param {Object} options - 取得オプション
 * @param {string} options.symbol - ティッカーシンボルまたは証券コード
 * @param {string} options.dataType - データタイプ（constants.jsのDATA_TYPES参照）
 * @param {Array<Function>} options.fetchFunctions - データ取得関数の配列
 * @param {Object} options.defaultValues - 取得失敗時のデフォルト値
 * @param {boolean} options.refresh - キャッシュを無視するフラグ
 * @param {Object} options.cache - キャッシュ設定（time: キャッシュ時間）
 * @returns {Promise<Object>} 取得されたデータ
 */
const fetchDataWithFallback = async (options) => {
  const {
    symbol,
    dataType,
    fetchFunctions,
    defaultValues,
    refresh = false,
    cache = { time: 300 } // デフォルト: 5分
  } = options;
  
  if (!symbol || !dataType || !fetchFunctions || !Array.isArray(fetchFunctions)) {
    throw new Error('Invalid fetchDataWithFallback parameters');
  }
  
  // キャッシュキーの構築
  const cacheKey = `${dataType}:${symbol}`;
  
  // キャッシュチェック（リフレッシュフラグがfalseの場合のみ）
  if (!refresh) {
    try {
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData && cachedData.data) {
        logger.info(`Using cached data for ${dataType} ${symbol}`);
        return cachedData.data;
      }
    } catch (cacheError) {
      logger.warn(`Cache retrieval error for ${dataType} ${symbol}: ${cacheError.message}`);
      // キャッシュエラーは無視して処理継続
    }
  }
  
  // エラー情報を保持する配列
  const errors = [];
  
  // 各データソースを順に試す
  for (let i = 0; i < fetchFunctions.length; i++) {
    const fetchFunction = fetchFunctions[i];
    const sourceIndex = i + 1;
    
    try {
      logger.info(`Trying data source #${sourceIndex} for ${dataType} ${symbol}`);
      
      // データ取得関数呼び出し
      const data = await fetchFunction(symbol);
      
      // 有効なデータが取得できたか確認
      if (data && data.price !== undefined && !isNaN(data.price)) {
        logger.info(`Successfully fetched ${dataType} ${symbol} from source #${sourceIndex}`);
        
        // データを標準化（必要に応じてデフォルト値を使用）
        const normalizedData = {
          ticker: symbol,
          ...defaultValues,
          ...data,
          lastUpdated: data.lastUpdated || new Date().toISOString()
        };
        
        // キャッシュに保存
        try {
          await cacheService.set(cacheKey, normalizedData, cache.time);
        } catch (cacheError) {
          logger.warn(`Failed to cache data for ${dataType} ${symbol}: ${cacheError.message}`);
          // キャッシュに保存できなくても処理継続
        }
        
        return normalizedData;
      }
      
      // データが無効の場合は次のソースを試す
      errors.push({
        source: sourceIndex,
        error: new Error(`Invalid data returned (no price)`)
      });
      
    } catch (error) {
      // エラー情報を記録して次のソースを試す
      errors.push({
        source: sourceIndex,
        error
      });
      logger.warn(`Error fetching ${dataType} ${symbol} from source #${sourceIndex}: ${error.message}`);
    }
  }
  
  // すべてのデータソースが失敗した場合はデフォルト値を返す
  logger.warn(`All data sources failed for ${dataType} ${symbol}. Using default values.`);
  
  // エラー情報をアラート（エラーが多すぎるのを防ぐため低確率で送信）
  if (Math.random() < 0.1) { // 10%の確率でアラート
    await alertService.notifyError(
      `All Data Sources Failed for ${dataType}`,
      new Error(`Failed to fetch data for ${symbol} from all available sources`),
      {
        symbol,
        dataType,
        errors: errors.map(e => ({ source: e.source, message: e.error.message }))
      }
    );
  }
  
  // デフォルト値を使用
  const defaultData = {
    ticker: symbol,
    ...defaultValues,
    lastUpdated: new Date().toISOString(),
    source: 'Default Fallback',
    isDefault: true,
    errors: errors.map(e => ({ source: e.source, message: e.error.message }))
  };
  
  // キャッシュにデフォルト値を短い時間だけ保存（次回すぐに再試行できるように）
  try {
    await cacheService.set(cacheKey, defaultData, Math.min(cache.time / 3, 60)); // 1分または通常の1/3の短い時間
  } catch (cacheError) {
    logger.warn(`Failed to cache default data for ${dataType} ${symbol}: ${cacheError.message}`);
  }
  
  return defaultData;
};

/**
 * 複数銘柄のデータをバッチ処理で取得する（フォールバック機能付き）
 * @param {Object} options - 取得オプション
 * @param {Array<string>} options.symbols - シンボルの配列
 * @param {string} options.dataType - データタイプ（constants.jsのDATA_TYPES参照）
 * @param {Array<Function>} options.fetchFunctions - データ取得関数の配列
 * @param {Object} options.defaultValues - 取得失敗時のデフォルト値
 * @param {boolean} options.refresh - キャッシュを無視するフラグ
 * @param {number} options.batchSize - バッチサイズ
 * @param {number} options.delay - バッチ間の遅延時間（ミリ秒）
 * @param {Object} options.cache - キャッシュ設定（time: キャッシュ時間）
 * @returns {Promise<Object>} 取得されたデータのオブジェクト（シンボルをキーとする）
 */
const fetchBatchDataWithFallback = async (options) => {
  const {
    symbols,
    dataType,
    fetchFunctions,
    defaultValues,
    refresh = false,
    batchSize = 10,
    delay = 500,
    cache = { time: 300 } // デフォルト: 5分
  } = options;
  
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('Invalid symbols array');
  }
  
  if (!dataType || !fetchFunctions || !Array.isArray(fetchFunctions)) {
    throw new Error('Invalid fetchBatchDataWithFallback parameters');
  }
  
  // 結果オブジェクト
  const results = {};
  
  // キャッシュから取得（リフレッシュフラグがfalseの場合のみ）
  if (!refresh) {
    // 全シンボルに対してキャッシュをチェック
    const cacheCheckPromises = symbols.map(async (symbol) => {
      try {
        const cacheKey = `${dataType}:${symbol}`;
        const cachedData = await cacheService.get(cacheKey);
        
        if (cachedData && cachedData.data) {
          results[symbol] = cachedData.data;
          return true; // キャッシュヒット
        }
        return false; // キャッシュミス
      } catch (error) {
        logger.warn(`Cache check error for ${symbol}: ${error.message}`);
        return false;
      }
    });
    
    await Promise.all(cacheCheckPromises);
  }
  
  // キャッシュにないシンボルのリスト
  const missingSymbols = symbols.filter(symbol => !results[symbol]);
  
  if (missingSymbols.length === 0) {
    // 全てのデータがキャッシュから取得できた場合
    logger.info(`All ${symbols.length} symbols for ${dataType} were retrieved from cache`);
    return results;
  }
  
  logger.info(`Fetching ${missingSymbols.length} missing symbols for ${dataType}`);
  
  // バッチに分割
  for (let i = 0; i < missingSymbols.length; i += batchSize) {
    const batchSymbols = missingSymbols.slice(i, i + batchSize);
    logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} with ${batchSymbols.length} symbols`);
    
    // バッチ内のシンボルを並列処理
    const batchPromises = batchSymbols.map(async (symbol) => {
      try {
        // 個別シンボルのデータ取得（フォールバック処理含む）
        const data = await fetchDataWithFallback({
          symbol,
          dataType,
          fetchFunctions,
          defaultValues,
          refresh,
          cache
        });
        
        // 結果を格納
        results[symbol] = data;
      } catch (error) {
        logger.error(`Error processing ${symbol}: ${error.message}`);
        
        // エラー時もデフォルト値を返す
        results[symbol] = {
          ticker: symbol,
          ...defaultValues,
          lastUpdated: new Date().toISOString(),
          source: 'Error',
          error: error.message
        };
      }
    });
    
    // バッチ内のすべてのシンボルを処理
    await Promise.all(batchPromises);
    
    // API制限を回避するためのバッチ間の遅延
    if (i + batchSize < missingSymbols.length) {
      logger.debug(`Delaying ${delay}ms before next batch`);
      await sleep(delay);
    }
  }
  
  return results;
};

module.exports = {
  fetchDataWithFallback,
  fetchBatchDataWithFallback
};
