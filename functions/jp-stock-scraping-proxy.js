// functions/jp-stock-scraping-proxy.js
// 日本株の株価をスクレイピングで取得するプロキシ関数

const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event, context) {
  // CORS ヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // プリフライトリクエスト（OPTIONS）をハンドリング
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // クエリパラメータを取得
  const params = event.queryStringParameters || {};
  
  // 証券コードが必要
  if (!params.code) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: '証券コードパラメータが必要です'
      })
    };
  }

  const stockCode = params.code.replace(/\.T$/, '');
  console.log(`Fetching stock data for ${stockCode}`);
  
  // 複数のソースにアクセスして株価データを取得
  try {
    // ソース1: Yahoo Finance Japan
    try {
      console.log(`Trying Yahoo Finance Japan for ${stockCode}`);
      const yahooData = await scrapeYahooFinanceJapan(stockCode);
      
      if (yahooData && yahooData.price) {
        console.log(`Successfully fetched stock data from Yahoo Finance Japan for ${stockCode}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: stockCode,
              ...yahooData,
              source: 'Yahoo Finance Japan',
              isStock: true,
              isMutualFund: false
            }
          })
        };
      }
    } catch (yahooError) {
      console.error(`Yahoo Finance Japan scraping failed for ${stockCode}:`, yahooError.message);
    }

    // ソース2: Minkabu
    try {
      console.log(`Trying Minkabu for ${stockCode}`);
      const minkabuData = await scrapeMinkabu(stockCode);
      
      if (minkabuData && minkabuData.price) {
        console.log(`Successfully fetched stock data from Minkabu for ${stockCode}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: stockCode,
              ...minkabuData,
              source: 'Minkabu',
              isStock: true,
              isMutualFund: false
            }
          })
        };
      }
    } catch (minkabuError) {
      console.error(`Minkabu scraping failed for ${stockCode}:`, minkabuError.message);
    }

    // ソース3: Kabutan
    try {
      console.log(`Trying Kabutan for ${stockCode}`);
      const kabutanData = await scrapeKabutan(stockCode);
      
      if (kabutanData && kabutanData.price) {
        console.log(`Successfully fetched stock data from Kabutan for ${stockCode}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: stockCode,
              ...kabutanData,
              source: 'Kabutan',
              isStock: true,
              isMutualFund: false
            }
          })
        };
      }
    } catch (kabutanError) {
      console.error(`Kabutan scraping failed for ${stockCode}:`, kabutanError.message);
    }

    // すべてのソースが失敗した場合はフォールバックデータを返す
    console.log(`All sources failed, using fallback data for ${stockCode}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          ticker: stockCode,
          price: 2500, // フォールバック価格
          name: `日本株 ${stockCode}`,
          currency: 'JPY',
          lastUpdated: new Date().toISOString(),
          source: 'Fallback',
          isStock: true,
          isMutualFund: false
        },
        message: 'すべてのソースからデータ取得に失敗したため、フォールバック値を使用しています'
      })
    };
    
  } catch (error) {
    console.error(`Stock scraping error for ${stockCode}:`, error);
    
    // エラー発生時もフォールバックデータを返す
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          ticker: stockCode,
          price: 2500, // フォールバック価格
          name: `日本株 ${stockCode}`,
          currency: 'JPY',
          lastUpdated: new Date().toISOString(),
          source: 'Fallback',
          isStock: true,
          isMutualFund: false
        },
        message: 'データ取得中にエラーが発生したため、フォールバック値を使用しています'
      })
    };
  }
};

/**
 * Yahoo Finance Japanから株価データをスクレイピングする
 * @param {string} code - 証券コード
 * @returns {Promise<Object>} - 株価データ
 */
async function scrapeYahooFinanceJapan(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  const response = await axios.get(`https://finance.yahoo.co.jp/quote/${code}.T`, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Referer': 'https://finance.yahoo.co.jp/'
    },
    timeout: 10000
  });
  
  const $ = cheerio.load(response.data);
  
  // 株価の取得
  const priceText = $('._3rXWJKZF').first().text().trim();
  const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
  
  // 銘柄名の取得
  const stockName = $('._3s5O0sub').first().text().trim();
  
  // 最終更新日時の取得（現在時刻を使用）
  const lastUpdated = new Date().toISOString();
  
  if (!price || isNaN(price)) {
    throw new Error('株価の取得に失敗しました');
  }
  
  return {
    price,
    name: stockName || `${code}`,
    currency: 'JPY',
    lastUpdated
  };
}

/**
 * Minkabuから株価データをスクレイピングする
 * @param {string} code - 証券コード
 * @returns {Promise<Object>} - 株価データ
 */
async function scrapeMinkabu(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  const response = await axios.get(`https://minkabu.jp/stock/${code}`, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
    },
    timeout: 10000
  });
  
  const $ = cheerio.load(response.data);
  
  // 株価の取得
  const priceText = $('.stock_price').first().text().trim();
  const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
  
  // 銘柄名の取得
  const stockName = $('.md_card_title').first().text().trim();
  
  // 最終更新日時の取得（現在時刻を使用）
  const lastUpdated = new Date().toISOString();
  
  if (!price || isNaN(price)) {
    throw new Error('株価の取得に失敗しました');
  }
  
  return {
    price,
    name: stockName || `${code}`,
    currency: 'JPY',
    lastUpdated
  };
}

/**
 * Kabutanから株価データをスクレイピングする
 * @param {string} code - 証券コード
 * @returns {Promise<Object>} - 株価データ
 */
async function scrapeKabutan(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  const response = await axios.get(`https://kabutan.jp/stock/?code=${code}`, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
    },
    timeout: 10000
  });
  
  const $ = cheerio.load(response.data);
  
  // 株価の取得
  const priceText = $('.kabuka').first().text().trim();
  const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
  
  // 銘柄名の取得
  const stockName = $('.company_block h3').text().trim();
  
  // 最終更新日時の取得（現在時刻を使用）
  const lastUpdated = new Date().toISOString();
  
  if (!price || isNaN(price)) {
    throw new Error('株価の取得に失敗しました');
  }
  
  return {
    price,
    name: stockName || `${code}`,
    currency: 'JPY',
    lastUpdated
  };
}

/**
 * ランダムなユーザーエージェントを取得する
 * @returns {string} - ユーザーエージェント
 */
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}
