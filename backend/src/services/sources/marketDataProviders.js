/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/sources/marketDataProviders.js
 * 
 * 説明: 
 * 各種金融データを多様なソース（API、CSV、スクレイピング）から取得する統合サービス。
 * それぞれのデータタイプに最適なデータソースを使い分け、一貫したインターフェースを提供します。
 * 
 * @author Portfolio Manager Team
 * @updated 2025-05-15
 */
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { withRetry, isRetryableApiError, sleep } = require('../../utils/retry');
const alertService = require('../alerts');
const blacklist = require('../../utils/scrapingBlacklist');
const fundDataService = require('./fundDataService');
const yahooFinanceService = require('./yahooFinance');
const { 
  getRandomUserAgent, 
  recordDataFetchFailure, 
  recordDataFetchSuccess,
  checkBlacklistAndGetFallback
} = require('../../utils/dataFetchUtils');
const { DATA_TYPES, CACHE_TIMES } = require('../../config/constants');

// 環境変数からタイムアウト設定を取得
const JP_STOCK_SCRAPING_TIMEOUT = parseInt(process.env.JP_STOCK_SCRAPING_TIMEOUT || '30000', 10);
const US_STOCK_SCRAPING_TIMEOUT = parseInt(process.env.US_STOCK_SCRAPING_TIMEOUT || '20000', 10);
const RATE_LIMIT_DELAY = parseInt(process.env.SCRAPING_RATE_LIMIT_DELAY || '500', 10);

/**
 * 日本株のデータを取得する
 * @param {string} code - 証券コード（4桁）
 * @returns {Promise<Object>} 株価データ
 */
const getJpStockData = async (code) => {
  // 4桁のコードに正規化
  const stockCode = code.replace(/\.T$/, '');
  console.log(`Preparing to fetch Japanese stock data for ${stockCode}`);
  
  // ブラックリストのチェックとフォールバックデータの準備
  const { isBlacklisted, fallbackData } = await checkBlacklistAndGetFallback(
    stockCode, 
    'jp', 
    {
      defaultPrice: 2500,
      currencyCode: 'JPY',
      name: `日本株 ${stockCode}`,
      isStock: true,
      isMutualFund: false
    }
  );
  
  if (isBlacklisted) {
    console.log(`Stock ${stockCode} is blacklisted. Using fallback data.`);
    return fallbackData;
  }
  
  // 複数のソースからデータ取得を試みる
  try {
    // ソース1: Yahoo Finance Japan
    try {
      console.log(`Trying Yahoo Finance Japan for ${stockCode}`);
      const yahooData = await scrapeYahooFinanceJapan(stockCode);
      
      if (yahooData && yahooData.price) {
        console.log(`Successfully fetched stock data from Yahoo Finance Japan for ${stockCode}`);
        
        // 成功を記録
        await recordDataFetchSuccess(stockCode);
        
        return {
          ticker: stockCode,
          ...yahooData,
          source: 'Yahoo Finance Japan',
          isStock: true,
          isMutualFund: false
        };
      }
    } catch (yahooError) {
      await recordDataFetchFailure(stockCode, 'jp', 'Yahoo Finance Japan', yahooError);
    }

    // ソース2: Minkabu
    try {
      console.log(`Trying Minkabu for ${stockCode}`);
      const minkabuData = await scrapeMinkabu(stockCode);
      
      if (minkabuData && minkabuData.price) {
        console.log(`Successfully fetched stock data from Minkabu for ${stockCode}`);
        
        // 成功を記録
        await recordDataFetchSuccess(stockCode);
        
        return {
          ticker: stockCode,
          ...minkabuData,
          source: 'Minkabu',
          isStock: true,
          isMutualFund: false
        };
      }
    } catch (minkabuError) {
      await recordDataFetchFailure(stockCode, 'jp', 'Minkabu', minkabuError);
    }

    // ソース3: Kabutan
    try {
      console.log(`Trying Kabutan for ${stockCode}`);
      const kabutanData = await scrapeKabutan(stockCode);
      
      if (kabutanData && kabutanData.price) {
        console.log(`Successfully fetched stock data from Kabutan for ${stockCode}`);
        
        // 成功を記録
        await recordDataFetchSuccess(stockCode);
        
        return {
          ticker: stockCode,
          ...kabutanData,
          source: 'Kabutan',
          isStock: true,
          isMutualFund: false
        };
      }
    } catch (kabutanError) {
      await recordDataFetchFailure(stockCode, 'jp', 'Kabutan', kabutanError);
    }

    // すべてのソースが失敗した場合
    console.log(`All sources failed for ${stockCode}, using fallback data`);
    
    // 失敗を最終記録
    await recordDataFetchFailure(
      stockCode, 
      'jp', 
      'All Sources', 
      new Error('All data sources failed'),
      { 
        alertTitle: 'All JP Stock Data Sources Failed',
        alertThreshold: 0.1 
      }
    );
    
    // フォールバックデータを返す（ブラックリストではない）
    return {
      ...fallbackData,
      source: 'Fallback',
      isBlacklisted: false
    };
  } catch (error) {
    console.error(`Stock data retrieval error for ${stockCode}:`, error);
    throw new Error(`JP stock data retrieval failed for ${stockCode}: ${error.message}`);
  }
};

