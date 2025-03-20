// src/services/marketDataService.js

import axios from 'axios';
import { 
  guessFundType, 
  estimateAnnualFee, 
  extractFundInfo, 
  estimateDividendYield,
  TICKER_SPECIFIC_FEES,
  TICKER_SPECIFIC_DIVIDENDS,
  FUND_TYPES
} from '../utils/fundUtils';

// 環境に応じたベースURL設定
const isLocalhost = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// 本番環境のURLは環境変数から取得、未設定の場合は現在のオリジンを使用
// 以下の優先順位でURLを決定:
// 1. REACT_APP_API_BASE_URL 環境変数
// 2. ローカルでない場合は現在のウィンドウの origin
// 3. 明示的なフォールバックURL
const PROD_BASE_URL = process.env.REACT_APP_API_BASE_URL || 
                      (!isLocalhost ? window.location.origin : 'https://delicate-malasada-1fb747.netlify.app');

// API エンドポイントの設定
const BASE_URL = isLocalhost ? '' : PROD_BASE_URL;

// Alpha Vantage APIエンドポイント（プライマリソース）
const ALPHA_VANTAGE_URL = isLocalhost
  ? '/.netlify/functions/alpha-vantage-proxy' // ローカル環境
  : `${BASE_URL}/.netlify/functions/alpha-vantage-proxy`; // 本番環境

// Yahoo Finance APIエンドポイント（バックアップソース - 現在動作しない）
const YAHOO_API_URL = isLocalhost
  ? '/v7/finance/quote' // ローカル環境ではsetupProxy.jsのプロキシ経由
  : `${BASE_URL}/.netlify/functions/yahoo-finance-proxy`; // 本番環境

// 環境変数または固定値からAPIキーを取得
const ALPHA_VANTAGE_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'GC4EBI5YHFKOJEXY';

// 設定情報をログ出力（開発時の確認用）
console.log(`API Configuration:
- Environment: ${isLocalhost ? 'Local development' : 'Production'}
- Base URL: ${BASE_URL || '(using proxy)'}
- Alpha Vantage API (Primary): ${ALPHA_VANTAGE_URL}
- Yahoo Finance API (Disabled): ${YAHOO_API_URL}
- Alpha Vantage Key: ${ALPHA_VANTAGE_KEY.substring(0, 4)}...
`);

// 為替レートのデフォルト値（最終手段）
const DEFAULT_EXCHANGE_RATES = {
  'USD/JPY': 150.0,
  'JPY/USD': 1/150.0,
  'EUR/JPY': 160.0,
  'EUR/USD': 1.1,
};

/**
 * 特定ティッカーがETFかどうかを判定する
 * @param {string} ticker - ティッカーシンボル 
 * @returns {boolean} - ETFならtrue
 */
function isETFFromTickerSpecificList(ticker) {
  // 大文字に統一
  ticker = ticker.toUpperCase();
  // TICKER_SPECIFIC_FEESリストに含まれていて、特定の例外以外はETFとみなす
  return TICKER_SPECIFIC_FEES[ticker] !== undefined && 
         !['VTSAX', 'VFIAX', 'GBTC', 'ETHE'].includes(ticker);
}

/**
 * 銘柄のファンドタイプを確実に判定する
 * @param {string} ticker - ティッカーシンボル
 * @param {string} name - 銘柄名 
 * @returns {string} - 確定したファンドタイプ
 */
function determineFundType(ticker, name) {
  // 大文字に統一
  ticker = ticker.toUpperCase();
  
  // ティッカーが既知のETF/ファンドリストにあるかチェック
  if (isETFFromTickerSpecificList(ticker)) {
    // BTC関連はクリプト、GLDはETFに
    if (ticker === 'IBIT' || ticker === 'GBTC' || ticker === 'ETHE') {
      return FUND_TYPES.CRYPTO;
    }
    // 通常のETF
    return ticker.includes('.T') ? FUND_TYPES.ETF_JP : FUND_TYPES.ETF_US;
  }
  
  // そうでなければ通常の判定ロジックを使用
  return guessFundType(ticker, name);
}

/**
 * ETFかどうかを判定し、配当情報を確定する
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} - 配当があるならtrue
 */
