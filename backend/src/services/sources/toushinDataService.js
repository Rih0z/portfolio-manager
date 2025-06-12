/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/sources/toushinDataService.js
 * 
 * 説明: 
 * 投資信託協会のAPIを利用して投資信託のデータを取得するサービス。
 * バックアップデータソースとして利用します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-06-12
 */
'use strict';

const axios = require('axios');
const { withRetry, isRetryableApiError } = require('../../utils/retry');
const cacheService = require('../cache');
const { DATA_TYPES, CACHE_TIMES } = require('../../config/constants');
const {
  getRandomUserAgent,
  recordDataFetchFailure,
  recordDataFetchSuccess
} = require('../../utils/dataFetchUtils');

// 環境変数からタイムアウト設定を取得
const MUTUAL_FUND_TIMEOUT = parseInt(process.env.MUTUAL_FUND_TIMEOUT || '30000', 10);

/**
 * 投資信託協会APIから投資信託データを取得
 * @param {string} code - ファンドコード（7-8桁）
 * @returns {Promise<Object>} 投資信託データ
 */
const getToushinApiData = async (code) => {
  const fundCode = code.replace(/\.T$/i, '');
  console.log(`Fetching data from Toushin API for ${fundCode}`);

  try {
    // 投資信託協会のAPI エンドポイント
    const url = `https://api.toushin.or.jp/openapi/fund/nav/${fundCode}`;
    
    const userAgent = getRandomUserAgent();
    
    const response = await withRetry(
      () => axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        },
        timeout: MUTUAL_FUND_TIMEOUT
      }),
      {
        maxRetries: 2,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response from Toushin API');
    }
    
    const fundData = response.data.data;
    
    // 基準価額を取得
    const price = parseFloat(fundData.nav || fundData.netAssetValue || 0);
    
    if (isNaN(price) || price === 0) {
      throw new Error('Invalid price data from Toushin API');
    }
    
    // 前日比データ
    const change = parseFloat(fundData.navChange || 0);
    const changePercent = parseFloat(fundData.navChangeRate || 0);
    
    return {
      ticker: fundCode,
      price,
      change,
      changePercent,
      name: fundData.fundName || `投資信託 ${fundCode}`,
      currency: 'JPY',
      lastUpdated: fundData.navDate || new Date().toISOString(),
      source: 'Toushin API',
      priceLabel: '基準価額',
      isStock: false,
      isMutualFund: true,
      totalAssets: fundData.totalAssets,
      managementCompany: fundData.managementCompany
    };
    
  } catch (error) {
    console.error(`Error fetching from Toushin API for ${fundCode}:`, error.message);
    throw error;
  }
};

/**
 * Yahoo Finance Japanから投資信託データを取得（バックアップ）
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} 投資信託データ
 */
const getYahooJapanFundData = async (code) => {
  const fundCode = code.replace(/\.T$/i, '');
  console.log(`Fetching fund data from Yahoo Japan for ${fundCode}`);

  try {
    // Yahoo Finance JapanのAPI風エンドポイント
    const url = `https://finance.yahoo.co.jp/quote/${fundCode}`;
    
    const response = await withRetry(
      () => axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        },
        timeout: MUTUAL_FUND_TIMEOUT
      }),
      {
        maxRetries: 2,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    // HTMLからデータを抽出（簡易パース）
    const html = response.data;
    
    // 基準価額を正規表現で抽出
    const priceMatch = html.match(/基準価額[^0-9]*([0-9,]+)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;
    
    if (!price) {
      throw new Error('Could not extract price from Yahoo Japan');
    }
    
    // 前日比を抽出
    const changeMatch = html.match(/前日比[^0-9-]*([+-]?[0-9,]+)/);
    const change = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;
    
    const changePercentMatch = html.match(/([+-]?[0-9.]+)%/);
    const changePercent = changePercentMatch ? parseFloat(changePercentMatch[1]) : 0;
    
    return {
      ticker: fundCode,
      price,
      change,
      changePercent,
      name: `投資信託 ${fundCode}`,
      currency: 'JPY',
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Japan',
      priceLabel: '基準価額',
      isStock: false,
      isMutualFund: true
    };
    
  } catch (error) {
    console.error(`Error fetching from Yahoo Japan for ${fundCode}:`, error.message);
    throw error;
  }
};