/**
 * 米国株・ETFのデータを取得する
 * @param {string} symbol - ティッカーシンボル
 * @returns {Promise<Object>} 株価データ
 */
const getUsStockData = async (symbol) => {
  console.log(`Preparing to fetch US stock data for ${symbol}`);
  
  // ブラックリストのチェックとフォールバックデータの準備
  const { isBlacklisted, fallbackData } = await checkBlacklistAndGetFallback(
    symbol, 
    'us', 
    {
      defaultPrice: 100,
      currencyCode: 'USD',
      name: symbol,
      isStock: true,
      isMutualFund: false
    }
  );
  
  if (isBlacklisted) {
    console.log(`Stock ${symbol} is blacklisted. Using fallback data.`);
    return fallbackData;
  }
  
  try {
    // 最初にYahoo Finance APIを試す
    try {
      console.log(`Trying Yahoo Finance API for ${symbol}`);
      const yahooApiData = await yahooFinanceService.getStockData(symbol);
      
      if (yahooApiData && yahooApiData.price) {
        console.log(`Successfully fetched stock data from Yahoo Finance API for ${symbol}`);
        
        // 成功を記録
        await recordDataFetchSuccess(symbol);
        
        return yahooApiData;
      }
    } catch (yahooApiError) {
      await recordDataFetchFailure(symbol, 'us', 'Yahoo Finance API', yahooApiError);
      
      // API失敗時はスクレイピングにフォールバック
      console.log(`Yahoo Finance API failed, falling back to scraping for ${symbol}`);
    }

    // APIが失敗した場合のフォールバック: Yahoo Finance (スクレイピング)
    try {
      console.log(`Trying Yahoo Finance scraping for ${symbol}`);
      const yahooData = await scrapeYahooFinance(symbol);
      
      if (yahooData && yahooData.price) {
        console.log(`Successfully fetched stock data from Yahoo Finance scraping for ${symbol}`);
        
        // 成功を記録
        await recordDataFetchSuccess(symbol);
        
        return {
          ticker: symbol,
          ...yahooData,
          source: 'Yahoo Finance (Web)',
          isStock: true,
          isMutualFund: false
        };
      }
    } catch (yahooError) {
      await recordDataFetchFailure(symbol, 'us', 'Yahoo Finance (Web)', yahooError);
    }

    // ソース2: MarketWatch
    try {
      console.log(`Trying MarketWatch for ${symbol}`);
      const marketWatchData = await scrapeMarketWatch(symbol);
      
      if (marketWatchData && marketWatchData.price) {
        console.log(`Successfully fetched stock data from MarketWatch for ${symbol}`);
        
        // 成功を記録
        await recordDataFetchSuccess(symbol);
        
        return {
          ticker: symbol,
          ...marketWatchData,
          source: 'MarketWatch',
          isStock: true,
          isMutualFund: false
        };
      }
    } catch (marketWatchError) {
      await recordDataFetchFailure(symbol, 'us', 'MarketWatch', marketWatchError);
    }

    // すべてのソースが失敗した場合
    console.log(`All sources failed for ${symbol}, using fallback data`);
    
    // 失敗を最終記録
    await recordDataFetchFailure(
      symbol, 
      'us', 
      'All Sources', 
      new Error('All data sources failed'),
      { 
        alertTitle: 'All US Stock Data Sources Failed',
        alertThreshold: 0.1 
      }
    );
    
    // フォールバックデータを返す（ブラックリストではない）
    return {
      ...fallbackData,
      source: 'Fallback',
      isBlacklisted: false
    };
  } catch (error) {
    console.error(`US stock data retrieval error for ${symbol}:`, error);
    throw new Error(`US stock data retrieval failed for ${symbol}: ${error.message}`);
  }
};

