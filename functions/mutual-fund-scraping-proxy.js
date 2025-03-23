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

  // 1. ファンドコードの形式を正規化（末尾のCとTを取り除く）
  let fundCode = params.code.replace(/\.T$/i, '').replace(/C$/i, '');
  console.log(`Original fund code: ${params.code}, Normalized code: ${fundCode}`);
  
  // 2. 追加: ファンドコードの形式をチェック（7桁から8桁の数字）
  if (!/^\d{7,8}$/.test(fundCode)) {
    console.warn(`Fund code ${fundCode} does not match expected format (7-8 digits)`);
    
    // 4桁のコードの場合は、日本株の誤判定の可能性がある
    if (/^\d{4}$/.test(fundCode)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: `${fundCode}は日本株の証券コードの可能性があります。投資信託コードは通常7-8桁の数字+Cの形式です。`
        })
      };
    }
  }
  
  console.log(`Fetching mutual fund data for ${fundCode}`);
  
  // 複数のソースにアクセスして基準価額データを取得
  try {
    // ソース1: Yahoo Finance Japan
    try {
      console.log(`Trying Yahoo Finance Japan for ${fundCode}`);
      // Yahoo Finance形式の投資信託コード（数字+C.T）
      const yahooFundCode = `${fundCode}C.T`;
      console.log(`Yahoo Finance fund code format: ${yahooFundCode}`);
      
      const yahooData = await scrapeYahooFinanceFund(yahooFundCode);
      
      if (yahooData && yahooData.price) {
        console.log(`Successfully fetched fund data from Yahoo Finance Japan for ${fundCode}: ${yahooData.price}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: `${fundCode}C`,
              ...yahooData,
              source: 'Yahoo Finance Japan',
              isStock: false,
              isMutualFund: true
            }
          })
        };
      } else {
        console.log(`No valid data from Yahoo Finance Japan for ${fundCode}`);
      }
    } catch (yahooError) {
      console.error(`Yahoo Finance Japan scraping failed for ${fundCode}:`, yahooError.message);
    }

    // ソース2: 投資信託協会のウェブサイトをスクレイピング
    try {
      console.log(`Trying 投資信託協会 for ${fundCode}`);
      const toushinData = await scrapeToushinLib(fundCode);
      
      if (toushinData && toushinData.price) {
        console.log(`Successfully fetched fund data from 投資信託協会 for ${fundCode}: ${toushinData.price}`);
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
      } else {
        console.log(`No valid data from 投資信託協会 for ${fundCode}`);
      }
    } catch (toushinError) {
      console.error(`投資信託協会 scraping failed for ${fundCode}:`, toushinError.message);
    }

    // ソース3: Morningstar Japanの投資信託ページをスクレイピング
    try {
      console.log(`Trying Morningstar Japan for ${fundCode}`);
      const morningstarData = await scrapeMorningstar(fundCode);
      
      if (morningstarData && morningstarData.price) {
        console.log(`Successfully fetched fund data from Morningstar Japan for ${fundCode}: ${morningstarData.price}`);
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
      } else {
        console.log(`No valid data from Morningstar Japan for ${fundCode}`);
      }
    } catch (morningstarError) {
      console.error(`Morningstar Japan scraping failed for ${fundCode}:`, morningstarError.message);
    }

    // ソース4: Minkabu投資信託ページをスクレイピング
    try {
      console.log(`Trying Minkabu fund page for ${fundCode}`);
      const minkabuFundData = await scrapeMinkabuFund(fundCode);
      
      if (minkabuFundData && minkabuFundData.price) {
        console.log(`Successfully fetched fund data from Minkabu for ${fundCode}: ${minkabuFundData.price}`);
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
      } else {
        console.log(`No valid data from Minkabu for ${fundCode}`);
      }
    } catch (minkabuError) {
      console.error(`Minkabu fund scraping failed for ${fundCode}:`, minkabuError.message);
    }

    // 直接Yahoo Finance APIを試してみる
    try {
      console.log(`Trying direct Yahoo Finance query for ${fundCode}`);
      const yahooDirectData = await getYahooFinanceData(fundCode);
      
      if (yahooDirectData && yahooDirectData.price) {
        console.log(`Successfully fetched fund data from direct Yahoo Finance query for ${fundCode}: ${yahooDirectData.price}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              ticker: `${fundCode}C`,
              ...yahooDirectData,
              source: 'Yahoo Finance API',
              isStock: false,
              isMutualFund: true
            }
          })
        };
      } else {
        console.log(`No valid data from direct Yahoo Finance query for ${fundCode}`);
      }
    } catch (yahooDirectError) {
      console.error(`Direct Yahoo Finance query failed for ${fundCode}:`, yahooDirectError.message);
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
  
  try {
    console.log(`Fetching from 投資信託協会 with code: ${code}`);
    const url = `https://toushin-lib.fwg.ne.jp/FdsWeb/FDST030000/fundDetailSearch?isinCd=${code}C`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Referer': 'https://toushin-lib.fwg.ne.jp/FdsWeb/FDST000000/fundSearch'
      },
      timeout: 15000
    });
    
    if (!response.data) {
      console.error('No data returned from 投資信託協会');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // レスポンス内容（デバッグ用）
    console.log('Response from 投資信託協会 received, content length:', response.data.length);
    
    // 基準価額の取得
    // 多様なセレクタを試行して基準価額を探す
    let priceElement = $('.fund-price, .base-price, td:contains("基準価額") + td, .price-value, .basePrice').first();
    let priceText = priceElement.text().trim();
    
    if (!priceText) {
      // テーブル構造を探す
      $('table tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const label = $(cells[0]).text().trim();
          if (label.includes('基準価額')) {
            priceText = $(cells[1]).text().trim();
            return false; // eachループを抜ける
          }
        }
      });
    }
    
    console.log(`Found price text: "${priceText}"`);
    const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
    
    // ファンド名の取得
    // 多様なセレクタを試行してファンド名を探す
    let fundNameElement = $('.fund-name, .fund-title, h1, h2, .title, .fundName').first();
    let fundName = fundNameElement.text().trim();
    
    if (!fundName) {
      // ヘッダーやタイトルを探す
      fundName = $('h1, h2, .header, .title').first().text().trim();
    }
    
    console.log(`Found fund name: "${fundName}"`);
    
    // 更新日の取得
    let updateDateText = $('.update-date, .date, td:contains("基準日") + td, .baseDate').first().text().trim();
    let lastUpdated;
    
    console.log(`Found update date text: "${updateDateText}"`);
    
    try {
      // 日付形式を解析 (YYYY年MM月DD日 or YYYY/MM/DD)
      const dateParts = updateDateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/) || updateDateText.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (dateParts) {
        lastUpdated = new Date(dateParts[1], dateParts[2] - 1, dateParts[3]).toISOString();
      } else {
        lastUpdated = new Date().toISOString();
      }
    } catch (e) {
      console.error('Date parsing error:', e);
      lastUpdated = new Date().toISOString();
    }
    
    if (!price || isNaN(price)) {
      console.error('Failed to extract price from 投資信託協会');
      return null;
    }
    
    return {
      price,
      name: fundName || `投資信託 ${code}C`,
      currency: 'JPY',
      lastUpdated,
      priceLabel: '基準価額'
    };
  } catch (error) {
    console.error(`Error in scrapeToushinLib for ${code}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    return null;
  }
}

/**
 * Yahoo Finance Japanの投資信託ページから基準価額をスクレイピングする
 * @param {string} code - ファンドコード（末尾にCとTが付いたフォーマット）
 * @returns {Promise<Object>} - 基準価額データ
 */
async function scrapeYahooFinanceFund(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  try {
    // Cと.Tがない場合は追加
    if (!code.toUpperCase().includes('C')) {
      code = `${code}C`;
    }
    if (!code.toUpperCase().includes('.T')) {
      code = `${code}.T`;
    }
    
    console.log(`Fetching from Yahoo Finance Japan with code: ${code}`);
    const url = `https://finance.yahoo.co.jp/quote/${code}`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Referer': 'https://finance.yahoo.co.jp/fund/'
      },
      timeout: 10000
    });
    
    if (!response.data) {
      console.error('No data returned from Yahoo Finance Japan');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // レスポンス内容（デバッグ用）
    console.log('Response from Yahoo Finance Japan received, content length:', response.data.length);
    
    // 基準価額の取得 - Yahoo Financeの構造に合わせたセレクタ
    // 多様なセレクタを試す
    let priceElement = $('._3rXWJKZF, ._3s5O5DJ7, .price, ._19_vlyV_').first();
    let priceText = priceElement.text().trim();
    
    if (!priceText) {
      // フォールバックとして数値を含む要素を探す
      $('span').each((i, el) => {
        const text = $(el).text().trim();
        if (/[\d,]+\.\d+/.test(text) || /[\d,]+円/.test(text)) {
          priceText = text;
          return false; // eachループを抜ける
        }
      });
    }
    
    console.log(`Found price text: "${priceText}"`);
    const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
    
    // ファンド名の取得
    let fundNameElement = $('._3s5O0sub, .name, h1, h2, ._1fYqGSYw').first();
    let fundName = fundNameElement.text().trim();
    
    if (!fundName) {
      // ヘッダーまたはタイトル要素を探す
      fundName = $('h1, h2, .title, header').first().text().trim();
    }
    
    console.log(`Found fund name: "${fundName}"`);
    
    // 最終更新日時の取得（現在時刻を使用）
    const lastUpdated = new Date().toISOString();
    
    if (!price || isNaN(price)) {
      console.error('Failed to extract price from Yahoo Finance Japan');
      return null;
    }
    
    return {
      price,
      name: fundName || `投資信託 ${code}`,
      currency: 'JPY',
      lastUpdated,
      priceLabel: '基準価額'
    };
  } catch (error) {
    console.error(`Error in scrapeYahooFinanceFund for ${code}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    return null;
  }
}

/**
 * Morningstar Japanの投資信託ページから基準価額をスクレイピングする
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} - 基準価額データ
 */
async function scrapeMorningstar(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  try {
    console.log(`Fetching from Morningstar Japan with code: ${code}`);
    const url = `https://www.morningstar.co.jp/FundData/SnapShot.do?fnc=${code}C`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
      },
      timeout: 10000
    });
    
    if (!response.data) {
      console.error('No data returned from Morningstar Japan');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // レスポンス内容（デバッグ用）
    console.log('Response from Morningstar Japan received, content length:', response.data.length);
    
    // 基準価額の取得
    let priceText = '';
    
    // 1. td:contains("基準価額") + td を試す
    priceText = $('td:contains("基準価額") + td').first().text().trim();
    
    // 2. 基準価額を含むテーブル行を探す（別の構造）
    if (!priceText) {
      $('table tr').each((i, row) => {
        const label = $(row).find('td, th').first().text().trim();
        if (label.includes('基準価額')) {
          priceText = $(row).find('td').last().text().trim();
          return false; // eachループを抜ける
        }
      });
    }
    
    // 3. クラスや属性で探す
    if (!priceText) {
      priceText = $('.price, .fund-price, [data-label="基準価額"]').first().text().trim();
    }
    
    console.log(`Found price text: "${priceText}"`);
    
    // 価格の数値を抽出
    const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
    
    // ファンド名の取得
    let fundName = $('#segment_name, h2.fund-name, .fund_name_text').first().text().trim();
    
    if (!fundName) {
      // 別の場所を探す
      fundName = $('h1, h2, .title').first().text().trim();
    }
    
    console.log(`Found fund name: "${fundName}"`);
    
    // 最終更新日時の取得
    let updateDateText = $('td:contains("基準日") + td, .reference_date').first().text().trim();
    let lastUpdated;
    
    console.log(`Found update date text: "${updateDateText}"`);
    
    try {
      // 日付形式を解析 (YYYY/MM/DD)
      const dateParts = updateDateText.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (dateParts) {
        lastUpdated = new Date(dateParts[1], dateParts[2] - 1, dateParts[3]).toISOString();
      } else {
        lastUpdated = new Date().toISOString();
      }
    } catch (e) {
      console.error('Date parsing error:', e);
      lastUpdated = new Date().toISOString();
    }
    
    if (!price || isNaN(price)) {
      console.error('Failed to extract price from Morningstar Japan');
      return null;
    }
    
    return {
      price,
      name: fundName || `投資信託 ${code}C`,
      currency: 'JPY',
      lastUpdated,
      priceLabel: '基準価額'
    };
  } catch (error) {
    console.error(`Error in scrapeMorningstar for ${code}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    return null;
  }
}

/**
 * Minkabuの投資信託ページから基準価額をスクレイピングする
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} - 基準価額データ
 */
async function scrapeMinkabuFund(code) {
  // ランダムなユーザーエージェントを選択
  const userAgent = getRandomUserAgent();
  
  try {
    console.log(`Fetching from Minkabu with code: ${code}`);
    const url = `https://itf.minkabu.jp/fund/${code}`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
      },
      timeout: 10000
    });
    
    if (!response.data) {
      console.error('No data returned from Minkabu');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // レスポンス内容（デバッグ用）
    console.log('Response from Minkabu received, content length:', response.data.length);
    
    // 基準価額の取得
    let priceText = '';
    
    // 複数のセレクタを試す
    priceText = $('.stock_price, .fund_price, .base_price, .price').first().text().trim();
    
    // テーブル構造を探す
    if (!priceText) {
      $('table tr').each((i, row) => {
        const label = $(row).find('th, td').first().text().trim();
        if (label.includes('基準価額')) {
          priceText = $(row).find('td').last().text().trim();
          return false; // eachループを抜ける
        }
      });
    }
    
    // 数値を含む要素を探す（フォールバック）
    if (!priceText) {
      $('div, span').each((i, el) => {
        const text = $(el).text().trim();
        if (/[\d,]+円/.test(text) || /[\d,]+\.\d+/.test(text)) {
          priceText = text;
          return false; // eachループを抜ける
        }
      });
    }
    
    console.log(`Found price text: "${priceText}"`);
    const price = parseFloat(priceText.replace(/[^0-9\.]/g, ''));
    
    // ファンド名の取得
    let fundName = $('.md_card_title, h1.fund_name, .fund_title').first().text().trim();
    
    if (!fundName) {
      // 別の場所を探す
      fundName = $('h1, h2, .title').first().text().trim();
    }
    
    console.log(`Found fund name: "${fundName}"`);
    
    // 最終更新日時の取得（現在時刻を使用）
    const lastUpdated = new Date().toISOString();
    
    if (!price || isNaN(price)) {
      console.error('Failed to extract price from Minkabu');
      return null;
    }
    
    return {
      price,
      name: fundName || `投資信託 ${code}C`,
      currency: 'JPY',
      lastUpdated,
      priceLabel: '基準価額'
    };
  } catch (error) {
    console.error(`Error in scrapeMinkabuFund for ${code}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    return null;
  }
}

/**
 * Yahoo Finance APIを使って直接データを取得する
 * @param {string} code - ファンドコード
 * @returns {Promise<Object>} - 基準価額データ
 */
async function getYahooFinanceData(code) {
  // Cと.Tがない場合は追加
  let formattedCode = code;
  if (!formattedCode.toUpperCase().includes('C')) {
    formattedCode = `${formattedCode}C`;
  }
  if (!formattedCode.toUpperCase().includes('.T')) {
    formattedCode = `${formattedCode}.T`;
  }
  
  try {
    console.log(`Fetching from Yahoo Finance API with code: ${formattedCode}`);
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${formattedCode}`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (!response.data || !response.data.quoteResponse || !response.data.quoteResponse.result) {
      console.error('Invalid response from Yahoo Finance API');
      return null;
    }
    
    const results = response.data.quoteResponse.result;
    if (results.length === 0) {
      console.error('No results found in Yahoo Finance API response');
      return null;
    }
    
    const fundData = results[0];
    console.log('Yahoo Finance API data:', fundData);
    
    if (!fundData.regularMarketPrice) {
      console.error('No price information in Yahoo Finance API response');
      return null;
    }
    
    const price = fundData.regularMarketPrice;
    const fundName = fundData.shortName || fundData.longName || `投資信託 ${code}C`;
    const currency = fundData.currency || 'JPY';
    
    return {
      price,
      name: fundName,
      currency,
      lastUpdated: new Date().toISOString(),
      priceLabel: '基準価額'
    };
  } catch (error) {
    console.error(`Error in getYahooFinanceData for ${code}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    return null;
  }
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
