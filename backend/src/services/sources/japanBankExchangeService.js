/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/sources/japanBankExchangeService.js
 * 
 * 説明: 
 * 日本銀行の公式APIを利用して為替レートを取得するサービス。
 * 信頼性の高い公式データソースです。
 * 
 * @author Portfolio Manager Team
 * @created 2025-06-12
 */
'use strict';

const axios = require('axios');
const { withRetry, isRetryableApiError } = require('../../utils/retry');
const cacheService = require('../cache');
const { DATA_TYPES, CACHE_TIMES } = require('../../config/constants');
const { getRandomUserAgent } = require('../../utils/dataFetchUtils');

/**
 * 日本銀行APIから為替レートを取得
 * @param {string} base - ベース通貨コード（例: 'USD'）
 * @param {string} target - 対象通貨コード（例: 'JPY'）
 * @returns {Promise<Object>} 為替レートデータ
 */
const getBOJExchangeRate = async (base = 'USD', target = 'JPY') => {
  console.log(`Fetching exchange rate from Bank of Japan for ${base}/${target}`);
  
  try {
    // 日本銀行時系列統計データ検索サイトAPI
    const today = new Date();
    const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 7日前
    
    // 日付フォーマット (YYYY-MM-DD)
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    // 日銀APIのシリーズコード（主要通貨の対円レート）
    const seriesMap = {
      'USD': 'DEXJPUS', // USD/JPY
      'EUR': 'DEXJPEU', // EUR/JPY
      'GBP': 'DEXJPUK', // GBP/JPY
      'CHF': 'DEXJPCH', // CHF/JPY
      'AUD': 'DEXJPAU', // AUD/JPY
      'CAD': 'DEXJPCA', // CAD/JPY
    };
    
    // JPYがターゲットでない場合は非対応
    if (target !== 'JPY' || !seriesMap[base]) {
      throw new Error(`Unsupported currency pair: ${base}/${target}`);
    }
    
    // 日銀API URL
    const url = `https://www.boj.or.jp/statistics/market/forex/fxdaily/fxlist/index.htm/.json`;
    
    const response = await withRetry(
      () => axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        },
        timeout: 10000
      }),
      {
        maxRetries: 2,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response from BOJ API');
    }
    
    // 最新のレートを取得
    const rates = response.data.data;
    const latestRate = rates[rates.length - 1];
    
    if (!latestRate || !latestRate[base]) {
      throw new Error(`No rate found for ${base}/JPY`);
    }
    
    const rate = parseFloat(latestRate[base]);
    
    // 前日のレートを取得
    let change = 0;
    let changePercent = 0;
    
    if (rates.length > 1) {
      const previousRate = parseFloat(rates[rates.length - 2][base]);
      change = rate - previousRate;
      changePercent = (change / previousRate) * 100;
    }
    
    return {
      ticker: `${base}-${target}`,
      pair: `${base}-${target}`,
      base,
      target,
      rate,
      change,
      changePercent,
      lastUpdated: new Date(latestRate.date).toISOString(),
      source: 'Bank of Japan',
      isOfficial: true
    };
    
  } catch (error) {
    console.error(`Error fetching from BOJ API:`, error.message);
    throw error;
  }
};

/**
 * ECB（欧州中央銀行）APIから為替レートを取得
 * @param {string} base - ベース通貨コード
 * @param {string} target - 対象通貨コード
 * @returns {Promise<Object>} 為替レートデータ
 */
const getECBExchangeRate = async (base = 'EUR', target = 'JPY') => {
  console.log(`Fetching exchange rate from ECB for ${base}/${target}`);
  
  try {
    // ECB APIエンドポイント
    const url = `https://api.frankfurter.app/latest?from=${base}&to=${target}`;
    
    const response = await withRetry(
      () => axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json'
        },
        timeout: 10000
      }),
      {
        maxRetries: 2,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    if (!response.data || !response.data.rates) {
      throw new Error('Invalid response from ECB API');
    }
    
    const rate = response.data.rates[target];
    
    if (!rate) {
      throw new Error(`No rate found for ${base}/${target}`);
    }
    
    return {
      ticker: `${base}-${target}`,
      pair: `${base}-${target}`,
      base,
      target,
      rate,
      change: 0,
      changePercent: 0,
      lastUpdated: response.data.date || new Date().toISOString(),
      source: 'European Central Bank (via Frankfurter)',
      isOfficial: true
    };
    
  } catch (error) {
    console.error(`Error fetching from ECB API:`, error.message);
    throw error;
  }
};