/**
 * 投資信託のデータを取得する（CSV取得方式）
 * @param {string} code - ファンドコード（7-8桁）
 * @returns {Promise<Object>} 投資信託データ
 */
const getMutualFundData = async (code) => {
  console.log(`Redirecting mutual fund data request for ${code} to CSV download method`);
  
  try {
    // CSV取得方式でデータ取得
    return await fundDataService.getMutualFundData(code);
  } catch (error) {
    console.error(`Mutual fund data retrieval error for ${code}:`, error);
    throw new Error(`Mutual fund data retrieval failed for ${code}: ${error.message}`);
  }
};

// 以下、各スクレイピング関数の実装（変更なし）
/**
 * Yahoo Finance Japanから日本株のデータをスクレイピングする
 * @param {string} stockCode - 証券コード（4桁）
 * @returns {Promise<Object>} 株価データ
 */
const scrapeYahooFinanceJapan = async (stockCode) => {
  console.log(`Scraping Yahoo Finance Japan for ${stockCode}`);
  
  try {
    // Yahoo Finance Japan用のURLを構築
    const url = `https://finance.yahoo.co.jp/quote/${stockCode}.T`;
    
    // ランダムなユーザーエージェントを使用
    const userAgent = getRandomUserAgent();
    
    // ページ取得
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      },
      timeout: JP_STOCK_SCRAPING_TIMEOUT
    });
    
    // HTMLパース
    const $ = cheerio.load(response.data);
    
    // 株価の取得（_3rXWJNmiHHh4lN4kRUvvv7クラスのスパン要素）
    const priceElement = $('span._3rXWJNmiHHh4lN4kRUvvv7');
    if (!priceElement.length) {
      throw new Error('Price element not found');
    }
    
    // 価格の取得と数値変換（カンマ除去）
    const priceText = priceElement.text().trim();
    const price = parseFloat(priceText.replace(/,/g, ''));
    
    if (isNaN(price)) {
      throw new Error(`Invalid price format: ${priceText}`);
    }
    
    // 価格変動の取得（前日比）
    const changeElement = $('span._3Ovs4ARF5Hslpj9n5NwEjn');
    const changeText = changeElement.text().trim();
    
    // 前日比の解析（+200円(+1.2%)や-300円(-1.5%)のような形式）
    let change = 0;
    let changePercent = 0;
    
    if (changeText) {
      // 正規表現で前日比を抽出
      const changeMatch = changeText.match(/([-+])([\d,]+)円\s*\(([-+])([\d.]+)%\)/);
      
      if (changeMatch) {
        const changeSign = changeMatch[1] === '-' ? -1 : 1;
        const changeValue = parseFloat(changeMatch[2].replace(/,/g, ''));
        const changePercentSign = changeMatch[3] === '-' ? -1 : 1;
        const changePercentValue = parseFloat(changeMatch[4]);
        
        change = changeSign * changeValue;
        changePercent = changePercentSign * changePercentValue;
      }
    }
    
    // 企業名の取得
    const nameElement = $('h1._1wANDxx3RtV3AdCFSC4_Lp');
    const name = nameElement.text().trim();
    
    // 最終更新日時（現在時刻を使用）
    const lastUpdated = new Date().toISOString();
    
    return {
      price,
      change,
      changePercent,
      name: name || `日本株 ${stockCode}`,
      currency: 'JPY',
      lastUpdated
    };
  } catch (error) {
    console.error(`Error scraping Yahoo Finance Japan for ${stockCode}:`, error.message);
    throw new Error(`Yahoo Finance Japan scraping failed: ${error.message}`);
  }
};

