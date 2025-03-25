// functions/stock-scraping-proxy.js
/**
 * 株価スクレイピングプロキシ
 * API経由での取得に失敗した海外個別株・ETFの株価をスクレイピングで取得する
 */
const axios = require('axios');
const { JSDOM } = require('jsdom');

// CORSヘッダー
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// スクレイピングソースの設定
const SCRAPING_SOURCES = {
  YAHOO_FINANCE: {
    name: 'Yahoo Finance',
    baseUrl: 'https://finance.yahoo.com/quote/',
    priceSelector: '[data-test="qsp-price"]',
    nameSelector: 'h1'
  },
  MARKET_WATCH: {
    name: 'MarketWatch',
    baseUrl: 'https://www.marketwatch.com/investing/stock/',
    etfUrl: 'https://www.marketwatch.com/investing/fund/',
    priceSelector: '.intraday__price .value',
    nameSelector: 'h1.company__name'
  },
  INVESTING_COM: {
    name: 'Investing.com',
    baseUrl: 'https://www.investing.com/etfs/',
    stockBaseUrl: 'https://www.investing.com/equities/',
    priceSelector: '.instrument-price_last__KQzyA',
    nameSelector: 'h1[data-test="instrument-header-heading"]'
  }
};

// ユーザーエージェントリスト (スクレイピング検出対策)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
];

// リファラーリスト (スクレイピング検出対策)
const REFERRERS = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://search.yahoo.com/',
  'https://finance.yahoo.com/',
  'https://www.marketwatch.com/'
];

// イベントハンドラー
exports.handler = async function(event, context) {
  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: HEADERS,
      body: ''
    };
  }

  // クエリパラメータを取得
  const params = event.queryStringParameters || {};
  const { symbol, type } = params;
  
  if (!symbol) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({
        success: false,
        message: 'シンボルパラメータが必要です'
      })
    };
  }
  
  // シンボルタイプ（stockまたはetf）
  const assetType = type || detectAssetType(symbol);
  console.log(`Scraping ${assetType} data for: ${symbol}`);
  
  try {
    // 複数のソースでスクレイピングを試みる
    const results = await Promise.allSettled([
      scrapeYahooFinance(symbol),
      scrapeMarketWatch(symbol, assetType),
      scrapeInvestingCom(symbol, assetType)
    ]);
    
    // 成功したスクレイピング結果を抽出
    const successfulResults = results
      .filter(r => r.status === 'fulfilled' && r.value && r.value.success)
      .map(r => r.value);
    
    if (successfulResults.length > 0) {
      // 最初の成功結果を使用
      const result = successfulResults[0];
      console.log(`Successfully scraped ${symbol} from ${result.source}`);
      
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          success: true,
          data: result,
          source: result.source
        })
      };
    }
    
    // すべてのスクレイピングが失敗した場合
    console.error(`All scraping attempts failed for ${symbol}`);
    
    // エラーメッセージを集約
    const errorMessages = results
      .filter(r => r.status === 'rejected' || (r.value && !r.value.success))
      .map(r => r.status === 'rejected' ? r.reason.message : r.value.message)
      .join('; ');
    
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({
        success: false,
        message: `スクレイピングでの取得に失敗しました: ${errorMessages || 'Unknown error'}`
      })
    };
  } catch (error) {
    console.error(`Scraping error for ${symbol}:`, error);
    
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        success: false,
        message: `スクレイピングエラー: ${error.message}`
      })
    };
  }
};

/**
 * シンボルからアセットタイプを判定する
 * @param {string} symbol - ティッカーシンボル
 * @returns {string} - 'etf'または'stock'
 */
function detectAssetType(symbol) {
  const ETF_PATTERNS = [
    // ETF発行会社のプレフィックス
    'SPY', 'VOO', 'VTI', 'QQQ', 'IVV', 'DIA', 'EFA', 'VEA', 'VWO', 'IEMG',
    // 一般的なETFプレフィックス
    'V', 'IW', 'IEF', 'LQD', 'BND', 'AGG', 'XL', 'ARKK', 'INDA', 'EWZ', 'GLD'
  ];

  // 大文字に変換
  const upperSymbol = symbol.toUpperCase();
  
  // ETFパターンに一致するか確認
  for (const pattern of ETF_PATTERNS) {
    if (upperSymbol === pattern || upperSymbol.startsWith(pattern)) {
      return 'etf';
    }
  }
  
  // デフォルトは個別株として扱う
  return 'stock';
}

/**
 * ランダムなヘッダーを生成する (スクレイピング検出対策)
 * @returns {Object} - ヘッダーオブジェクト
 */
function getRandomHeaders() {
  return {
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': REFERRERS[Math.floor(Math.random() * REFERRERS.length)],
    'DNT': '1',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache'
  };
}

/**
 * Yahoo Financeからの株価スクレイピング
 * @param {string} symbol - ティッカーシンボル
 * @returns {Promise<Object>} - スクレイピング結果
 */
