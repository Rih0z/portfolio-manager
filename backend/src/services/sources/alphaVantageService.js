/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/sources/alphaVantageService.js
 * 
 * 説明: 
 * Alpha Vantage APIを使用して米国株式のデータを取得するサービス。
 * 高品質な有料データを提供し、Yahoo Finance APIの代替として機能します。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-26
 */
'use strict';

const axios = require('axios');
const { withRetry, isRetryableApiError } = require('../../utils/retry');
const alertService = require('../alerts');
const { getApiKeys } = require('../../utils/secretsManager');

// API設定
const API_TIMEOUT = parseInt(process.env.ALPHA_VANTAGE_TIMEOUT || '8000', 10);
const BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Alpha Vantage APIを使用して単一銘柄のデータを取得する
 * @param {string} symbol - ティッカーシンボル
 * @returns {Promise<Object>} 株価データ
 */
const getStockData = async (symbol) => {
  try {
    if (!symbol) {
      throw new Error('Symbol is required');
    }

    // Secrets Manager から API キーを取得
    const apiKeys = await getApiKeys();
    const API_KEY = apiKeys.alphaVantage;
    
    if (!API_KEY || API_KEY === 'PLACEHOLDER_KEY') {
      throw new Error('Alpha Vantage API key not configured');
    }

    console.log(`Fetching Alpha Vantage data for ${symbol}`);
    
    const response = await withRetry(
      () => axios.get(BASE_URL, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: API_KEY
        },
        timeout: API_TIMEOUT
      }),
      {
        maxRetries: 3,
        baseDelay: 1000,
        shouldRetry: isRetryableApiError
      }
    );

    const data = response.data;
    
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
    }
    
    if (data['Note']) {
      throw new Error(`Alpha Vantage rate limit: ${data['Note']}`);
    }

    const quote = data['Global Quote'];
    
    if (!quote || !quote['05. price']) {
      throw new Error('Invalid Alpha Vantage response format');
    }

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
    
    console.log(`Alpha Vantage successful for ${symbol}: $${price}`);

    return {
      ticker: symbol,
      price: price,
      change: change,
      changePercent: changePercent,
      currency: 'USD',
      name: quote['01. symbol'],
      lastUpdated: new Date().toISOString(),
      source: 'Alpha Vantage',
      isStock: true,
      isMutualFund: false,
      volume: parseInt(quote['06. volume']) || 0,
      previousClose: parseFloat(quote['08. previous close']) || 0,
      latestTradingDay: quote['07. latest trading day'] || null
    };
  } catch (error) {
    console.error(`Alpha Vantage API error for ${symbol}:`, error.message);
    
    await alertService.notifyError(
      'Alpha Vantage API Error',
      error,
      { symbol, source: 'Alpha Vantage' }
    );
    
    throw error;
  }
};

/**
 * 複数銘柄のデータを取得する（Alpha Vantageは1分あたり5リクエスト制限があるため慎重に実装）
 * @param {Array<string>} symbols - ティッカーシンボルの配列
 * @returns {Promise<Object>} 銘柄をキーとするデータオブジェクト
 */
const getStocksData = async (symbols) => {
  console.log(`Fetching Alpha Vantage data for ${symbols.length} symbols`);
  
  const results = {};
  const errors = [];
  
  // Alpha Vantageは無料プランで1分間に5リクエストまでの制限があるため、順次処理
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    
    try {
      results[symbol] = await getStockData(symbol);
      
      // レート制限を避けるため12秒間隔で実行（1分間に5リクエスト以下）
      if (i < symbols.length - 1) {
        console.log(`Waiting 12 seconds before next Alpha Vantage request...`);
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    } catch (error) {
      console.error(`Failed to fetch Alpha Vantage data for ${symbol}:`, error.message);
      errors.push({ symbol, error: error.message });
    }
  }
  
  if (errors.length > 0) {
    console.warn(`Alpha Vantage batch request had ${errors.length} errors:`, errors);
  }
  
  return results;
};

/**
 * Alpha Vantage APIキーが設定されているかチェック
 * @returns {Promise<boolean>} APIキーが利用可能かどうか
 */
const isAvailable = async () => {
  try {
    const apiKeys = await getApiKeys();
    return !!(apiKeys.alphaVantage && apiKeys.alphaVantage !== 'PLACEHOLDER_KEY');
  } catch (error) {
    console.warn('Failed to check Alpha Vantage availability:', error.message);
    return false;
  }
};

module.exports = {
  getStockData,
  getStocksData,
  isAvailable
};