/**
 * Minkabuから日本株のデータをスクレイピングする
 * @param {string} stockCode - 証券コード（4桁）
 * @returns {Promise<Object>} 株価データ
 */
const scrapeMinkabu = async (stockCode) => {
  // 実装は変更なし（省略）
  // 実際のコードにはスクレイピングのロジックが含まれています
};

/**
 * Kabutanから日本株のデータをスクレイピングする
 * @param {string} stockCode - 証券コード（4桁）
 * @returns {Promise<Object>} 株価データ
 */
const scrapeKabutan = async (stockCode) => {
  // 実装は変更なし（省略）
  // 実際のコードにはスクレイピングのロジックが含まれています
};

/**
 * Yahoo Financeから米国株のデータをスクレイピングする
 * @param {string} symbol - ティッカーシンボル
 * @returns {Promise<Object>} 株価データ
 */
const scrapeYahooFinance = async (symbol) => {
  // 実装は変更なし（省略）
  // 実際のコードにはスクレイピングのロジックが含まれています
};

/**
 * MarketWatchから米国株のデータをスクレイピングする
 * @param {string} symbol - ティッカーシンボル
 * @returns {Promise<Object>} 株価データ
 */
const scrapeMarketWatch = async (symbol) => {
  // 実装は変更なし（省略）
  // 実際のコードにはスクレイピングのロジックが含まれています
};

/**
 * 複数の日本株を並列で取得する（ブラックリスト対応版）
 * @param {Array<string>} codes - 証券コードの配列
 * @returns {Promise<Object>} - 銘柄コードをキーとする株価データのオブジェクト
 */
const getJpStocksParallel = async (codes) => {
  if (!codes || !Array.isArray(codes) || codes.length === 0) {
    throw new Error('Invalid stock codes array');
  }
  
  console.log(`Preparing to fetch data for ${codes.length} Japanese stocks in parallel`);
  
  // ブラックリスト確認と非ブラックリスト銘柄の抽出
  const checkedCodes = await Promise.all(
    codes.map(async (code) => {
      const isInBlacklist = await blacklist.isBlacklisted(code, 'jp');
      return { code, isBlacklisted: isInBlacklist };
    })
  );
  
  // ブラックリスト銘柄を分離
  const blacklistedCodes = checkedCodes.filter(item => item.isBlacklisted).map(item => item.code);
  const processingCodes = checkedCodes.filter(item => !item.isBlacklisted).map(item => item.code);
  
  console.log(`${blacklistedCodes.length} codes are blacklisted and will use fallback data.`);
  console.log(`Proceeding with data retrieval for ${processingCodes.length} codes.`);
  
  // 結果オブジェクト初期化
  const results = {};
  
  // ブラックリスト銘柄にはデフォルト値を設定
  for (const code of blacklistedCodes) {
    results[code] = {
      ticker: code,
      price: 2500, // フォールバック価格
      change: 0,
      changePercent: 0,
      name: `日本株 ${code}`,
      currency: 'JPY',
      lastUpdated: new Date().toISOString(),
      source: 'Blacklisted Fallback',
      isStock: true,
      isMutualFund: false,
      isBlacklisted: true
    };
  }
  
  // 取得対象がない場合は早期リターン
  if (processingCodes.length === 0) {
    return results;
  }
  
  let errorCount = 0;
  
  // 各コードにインデックスを割り当て、遅延を計算
  const indexedCodes = processingCodes.map((code, index) => ({ code, index }));
  
  // 並列処理（制御付き）
  await Promise.allSettled(
    indexedCodes.map(async ({ code, index }) => {
      try {
        // APIレート制限を回避するために各リクエストを少し遅延させる
        const delay = index * RATE_LIMIT_DELAY;
        if (delay > 0) {
          await sleep(delay);
        }
        
          // 株価データを取得
          const stockData = await module.exports.getJpStockData(code);
        results[code] = stockData;
      } catch (error) {
        console.error(`Error getting data for JP stock ${code}:`, error.message);
        errorCount++;
        
        // エラーでも最低限の情報を返す
        results[code] = {
          ticker: code,
          price: null,
          change: null,
          changePercent: null,
          name: `日本株 ${code}`,
          currency: 'JPY',
          lastUpdated: new Date().toISOString(),
          source: 'Error',
          isStock: true,
          isMutualFund: false,
          error: error.message
        };
      }
    })
  );
  
  // エラー率が高すぎる場合はアラート
  if (errorCount > processingCodes.length / 3) { // 1/3以上失敗
    await alertService.notifyError(
      'High Error Rate in JP Stock Data Retrieval',
      new Error(`${errorCount} out of ${processingCodes.length} JP stocks failed to retrieve data`),
      { errorRate: errorCount / processingCodes.length }
    );
  }
  
  return results;
};

