// functions/yahoo-finance-proxy.js

/**
 * Yahoo Finance APIへのプロキシ関数（改良版）
 * 株価データと投資信託データを取得する
 */
const axios = require('axios');

exports.handler = async function(event, context) {
  // リクエスト情報をログ出力
  console.log('Yahoo Finance Proxy - Request received:');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
  console.log('Query parameters:', JSON.stringify(event.queryStringParameters));
  
  // CORS ヘッダーを設定 - すべてのオリジンからのリクエストを許可
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
  
  // プリフライトリクエスト（OPTIONS）をハンドリング
  if (event.httpMethod === 'OPTIONS') {
    console.log('Responding to OPTIONS request');
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }
  
  try {
    // クエリパラメータを取得
    const params = event.queryStringParameters || {};
    
    // シンボルまたは為替レートのパラメータが必要
    if (!params.symbols && !params.exchange_rate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'symbols or exchange_rate parameter is required',
          message: 'symbols または exchange_rate パラメータが必要です'
        })
      };
    }
    
    // 株価データを取得
    if (params.symbols) {
      return await handleStockData(params.symbols, headers);
    }
    
    // 為替レートを取得
    if (params.exchange_rate) {
      return await handleExchangeRate(params.exchange_rate, headers);
    }
    
  } catch (error) {
    console.error('Yahoo Finance proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch data from Yahoo Finance',
        message: error.message || 'Unknown error',
        details: error.stack
      })
    };
  }
};

/**
 * 投資信託かどうかを判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} 投資信託の場合はtrue
 */
function isMutualFund(ticker) {
  if (!ticker) return false;
  return /^\d{7,8}C(\.T)?$/i.test(ticker);
}

/**
 * 日本株かどうかを判定する関数
 * @param {string} ticker - ティッカーシンボル
 * @returns {boolean} 日本株の場合はtrue
 */
function isJapaneseStock(ticker) {
  if (!ticker) return false;
  ticker = ticker.toString();
  return /^\d{4}(\.T)?$/.test(ticker) || ticker.endsWith('.T');
}

/**
 * ティッカーシンボルからフォールバックデータを生成する
 * @param {string} symbol - ティッカーシンボル
 * @returns {Object} フォールバックデータ
 */
function generateFallbackData(symbol) {
  // 投資信託かどうかを判定
  const isMutualFundTicker = isMutualFund(symbol);
  const isJapaneseStockTicker = isJapaneseStock(symbol);
  
  // オリジナルのティッカーシンボル（.Tを取り除く）
  const originalSymbol = symbol.replace(/\.T$/, '');
  
  return {
    ticker: symbol,
    price: isMutualFundTicker ? 10000 : isJapaneseStockTicker ? 2500 : 150,
    name: isMutualFundTicker ? `投資信託 ${originalSymbol}` : 
          isJapaneseStockTicker ? `日本株 ${originalSymbol}` : 
          `${originalSymbol}`,
    currency: isJapaneseStockTicker || isMutualFundTicker ? 'JPY' : 'USD',
    lastUpdated: new Date().toISOString(),
    source: 'Fallback',
    isStock: !isMutualFundTicker,
    isMutualFund: isMutualFundTicker,
    priceLabel: isMutualFundTicker ? '基準価額' : '株価'
  };
}

/**
 * 株価データを取得する
 * @param {string} symbols - カンマ区切りのティッカーシンボル
 * @param {Object} headers - レスポンスヘッダー
 * @returns {Object} - レスポンスオブジェクト
 */
