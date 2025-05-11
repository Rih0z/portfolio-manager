/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/services/marketDataService.js
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-11 17:00:00 
 * 
 * 更新履歴: 
 * - 2025-05-11 17:00:00 Koki Riho 初回作成
 * - 2025-05-12 10:30:00 外部APIサーバー利用に修正
 * 
 * 説明: 
 * 市場データ取得のための集約API呼び出しを提供するサービス。
 * 株価データ、為替レート、ファンド情報、配当データなどを
 * 一元的に取得する機能を提供する。
 */

import axios from 'axios';

// 環境変数からAPI設定を取得
const API_URL = process.env.REACT_APP_MARKET_DATA_API_URL || 'http://localhost:3000';
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';

// タイムアウト設定
const TIMEOUT = {
  DEFAULT: 10000,        // 10秒
  EXCHANGE_RATE: 5000,   // 5秒
  US_STOCK: 10000,       // 10秒
  JP_STOCK: 20000,       // 20秒
  MUTUAL_FUND: 20000     // 20秒
};

// リトライ設定
const RETRY = {
  MAX_ATTEMPTS: 3,      // 最大試行回数
  INITIAL_DELAY: 1000,  // 初期遅延（ミリ秒）
  BACKOFF_FACTOR: 2     // バックオフ係数
};

/**
 * 市場データ取得用共通クライアント
 */