/**
 * 楽天証券から投資信託データを取得（バックアップ）
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} 投資信託データ
 */
const getRakutenFundData = async (code) => {
  const fundCode = code.replace(/\.T$/i, '');
  console.log(`Fetching fund data from Rakuten for ${fundCode}`);

  try {
    // 楽天証券のAPI風エンドポイント
    const url = `https://www.rakuten-sec.co.jp/web/fund/detail/?ID=${fundCode}`;
    
    const response = await withRetry(
      () => axios.get(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        },
        timeout: MUTUAL_FUND_TIMEOUT
      }),
      {
        maxRetries: 2,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    const html = response.data;
    
    // 基準価額を抽出
    const priceMatch = html.match(/基準価額[^0-9]*([0-9,]+)円/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;
    
    if (!price) {
      throw new Error('Could not extract price from Rakuten');
    }
    
    // ファンド名を抽出
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const name = nameMatch ? nameMatch[1].trim() : `投資信託 ${fundCode}`;
    
    return {
      ticker: fundCode,
      price,
      change: 0,
      changePercent: 0,
      name,
      currency: 'JPY',
      lastUpdated: new Date().toISOString(),
      source: 'Rakuten Securities',
      priceLabel: '基準価額',
      isStock: false,
      isMutualFund: true
    };
    
  } catch (error) {
    console.error(`Error fetching from Rakuten for ${fundCode}:`, error.message);
    throw error;
  }
};

/**
 * 複数のソースから投資信託データを取得（優先順位付き）
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} 投資信託データ
 */
const getEnhancedMutualFundData = async (code) => {
  const fundCode = code.replace(/\.T$/i, '');
  console.log(`Getting enhanced mutual fund data for ${fundCode}`);
  
  // キャッシュキー構築
  const cacheKey = `${DATA_TYPES.MUTUAL_FUND}:${fundCode}`;
  
  // キャッシュをチェック
  const cachedData = await cacheService.get(cacheKey);
  
  if (cachedData) {
    console.log(`Using cached data for ${fundCode}`);
    return cachedData;
  }
  
  // データソースの優先順位
  const dataSources = [
    { name: 'Toushin API', fn: getToushinApiData },
    { name: 'Yahoo Japan', fn: getYahooJapanFundData },
    { name: 'Rakuten Securities', fn: getRakutenFundData }
  ];
  
  let lastError = null;
  
  // 各データソースを順番に試行
  for (const source of dataSources) {
    try {
      console.log(`Trying ${source.name} for ${fundCode}`);
      const data = await source.fn(fundCode);
      
      if (data && data.price) {
        console.log(`Successfully fetched data from ${source.name} for ${fundCode}`);
        
        // 成功を記録
        await recordDataFetchSuccess(fundCode);
        
        // データをキャッシュに保存
        await cacheService.set(cacheKey, data, CACHE_TIMES.MUTUAL_FUND);
        
        return data;
      }
    } catch (error) {
      console.error(`${source.name} failed for ${fundCode}:`, error.message);
      lastError = error;
      
      // 失敗を記録
      await recordDataFetchFailure(
        fundCode,
        'fund',
        source.name,
        error,
        { alertThreshold: 0.3 }
      );
    }
  }
  
  // すべてのソースが失敗した場合
  throw new Error(`All sources failed for ${fundCode}: ${lastError?.message || 'Unknown error'}`);
};

module.exports = {
  getToushinApiData,
  getYahooJapanFundData,
  getRakutenFundData,
  getEnhancedMutualFundData
};