function determineHasDividend(ticker) {
  // 大文字に統一
  ticker = ticker.toUpperCase();
  
  // 特定の配当リストに情報があればそれを使用
  if (TICKER_SPECIFIC_DIVIDENDS[ticker] !== undefined) {
    return TICKER_SPECIFIC_DIVIDENDS[ticker] > 0;
  }
  
  // 知られている無配当ETF
  const noDividendETFs = ['GLD', 'IBIT', 'GBTC', 'ETHE'];
  if (noDividendETFs.includes(ticker)) {
    return false;
  }
  
  // ETFリストに含まれるものは（上記の例外を除き）配当ありとみなす
  if (isETFFromTickerSpecificList(ticker)) {
    return true;
  }
  
  // ファンドタイプに基づく判断
  const fundType = determineFundType(ticker, ticker);
  
  if (fundType === FUND_TYPES.STOCK) {
    // 個別株は配当の有無不明のためfalse
    return false;
  } else if (
    fundType === FUND_TYPES.ETF_JP || 
    fundType === FUND_TYPES.ETF_US || 
    fundType === FUND_TYPES.INDEX_JP || 
    fundType === FUND_TYPES.INDEX_US || 
    fundType === FUND_TYPES.INDEX_GLOBAL ||
    fundType === FUND_TYPES.REIT_JP || 
    fundType === FUND_TYPES.REIT_US || 
    fundType === FUND_TYPES.BOND
  ) {
    // ETF、インデックスファンド、REIT、債券ファンドは通常配当あり
    return true;
  }
  
  // デフォルトはfalse
  return false;
}

/**
 * 銘柄データを取得 - Alpha Vantageをプライマリソースとして使用
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - 銘柄データとステータス
 */