/**
 * Yahoo Finance APIから為替レートを取得（バックアップ）
 * @param {string} base - ベース通貨コード
 * @param {string} target - 対象通貨コード
 * @returns {Promise<Object>} 為替レートデータ
 */
const getYahooExchangeRate = async (base = 'USD', target = 'JPY') => {
  console.log(`Fetching exchange rate from Yahoo Finance for ${base}/${target}`);
  
  try {
    const yahooFinance2Service = require('./yahooFinance2Service');
    
    // Yahoo Financeのティッカー形式
    const ticker = `${base}${target}=X`;
    
    const data = await yahooFinance2Service.getStockData(ticker);
    
    if (!data || !data.price) {
      throw new Error('No rate data from Yahoo Finance');
    }
    
    return {
      ticker: `${base}-${target}`,
      pair: `${base}-${target}`,
      base,
      target,
      rate: data.price,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      source: 'Yahoo Finance',
      dayHigh: data.dayHigh,
      dayLow: data.dayLow,
      previousClose: data.previousClose
    };
    
  } catch (error) {
    console.error(`Error fetching from Yahoo Finance:`, error.message);
    throw error;
  }
};

/**
 * 複数のソースから為替レートを取得（優先順位付き）
 * @param {string} base - ベース通貨コード
 * @param {string} target - 対象通貨コード
 * @returns {Promise<Object>} 為替レートデータ
 */
const getEnhancedExchangeRate = async (base = 'USD', target = 'JPY') => {
  const pair = `${base}-${target}`;
  console.log(`Getting enhanced exchange rate for ${pair}`);
  
  // キャッシュキー構築
  const cacheKey = `${DATA_TYPES.EXCHANGE_RATE}:${pair}`;
  
  // キャッシュをチェック
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) {
    console.log(`Using cached exchange rate for ${pair}`);
    return cachedData;
  }
  
  // データソースの優先順位
  const dataSources = [];
  
  // JPYペアの場合は日銀APIを優先
  if (target === 'JPY') {
    dataSources.push({ name: 'Bank of Japan', fn: () => getBOJExchangeRate(base, target) });
  }
  
  // EURペアの場合はECB APIを優先
  if (base === 'EUR' || target === 'EUR') {
    dataSources.push({ name: 'ECB', fn: () => getECBExchangeRate(base, target) });
  }
  
  // Yahoo Financeは汎用バックアップ
  dataSources.push({ name: 'Yahoo Finance', fn: () => getYahooExchangeRate(base, target) });
  
  let lastError = null;
  
  // 各データソースを順番に試行
  for (const source of dataSources) {
    try {
      console.log(`Trying ${source.name} for ${pair}`);
      const data = await source.fn();
      
      if (data && data.rate) {
        console.log(`Successfully fetched rate from ${source.name} for ${pair}: ${data.rate}`);
        
        // データをキャッシュに保存
        await cacheService.set(cacheKey, data, CACHE_TIMES.EXCHANGE_RATE);
        
        return data;
      }
    } catch (error) {
      console.error(`${source.name} failed for ${pair}:`, error.message);
      lastError = error;
    }
  }
  
  // すべてのソースが失敗した場合はデフォルト値を返す
  console.warn(`All sources failed for ${pair}, using default rate`);
  
  const defaultRate = pair === 'USD-JPY' ? 150.0 : 1.0;
  const fallbackData = {
    ticker: pair,
    pair,
    base,
    target,
    rate: defaultRate,
    change: 0,
    changePercent: 0,
    lastUpdated: new Date().toISOString(),
    source: 'Default Fallback',
    isDefault: true,
    error: `All sources failed: ${lastError?.message || 'Unknown error'}`
  };
  
  // 短いTTLでキャッシュ（再試行を促す）
  await cacheService.set(cacheKey, fallbackData, 300); // 5分
  
  return fallbackData;
};

module.exports = {
  getBOJExchangeRate,
  getECBExchangeRate,
  getYahooExchangeRate,
  getEnhancedExchangeRate
};