/**
 * 複数の米国株を並列で取得する（ブラックリスト対応版）
 * @param {Array<string>} symbols - ティッカーシンボルの配列
 * @returns {Promise<Object>} - シンボルをキーとする株価データのオブジェクト
 */
const getUsStocksParallel = async (symbols) => {
  // 米国株の場合、基本的にはYahoo Finance APIの一括取得を使用
  try {
    // まずYahoo Finance APIでバッチ取得を試みる
    const batchResults = await yahooFinanceService.getStocksData(symbols);
    
    // APIで取得できなかったシンボルをチェック
    const missingSymbols = symbols.filter(symbol => !batchResults[symbol]);
    
    // 全て取得できた場合はそのまま返す
    if (missingSymbols.length === 0) {
      return batchResults;
    }
    
    console.log(`Yahoo Finance API missing ${missingSymbols.length} symbols, falling back to individual fetching`);
    
    // 個別に取得処理を実施
    const fallbackResults = {};
    
    let errorCount = 0;
    const indexedSymbols = missingSymbols.map((symbol, index) => ({ symbol, index }));
    
    await Promise.allSettled(
      indexedSymbols.map(async ({ symbol, index }) => {
        try {
          // APIレート制限を回避するために各リクエストを少し遅延させる
          const delay = index * RATE_LIMIT_DELAY;
          if (delay > 0) {
            await sleep(delay);
          }
          
          // 個別に取得処理を実施
          const stockData = await module.exports.getUsStockData(symbol);
          fallbackResults[symbol] = stockData;
        } catch (error) {
          console.error(`Error getting data for US stock ${symbol}:`, error.message);
          errorCount++;
          
          // エラーでも最低限の情報を返す
          fallbackResults[symbol] = {
            ticker: symbol,
            price: null,
            change: null,
            changePercent: null,
            name: symbol,
            currency: 'USD',
            lastUpdated: new Date().toISOString(),
            source: 'Error',
            isStock: true,
            isMutualFund: false,
            error: error.message
          };
        }
      })
    );
    
    // 結果を統合
    return { ...batchResults, ...fallbackResults };
  } catch (batchError) {
    console.error('Yahoo Finance API batch retrieval failed, falling back to individual fetching:', batchError.message);
    
    // バッチ処理に完全に失敗した場合は個別処理を行う
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('Invalid stock symbols array');
    }
    
    console.log(`Preparing to fetch data for ${symbols.length} US stocks in parallel`);
    
    // ブラックリスト確認と非ブラックリスト銘柄の抽出
    const checkedSymbols = await Promise.all(
      symbols.map(async (symbol) => {
        const isInBlacklist = await blacklist.isBlacklisted(symbol, 'us');
        return { symbol, isBlacklisted: isInBlacklist };
      })
    );
    
    // ブラックリスト銘柄を分離
    const blacklistedSymbols = checkedSymbols.filter(item => item.isBlacklisted).map(item => item.symbol);
    const processingSymbols = checkedSymbols.filter(item => !item.isBlacklisted).map(item => item.symbol);
    
    console.log(`${blacklistedSymbols.length} symbols are blacklisted and will use fallback data.`);
    console.log(`Proceeding with data retrieval for ${processingSymbols.length} symbols.`);
    
    // 結果オブジェクト初期化
    const results = {};
    
    // ブラックリスト銘柄にはデフォルト値を設定
    for (const symbol of blacklistedSymbols) {
      results[symbol] = {
        ticker: symbol,
        price: 100, // フォールバック価格
        change: 0,
        changePercent: 0,
        name: symbol,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        source: 'Blacklisted Fallback',
        isStock: true,
        isMutualFund: false,
        isBlacklisted: true
      };
    }
    
    // 取得対象がない場合は早期リターン
    if (processingSymbols.length === 0) {
      return results;
    }
    
    let errorCount = 0;
    
    // 各シンボルにインデックスを割り当て、遅延を計算
    const indexedSymbols = processingSymbols.map((symbol, index) => ({ symbol, index }));
    
    // 並列処理（制御付き）
    await Promise.allSettled(
      indexedSymbols.map(async ({ symbol, index }) => {
        try {
          // APIレート制限を回避するために各リクエストを少し遅延させる
          const delay = index * RATE_LIMIT_DELAY;
          if (delay > 0) {
            await sleep(delay);
          }
          
          // 株価データを取得
          const stockData = await module.exports.getUsStockData(symbol);
          results[symbol] = stockData;
        } catch (error) {
          console.error(`Error getting data for US stock ${symbol}:`, error.message);
          errorCount++;
          
          // エラーでも最低限の情報を返す
          results[symbol] = {
            ticker: symbol,
            price: null,
            change: null,
            changePercent: null,
            name: symbol,
            currency: 'USD',
            lastUpdated: new Date().toISOString(),
            source: 'Error',
            isStock: true,
            isMutualFund: false,
            error: error.message
          };
        }
      })
    );
    
    // エラー率が高すぎる場合はアラート
    if (errorCount > processingSymbols.length / 3) { // 1/3以上失敗
      await alertService.notifyError(
        'High Error Rate in US Stock Data Retrieval',
        new Error(`${errorCount} out of ${processingSymbols.length} US stocks failed to retrieve data`),
        { errorRate: errorCount / processingSymbols.length }
      );
    }
    
    return results;
  }
};