const marketDataClient = axios.create({
  timeout: TIMEOUT.DEFAULT,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 環境に基づいてAPIエンドポイントを取得
 * @param {string} path - APIパス
 * @returns {string} 完全なAPIエンドポイントURL
 */
const getApiEndpoint = (path) => {
  return `${API_URL}/${API_STAGE}/api/${path}`;
};

/**
 * リトライメカニズム付きのfetch関数
 * @param {string} url - APIエンドポイント
 * @param {Object} params - クエリパラメータ
 * @param {number} timeout - タイムアウト（ミリ秒）
 * @param {number} maxRetries - 最大リトライ回数
 * @returns {Promise<Object>} レスポンスデータ
 */
const fetchWithRetry = async (url, params = {}, timeout = TIMEOUT.DEFAULT, maxRetries = RETRY.MAX_ATTEMPTS) => {
  let retries = 0;
  
  while (retries <= maxRetries) {
    try {
      const response = await marketDataClient.get(url, {
        params,
        timeout: timeout + (retries * 2000) // リトライごとにタイムアウトを延長
      });
      
      // 成功したらレスポンスを返す
      return response.data;
    } catch (error) {
      console.error(`API fetch error (attempt ${retries+1}/${maxRetries+1}):`, error.message);
      
      // 最後の試行で失敗した場合はエラーを投げる
      if (retries === maxRetries) {
        throw error;
      }
      
      // リトライ前に遅延を入れる（指数バックオフ+ジッター）
      const delay = RETRY.INITIAL_DELAY * Math.pow(RETRY.BACKOFF_FACTOR, retries) * (0.9 + Math.random() * 0.2);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // リトライカウントを増やす
      retries++;
    }
  }
};

/**
 * エラーメッセージを整形する
 * @param {Error} error - エラーオブジェクト
 * @returns {Object} エラー情報
 */
const formatErrorResponse = (error, ticker) => {
  const errorResponse = {
    success: false,
    error: true,
    message: 'データの取得に失敗しました',
    errorType: 'UNKNOWN',
    errorDetail: error.message
  };
  
  if (error.response) {
    // サーバーからのレスポンスがある場合
    errorResponse.status = error.response.status;
    errorResponse.errorType = error.response.status === 429 ? 'RATE_LIMIT' : 'API_ERROR';
    errorResponse.message = error.response.data?.message || `API エラー (${error.response.status})`;
  } else if (error.code === 'ECONNABORTED') {
    // タイムアウトの場合
    errorResponse.errorType = 'TIMEOUT';
    errorResponse.message = 'リクエストがタイムアウトしました';
  } else if (error.message.includes('Network Error')) {
    // ネットワークエラーの場合
    errorResponse.errorType = 'NETWORK';
    errorResponse.message = 'ネットワーク接続に問題があります';
  }
  
  if (ticker) {
    errorResponse.ticker = ticker;
  }
  
  return errorResponse;
};

/**
 * 銘柄データを取得する
 * @param {string} ticker - ティッカーシンボル
 * @param {boolean} refresh - キャッシュを無視して最新データを取得するか
 * @returns {Promise<Object>} 銘柄データ
 */
export const fetchTickerData = async (ticker, refresh = false) => {
  if (!ticker) {
    return {
      success: false,
      message: 'ティッカーシンボルが指定されていません',
      error: true
    };
  }
  
  try {
    const endpoint = getApiEndpoint('market-data');
    
    // 銘柄タイプを判定
    const isJapaneseStock = /^\d{4}(\.T)?$/.test(ticker);
    const isMutualFund = /^\d{7,8}C(\.T)?$/.test(ticker);
    
    // 銘柄タイプに応じたパラメータ設定
    const type = isJapaneseStock 
      ? 'jp-stock' 
      : isMutualFund 
        ? 'mutual-fund' 
        : 'us-stock';
    
    const timeout = isJapaneseStock 
      ? TIMEOUT.JP_STOCK 
      : isMutualFund 
        ? TIMEOUT.MUTUAL_FUND 
        : TIMEOUT.US_STOCK;
    
    // APIリクエスト
    const response = await fetchWithRetry(
      endpoint,
      {
        type,
        symbols: ticker,
        refresh: refresh ? 'true' : 'false'
      },
      timeout
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return {
      ...formatErrorResponse(error, ticker),
      // フォールバックデータも含める
      data: generateFallbackData(ticker)
    };
  }
};

/**
 * 複数銘柄のデータを一括取得
 * @param {Object} options - 取得オプション
 * @param {string} options.usStocks - カンマ区切りの米国株シンボル
 * @param {string} options.jpStocks - カンマ区切りの日本株コード
 * @param {string} options.mutualFunds - カンマ区切りの投資信託コード
 * @param {boolean} options.exchangeRate - 為替レートも取得するかどうか
 * @param {boolean} options.refresh - キャッシュを無視して最新データを取得するか
 * @returns {Promise<Object>} 複合データ
 */
export const fetchMultipleTickerData = async ({ 
  usStocks, 
  jpStocks, 
  mutualFunds, 
  exchangeRate = true, 
  refresh = false 
}) => {
  try {
    const promises = [];
    const results = {};
    
    // 米国株
    if (usStocks) {
      promises.push(
        fetchWithRetry(
          getApiEndpoint('market-data'),
          {
            type: 'us-stock',
            symbols: usStocks,
            refresh: refresh ? 'true' : 'false'
          },
          TIMEOUT.US_STOCK
        )
        .then(data => { results.usStocks = data; })
        .catch(error => { 
          console.error('US stocks fetch error:', error);
          results.usStocksError = formatErrorResponse(error);
        })
      );
    }
    
    // 日本株
    if (jpStocks) {
      promises.push(
        fetchWithRetry(
          getApiEndpoint('market-data'),
          {
            type: 'jp-stock',
            symbols: jpStocks,
            refresh: refresh ? 'true' : 'false'
          },
          TIMEOUT.JP_STOCK
        )
        .then(data => { results.jpStocks = data; })
        .catch(error => { 
          console.error('JP stocks fetch error:', error);
          results.jpStocksError = formatErrorResponse(error);
        })
      );
    }
    
    // 投資信託
    if (mutualFunds) {
      promises.push(
        fetchWithRetry(
          getApiEndpoint('market-data'),
          {
            type: 'mutual-fund',
            symbols: mutualFunds,
            refresh: refresh ? 'true' : 'false'
          },
          TIMEOUT.MUTUAL_FUND
        )
        .then(data => { results.mutualFunds = data; })
        .catch(error => { 
          console.error('Mutual funds fetch error:', error);
          results.mutualFundsError = formatErrorResponse(error);
        })
      );
    }
    
    // 為替レート
    if (exchangeRate) {
      promises.push(
        fetchExchangeRate('USD', 'JPY', refresh)
          .then(data => { results.exchangeRate = data; })
          .catch(error => { 
            console.error('Exchange rate fetch error:', error);
            results.exchangeRateError = formatErrorResponse(error);
          })
      );
    }
    
    // すべてのリクエストを待機
    await Promise.all(promises);
    
    // エラーチェック - 重要なデータが欠けている場合は例外をスロー
    if (!results.usStocks && !results.jpStocks && !results.mutualFunds) {
      throw new Error('すべての資産データの取得に失敗しました');
    }
    
    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Batch data fetch error:', error);
    return {
      success: false,
      error: true,
      message: `複数データの取得に失敗しました: ${error.message}`
    };
  }
};

/**
 * 為替レートを取得する
 * @param {string} fromCurrency - 変換元通貨
 * @param {string} toCurrency - 変換先通貨
 * @param {boolean} refresh - キャッシュを無視して最新データを取得するか
 * @returns {Promise<Object>} 為替レートデータ
 */
export const fetchExchangeRate = async (fromCurrency = 'USD', toCurrency = 'JPY', refresh = false) => {
  try {
    const endpoint = getApiEndpoint('market-data');
    
    const response = await fetchWithRetry(
      endpoint,
      {
        type: 'exchange-rate',
        base: fromCurrency,
        target: toCurrency,
        refresh: refresh ? 'true' : 'false'
      },
      TIMEOUT.EXCHANGE_RATE
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching exchange rate ${fromCurrency}/${toCurrency}:`, error);
    
    // フォールバック値を返す
    return {
      success: false,
      error: true,
      message: '為替レートの取得に失敗しました',
      ...formatErrorResponse(error),
      // デフォルト値も含める
      rate: fromCurrency === 'USD' && toCurrency === 'JPY' ? 150.0 : 
            fromCurrency === 'JPY' && toCurrency === 'USD' ? 1/150.0 : 1.0,
      source: 'Fallback',
      lastUpdated: new Date().toISOString()
    };
  }
};

/**
 * ファンド情報を取得する
 * @param {string} ticker - ティッカーシンボル
 * @param {string} name - 銘柄名（オプション）
 * @returns {Promise<Object>} ファンド情報
 */
export const fetchFundInfo = async (ticker, name = '') => {
  try {
    const endpoint = getApiEndpoint('market-data');
    
    const response = await fetchWithRetry(
      endpoint,
      {
        type: 'fund-info',
        ticker: ticker,
        name: name
      }
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching fund info for ${ticker}:`, error);
    return formatErrorResponse(error, ticker);
  }
};

/**
 * 配当データを取得する
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} 配当データ
 */
export const fetchDividendData = async (ticker) => {
  try {
    const endpoint = getApiEndpoint('market-data');
    
    const response = await fetchWithRetry(
      endpoint,
      {
        type: 'dividend-info',
        ticker: ticker
      }
    );
    
    return response;
  } catch (error) {
    console.error(`Error fetching dividend data for ${ticker}:`, error);
    
    // フォールバック値を返す
    return {
      success: false,
      error: true,
      ...formatErrorResponse(error, ticker),
      data: {
        dividendYield: 0,
        hasDividend: false,
        dividendFrequency: 'unknown',
        dividendIsEstimated: true,
        lastUpdated: new Date().toISOString()
      }
    };
  }
};

/**
 * データの鮮度をチェックする
 * @param {Object[]} assets - 資産データの配列
 * @param {number} staleThresholdHours - 古いと判断する時間（時間単位）
 * @returns {Promise<Object>} 鮮度チェック結果
 */
export const checkDataFreshness = async (assets, staleThresholdHours = 24) => {
  try {
    // ローカル処理で済む場合はAPIを呼び出さない
    if (!Array.isArray(assets) || assets.length === 0) {
      return {
        success: true,
        fresh: true,
        staleItems: [],
        missingUpdateTime: [],
        message: 'データがありません'
      };
    }
    
    const now = new Date();
    const staleThreshold = staleThresholdHours * 60 * 60 * 1000; // ミリ秒に変換
    
    const staleItems = [];
    const missingUpdateTime = [];
    
    assets.forEach(asset => {
      if (!asset.lastUpdated) {
        missingUpdateTime.push(asset.ticker);
      } else {
        const updateTime = new Date(asset.lastUpdated);
        const age = now - updateTime;
        
        if (age > staleThreshold) {
          staleItems.push({
            ticker: asset.ticker,
            age: Math.floor(age / (60 * 60 * 1000)), // 時間単位に変換
            lastUpdated: asset.lastUpdated
          });
        }
      }
    });
    
    return {
      success: true,
      fresh: staleItems.length === 0 && missingUpdateTime.length === 0,
      staleItems,
      missingUpdateTime,
      message: staleItems.length > 0 
        ? `${staleItems.length}個の銘柄データが${staleThresholdHours}時間以上更新されていません` 
        : missingUpdateTime.length > 0 
          ? `${missingUpdateTime.length}個の銘柄に更新時間情報がありません` 
          : 'すべてのデータは最新です'
    };
  } catch (error) {
    console.error('Data freshness check error:', error);
    return {
      success: false,
      error: true,
      message: 'データの鮮度チェックに失敗しました',
      ...formatErrorResponse(error)
    };
  }
};

/**
 * フォールバックデータを生成する
 * @param {string} ticker - ティッカーシンボル
 * @returns {Object} フォールバックデータ
 */
const generateFallbackData = (ticker) => {
  if (!ticker) return null;
  
  // 銘柄タイプを判定
  const isJapaneseStock = /^\d{4}(\.T)?$/.test(ticker);
  const isMutualFund = /^\d{7,8}C(\.T)?$/.test(ticker);
  
  // 通貨とデフォルト価格を設定
  const currency = isJapaneseStock || isMutualFund ? 'JPY' : 'USD';
  let price;
  
  if (isJapaneseStock) {
    price = 2500; // 日本株のデフォルト価格
  } else if (isMutualFund) {
    price = 10000; // 投資信託のデフォルト価格
  } else {
    price = 100; // 米国株のデフォルト価格
  }
  
  return {
    ticker: ticker,
    price: price,
    name: ticker,
    currency: currency,
    lastUpdated: new Date().toISOString(),
    source: 'Fallback',
    isStock: !isMutualFund,
    isMutualFund: isMutualFund,
    priceLabel: isMutualFund ? '基準価額' : '株価'
  };
};

export default {
  fetchTickerData,
  fetchMultipleTickerData,
  fetchExchangeRate,
  fetchFundInfo,
  fetchDividendData,
  checkDataFreshness
};

