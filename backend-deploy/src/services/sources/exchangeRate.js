/**
 * プロジェクト: portfolio-market-data-api
 * ファイルパス: src/services/sources/exchangeRate.js
 * 
 * 説明: 
 * 為替レートデータを取得するサービス。
 * 複数の為替レートプロバイダに対応し、フォールバック機能や
 * レート制限対策も実装しています。
 * 
 * @author Portfolio Manager Team
 * @updated 2025-05-28
 */
'use strict';

const axios = require('axios');
const { withRetry, isRetryableApiError } = require('../../utils/retry');
const alertService = require('../alerts');
const { DEFAULT_EXCHANGE_RATE } = require('../../config/constants');
const { getRandomUserAgent } = require('../../utils/dataFetchUtils');

// 環境変数からAPIキーを取得
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY || '';
const OPEN_EXCHANGE_RATES_APP_ID = process.env.OPEN_EXCHANGE_RATES_APP_ID || '';

// 利用可能なAPIプロバイダ
const PROVIDERS = {
  YAHOO_FINANCE2: 'yahoo-finance2',
  EXCHANGERATE_API: 'exchangerate-api',
  FRANKFURTER: 'frankfurter-api',
  FALLBACK: 'hardcoded-values'
};

/**
 * 為替レートを取得する - 複数のAPIを順に試行
 * @param {string} base - ベース通貨コード（例: 'USD'）
 * @param {string} target - 対象通貨コード（例: 'JPY'）
 * @returns {Promise<Object>} 為替レートデータ
 */
const getExchangeRate = async (base = 'USD', target = 'JPY') => {
  console.log(`Getting exchange rate for ${base}/${target}`);
  
  // 通貨コードを標準化
  base = base.toUpperCase();
  target = target.toUpperCase();
  
  // 通貨ペアチェック
  if (base === target) {
    return createExchangeRateResponse(base, target, 1, 0, 0, 'Internal (same currencies)');
  }
  
  // JPY/USDの場合のフラグ
  const isJpyToUsd = base === 'JPY' && target === 'USD';
  
  // JPY/USDの場合はUSD/JPYとして取得して後で逆数を計算
  let queryBase = base;
  let queryTarget = target;
  if (isJpyToUsd) {
    queryBase = 'USD';
    queryTarget = 'JPY';
  }
  
  try {
    // 1. まず、Yahoo Finance2を試す（無料、信頼性高い）
    try {
      const rateData = await getExchangeRateFromYahooFinance2(queryBase, queryTarget);
      
      if (rateData) {
        // JPY/USDの場合は逆数を計算
        if (isJpyToUsd) {
          rateData.rate = 1 / rateData.rate;
        }
        
        return createExchangeRateResponse(
          base, 
          target, 
          rateData.rate, 
          rateData.change, 
          rateData.changePercent, 
          rateData.source, 
          rateData.lastUpdated
        );
      }
    } catch (error) {
      console.warn(`Yahoo Finance2 failed: ${error.message}`);
    }
    
    // 2. exchangerate-api.comを試す
    try {
      const rateData = await getExchangeRateFromExchangerateApi(queryBase, queryTarget);
      
      if (rateData) {
        // JPY/USDの場合は逆数を計算
        if (isJpyToUsd) {
          rateData.rate = 1 / rateData.rate;
        }
        
        return createExchangeRateResponse(
          base, 
          target, 
          rateData.rate, 
          rateData.change, 
          rateData.changePercent, 
          rateData.source, 
          rateData.lastUpdated
        );
      }
    } catch (error) {
      console.warn(`ExchangeRate API failed: ${error.message}`);
    }
    
    // 3. Frankfurter APIを試す（欧州中央銀行のデータ）
    try {
      const rateData = await getExchangeRateFromFrankfurter(queryBase, queryTarget);
      
      if (rateData) {
        // JPY/USDの場合は逆数を計算
        if (isJpyToUsd) {
          rateData.rate = 1 / rateData.rate;
        }
        
        return createExchangeRateResponse(
          base, 
          target, 
          rateData.rate, 
          rateData.change, 
          rateData.changePercent, 
          rateData.source, 
          rateData.lastUpdated
        );
      }
    } catch (error) {
      console.warn(`Frankfurter API failed: ${error.message}`);
    }
    
    // 4. ハードコードされた値を使用
    try {
      const hardcodedRateData = getExchangeRateFromHardcodedValues(queryBase, queryTarget);
      
      // JPY/USDの場合は逆数を計算
      if (isJpyToUsd) {
        hardcodedRateData.rate = 1 / hardcodedRateData.rate;
      }
      
      return createExchangeRateResponse(
        base, 
        target, 
        hardcodedRateData.rate, 
        hardcodedRateData.change, 
        hardcodedRateData.changePercent, 
        hardcodedRateData.source, 
        hardcodedRateData.lastUpdated
      );
    } catch (error) {
      console.error(`Hardcoded rates also failed: ${error.message}`);
    }
    
    // すべての方法が失敗した場合、最終的にデフォルト値を使用
    let fallbackRate = DEFAULT_EXCHANGE_RATE;
    
    // JPY/USDの場合はデフォルト値の逆数を使用
    if (isJpyToUsd) {
      fallbackRate = 1 / fallbackRate;
    }
    
    // 緊急アラート通知
    await alertService.notifyError(
      'All Exchange Rate Sources Failed',
      new Error(`Failed to get exchange rate for ${base}/${target} from all providers`),
      { base, target, isJpyToUsd }
    );
    
    return createExchangeRateResponse(
      base, 
      target, 
      fallbackRate, 
      0, 
      0, 
      'Emergency Fallback', 
      new Date().toISOString(), 
      true
    );
  } catch (error) {
    console.error('Unexpected error in exchange rate service:', error);
    
    // 完全に予期しないエラーの場合、デフォルト値を使用
    let fallbackRate = DEFAULT_EXCHANGE_RATE;
    
    // JPY/USDの場合はデフォルト値の逆数を使用
    if (isJpyToUsd) {
      fallbackRate = 1 / fallbackRate;
    }
    
    return createExchangeRateResponse(
      base, 
      target, 
      fallbackRate, 
      0, 
      0, 
      'Emergency Fallback', 
      new Date().toISOString(), 
      true, 
      error.message
    );
  }
};