/**
 * 複数の投資信託を並列で取得する
 * @param {Array<string>} codes - ファンドコードの配列
 * @returns {Promise<Object>} - ファンドコードをキーとするデータのオブジェクト
 */
const getMutualFundsParallel = async (codes) => {
  console.log(`Redirecting parallel mutual fund data request to CSV download method`);
  
  try {
    // CSVダウンロード方式でデータ取得
    return await fundDataService.getMutualFundsParallel(codes);
  } catch (error) {
    console.error(`Parallel mutual fund data retrieval error:`, error);
    throw new Error(`Parallel mutual fund data retrieval failed: ${error.message}`);
  }
};

/**
 * ブラックリストのクリーンアップを実行する
 * @returns {Promise<Object>} クリーンアップ結果
 */
const cleanupBlacklist = async () => {
  console.log('Starting data source blacklist cleanup');
  
  try {
    const result = await blacklist.cleanupBlacklist();
    console.log(`Data source blacklist cleanup completed: ${result.cleanedItems} items removed`);
    return result;
  } catch (error) {
    console.error('Error cleaning up data source blacklist:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * ブラックリストされた銘柄の一覧を取得する
 * @returns {Promise<Object>} 市場ごとのブラックリスト銘柄
 */
const getBlacklistedSymbols = async () => {
  try {
    const symbols = await blacklist.getBlacklistedSymbols();
    
    // 市場別に分類
    const result = {
      jp: [],
      us: [],
      fund: []
    };
    
    symbols.forEach(item => {
      if (result[item.market]) {
        result[item.market].push({
          market: item.market,
          symbol: item.symbol,
          failureCount: item.failureCount,
          lastFailure: item.lastFailure,
          cooldownUntil: item.cooldownUntil,
          reason: item.reason
        });
      }
    });
    
    return {
      success: true,
      count: symbols.length,
      blacklist: result
    };
  } catch (error) {
    console.error('Error getting blacklisted symbols:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  getJpStockData,
  getUsStockData,
  getMutualFundData,
  getJpStocksParallel,
  getUsStocksParallel,
  getMutualFundsParallel,
  cleanupBlacklist,
  getBlacklistedSymbols
};
