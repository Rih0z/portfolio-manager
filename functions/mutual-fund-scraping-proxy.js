// functions/mutual-fund-scraping-proxy.js
// 投資信託の基準価額をスクレイピングで取得するプロキシ関数

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
  
  // ファンドコードが必要
  if (!params.code) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'ファンドコードパラメータが必要です'
      })
    };
  }

  // ファンドコードから末尾のCを削除（必要に応じて）
  let fundCode = params.code;
  if (fundCode.endsWith('C')) {
    fundCode = fundCode.slice(0, -1);
  }
  
  console.log(`Fetching mutual fund data for ${fundCode}`);
  
  // 複数のソースにアクセスして基準価額データを取得
  try {
    // ソース1: 投資信託協会のウェブサイトをスクレイピング
    try {
      console.log(`Trying 投資信託協会 for ${fundCode}`);
      const toushinData = await scrapeToushinLib(fundCode);
      
      if (toushinData && toushinData.price) {
        console.log(`Successfully fetched fund data from 投資信託協会 for ${fundCode}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: `${fundCode}C`,
              ...toushinData,
              source: '投資信託協会',
              isStock: false,
              isMutualFund: true
            }
          })
        };
      }
    } catch (toushinError) {
      console.error(`投資信託協会 scraping failed for ${fundCode}:`, toushinError.message);
    }

    // ソース2: Yahoo Finance Japanの投資信託ページをスクレイピング
    try {
      console.log(`Trying Yahoo Finance Japan Funds for ${fundCode}`);
      const yahooFundData = await scrapeYahooFinanceFund(fundCode);
      
      if (yahooFundData && yahooFundData.price) {
        console.log(`Successfully fetched fund data from Yahoo Finance Japan for ${fundCode}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: `${fundCode}C`,
              ...yahooFundData,
              source: 'Yahoo Finance Japan',
              isStock: false,
              isMutualFund: true
            }
          })
        };
      }
    } catch (yahooError) {
      console.error(`Yahoo Finance Japan Funds scraping failed for ${fundCode}:`, yahooError.message);
    }

    // ソース3: Morningstar Japanの投資信託ページをスクレイピング
    try {
      console.log(`Trying Morningstar Japan for ${fundCode}`);
      const morningstarData = await scrapeMorningstar(fundCode);
      
      if (morningstarData && morningstarData.price) {
        console.log(`Successfully fetched fund data from Morningstar Japan for ${fundCode}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: `${fundCode}C`,
              ...morningstarData,
              source: 'Morningstar Japan',
              isStock: false,
              isMutualFund: true
            }
          })
        };
      }
    } catch (morningstarError) {
      console.error(`Morningstar Japan scraping failed for ${fundCode}:`, morningstarError.message);
    }

    // ソース4: Minkabu投資信託ページをスクレイピング
    try {
      console.log(`Trying Minkabu fund page for ${fundCode}`);
      const minkabuFundData = await scrapeMinkabuFund(fundCode);
      
      if (minkabuFundData && minkabuFundData.price) {
        console.log(`Successfully fetched fund data from Minkabu for ${fundCode}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: `${fundCode}C`,
              ...minkabuFundData,
              source: 'Minkabu',
              isStock: false,
              isMutualFund: true
            }
          })
        };
      }
    } catch (minkabuError) {
      console.error(`Minkabu fund scraping failed for ${fundCode}:`, minkabuError.message);
    }

    // すべてのソースが失敗した場合はフォールバックデータを返す
    console.log(`All sources failed, using fallback data for ${fundCode}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          ticker: `${fundCode}C`,
          price: 10000, // フォールバック基準価額
          name: `投資信託 ${fundCode}C`,
          currency: 'JPY',
          lastUpdated: new Date().toISOString(),
          source: 'Fallback',
          isStock: false,
          isMutualFund: true,
          priceLabel: '基準価額'
        },
        message: 'すべてのソースからデータ取得に失敗したため、フォールバック値を使用しています'
      })
    };
    
  } catch (error) {
    console.error(`Mutual fund scraping error for ${fundCode}:`, error);
    
    // エラー発生時もフォールバックデータを返す
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          ticker: `${fundCode}C`,
          price: 10000, // フォールバック基準価額
          name: `投資信託 ${fundCode}C`,
          currency: 'JPY',
          lastUpdated: new Date().toISOString(),
          source: 'Fallback',
          isStock: false,
          isMutualFund: true,
          priceLabel: '基準価額'
        },
        message: 'データ取得中にエラーが発生したため、フォールバック値を使用しています'
      })
    };
  }
};

/**
 * 投資信託協会のウェブサイトから基準価額をスクレイピングする
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} - 基準価額データ
 */
async function scrapeToushinLib(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  const response = await axios.get(`https://toushin-lib.fwg.ne.jp/FdsWeb/FDST030000/fundDetailSearch?isinCd=${code}C`, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      'Referer': 'https://toushin-lib.fwg.ne.jp/FdsWeb/FDST000000/fundSearch'
    },
    timeout: 15000
  });
  
  const $ = cheerio.load(response.data);
  
  // 基準価額の取得
  // 実際のページ構造に合わせて調整が必要です
  const priceText = $('.fund-price, .base-price, td:contains("基準価額") + td, .price-value').first().text().trim();
  const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
  
  // ファンド名の取得
  const fundName = $('.fund-name, .fund-title, h1, h2, .title').first().text().trim();
  
  // 更新日の取得
  const updateDateText = $('.update-date, .date, td:contains("基準日") + td').first().text().trim();
  let lastUpdated;
  
  try {
    // 日付形式を解析 (YYYY年MM月DD日)
    const dateParts = updateDateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (dateParts) {
      lastUpdated = new Date(dateParts[1], dateParts[2] - 1, dateParts[3]).toISOString();
    } else {
      lastUpdated = new Date().toISOString();
    }
  } catch (e) {
    lastUpdated = new Date().toISOString();
  }
  
  if (!price || isNaN(price)) {
    throw new Error('基準価額の取得に失敗しました');
  }
  
  return {
    price,
    name: fundName || `投資信託 ${code}C`,
    currency: 'JPY',
    lastUpdated,
    priceLabel: '基準価額'
  };
}