export async function fetchTickerData(ticker) {
  if (!ticker) {
    return {
      success: false,
      message: 'ティッカーシンボルが指定されていません',
      error: true
    };
  }
  
  // ティッカーを大文字に統一
  ticker = ticker.toUpperCase();
  
  try {
    // Alpha Vantage APIからデータ取得を試みる（プライマリソース）
    console.log(`Attempting to fetch data for ${ticker} from Alpha Vantage at: ${ALPHA_VANTAGE_URL}`);
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: ticker
      },
      timeout: 15000, // 15秒タイムアウト設定
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
    
    // APIレート制限のチェック
    if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
      console.warn(`Alpha Vantage API rate limit reached for ${ticker}`);
      return {
        success: false,
        message: 'Alpha Vantage APIのリクエスト制限に達しました。しばらく待ってから再試行してください。',
        error: true,
        errorType: 'RATE_LIMIT',
        data: generateFallbackTickerData(ticker).data
      };
    }
    
    // レスポンスの検証（より堅牢な検証）
    if (response.data && response.data['Global Quote']) {
      const quoteData = response.data['Global Quote'];
      
      // 価格データが存在するか確認
      if (quoteData && quoteData['05. price']) {
        const price = parseFloat(quoteData['05. price']);
        
        // 価格が有効な数値かチェック
        if (!isNaN(price) && price > 0) {
          console.log(`Successfully fetched data for ${ticker} from Alpha Vantage: $${price}`);
          
          // 銘柄名の取得を試みる（短めのフォールバック処理）
          let name = ticker;
          try {
            // もし時間とAPIリクエスト数に余裕があれば
            // SYMBOL_SEARCH機能で銘柄名を取得することも可能
            // ここでは単純にティッカーを名前として使用
          } catch (error) {
            console.log(`Could not fetch name for ${ticker}, using ticker as name`);
          }
          
          // ファンドタイプを判定（ETFリストを優先）
          const fundType = determineFundType(ticker, name);
          console.log(`Determined fund type for ${ticker}: ${fundType}`);
          
          // 個別株かどうかを判定（ETFリストに含まれる場合は必ず個別株ではない）
          const isStock = fundType === FUND_TYPES.STOCK;
          
          // 手数料情報を取得
          const feeInfo = estimateAnnualFee(ticker, name);
          
          // 基本情報を取得
          const fundInfo = extractFundInfo(ticker, name);
          
          // 配当情報の取得
          const dividendInfo = estimateDividendYield(ticker, name);
          
          // 配当情報を確定（ETFリストを優先）
          const hasDividend = determineHasDividend(ticker);
          
          // 通貨判定
          const currency = fundInfo.currency || (ticker.includes('.T') ? 'JPY' : 'USD');
          
          // 手数料情報（個別株は常に0%）
          const annualFee = isStock ? 0 : feeInfo.fee;
          
          return {
            success: true,
            data: {
              id: ticker,
              name: name,
              ticker: ticker,
              exchangeMarket: ticker.includes('.T') ? 'Japan' : 'US',
              price: price,
              currency: currency,
              holdings: 0,
              annualFee: annualFee,
              fundType: fundType,
              isStock: isStock,
              feeSource: isStock ? '個別株' : feeInfo.source,
              feeIsEstimated: isStock ? false : feeInfo.isEstimated,
              region: fundInfo.region || 'unknown',
              lastUpdated: new Date().toISOString(),
              source: 'Alpha Vantage',
              // 配当情報
              dividendYield: dividendInfo.yield,
              hasDividend: hasDividend,
              dividendFrequency: dividendInfo.dividendFrequency,
              dividendIsEstimated: dividendInfo.isEstimated
            },
            message: '正常に取得しました'
          };
        } else {
          console.warn(`Invalid price value for ${ticker}: ${price}. Using fallback.`);
        }
      } else {
        console.warn(`Missing price data for ${ticker} in response. Using fallback.`);
      }
    } else if (response.data && response.data['Error Message']) {
      // Alpha Vantage のエラーメッセージがある場合
      console.error(`Alpha Vantage API error for ${ticker}: ${response.data['Error Message']}`);
      return {
        success: false,
        message: `銘柄情報の取得エラー: ${response.data['Error Message']}`,
        error: true,
        errorType: 'API_ERROR',
        data: generateFallbackTickerData(ticker).data
      };
    }
    
    console.log(`No valid data found for ${ticker} from Alpha Vantage, using fallback`);
    // データが適切な形式でない場合、フォールバック値を使用
    return generateFallbackTickerData(ticker);
    
  } catch (error) {
    console.error(`Alpha Vantage API error for ${ticker}:`, error.message);
    
    // エラーの種類を特定して適切なメッセージを生成
    let errorType = 'UNKNOWN';
    let errorMessage = 'データの取得に失敗しました。';
    
    if (error.response) {
      // サーバーからのレスポンスがある場合
      if (error.response.status === 429) {
        errorType = 'RATE_LIMIT';
        errorMessage = 'APIリクエスト制限に達しました。しばらく待ってから再試行してください。';
      } else {
        errorType = 'API_ERROR';
        errorMessage = `API エラー (${error.response.status}): ${error.response.data?.message || error.message}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT';
      errorMessage = 'リクエストのタイムアウトが発生しました。ネットワーク接続を確認してください。';
    } else if (error.code === 'ERR_NETWORK') {
      errorType = 'NETWORK';
      errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
    }
    
    // エラー詳細を含むレスポンス
    const fallbackResult = generateFallbackTickerData(ticker);
    
    return {
      ...fallbackResult,
      errorType: errorType,
      message: errorMessage
    };
  }
}

/**
 * 全ての取得方法が失敗した場合のフォールバックデータ生成
 * @param {string} ticker - ティッカーシンボル
 * @returns {Object} - フォールバック銘柄データとステータス
 */
function generateFallbackTickerData(ticker) {
  // ティッカーを大文字に統一
  ticker = ticker.toUpperCase();
  
  // 市場とティッカーから推測されるデフォルト値を使用
  const isJapanese = ticker.includes('.T') || /^\d{4,}$/.test(ticker);
  const defaultPrice = isJapanese ? 2500 : 150;
  
  // ファンドタイプを判定（ETFリストを優先）
  const fundType = determineFundType(ticker, ticker);
  
  // 個別株かどうかを判定（ETFリストに含まれる場合は必ず個別株ではない）
  const isStock = fundType === FUND_TYPES.STOCK;
  
  // 基本情報と手数料情報を取得
  const fundInfo = extractFundInfo(ticker, ticker);
  const feeInfo = estimateAnnualFee(ticker, ticker);
  
  // 配当情報の推定
  const dividendInfo = estimateDividendYield(ticker, ticker);
  
  // 配当情報を確定（ETFリストを優先）
  const hasDividend = determineHasDividend(ticker);
  
  // 手数料情報（個別株は常に0%）
  const annualFee = isStock ? 0 : feeInfo.fee;
  
  return {
    success: false,
    data: {
      id: ticker,
      name: ticker,
      ticker: ticker,
      exchangeMarket: isJapanese ? 'Japan' : 'US',
      price: defaultPrice,
      currency: isJapanese ? 'JPY' : 'USD',
      holdings: 0,
      annualFee: annualFee,
      fundType: fundType,
      isStock: isStock,
      feeSource: isStock ? '個別株' : feeInfo.source,
      feeIsEstimated: isStock ? false : feeInfo.isEstimated,
      region: fundInfo.region || 'unknown',
      lastUpdated: new Date().toISOString(),
      source: 'Fallback',
      // 配当情報
      dividendYield: dividendInfo.yield,
      hasDividend: hasDividend,
      dividendFrequency: dividendInfo.dividendFrequency,
      dividendIsEstimated: dividendInfo.isEstimated
    },
    message: '最新の価格データを取得できませんでした。前回の価格または推定値を使用しています。',
    error: true
  };
}

/**
 * 配当データを取得
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - 配当データとステータス
 */
export async function fetchDividendData(ticker) {
  try {
    // ティッカーを大文字に統一
    ticker = ticker.toUpperCase();
    
    // ファンドタイプを判定（ETFリストを優先）
    const fundType = determineFundType(ticker, ticker);
    
    // 配当情報の取得
    const dividendInfo = estimateDividendYield(ticker, ticker);
    
    // 配当情報を確定（ETFリストを優先）
    const hasDividend = determineHasDividend(ticker);
    
    return {
      success: true,
      data: {
        dividendYield: dividendInfo.yield,
        hasDividend: hasDividend,
        dividendFrequency: dividendInfo.dividendFrequency,
        dividendIsEstimated: dividendInfo.isEstimated,
        lastUpdated: new Date().toISOString()
      },
      message: '配当情報を取得しました'
    };
  } catch (error) {
    console.error('Dividend data fetch error:', error);
    
    // エラー時はティッカーからの推定値を返す
    const dividendInfo = estimateDividendYield(ticker, ticker);
    const hasDividend = determineHasDividend(ticker);
    
    return {
      success: false,
      data: {
        dividendYield: dividendInfo.yield,
        hasDividend: hasDividend,
        dividendFrequency: dividendInfo.dividendFrequency,
        dividendIsEstimated: true,
        lastUpdated: new Date().toISOString()
      },
      message: '配当情報の取得に失敗しました。推定値を使用しています。',
      error: true
    };
  }
}

/**
 * 銘柄情報を取得（手数料と配当情報を含む）
 * @param {string} ticker - ティッカーシンボル
 * @param {string} name - 銘柄名（省略可）
 * @returns {Promise<Object>} - 銘柄情報とステータス
 */
export async function fetchFundInfo(ticker, name = '') {
  try {
    // ティッカーを大文字に統一
    ticker = ticker.toUpperCase();
    
    // ファンドタイプを判定（ETFリストを優先）
    const fundType = determineFundType(ticker, name);
    
    // 個別株かどうかを判定
    const isStock = fundType === FUND_TYPES.STOCK;
    
    // 手数料情報を推定
    const feeInfo = estimateAnnualFee(ticker, name);
    
    // 配当情報を推定
    const dividendInfo = estimateDividendYield(ticker, name);
    
    // 配当情報を確定（ETFリストを優先）
    const hasDividend = determineHasDividend(ticker);
    
    return {
      success: true,
      ticker: ticker,
      name: name || ticker,
      fundType: fundType,
      isStock: isStock,
      annualFee: isStock ? 0 : feeInfo.fee,
      feeSource: isStock ? '個別株' : feeInfo.source,
      feeIsEstimated: isStock ? false : feeInfo.isEstimated,
      dividendYield: dividendInfo.yield,
      hasDividend: hasDividend,
      dividendFrequency: dividendInfo.dividendFrequency,
      dividendIsEstimated: dividendInfo.isEstimated,
      message: 'ファンド情報を取得しました'
    };
  } catch (error) {
    console.error('Fund info fetch error:', error);
    
    return {
      success: false,
      ticker: ticker,
      fundType: 'UNKNOWN',
      isStock: false,
      annualFee: 0,
      feeSource: '取得失敗',
      feeIsEstimated: true,
      dividendYield: 0,
      hasDividend: false,
      dividendFrequency: 'unknown',
      dividendIsEstimated: true,
      message: 'ファンド情報の取得に失敗しました',
      error: true
    };
  }
}

/**
 * 為替レートを取得する
 * @param {string} fromCurrency - 元の通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Promise<Object>} - 為替レートデータとステータス
 */
export async function fetchExchangeRate(fromCurrency, toCurrency) {
  try {
    // 同一通貨の場合は1を返す
    if (fromCurrency === toCurrency) {
      return {
        success: true,
        rate: 1,
        source: 'Direct',
        message: '同一通貨間のレートです',
        lastUpdated: new Date().toISOString()
      };
    }
    
    console.log(`Attempting to fetch exchange rate for ${fromCurrency}/${toCurrency} from Alpha Vantage`);
    
    // Alpha Vantage APIから為替データ取得
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'CURRENCY_EXCHANGE_RATE',
        from_currency: fromCurrency,
        to_currency: toCurrency,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 15000 // 15秒タイムアウト設定
    });
    
    if (response.data && 
        response.data['Realtime Currency Exchange Rate'] && 
        response.data['Realtime Currency Exchange Rate']['5. Exchange Rate']) {
      
      const rate = parseFloat(response.data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
      
      console.log(`Successfully fetched exchange rate for ${fromCurrency}/${toCurrency} from Alpha Vantage: ${rate}`);
      
      return {
        success: true,
        rate: rate,
        source: 'Alpha Vantage',
        message: '正常に取得しました',
        lastUpdated: new Date().toISOString()
      };
    }
    
    console.log(`No valid exchange rate data for ${fromCurrency}/${toCurrency} from Alpha Vantage, using fallback`);
    // すべての取得方法が失敗した場合はデフォルト値を使用
    return generateFallbackExchangeRate(fromCurrency, toCurrency);
    
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    console.log(`Error fetching exchange rate for ${fromCurrency}/${toCurrency}, using fallback`);
    
    // フォールバック値を返す
    return generateFallbackExchangeRate(fromCurrency, toCurrency);
  }
}

/**
 * デフォルトの為替レートを生成する
 * @param {string} fromCurrency - 元の通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Object} - デフォルト為替レートデータとステータス
 */
function generateFallbackExchangeRate(fromCurrency, toCurrency) {
  const pair = `${fromCurrency}/${toCurrency}`;
  let rate;
  
  // デフォルト値から取得を試みる
  if (DEFAULT_EXCHANGE_RATES[pair]) {
    rate = DEFAULT_EXCHANGE_RATES[pair];
  } else if (fromCurrency === 'JPY' && toCurrency === 'USD') {
    rate = 1 / 150.0; // 円からドル
  } else if (fromCurrency === 'USD' && toCurrency === 'JPY') {
    rate = 150.0; // ドルから円
  } else {
    // その他の通貨ペアの場合は1を使用
    rate = 1;
  }
  
  console.log(`Using fallback exchange rate for ${fromCurrency}/${toCurrency}: ${rate}`);
  
  return {
    success: false,
    rate: rate,
    source: 'Fallback',
    message: '最新の為替レートを取得できませんでした。デフォルト値を使用しています。',
    error: true,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * 複数銘柄のデータを一括取得する
 * @param {Array<string>} tickers - ティッカーシンボルの配列
 * @returns {Promise<Object>} - 複数銘柄のデータとステータス
 */
export async function fetchMultipleTickerData(tickers) {
  if (!tickers || !tickers.length) {
    return {
      success: false,
      data: [],
      message: 'ティッカーリストが空です',
      error: true
    };
  }
  
  console.log(`Fetching data for ${tickers.length} tickers: ${tickers.join(', ')}`);
  
  // 各ティッカーを並行して取得
  const results = await Promise.all(
    tickers.map(async (ticker) => {
      const result = await fetchTickerData(ticker);
      return {
        ticker,
        ...result
      };
    })
  );
  
  // 全体の成功・失敗を判定
  const hasError = results.some(result => !result.success);
  const allSuccess = results.every(result => result.success);
  
  // 結果のサマリーをログ
  console.log(`Fetch summary: ${results.filter(r => r.success).length} succeeded, ${results.filter(r => !r.success).length} failed`);
  
  return {
    success: allSuccess,
    data: results.map(result => result.data),
    partialSuccess: hasError && results.some(result => result.success),
    message: allSuccess 
      ? '全ての銘柄データを正常に取得しました' 
      : hasError 
        ? '一部の銘柄データの取得に失敗しました' 
        : '全ての銘柄データの取得に失敗しました',
    error: hasError,
    details: results.map(result => ({
      ticker: result.ticker,
      success: result.success,
      message: result.message,
      source: result.data.source
    }))
  };
}

/**
 * 市場データの更新状態をチェックする
 * @param {Array<Object>} assets - 資産データ
 * @param {number} staleThresholdHours - 古いと判断する時間（時間単位）
 * @returns {Object} - 更新状態の診断結果
 */
export function checkDataFreshness(assets, staleThresholdHours = 24) {
  if (!assets || !assets.length) {
    return {
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
    fresh: staleItems.length === 0 && missingUpdateTime.length === 0,
    staleItems,
    missingUpdateTime,
    message: staleItems.length > 0 
      ? `${staleItems.length}個の銘柄データが${staleThresholdHours}時間以上更新されていません` 
      : missingUpdateTime.length > 0 
        ? `${missingUpdateTime.length}個の銘柄に更新時間情報がありません` 
        : 'すべてのデータは最新です'
  };
}
