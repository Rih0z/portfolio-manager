// functions/yahoo-finance-proxy.js

/**
 * Yahoo Finance APIへのプロキシ関数（401エラー対応版）
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
    // 複数のアプローチを試す
    console.log(`Attempting to fetch data for symbols: ${formattedSymbols.join(',')}`);
    
    // アプローチ1: Yahoo Finance APIを直接呼び出す
    try {
      console.log('Trying approach 1: Direct Yahoo Finance API call with enhanced headers');
      
      // ランダムなユーザーエージェントを選択
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${formattedSymbols.join(',')}`;
      
      const response = await axios.get(yahooUrl, {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://finance.yahoo.com/quote/AAPL/',
          'Origin': 'https://finance.yahoo.com',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });
      
      // データが正常に取得できたかチェック
      if (response.data && 
          response.data.quoteResponse && 
          response.data.quoteResponse.result &&
          response.data.quoteResponse.result.length > 0) {
        
        console.log(`Successfully retrieved data via approach 1 for ${response.data.quoteResponse.result.length} symbols`);
        
        const quotes = response.data.quoteResponse.result;
        const result = {};
        
        quotes.forEach(quote => {
          const ticker = quote.symbol;
          const isMutualFundTicker = isMutualFund(ticker);
          
          result[ticker.replace(/\.T$/, '')] = {
            ticker: ticker.replace(/\.T$/, ''),
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
        
        // 見つからなかったシンボルにフォールバックデータを追加
        const foundSymbols = Object.keys(result).map(key => key.includes('.T') ? key : `${key}.T`);
        const notFoundSymbols = formattedSymbols.filter(s => !foundSymbols.includes(s) && !foundSymbols.includes(s.replace(/\.T$/, '')));
        
        if (notFoundSymbols.length > 0) {
          console.log(`Generating fallback data for ${notFoundSymbols.length} missing symbols`);
          
          notFoundSymbols.forEach(symbol => {
            const plainSymbol = symbol.replace(/\.T$/, '');
            result[plainSymbol] = generateFallbackData(symbol);
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
      
      throw new Error('No valid data found in Yahoo Finance response');
      
    } catch (error1) {
      console.log(`Approach 1 failed: ${error1.message}`);
      
      // アプローチ2: アルタネイトエンドポイントを試す
      try {
        console.log('Trying approach 2: Alternate Yahoo Finance endpoint');
        
        // 各シンボルを個別に取得（異なるエンドポイント）
        const result = {};
        
        for (const symbol of formattedSymbols) {
          try {
            const plainSymbol = symbol.replace(/\.T$/, '');
            const altUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;
            
            console.log(`Fetching data for ${symbol} from alternate endpoint`);
            
            const response = await axios.get(altUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': `https://finance.yahoo.com/quote/${symbol}`,
                'Origin': 'https://finance.yahoo.com'
              },
              timeout: 10000
            });
            
            if (response.data && 
                response.data.quoteSummary && 
                response.data.quoteSummary.result && 
                response.data.quoteSummary.result.length > 0 &&
                response.data.quoteSummary.result[0].price) {
              
              const priceData = response.data.quoteSummary.result[0].price;
              const isMutualFundTicker = isMutualFund(symbol);
              
              result[plainSymbol] = {
                ticker: plainSymbol,
                price: priceData.regularMarketPrice?.raw || 0,
                name: priceData.shortName || priceData.longName || symbol,
                currency: priceData.currency || (symbol.includes('.T') ? 'JPY' : 'USD'),
                lastUpdated: new Date().toISOString(),
                source: 'Yahoo Finance',
                isStock: !isMutualFundTicker,
                isMutualFund: isMutualFundTicker,
                priceLabel: isMutualFundTicker ? '基準価額' : '株価'
              };
              
              console.log(`Successfully retrieved data for ${symbol} via approach 2`);
            } else {
              throw new Error(`No valid data found for ${symbol}`);
            }
          } catch (symbolError) {
            console.log(`Failed to fetch data for ${symbol}: ${symbolError.message}`);
            const plainSymbol = symbol.replace(/\.T$/, '');
            result[plainSymbol] = generateFallbackData(symbol);
          }
          
          // APIレート制限を避けるための短い遅延
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: result
          })
        };
        
      } catch (error2) {
        console.log(`Approach 2 failed: ${error2.message}`);
        
        // アプローチ3: フォールバックデータを使用
        console.log('Using fallback data for all symbols');
        
        const result = {};
        formattedSymbols.forEach(symbol => {
          const plainSymbol = symbol.replace(/\.T$/, '');
          result[plainSymbol] = generateFallbackData(symbol);
        });
        
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
    }
    
  } catch (error) {
    console.error('Error in handleStockData:', error);
    
    // 最終的なフォールバック
    const result = {};
    formattedSymbols.forEach(symbol => {
      const plainSymbol = symbol.replace(/\.T$/, '');
      result[plainSymbol] = generateFallbackData(symbol);
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
    // 一番信頼性の高いexchangerate.hostを優先的に使用
    try {
      console.log(`Attempting to use exchangerate.host API for ${fromCurrency}/${toCurrency}...`);
      
      const response = await axios.get('https://api.exchangerate.host/latest', {
        params: {
          base: fromCurrency,
          symbols: toCurrency
        },
        timeout: 5000
      });
      
      if (response.data && response.data.rates && response.data.rates[toCurrency]) {
        const rate = response.data.rates[toCurrency];
        
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
      
      throw new Error('No valid data in exchangerate.host response');
      
    } catch (error1) {
      console.warn(`exchangerate.host API failed: ${error1.message}`);
      
      // フォールバックとしてYahoo Financeを試す
      try {
        console.log(`Trying Yahoo Finance for ${fromCurrency}/${toCurrency} exchange rate`);
        
        const symbol = `${fromCurrency}${toCurrency}=X`;
        const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
        
        const response = await axios.get(yahooUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://finance.yahoo.com/'
          },
          timeout: 10000
        });
        
        if (response.data && 
            response.data.quoteResponse && 
            response.data.quoteResponse.result && 
            response.data.quoteResponse.result.length > 0) {
          
          const quote = response.data.quoteResponse.result[0];
          const rate = quote.regularMarketPrice || quote.ask || quote.bid || 0;
          
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
        
        throw new Error('No valid data in Yahoo Finance response');
        
      } catch (error2) {
        console.warn(`Yahoo Finance exchange rate failed: ${error2.message}`);
        
        // デフォルト値にフォールバック
        const defaultRate = getDefaultExchangeRate(fromCurrency, toCurrency);
        
        console.log(`Using fallback exchange rate: ${defaultRate}`);
        
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
    console.error(`Exchange rate error: ${error.message}`);
    
    const defaultRate = getDefaultExchangeRate(fromCurrency, toCurrency);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        rate: defaultRate,
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
function getDefaultExchangeRate(fromCurrency, toCurrency) {
  // よく使われる通貨ペアのデフォルト値
  const defaultRates = {
    'USDJPY': 155.0,
    'JPYUSD': 1/155.0,
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