async function handleStockData(symbols, headers) {
  // カンマ区切りのシンボルを配列に変換
  const symbolsList = symbols.split(',').map(s => s.trim());
  
  // 日本株と投資信託の場合は.Tを追加
  const formattedSymbols = symbolsList.map(symbol => {
    // 投資信託コード処理を追加（7-8桁数字+C）
    if (/^\d{7,8}C$/i.test(symbol) && !symbol.includes('.T')) {
      return `${symbol}.T`;
    }
    // 日本株の場合（4桁数字）
    else if (/^\d{4}$/.test(symbol) && !symbol.includes('.T')) {
      return `${symbol}.T`;
    }
    return symbol;
  });
  
  try {
    // Yahoo Financeの改良版アプローチ
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${formattedSymbols.join(',')}`;
    
    console.log(`Requesting Yahoo Finance API: ${yahooUrl}`);
    
    // ランダムなユーザーエージェントを生成（検出回避）
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // 第1アプローチ: 通常リクエスト + 強化ヘッダー
    try {
      console.log('Attempting normal request with enhanced headers...');
      const response = await axios.get(yahooUrl, {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://finance.yahoo.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Connection': 'keep-alive',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'X-API-KEY': process.env.YFINANCE_API_KEY || '' // プロキシサービスがあれば
        },
        timeout: 15000
      });
      
      // データの存在を確認
      if (response.data && 
          response.data.quoteResponse && 
          response.data.quoteResponse.result &&
          response.data.quoteResponse.result.length > 0) {
        
        const quotes = response.data.quoteResponse.result;
        
        // 結果を整形
        const result = {};
        quotes.forEach(quote => {
          const ticker = quote.symbol;
          
          // 取得した情報をログに出力
          console.log(`Received data for ${ticker}: ${quote.shortName || quote.longName}, Price: ${quote.regularMarketPrice || quote.ask || quote.bid || 0}`);
          
          // 投資信託かどうかを判定
          const isMutualFundTicker = isMutualFund(ticker);
          
          result[ticker] = {
            ticker: ticker,
            price: quote.regularMarketPrice || quote.ask || quote.bid || 0,
            name: quote.shortName || quote.longName || ticker,
            currency: quote.currency || (ticker.includes('.T') ? 'JPY' : 'USD'),
            lastUpdated: new Date().toISOString(),
            source: 'Yahoo Finance',
            isStock: !isMutualFundTicker,
            isMutualFund: isMutualFundTicker,
            priceLabel: isMutualFundTicker ? '基準価額' : '株価'
          };
        });
        
        // データが見つからなかったシンボルをログ
        const foundSymbols = Object.keys(result);
        const notFoundSymbols = formattedSymbols.filter(s => !foundSymbols.includes(s));
        
        if (notFoundSymbols.length > 0) {
          console.log(`No data found for symbols: ${notFoundSymbols.join(', ')}`);
          
          // 見つからなかったシンボルにはフォールバック値を設定
          notFoundSymbols.forEach(symbol => {
            result[symbol] = generateFallbackData(symbol);
          });
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: result
          })
        };
      }
      
      // 応答はあるがデータがない場合、例外をスローして次のアプローチに移る
      throw new Error('No valid data in Yahoo Finance response');
      
    } catch (primaryError) {
      console.warn('Primary approach failed:', primaryError.message);
      
      // 第2アプローチ: 全てのシンボルに対するフォールバックデータを生成
      console.log('Generating fallback data for all symbols...');
      const result = {};
      
      formattedSymbols.forEach(symbol => {
        result[symbol] = generateFallbackData(symbol);
      });
      
      // フォールバックデータを使用するため成功レスポンスを返す
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true, 
          message: 'Yahoo Finance API is currently unavailable. Using fallback data.',
          data: result
        })
      };
    }
    
  } catch (error) {
    console.error('Error fetching stock data:', error);
    
    // フォールバックデータを生成
    const result = {};
    formattedSymbols.forEach(symbol => {
      result[symbol] = generateFallbackData(symbol);
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        message: 'Using fallback data due to API error'
      })
    };
  }
}

/**
 * 為替レートを取得する
 * @param {string} exchangeRate - 通貨ペア（例: USDJPY）
 * @param {Object} headers - レスポンスヘッダー
 * @returns {Object} - レスポンスオブジェクト
 */
async function handleExchangeRate(exchangeRate, headers) {
  // 通貨ペアを解析
  if (exchangeRate.length < 6) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Invalid exchange rate format',
        message: '無効な為替レート形式です。USDJPY のような形式を使用してください。'
      })
    };
  }
  
  const fromCurrency = exchangeRate.substring(0, 3);
  const toCurrency = exchangeRate.substring(3, 6);
  
  // 同一通貨の場合は1を返す
  if (fromCurrency === toCurrency) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        rate: 1.0,
        source: 'Direct',
        lastUpdated: new Date().toISOString()
      })
    };
  }
  
  try {
    // JPY/USDの場合、USD/JPYの逆数を計算する
    const isJpyToUsd = fromCurrency === 'JPY' && toCurrency === 'USD';
    let targetFromCurrency = fromCurrency;
    let targetToCurrency = toCurrency;
    
    if (isJpyToUsd) {
      targetFromCurrency = 'USD';
      targetToCurrency = 'JPY';
    }
    
    // 为替レートAPIを優先的に使用する
    try {
      console.log(`Attempting to use exchangerate.host API for ${fromCurrency}/${toCurrency}...`);
      
      // exchangerate.host APIを呼び出す
      const response = await axios.get('https://api.exchangerate.host/latest', {
        params: {
          base: targetFromCurrency,
          symbols: targetToCurrency
        },
        timeout: 5000
      });
      
      if (response.data && response.data.rates && response.data.rates[targetToCurrency]) {
        let rate = response.data.rates[targetToCurrency];
        
        // JPY/USDの場合は逆数を計算
        if (isJpyToUsd) {
          rate = 1 / rate;
        }
        
        console.log(`Successfully retrieved exchange rate from exchangerate.host: ${rate}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            rate: rate,
            source: 'exchangerate.host',
            lastUpdated: new Date().toISOString()
          })
        };
      }
      
      // 応答はあるがデータがない場合、例外をスローして次のアプローチに移る
      throw new Error('No valid data in exchangerate.host response');
      
    } catch (primaryError) {
      console.warn('Primary approach for exchange rate failed:', primaryError.message);
      
      // フォールバックとしてYahoo Finance APIを試す
      try {
        console.log(`Attempting to use Yahoo Finance API for exchange rate ${fromCurrency}/${toCurrency}...`);
        
        // Yahoo Financeの為替レートSymbolを作成（例: USDJPY=X）
        const symbol = `${targetFromCurrency}${targetToCurrency}=X`;
        const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
        
        const response = await axios.get(yahooUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://finance.yahoo.com/',
          },
          timeout: 10000
        });
        
        if (response.data && 
            response.data.quoteResponse && 
            response.data.quoteResponse.result && 
            response.data.quoteResponse.result.length > 0) {
          
          const quote = response.data.quoteResponse.result[0];
          let rate = quote.regularMarketPrice || quote.ask || quote.bid || 0;
          
          // JPY/USDの場合は逆数を計算
          if (isJpyToUsd) {
            rate = 1 / rate;
          }
          
          console.log(`Successfully retrieved exchange rate from Yahoo Finance: ${rate}`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              rate: rate,
              source: 'Yahoo Finance',
              lastUpdated: new Date().toISOString()
            })
          };
        }
        
        // データが取得できない場合は例外をスロー
        throw new Error('No valid data in Yahoo Finance response for exchange rate');
        
      } catch (secondaryError) {
        console.warn('Secondary approach for exchange rate failed:', secondaryError.message);
        
        // デフォルト値を使用
        const defaultRate = defaultExchangeRate(fromCurrency, toCurrency);
        
        console.log(`Using fallback exchange rate for ${fromCurrency}/${toCurrency}: ${defaultRate}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            rate: defaultRate,
            source: 'Fallback',
            message: 'Using fallback exchange rate due to API errors',
            lastUpdated: new Date().toISOString()
          })
        };
      }
    }
    
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // フォールバック値を返す
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        rate: defaultExchangeRate(fromCurrency, toCurrency),
        source: 'Fallback',
        message: 'Using fallback exchange rate due to API error',
        lastUpdated: new Date().toISOString()
      })
    };
  }
}

/**
 * 通貨ペアに基づいたデフォルト為替レートを返す
 * @param {string} fromCurrency - 変換元通貨
 * @param {string} toCurrency - 変換先通貨
 * @returns {number} - デフォルト為替レート
 */
function defaultExchangeRate(fromCurrency, toCurrency) {
  // よく使われる通貨ペアのデフォルト値
  const defaultRates = {
    'USDJPY': 150.0,
    'JPYUSD': 1/150.0,
    'EURJPY': 160.0,
    'EURUSD': 1.1
  };
  
  const pair = `${fromCurrency}${toCurrency}`;
  
  if (defaultRates[pair]) {
    return defaultRates[pair];
  }
  
  // 環境変数からデフォルト値を取得（USDJPY用）
  if (pair === 'USDJPY' && process.env.DEFAULT_EXCHANGE_RATE) {
    return parseFloat(process.env.DEFAULT_EXCHANGE_RATE);
  }
  
  // JPYUSD用のデフォルト値
  if (pair === 'JPYUSD' && process.env.DEFAULT_EXCHANGE_RATE) {
    return 1 / parseFloat(process.env.DEFAULT_EXCHANGE_RATE);
  }
  
  // その他の通貨ペアは1をデフォルト値とする
  return 1.0;
}
