// src/services/marketDataService.js

import axios from 'axios';

// 環境に応じたYahoo Finance APIエンドポイント
const YAHOO_API_URL = process.env.NODE_ENV === 'development' 
  ? '/v7/finance/quote'  // プロキシ経由
  : '/.netlify/functions/yahoo-finance-proxy'; // 本番環境

// Alpha Vantage APIエンドポイント（代替データソース）
const ALPHA_VANTAGE_URL = '/.netlify/functions/alpha-vantage-proxy';
// 環境変数名を統一（Reactフロントエンドなので REACT_APP_ プレフィックスは必要）
const ALPHA_VANTAGE_KEY = process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'GC4EBI5YHFKOJEXY';

// 為替レートのデフォルト値（最終手段）
const DEFAULT_EXCHANGE_RATES = {
  'USD/JPY': 150.0,
  'JPY/USD': 1/150.0,
  'EUR/JPY': 160.0,
  'EUR/USD': 1.1,
};

/**
 * Yahoo Financeから銘柄データを取得
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - 銘柄データとステータス
 */
export async function fetchTickerData(ticker) {
  try {
    // Yahoo Finance APIからデータ取得を試みる
    console.log(`Attempting to fetch data for ${ticker} from Yahoo Finance`);
    const response = await axios.get(YAHOO_API_URL, {
      params: { symbols: ticker },
      timeout: 5000 // 5秒タイムアウト設定
    });
    
    // レスポンスの検証
    if (response.data && 
        response.data.quoteResponse && 
        response.data.quoteResponse.result && 
        response.data.quoteResponse.result.length > 0) {
      
      const data = response.data.quoteResponse.result[0];
      
      return {
        success: true,
        data: {
          id: data.symbol,
          name: data.shortName || data.longName || ticker,
          ticker: data.symbol,
          exchangeMarket: data.fullExchangeName?.includes('Tokyo') ? 'Japan' : 'US',
          price: data.regularMarketPrice,
          currency: data.currency,
          holdings: 0,
          annualFee: 0.3,
          lastUpdated: new Date().toISOString(),
          source: 'Yahoo Finance'
        },
        message: '正常に取得しました'
      };
    }
    
    console.log(`No valid data found for ${ticker} from Yahoo Finance, trying Alpha Vantage`);
    // データが見つからない場合は代替ソースを試す
    return await fetchTickerDataFromAlternative(ticker);
    
  } catch (error) {
    console.error('Yahoo Finance API error:', error);
    console.log(`Error fetching ${ticker} from Yahoo Finance, trying Alpha Vantage`);
    
    // エラーが発生した場合は代替ソースを試す
    return await fetchTickerDataFromAlternative(ticker);
  }
}

/**
 * Alpha Vantageから銘柄データを取得（代替ソース）
 * @param {string} ticker - ティッカーシンボル
 * @returns {Promise<Object>} - 銘柄データとステータス
 */
async function fetchTickerDataFromAlternative(ticker) {
  try {
    // Alpha Vantage APIからデータ取得を試みる
    console.log(`Attempting to fetch data for ${ticker} from Alpha Vantage`);
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: ticker,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 8000 // 8秒タイムアウト設定
    });
    
    // レスポンスの検証
    if (response.data && response.data['Global Quote'] && response.data['Global Quote']['05. price']) {
      const quoteData = response.data['Global Quote'];
      const price = parseFloat(quoteData['05. price']);
      
      console.log(`Successfully fetched data for ${ticker} from Alpha Vantage`);
      
      // 通貨判定（簡易的な判定、実際にはより詳細な判定が必要）
      const currency = ticker.includes('.T') ? 'JPY' : 'USD';
      
      return {
        success: true,
        data: {
          id: ticker,
          name: ticker, // Alpha Vantageからは銘柄名が取得できないため、ティッカーを使用
          ticker: ticker,
          exchangeMarket: ticker.includes('.T') ? 'Japan' : 'US',
          price: price,
          currency: currency,
          holdings: 0,
          annualFee: 0.3,
          lastUpdated: new Date().toISOString(),
          source: 'Alpha Vantage'
        },
        message: '代替ソースから取得しました'
      };
    }
    
    console.log(`No valid data found for ${ticker} from Alpha Vantage, using fallback`);
    // 全ての取得方法が失敗した場合はフォールバック値を使用
    return generateFallbackTickerData(ticker);
    
  } catch (error) {
    console.error('Alternative API error:', error);
    console.log(`Error fetching ${ticker} from Alpha Vantage, using fallback`);
    
    // フォールバック値を返す
    return generateFallbackTickerData(ticker);
  }
}

