/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/sources/enhancedMarketDataService.js
 * 
 * 説明: 
 * フォールバック対応強化版のマーケットデータサービス。
 * GitHubからのフォールバックデータを統合し、最終更新日時を明示的に管理します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */
'use strict';

const { fetchDataWithFallback, fetchBatchDataWithFallback } = require('../../utils/dataFetchWithFallback');
const alphaVantageService = require('./alphaVantageService');
const yahooFinanceService = require('./yahooFinance');
const yahooFinance2Service = require('./yahooFinance2Service');
const jpxCsvService = require('./jpxCsvService');
const scrapingService = require('./marketDataProviders');
const exchangeRateService = require('./exchangeRate');
const fundDataService = require('./fundDataService');
const { DATA_TYPES, BATCH_SIZES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * 米国株データを取得する（強化版）
 * @param {string} symbol - ティッカーシンボル
 * @param {boolean} [refresh=false] - キャッシュを無視するかどうか
 * @returns {Promise<Object>} 株価データ
 */
const getUsStockData = async (symbol, refresh = false) => {
  // データソース関数の配列（優先順位順）
  const fetchFunctions = [];
  
  // Yahoo Finance2 NPM（最優先 - 無料、APIキー不要）
  if (yahooFinance2Service.isAvailable()) {
    fetchFunctions.push((sym) => yahooFinance2Service.getStockDataFromYahooFinance2(sym, DATA_TYPES.US_STOCK));
    console.log(`Yahoo Finance2 NPM available for ${symbol}`);
  }
  
  // Alpha Vantage API（次優先 - 高品質データ）
  if (await alphaVantageService.isAvailable()) {
    fetchFunctions.push((sym) => alphaVantageService.getStockData(sym));
    console.log(`Alpha Vantage API available for ${symbol}`);
  }
  
  // Yahoo Finance API
  fetchFunctions.push((sym) => yahooFinanceService.getStockData(sym));
  
  // Yahoo Finance (スクレイピング)
  fetchFunctions.push((sym) => scrapingService.getUsStockData(sym));
  
  // デフォルト値
  const defaultValues = {
    price: 100,
    change: 0,
    changePercent: 0,
    name: symbol,
    currency: 'USD',
    isStock: true,
    isMutualFund: false
  };
  
  // 強化されたフォールバック処理付きでデータを取得
  return await fetchDataWithFallback({
    symbol,
    dataType: DATA_TYPES.US_STOCK,
    fetchFunctions,
    defaultValues,
    refresh,
    cache: { time: 3600 } // 1時間固定
  });
};

/**
 * 複数の米国株データを取得する（強化版）
 * @param {Array<string>} symbols - ティッカーシンボルの配列
 * @param {boolean} [refresh=false] - キャッシュを無視するかどうか
 * @returns {Promise<Object>} 銘柄をキーとするデータオブジェクト
 */
const getUsStocksData = async (symbols, refresh = false) => {
  // Yahoo Finance2 NPMが利用可能な場合は優先使用
  if (yahooFinance2Service.isAvailable()) {
    try {
      console.log(`Using Yahoo Finance2 NPM for ${symbols.length} symbols`);
      const yf2Results = await yahooFinance2Service.getBatchStockData(symbols, DATA_TYPES.US_STOCK);
      
      // 全ての銘柄が取得できた場合はそのまま返す
      const successfulResults = Object.values(yf2Results).filter(data => data !== null);
      if (successfulResults.length === symbols.length) {
        logger.info('Successfully fetched all US stocks using Yahoo Finance2 NPM');
        return yf2Results;
      }
      
      // 一部取得できなかった場合は不足分を他のソースで補完
      const missingSymbols = symbols.filter(symbol => !yf2Results[symbol]);
      if (missingSymbols.length > 0) {
        console.log(`Yahoo Finance2 missing ${missingSymbols.length} symbols, using fallback sources`);
      }
    } catch (error) {
      console.warn('Yahoo Finance2 batch request failed, falling back to other sources:', error.message);
    }
  }
  
  // Alpha Vantage APIが利用可能で、銘柄数が少ない場合は使用
  if (await alphaVantageService.isAvailable() && symbols.length <= 3) {
    try {
      console.log(`Using Alpha Vantage API for ${symbols.length} symbols`);
      const alphaResults = await alphaVantageService.getStocksData(symbols);
      
      // 全ての銘柄が取得できた場合はそのまま返す
      if (Object.keys(alphaResults).length === symbols.length) {
        logger.info('Successfully fetched all US stocks using Alpha Vantage API');
        return alphaResults;
      }
      
      // 一部取得できなかった場合は不足分をYahoo Financeで補完
      const missingSymbols = symbols.filter(symbol => !alphaResults[symbol]);
      if (missingSymbols.length > 0) {
        console.log(`Alpha Vantage missing ${missingSymbols.length} symbols, using Yahoo Finance for remainder`);
        const yahooResults = await yahooFinanceService.getStocksData(missingSymbols);
        return { ...alphaResults, ...yahooResults };
      }
      
      return alphaResults;
    } catch (error) {
      console.warn('Alpha Vantage batch request failed, falling back to Yahoo Finance:', error.message);
    }
  }
  
  // Yahoo Finance APIのバッチ取得を試みる
  try {
    const batchResults = await yahooFinanceService.getStocksData(symbols);
    
    // APIで取得できなかったシンボルをチェック
    const missingSymbols = symbols.filter(symbol => !batchResults[symbol]);
    
    // 全て取得できた場合はそのまま返す
    if (missingSymbols.length === 0) {
      logger.info('Successfully fetched all US stocks using Yahoo Finance API batch call');
      return batchResults;
    }
    
    // 取得できなかった銘柄は個別処理
    logger.info(`Yahoo Finance API missing ${missingSymbols.length} symbols, fetching individually`);
    
    const missingFetchFunctions = [];
    
    // Alpha Vantage API（利用可能で、不足分が少ない場合）
    if (await alphaVantageService.isAvailable() && missingSymbols.length <= 2) {
      missingFetchFunctions.push((sym) => alphaVantageService.getStockData(sym));
    }
    
    // Yahoo Finance (スクレイピング)
    missingFetchFunctions.push((sym) => scrapingService.getUsStockData(sym));
    
    const missingResults = await fetchBatchDataWithFallback({
      symbols: missingSymbols,
      dataType: DATA_TYPES.US_STOCK,
      fetchFunctions: missingFetchFunctions,
      defaultValues: {
        price: 100,
        change: 0,
        changePercent: 0,
        currency: 'USD',
        isStock: true,
        isMutualFund: false
      },
      refresh,
      batchSize: BATCH_SIZES.US_STOCK,
      cache: { time: 3600 } // 1時間固定
    });
    
    // 結果を統合
    return { ...batchResults, ...missingResults };
  } catch (error) {
    logger.error('Yahoo Finance API batch call failed, falling back to individual fetching:', error.message);
    
    // バッチAPIが完全に失敗した場合は個別取得
    const fallbackFunctions = [];
    
    // Yahoo Finance2 NPM（最優先）
    if (yahooFinance2Service.isAvailable()) {
      fallbackFunctions.push((sym) => yahooFinance2Service.getStockDataFromYahooFinance2(sym, DATA_TYPES.US_STOCK));
    }
    
    // Alpha Vantage API（利用可能な場合）
    if (await alphaVantageService.isAvailable()) {
      fallbackFunctions.push((sym) => alphaVantageService.getStockData(sym));
    }
    
    // Yahoo Finance API
    fallbackFunctions.push((sym) => yahooFinanceService.getStockData(sym));
    
    // Yahoo Finance (スクレイピング)
    fallbackFunctions.push((sym) => scrapingService.getUsStockData(sym));
    
    return await fetchBatchDataWithFallback({
      symbols,
      dataType: DATA_TYPES.US_STOCK,
      fetchFunctions: fallbackFunctions,
      defaultValues: {
        price: 100,
        change: 0,
        changePercent: 0,
        currency: 'USD',
        isStock: true,
        isMutualFund: false
      },
      refresh,
      batchSize: BATCH_SIZES.US_STOCK,
      cache: { time: 3600 } // 1時間固定
    });
  }
};

/**
 * 日本株データを取得する（強化版）
 * @param {string} code - 証券コード（4桁）
 * @param {boolean} [refresh=false] - キャッシュを無視するかどうか
 * @returns {Promise<Object>} 株価データ
 */
const getJpStockData = async (code, refresh = false) => {
  // データソース関数の配列
  const fetchFunctions = [
    // Yahoo Finance2 NPM（最優先 - 無料、APIキー不要）
    ...(yahooFinance2Service.isAvailable() ? 
      [(sym) => yahooFinance2Service.getStockDataFromYahooFinance2(sym, DATA_TYPES.JP_STOCK)] : 
      []),
    // JPX CSV（次優先 - 無料、公式データ）
    (sym) => jpxCsvService.getJPXStockData(sym),
    // Yahoo Finance Japan (スクレイピング)
    (sym) => scrapingService.getJpStockData(sym),
  ];
  
  // デフォルト値
  const defaultValues = {
    price: 2500,
    change: 0,
    changePercent: 0,
    name: `日本株 ${code}`,
    currency: 'JPY',
    isStock: true,
    isMutualFund: false
  };
  
  // 強化されたフォールバック処理付きでデータを取得
  return await fetchDataWithFallback({
    symbol: code,
    dataType: DATA_TYPES.JP_STOCK,
    fetchFunctions,
    defaultValues,
    refresh,
    cache: { time: 3600 } // 1時間固定
  });
};

/**
 * 複数の日本株データを取得する（強化版）
 * @param {Array<string>} codes - 証券コードの配列
 * @param {boolean} [refresh=false] - キャッシュを無視するかどうか
 * @returns {Promise<Object>} 銘柄をキーとするデータオブジェクト
 */
const getJpStocksData = async (codes, refresh = false) => {
  // Yahoo Finance2 NPMが利用可能な場合は優先使用
  if (yahooFinance2Service.isAvailable()) {
    try {
      console.log(`Using Yahoo Finance2 NPM for ${codes.length} JP stocks`);
      const yf2Results = await yahooFinance2Service.getBatchStockData(codes, DATA_TYPES.JP_STOCK);
      
      // 全ての銘柄が取得できた場合はそのまま返す
      const successfulResults = Object.values(yf2Results).filter(data => data !== null);
      if (successfulResults.length === codes.length) {
        logger.info('Successfully fetched all JP stocks using Yahoo Finance2 NPM');
        return yf2Results;
      }
    } catch (error) {
      console.warn('Yahoo Finance2 JP batch request failed:', error.message);
    }
  }
  
  // JPX CSVでバッチ取得を試みる
  try {
    console.log(`Using JPX CSV for ${codes.length} JP stocks`);
    const jpxResults = await jpxCsvService.getBatchJPXData(codes);
    
    // 全ての銘柄が取得できた場合はそのまま返す
    const successfulResults = Object.values(jpxResults).filter(data => data !== null);
    if (successfulResults.length === codes.length) {
      logger.info('Successfully fetched all JP stocks using JPX CSV');
      return jpxResults;
    }
  } catch (error) {
    console.warn('JPX CSV batch request failed:', error.message);
  }
  
  return await fetchBatchDataWithFallback({
    symbols: codes,
    dataType: DATA_TYPES.JP_STOCK,
    fetchFunctions: [
      // Yahoo Finance2 NPM
      ...(yahooFinance2Service.isAvailable() ? 
        [(sym) => yahooFinance2Service.getStockDataFromYahooFinance2(sym, DATA_TYPES.JP_STOCK)] : 
        []),
      // JPX CSV
      (sym) => jpxCsvService.getJPXStockData(sym),
      // Yahoo Finance Japan (スクレイピング)
      (sym) => scrapingService.getJpStockData(sym),
    ],
    defaultValues: {
      price: 2500,
      change: 0,
      changePercent: 0,
      currency: 'JPY',
      isStock: true,
      isMutualFund: false
    },
    refresh,
    batchSize: BATCH_SIZES.JP_STOCK,
    cache: { time: 3600 } // 1時間固定
  });
};

/**
 * 投資信託データを取得する（強化版）
 * @param {string} code - ファンドコード
 * @param {boolean} [refresh=false] - キャッシュを無視するかどうか
 * @returns {Promise<Object>} 投資信託データ
 */
const getMutualFundData = async (code, refresh = false) => {
  // データソース関数の配列
  const fetchFunctions = [
    // Morningstar CSV
    (sym) => fundDataService.getMutualFundData(sym),
  ];
  
  // デフォルト値
  const defaultValues = {
    price: 10000,
    change: 0,
    changePercent: 0,
    name: `投資信託 ${code}C`,
    currency: 'JPY',
    isStock: false,
    isMutualFund: true,
    priceLabel: '基準価額'
  };
  
  // 強化されたフォールバック処理付きでデータを取得
  return await fetchDataWithFallback({
    symbol: code,
    dataType: DATA_TYPES.MUTUAL_FUND,
    fetchFunctions,
    defaultValues,
    refresh,
    cache: { time: 3600 } // 1時間固定
  });
};

/**
 * 複数の投資信託データを取得する（強化版）
 * @param {Array<string>} codes - ファンドコードの配列
 * @param {boolean} [refresh=false] - キャッシュを無視するかどうか
 * @returns {Promise<Object>} ファンドコードをキーとするデータオブジェクト
 */
const getMutualFundsData = async (codes, refresh = false) => {
  return await fetchBatchDataWithFallback({
    symbols: codes,
    dataType: DATA_TYPES.MUTUAL_FUND,
    fetchFunctions: [
      // Morningstar CSV
      (sym) => fundDataService.getMutualFundData(sym),
    ],
    defaultValues: {
      price: 10000,
      change: 0,
      changePercent: 0,
      currency: 'JPY',
      isStock: false,
      isMutualFund: true,
      priceLabel: '基準価額'
    },
    refresh,
    batchSize: BATCH_SIZES.MUTUAL_FUND,
    cache: { time: 3600 } // 1時間固定
  });
};

/**
 * 為替レートデータを取得する（強化版）
 * @param {string} base - ベース通貨
 * @param {string} target - ターゲット通貨
 * @param {boolean} [refresh=false] - キャッシュを無視するかどうか
 * @returns {Promise<Object>} 為替レートデータ
 */
const getExchangeRateData = async (base, target, refresh = false) => {
  // 為替レートに特化した処理
  const pair = `${base}-${target}`;
  
  // データソース関数
  const fetchFunctions = [
    // Yahoo Finance2 NPM（最優先 - 無料、APIキー不要）
    ...(yahooFinance2Service.isAvailable() ? 
      [async () => {
        try {
          return await yahooFinance2Service.getExchangeRate(base, target);
        } catch (error) {
          logger.debug(`Yahoo Finance2 exchange rate error for ${pair}:`, error.message);
          throw error;
        }
      }] : 
      []),
    // 既存の為替レートサービス
    async () => {
      try {
        return await exchangeRateService.getExchangeRate(base, target);
      } catch (error) {
        logger.error(`Error getting exchange rate for ${pair}:`, error.message);
        throw error;
      }
    }
  ];
  
  // デフォルト値
  const defaultValues = {
    pair,
    base,
    target,
    rate: base === 'USD' && target === 'JPY' ? 148.5 : 1.0,
    change: 0,
    changePercent: 0
  };
  
  // 強化されたフォールバック処理付きでデータを取得
  return await fetchDataWithFallback({
    symbol: pair,
    dataType: DATA_TYPES.EXCHANGE_RATE,
    fetchFunctions,
    defaultValues,
    refresh,
    cache: { time: 3600 } // 1時間固定
  });
};

/**
 * 複数の為替レートデータを一括で取得する（最適化版）
 * @param {Array<Array>} pairs - 通貨ペアの配列 [[base, target], ...]
 * @param {boolean} [refresh=false] - キャッシュを無視するかどうか
 * @returns {Promise<Object>} 為替レートデータのオブジェクト
 */
const getMultipleExchangeRatesData = async (pairs, refresh = false) => {
  const results = {};
  
  // Yahoo Finance2が利用可能な場合は優先使用
  if (yahooFinance2Service.isAvailable()) {
    const promises = pairs.map(async ([base, target]) => {
      const pair = `${base}-${target}`;
      
      try {
        const data = await yahooFinance2Service.getExchangeRate(base, target);
        return { pair, data };
      } catch (error) {
        logger.debug(`Yahoo Finance2 exchange rate error for ${pair}:`, error.message);
        return { pair, data: null };
      }
    });
    
    const yf2Results = await Promise.all(promises);
    
    // 成功したものを結果に追加
    yf2Results.forEach(({ pair, data }) => {
      if (data) {
        results[pair] = data;
      }
    });
    
    // 全て成功した場合は返す
    if (Object.keys(results).length === pairs.length) {
      logger.info('Successfully fetched all exchange rates using Yahoo Finance2');
      return results;
    }
  }
  
  // 残りの為替ペアを既存サービスで取得
  const promises = pairs.map(async ([base, target]) => {
    const pair = `${base}-${target}`;
    
    // Yahoo Finance2で既に取得済みの場合はスキップ
    if (results[pair]) {
      return { pair, data: results[pair] };
    }
    
    try {
      // 直接exchangeRateServiceを呼び出してキャッシュチェックを回避
      const data = await exchangeRateService.getExchangeRate(base, target);
      return { pair, data };
    } catch (error) {
      logger.error(`Error getting exchange rate for ${pair}:`, error.message);
      // エラー時はデフォルト値を返す
      return {
        pair,
        data: {
          pair,
          base,
          target,
          rate: base === 'USD' && target === 'JPY' ? 148.5 : 1.0,
          change: 0,
          changePercent: 0,
          source: 'Default',
          lastUpdated: new Date().toISOString()
        }
      };
    }
  });
  
  const pairResults = await Promise.all(promises);
  
  pairResults.forEach(({ pair, data }) => {
    results[pair] = data;
  });
  
  return results;
};

module.exports = {
  getUsStockData,
  getUsStocksData,
  getJpStockData,
  getJpStocksData,
  getMutualFundData,
  getMutualFundsData,
  getExchangeRateData,
  getMultipleExchangeRatesData
};