async function scrapeYahooFinance(symbol) {
  try {
    console.log(`Attempting to scrape Yahoo Finance for ${symbol}...`);
    
    const source = SCRAPING_SOURCES.YAHOO_FINANCE;
    const url = `${source.baseUrl}${symbol}`;
    
    const response = await axios.get(url, {
      headers: getRandomHeaders(),
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // 価格要素を取得
    const priceElement = document.querySelector(source.priceSelector);
    if (!priceElement) {
      throw new Error('Price element not found');
    }
    
    // 価格を数値に変換
    const priceText = priceElement.textContent.trim().replace(/,/g, '');
    const price = parseFloat(priceText);
    
    if (isNaN(price)) {
      throw new Error(`Invalid price format: ${priceText}`);
    }
    
    // 名前要素を取得
    const nameElement = document.querySelector(source.nameSelector);
    const name = nameElement ? nameElement.textContent.trim() : symbol;
    
    // 成功結果を返す
    return {
      success: true,
      ticker: symbol,
      price: price,
      name: name,
      currency: 'USD', // Yahoo Financeの場合、通常USDだが、他の通貨も可能性あり
      lastUpdated: new Date().toISOString(),
      source: source.name
    };
  } catch (error) {
    console.error(`Yahoo Finance scraping error for ${symbol}:`, error.message);
    return {
      success: false,
      message: `Yahoo Finance scraping failed: ${error.message}`
    };
  }
}

/**
 * MarketWatchからの株価スクレイピング
 * @param {string} symbol - ティッカーシンボル
 * @param {string} type - アセットタイプ（etfまたはstock）
 * @returns {Promise<Object>} - スクレイピング結果
 */
async function scrapeMarketWatch(symbol, type) {
  try {
    console.log(`Attempting to scrape MarketWatch for ${symbol} (${type})...`);
    
    const source = SCRAPING_SOURCES.MARKET_WATCH;
    const url = type === 'etf' 
      ? `${source.etfUrl}${symbol}` 
      : `${source.baseUrl}${symbol}`;
    
    const response = await axios.get(url, {
      headers: getRandomHeaders(),
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // 価格要素を取得
    const priceElement = document.querySelector(source.priceSelector);
    if (!priceElement) {
      throw new Error('Price element not found');
    }
    
    // 価格を数値に変換
    const priceText = priceElement.textContent.trim().replace(/,/g, '');
    const price = parseFloat(priceText);
    
    if (isNaN(price)) {
      throw new Error(`Invalid price format: ${priceText}`);
    }
    
    // 名前要素を取得
    const nameElement = document.querySelector(source.nameSelector);
    const name = nameElement ? nameElement.textContent.trim() : symbol;
    
    // 成功結果を返す
    return {
      success: true,
      ticker: symbol,
      price: price,
      name: name,
      currency: 'USD', // MarketWatchの場合、通常USDだが、他の通貨も可能性あり
      lastUpdated: new Date().toISOString(),
      source: source.name
    };
  } catch (error) {
    console.error(`MarketWatch scraping error for ${symbol}:`, error.message);
    return {
      success: false,
      message: `MarketWatch scraping failed: ${error.message}`
    };
  }
}

/**
 * Investing.comからの株価スクレイピング
 * @param {string} symbol - ティッカーシンボル
 * @param {string} type - アセットタイプ（etfまたはstock）
 * @returns {Promise<Object>} - スクレイピング結果
 */
async function scrapeInvestingCom(symbol, type) {
  try {
    console.log(`Attempting to scrape Investing.com for ${symbol} (${type})...`);
    
    const source = SCRAPING_SOURCES.INVESTING_COM;
    const url = type === 'etf' 
      ? `${source.baseUrl}${symbol}-us` 
      : `${source.stockBaseUrl}${symbol}`;
    
    const response = await axios.get(url, {
      headers: getRandomHeaders(),
      timeout: 10000
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // 価格要素を取得
    const priceElement = document.querySelector(source.priceSelector);
    if (!priceElement) {
      throw new Error('Price element not found');
    }
    
    // 価格を数値に変換
    const priceText = priceElement.textContent.trim().replace(/,/g, '');
    const price = parseFloat(priceText);
    
    if (isNaN(price)) {
      throw new Error(`Invalid price format: ${priceText}`);
    }
    
    // 名前要素を取得
    const nameElement = document.querySelector(source.nameSelector);
    const name = nameElement ? nameElement.textContent.trim() : symbol;
    
    // 成功結果を返す
    return {
      success: true,
      ticker: symbol,
      price: price,
      name: name,
      currency: 'USD', // Investing.comの場合、通常USDだが、他の通貨も可能性あり
      lastUpdated: new Date().toISOString(),
      source: source.name
    };
  } catch (error) {
    console.error(`Investing.com scraping error for ${symbol}:`, error.message);
    return {
      success: false,
      message: `Investing.com scraping failed: ${error.message}`
    };
  }
}