/**
 * 全ての取得方法が失敗した場合のフォールバックデータ生成
 * @param {string} ticker - ティッカーシンボル
 * @returns {Object} - フォールバック銘柄データとステータス
 */
function generateFallbackTickerData(ticker) {
  // 市場とティッカーから推測されるデフォルト値を使用
  const isJapanese = ticker.includes('.T');
  const defaultPrice = isJapanese ? 2500 : 150;
  
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
      annualFee: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'Fallback'
    },
    message: '最新の価格データを取得できませんでした。前回の価格または推定値を使用しています。',
    error: true
  };
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
    
    // 為替ペアを構築
    const pair = `${fromCurrency}${toCurrency}=X`;
    
    console.log(`Attempting to fetch exchange rate for ${pair} from Yahoo Finance`);
    
    // Yahoo Finance APIから為替データ取得
    const response = await axios.get(YAHOO_API_URL, {
      params: { symbols: pair },
      timeout: 5000 // 5秒タイムアウト設定
    });
    
    if (response.data && 
        response.data.quoteResponse && 
        response.data.quoteResponse.result && 
        response.data.quoteResponse.result.length > 0) {
      
      const data = response.data.quoteResponse.result[0];
      
      if (data.regularMarketPrice) {
        console.log(`Successfully fetched exchange rate for ${pair}: ${data.regularMarketPrice}`);
        return {
          success: true,
          rate: data.regularMarketPrice,
          source: 'Yahoo Finance',
          message: '正常に取得しました',
          lastUpdated: new Date().toISOString()
        };
      }
    }
    
    console.log(`No valid exchange rate data for ${pair} from Yahoo Finance, trying Alpha Vantage`);
    // Yahoo Financeから取得できなかった場合は代替ソースを試す
    return await fetchExchangeRateFromAlternative(fromCurrency, toCurrency);
    
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    console.log(`Error fetching exchange rate for ${fromCurrency}/${toCurrency}, trying alternative`);
    
    // エラーが発生した場合は代替ソースを試す
    return await fetchExchangeRateFromAlternative(fromCurrency, toCurrency);
  }
}

/**
 * 代替ソースから為替レートを取得する
 * @param {string} fromCurrency - 元の通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {Promise<Object>} - 為替レートデータとステータス
 */
async function fetchExchangeRateFromAlternative(fromCurrency, toCurrency) {
  try {
    console.log(`Attempting to fetch exchange rate for ${fromCurrency}/${toCurrency} from Alpha Vantage`);
    
    // Alpha Vantage APIから為替データ取得を試みる
    const response = await axios.get(ALPHA_VANTAGE_URL, {
      params: {
        function: 'CURRENCY_EXCHANGE_RATE',
        from_currency: fromCurrency,
        to_currency: toCurrency,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 8000 // 8秒タイムアウト設定
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
        message: '代替ソースから取得しました',
        lastUpdated: new Date().toISOString()
      };
    }
    
    console.log(`No valid exchange rate data for ${fromCurrency}/${toCurrency} from Alpha Vantage, using fallback`);
    // すべての取得方法が失敗した場合はデフォルト値を使用
    return generateFallbackExchangeRate(fromCurrency, toCurrency);
    
  } catch (error) {
    console.error('Alternative exchange rate fetch error:', error);
    console.log(`Error fetching exchange rate for ${fromCurrency}/${toCurrency} from Alpha Vantage, using fallback`);
    
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