/**
 * 為替レートレスポンスオブジェクトを作成する
 * @param {string} base - ベース通貨
 * @param {string} target - 対象通貨
 * @param {number} rate - 為替レート
 * @param {number} change - レート変化
 * @param {number} changePercent - レート変化率
 * @param {string} source - データソース
 * @param {string} lastUpdated - 最終更新日時
 * @param {boolean} isDefault - デフォルト値かどうか
 * @param {string} error - エラーメッセージ
 * @returns {Object} 為替レートレスポンス
 */
const createExchangeRateResponse = (
  base, 
  target, 
  rate, 
  change = 0, 
  changePercent = 0, 
  source = 'API', 
  lastUpdated = new Date().toISOString(),
  isDefault = false,
  error = null
) => {
  const response = {
    pair: `${base}${target}`,
    base,
    target,
    rate,
    change,
    changePercent,
    lastUpdated,
    source
  };
  
  if (isDefault) {
    response.isDefault = true;
  }
  
  if (error) {
    response.error = error;
  }
  
  return response;
};

/**
 * Yahoo Finance2を使用して為替レートを取得
 * @param {string} base - ベース通貨
 * @param {string} target - 対象通貨
 * @returns {Promise<Object|null>} 為替レートデータ
 */
const getExchangeRateFromYahooFinance2 = async (base, target) => {
  console.log(`Trying Yahoo Finance2 for ${base}/${target}...`);
  
  try {
    // yahoo-finance2パッケージの動的インポート
    let yahooFinance;
    try {
      yahooFinance = require('yahoo-finance2').default;
    } catch (error) {
      console.warn('yahoo-finance2 not available');
      return null;
    }
    
    // 為替ペアのシンボルを構成（例：USD/JPY → USDJPY=X）
    const symbol = `${base}${target}=X`;
    
    const quote = await withRetry(
      () => yahooFinance.quote(symbol),
      {
        maxRetries: 2,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    if (quote && quote.regularMarketPrice) {
      console.log(`Yahoo Finance2 successful! Rate: ${quote.regularMarketPrice}`);
      
      return {
        rate: quote.regularMarketPrice,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        source: PROVIDERS.YAHOO_FINANCE2,
        lastUpdated: quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toISOString() : new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from Yahoo Finance2:', error.message);
    return null;
  }
};

/**
 * exchangerate-api.comからの為替レートデータを取得する（無料、認証不要）
 * @param {string} base - ベース通貨
 * @param {string} target - 対象通貨
 * @returns {Promise<Object|null>} 為替レートデータ
 */
const getExchangeRateFromExchangerateApi = async (base, target) => {
  console.log(`Trying exchangerate-api.com for ${base}/${target}...`);
  
  try {
    // exchangerate-api.comを使用（無料、認証不要、信頼性が高い）
    const response = await withRetry(
      () => axios.get(`https://api.exchangerate-api.com/v4/latest/${base}`, {
        headers: {
          'User-Agent': getRandomUserAgent()
        },
        timeout: 8000
      }),
      {
        maxRetries: 3,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    const data = response.data;
    
    if (data && data.rates && data.rates[target]) {
      console.log(`exchangerate-api.com successful! Rate: ${data.rates[target]}`);
      
      return {
        rate: data.rates[target],
        change: 0, // この無料APIでは変化率は提供されない
        changePercent: 0,
        source: PROVIDERS.EXCHANGERATE_API,
        lastUpdated: data.date ? new Date(data.date).toISOString() : new Date().toISOString()
      };
    }
    
    console.warn('exchangerate-api.com returned no data for the requested currency pair');
    throw new Error('No data in exchangerate-api.com response');
  } catch (error) {
    console.error('Error fetching from exchangerate-api.com:', error.message);
    
    // APIエラーは無視してnullを返す
    
    // すべてのAPIエラーに対してアラート通知を行う
    await alertService.notifyError(
      'Exchange Rate API Error',
      error,
      { base, target, provider: PROVIDERS.EXCHANGERATE_API }
    );
    
    // APIエラーの場合はnullを返してフォールバックロジックに委ねる
    return null;
  }
};

/**
 * Frankfurter APIから為替レートを取得（欧州中央銀行のデータ、無料）
 * @param {string} base - ベース通貨
 * @param {string} target - 対象通貨
 * @returns {Promise<Object|null>} 為替レートデータ
 */
const getExchangeRateFromFrankfurter = async (base, target) => {
  console.log(`Trying Frankfurter API for ${base}/${target}...`);
  
  try {
    const response = await withRetry(
      () => axios.get(`https://api.frankfurter.app/latest`, {
        params: {
          from: base,
          to: target
        },
        headers: {
          'User-Agent': getRandomUserAgent()
        },
        timeout: 8000
      }),
      {
        maxRetries: 2,
        baseDelay: 500,
        shouldRetry: isRetryableApiError
      }
    );
    
    const data = response.data;
    
    if (data && data.rates && data.rates[target]) {
      console.log(`Frankfurter API successful! Rate: ${data.rates[target]}`);
      
      return {
        rate: data.rates[target],
        change: 0,
        changePercent: 0,
        source: PROVIDERS.FRANKFURTER,
        lastUpdated: data.date ? new Date(data.date).toISOString() : new Date().toISOString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from Frankfurter API:', error.message);
    return null;
  }
};

/**
 * ハードコードされた為替レート値から取得
 * @param {string} base - ベース通貨
 * @param {string} target - 対象通貨
 * @returns {Object} 為替レートデータ
 */
const getExchangeRateFromHardcodedValues = (base, target) => {
  console.log(`Using hardcoded exchange rates for ${base}/${target}...`);
  
  // 主要な通貨ペアの値
  const hardcodedRates = {
    'USDJPY': DEFAULT_EXCHANGE_RATE,
    'JPYUSD': 1/DEFAULT_EXCHANGE_RATE,
    'EURJPY': 160.2,
    'EURUSD': 1.08,
    'GBPUSD': 1.27,
    'GBPJPY': 189.8
  };
  
  const pairKey = `${base}${target}`;
  let rate = hardcodedRates[pairKey];
  
  if (!rate) {
    // ハードコードされていない場合はデフォルト値を使用
    rate = (pairKey === 'USDJPY' || pairKey.includes('JPY')) ? DEFAULT_EXCHANGE_RATE : 1.0;
  }
  
  console.log(`Using hardcoded exchange rate! Rate: ${rate}`);
  
  return {
    rate: rate,
    change: 0,
    changePercent: 0,
    source: PROVIDERS.FALLBACK,
    lastUpdated: new Date().toISOString()
  };
};

/**
 * 複数の通貨ペアの為替レートを取得
 * @param {Array<Object>} pairs - 通貨ペア配列 [{base, target}, ...]
 * @returns {Promise<Object>} 通貨ペアをキー、為替レートを値とするオブジェクト
 */
const getBatchExchangeRates = async (pairs) => {
  if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
    throw new Error('Invalid currency pairs array');
  }
  
  // 結果オブジェクト初期化
  const results = {};
  
  // 各通貨ペアを並列処理
  await Promise.allSettled(
    pairs.map(async ({ base, target }) => {
      try {
        // 各ペアのレートを取得
        const rateData = await module.exports.getExchangeRate(base, target);
        const pairKey = `${base}-${target}`;
        results[pairKey] = rateData;
      } catch (error) {
        console.error(`Error getting exchange rate for ${base}/${target}:`, error.message);
        
        // エラーでも最低限の情報を返す
        const pairKey = `${base}-${target}`;
        results[pairKey] = createExchangeRateResponse(
          base,
          target,
          null,
          null,
          null,
          'Error',
          new Date().toISOString(),
          false,
          error.message
        );
      }
    })
  );
  
  return results;
};

module.exports = {
  getExchangeRate,
  getBatchExchangeRates
};