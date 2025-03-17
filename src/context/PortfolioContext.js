// src/services/api.js

import axios from 'axios';
import { estimateAnnualFee, guessFundType, extractFundInfo, FUND_TYPES } from '../utils/fundUtils';

/**
 * 強制的にYahoo Finance API利用を無効化し、Alpha Vantageのみを使用するバージョン
 * 401エラーの完全な解決のため
 */

// 環境に応じたベースURL設定
const isLocalhost = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// 本番環境のURLは環境変数から取得、未設定の場合は現在のオリジンを使用
const PROD_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
                     (!isLocalhost ? window.location.origin : 'https://delicate-malasada-1fb747.netlify.app');

// Alpha Vantage APIエンドポイント（プライマリデータソース）
const ALPHA_VANTAGE_URL = isLocalhost
  ? '/.netlify/functions/alpha-vantage-proxy' // ローカル環境
  : `${PROD_BASE_URL}/.netlify/functions/alpha-vantage-proxy`; // 本番環境

// 環境変数または固定値からAPIキーを取得
const ALPHA_VANTAGE_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'GC4EBI5YHFKOJEXY';

// デバッグ用：初期起動時に設定を表示
console.log(`API Configuration (FORCED ALPHA VANTAGE MODE):
- Environment: ${isLocalhost ? 'Local development' : 'Production'}
- Alpha Vantage URL: ${ALPHA_VANTAGE_URL}
- Alpha Vantage Key: ${ALPHA_VANTAGE_KEY.substring(0, 4)}...`);

/**
 * 銘柄データを取得する（Alpha Vantageのみを使用）
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} 銘柄データ
 */
export async function fetchTickerData(ticker) {
  console.log(`[API] Fetching ticker data for ${ticker} using Alpha Vantage only`);
  
  try {
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: ticker,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 15000,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    console.log(`[API] Alpha Vantage response for ${ticker}:`, response.data);
    
    // Alpha Vantageのレート制限チェック
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      console.warn('[API] Alpha Vantage rate limit reached');
      return generateFallbackData(ticker);
    }
    
    // データチェック
    if (response.data && response.data['Global Quote'] && response.data['Global Quote']['05. price']) {
      const quoteData = response.data['Global Quote'];
      const price = parseFloat(quoteData['05. price']);
      
      // ティッカー情報から銘柄名を推定
      let name = ticker;
      
      // ファンド情報の取得（種類と手数料率の推定）
      const fundInfo = extractFundInfo(ticker, name);
      const fundType = guessFundType(ticker, name);
      const feeInfo = estimateAnnualFee(ticker, name);
      
      // 個別株かどうかを判定
      const isStock = fundType === FUND_TYPES.STOCK;
      
      // 個別株の場合は手数料を必ず0に設定
      const annualFee = isStock ? 0 : feeInfo.fee;
      
      console.log(`[API] Estimated fund type for ${ticker}: ${fundType} with fee ${isStock ? 0 : feeInfo.fee}%`);
      
      // 基本情報を返す
      return {
        id: ticker,
        name: ticker, // Alpha Vantageは銘柄名を提供しないのでティッカーを使用
        ticker: ticker,
        exchangeMarket: ticker.includes('.T') ? 'Japan' : 'US',
        price: price,
        currency: ticker.includes('.T') ? 'JPY' : 'USD',
        holdings: 0,
        annualFee: annualFee,
        fundType: fundType,
        feeSource: isStock ? '個別株' : feeInfo.source,
        feeIsEstimated: isStock ? false : feeInfo.isEstimated,
        region: fundInfo.region,
        isStock: isStock,
        lastUpdated: new Date().toISOString(),
        source: 'Alpha Vantage'
      };
    }
    
    // データが見つからない場合はフォールバック
    console.warn(`[API] No valid data found for ${ticker}`);
    return generateFallbackData(ticker);
  } 
  catch (error) {
    console.error('[API] Alpha Vantage error:', error.message);
    return generateFallbackData(ticker);
  }
}

/**
 * フォールバックデータを生成
 * @param {string} ticker - ティッカーシンボル
 * @returns {Object} - 生成されたフォールバックデータ
 */