/**
 * Yahoo Finance Japanの投資信託ページから基準価額をスクレイピングする
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} - 基準価額データ
 */
async function scrapeYahooFinanceFund(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  const response = await axios.get(`https://finance.yahoo.co.jp/quote/${code}C`, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      'Referer': 'https://finance.yahoo.co.jp/fund/'
    },
    timeout: 10000
  });
  
  const $ = cheerio.load(response.data);
  
  // 基準価額の取得
  // 実際のページ構造に合わせて調整が必要です
  const priceText = $('._3rXWJKZF, ._3s5O5DJ7, .price').first().text().trim();
  const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
  
  // ファンド名の取得
  const fundName = $('._3s5O0sub, .name, h1, h2').first().text().trim();
  
  // 最終更新日時の取得（現在時刻を使用）
  const lastUpdated = new Date().toISOString();
  
  if (!price || isNaN(price)) {
    throw new Error('基準価額の取得に失敗しました');
  }
  
  return {
    price,
    name: fundName || `投資信託 ${code}C`,
    currency: 'JPY',
    lastUpdated,
    priceLabel: '基準価額'
  };
}

/**
 * Morningstar Japanの投資信託ページから基準価額をスクレイピングする
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} - 基準価額データ
 */
async function scrapeMorningstar(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  const response = await axios.get(`https://www.morningstar.co.jp/FundData/SnapShot.do?fnc=${code}C`, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
    },
    timeout: 10000
  });
  
  const $ = cheerio.load(response.data);
  
  // 基準価額の取得
  const priceText = $('td:contains("基準価額") + td').first().text().trim();
  const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
  
  // ファンド名の取得
  const fundName = $('#segment_name, h2.fund-name').first().text().trim();
  
  // 最終更新日時の取得
  const updateDateText = $('td:contains("基準日") + td').first().text().trim();
  let lastUpdated;
  
  try {
    // 日付形式を解析 (YYYY/MM/DD)
    const dateParts = updateDateText.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (dateParts) {
      lastUpdated = new Date(dateParts[1], dateParts[2] - 1, dateParts[3]).toISOString();
    } else {
      lastUpdated = new Date().toISOString();
    }
  } catch (e) {
    lastUpdated = new Date().toISOString();
  }
  
  if (!price || isNaN(price)) {
    throw new Error('基準価額の取得に失敗しました');
  }
  
  return {
    price,
    name: fundName || `投資信託 ${code}C`,
    currency: 'JPY',
    lastUpdated,
    priceLabel: '基準価額'
  };
}

/**
 * Minkabuの投資信託ページから基準価額をスクレイピングする
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} - 基準価額データ
 */
async function scrapeMinkabuFund(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  const response = await axios.get(`https://minkabu.jp/fund/${code}`, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
    },
    timeout: 10000
  });
  
  const $ = cheerio.load(response.data);
  
  // 基準価額の取得
  const priceText = $('.stock_price, .fund_price, td:contains("基準価額") + td').first().text().trim();
  const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
  
  // ファンド名の取得
  const fundName = $('.md_card_title, h1.fund_name').first().text().trim();
  
  // 最終更新日時の取得（現在時刻を使用）
  const lastUpdated = new Date().toISOString();
  
  if (!price || isNaN(price)) {
    throw new Error('基準価額の取得に失敗しました');
  }
  
  return {
    price,
    name: fundName || `投資信託 ${code}C`,
    currency: 'JPY',
    lastUpdated,
    priceLabel: '基準価額'
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