function generateFallbackData(ticker) {
  console.log(`[API] Using fallback data for ${ticker}`);
  
  // 市場を簡易判定
  const isJapanese = ticker.includes('.T');
  const defaultPrice = isJapanese ? 2500 : 150;
  
  // ファンド情報の取得（種類と手数料率の推定）
  const fundInfo = extractFundInfo(ticker);
  const fundType = guessFundType(ticker);
  const feeInfo = estimateAnnualFee(ticker);
  
  // 個別株かどうかを判定
  const isStock = fundType === FUND_TYPES.STOCK;
  
  // 個別株の場合は手数料を必ず0に設定
  const annualFee = isStock ? 0 : feeInfo.fee;
  
  return {
    id: ticker,
    name: ticker,
    ticker: ticker,
    exchangeMarket: isJapanese ? 'Japan' : 'US',
    price: defaultPrice,
    currency: isJapanese ? 'JPY' : 'USD',
    holdings: 0,
    annualFee: annualFee,
    fundType: fundType,
    feeSource: isStock ? '個別株' : feeInfo.source,
    feeIsEstimated: isStock ? false : feeInfo.isEstimated,
    region: fundInfo.region,
    isStock: isStock,
    lastUpdated: new Date().toISOString(),
    source: 'Fallback'
  };
}

/**
 * 為替レートを取得する
 * @param {string} fromCurrency - 元の通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Promise<Object>} - 為替レートデータ
 */
export async function fetchExchangeRate(fromCurrency, toCurrency) {
  console.log(`[API] Fetching exchange rate ${fromCurrency}/${toCurrency}`);
  
  // 同一通貨の場合は1を返す
  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      source: 'Direct',
      lastUpdated: new Date().toISOString()
    };
  }
  
  try {
    // Alpha Vantage APIから為替レートを取得
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'CURRENCY_EXCHANGE_RATE',
        from_currency: fromCurrency,
        to_currency: toCurrency,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 15000
    });
    
    // レスポンスを確認
    if (response.data && 
        response.data['Realtime Currency Exchange Rate'] && 
        response.data['Realtime Currency Exchange Rate']['5. Exchange Rate']) {
      
      const rate = parseFloat(response.data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
      
      return {
        rate: rate,
        source: 'Alpha Vantage',
        lastUpdated: new Date().toISOString()
      };
    }
    
    // データが見つからない場合はフォールバック
    return getFallbackExchangeRate(fromCurrency, toCurrency);
  } 
  catch (error) {
    console.error('[API] Exchange rate error:', error.message);
    return getFallbackExchangeRate(fromCurrency, toCurrency);
  }
}

/**
 * フォールバックの為替レートを取得
 * @param {string} fromCurrency - 元の通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Object} - フォールバックの為替レート
 */
function getFallbackExchangeRate(fromCurrency, toCurrency) {
  console.log(`[API] Using fallback exchange rate for ${fromCurrency}/${toCurrency}`);
  
  let rate = 1;
  
  // 主要な通貨ペアのデフォルト値
  if (fromCurrency === 'USD' && toCurrency === 'JPY') {
    rate = 150.0;
  } 
  else if (fromCurrency === 'JPY' && toCurrency === 'USD') {
    rate = 1 / 150.0;
  }
  else if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    rate = 1.1;
  }
  else if (fromCurrency === 'EUR' && toCurrency === 'JPY') {
    rate = 160.0;
  }
  
  return {
    rate: rate,
    source: 'Fallback',
    lastUpdated: new Date().toISOString()
  };
}

/**
 * ファンド情報を取得する
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} ファンド情報
 */
export async function fetchFundInfo(ticker) {
  console.log(`[API] Fetching fund info for ${ticker}`);
  
  try {
    // まずはティッカーシンボルから基本情報を推定
    const fundInfo = extractFundInfo(ticker);
    const fundType = guessFundType(ticker);
    const feeInfo = estimateAnnualFee(ticker);
    
    // 個別株かどうかを判定
    const isStock = fundType === FUND_TYPES.STOCK;
    
    // 個別株の場合は手数料を必ず0に設定
    const annualFee = isStock ? 0 : feeInfo.fee;
    
    return {
      success: true,
      ticker: ticker,
      fundType: fundType,
      annualFee: annualFee,
      feeSource: isStock ? '個別株' : feeInfo.source,
      feeIsEstimated: isStock ? false : feeInfo.isEstimated,
      region: fundInfo.region,
      isStock: isStock,
      lastUpdated: new Date().toISOString(),
      source: 'Estimated'
    };
  } 
  catch (error) {
    console.error('[API] Fund info error:', error.message);
    
    // エラーが発生した場合もデフォルト値を返す
    return {
      success: false,
      ticker: ticker,
      fundType: 'unknown',
      annualFee: 0, // エラー時はデフォルトで0を返す
      feeSource: 'Default',
      feeIsEstimated: true,
      region: 'unknown',
      isStock: false,
      lastUpdated: new Date().toISOString(),
      source: 'Fallback'
    };
  }
}
