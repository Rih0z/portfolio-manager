// functions/alpaca-api-proxy.js
const axios = require('axios');

// 債券ETFの明示的なリスト
const BOND_ETFS = ['LQD', 'BND', 'AGG', 'TLT', 'IEF', 'GOVT', 'HYG', 'JNK', 'MUB', 'VCIT', 'VCSH'];

// 債券ETF向けの最新デフォルト価格
const BOND_ETF_DEFAULTS = {
  'LQD': 109.64,
  'BND': 73.57,
  'AGG': 98.32,
  'TLT': 96.18,
  'IEF': 95.35,
  'GOVT': 25.10,
  'HYG': 76.89,
  'JNK': 93.22,
  'MUB': 106.54,
  'VCIT': 80.38,
  'VCSH': 76.98
};

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // シンボルパラメータの取得
  const symbol = event.queryStringParameters?.symbol;
  
  if (!symbol) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'シンボルパラメータが必要です'
      })
    };
  }

  console.log(`Alpaca API request for symbol: ${symbol}`);
  
  // 債券ETFかどうかをチェック
  const isBondETF = BOND_ETFS.includes(symbol.toUpperCase());
  
  // 債券ETFの場合は特別処理
  if (isBondETF) {
    console.log(`${symbol} is a bond ETF. Using enhanced handling...`);
    return await handleBondETF(symbol, headers);
  }

  // 環境変数からキーを取得
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;

  // APIキーとシークレットが設定されているか確認
  if (!apiKey || !apiSecret) {
    console.error('Alpaca API keys are not configured');
    return generateFallbackResponse(symbol, headers, 'APIキーが設定されていません');
  }

  try {
    // Alpaca APIを呼び出す（最新の株価データを取得）
    const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret
      },
      timeout: 10000
    });
    
    // レスポンスからデータを抽出
    const quoteData = response.data;
    
    if (!quoteData || !quoteData.quote || !quoteData.quote.ap) {
      console.warn(`No valid quote data found for ${symbol}`);
      return generateFallbackResponse(symbol, headers, `${symbol}の株価データが見つかりません`);
    }
    
    // 結果を整形
    const result = {
      ticker: symbol,
      price: quoteData.quote.ap, // 気配値（ask price）
      name: symbol, // Alpaca APIは銘柄名を直接提供しないため
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      source: 'Alpaca',
      isStock: true,
      isMutualFund: false
    };
    
    console.log(`Successfully retrieved data for ${symbol} from Alpaca API`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result
      })
    };
  } catch (error) {
    console.error(`Alpaca API error for ${symbol}:`, error);
    
    // エラーの詳細をログ出力
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', JSON.stringify(error.response.data).substring(0, 500));
    }
    
    // エラーメッセージを生成
    let errorMessage = `Alpaca APIからの取得に失敗しました`;
    
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        errorMessage = 'Alpaca APIの認証に失敗しました。APIキーを確認してください。';
      } else if (status === 404) {
        errorMessage = `銘柄 ${symbol} は見つかりませんでした。銘柄コードを確認してください。`;
      } else if (status === 429) {
        errorMessage = 'Alpaca APIの使用制限に達しました。しばらく時間をおいて再試行してください。';
      } else if (status >= 500) {
        errorMessage = 'Alpaca APIサーバーでエラーが発生しました。しばらく時間をおいて再試行してください。';
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Alpaca APIからの応答がタイムアウトしました。接続状況を確認してください。';
    } else if (error.message.includes('Network Error')) {
      errorMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
    }
    
    return generateFallbackResponse(symbol, headers, errorMessage);
  }
};

/**
 * 債券ETF専用のハンドラー
 * @param {string} symbol - ティッカーシンボル
 * @param {Object} headers - レスポンスヘッダー
 * @returns {Object} レスポンスオブジェクト
 */
async function handleBondETF(symbol, headers) {
  console.log(`Using enhanced bond ETF handler for ${symbol}`);
  
  // 環境変数からキーを取得
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;
  
  // APIキーとシークレットが設定されているか確認
  if (!apiKey || !apiSecret) {
    console.error('Alpaca API keys are not configured');
    return generateBondETFFallbackResponse(symbol, headers, 'APIキーが設定されていません');
  }
  
  try {
    // 1. まずAlpacaの通常エンドポイントを試す
    try {
      console.log(`Trying primary Alpaca endpoint for bond ETF ${symbol}...`);
      
      const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`, {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret
        },
        timeout: 10000
      });
      
      // レスポンスからデータを抽出
      const quoteData = response.data;
      
      if (quoteData && quoteData.quote && quoteData.quote.ap) {
        console.log(`Successfully retrieved data for bond ETF ${symbol} from primary Alpaca endpoint`);
        
        // 結果を整形（債券ETF特有の情報を追加）
        const result = {
          ticker: symbol,
          price: quoteData.quote.ap,
          name: `${symbol} Bond ETF`,
          currency: 'USD',
          lastUpdated: new Date().toISOString(),
          source: 'Alpaca',
          isStock: false,
          isMutualFund: false,
          isBondETF: true,
          // 債券ETF特有の情報
          dividendYield: 3.0, // デフォルト利回り
          hasDividend: true
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: result
          })
        };
      }
      
      console.log(`No valid quote data found for bond ETF ${symbol} from primary endpoint`);
      throw new Error('Primary endpoint returned no valid data');
      
    } catch (primaryError) {
      console.warn(`Primary Alpaca endpoint failed for bond ETF ${symbol}:`, primaryError.message);
      
      // 2. 次にAlpacaの代替エンドポイントを試す
      try {
        console.log(`Trying alternative Alpaca endpoint for bond ETF ${symbol}...`);
        
        // 代替エンドポイント（バーデータ）を使用
        const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/bars/latest?timeframe=1Min`, {
          headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': apiSecret
          },
          timeout: 10000
        });
        
        // レスポンスからデータを抽出
        const barData = response.data;
        
        if (barData && barData.bar && barData.bar.c) {
          console.log(`Successfully retrieved data for bond ETF ${symbol} from alternative Alpaca endpoint`);
          
          // 結果を整形（債券ETF特有の情報を追加）
          const result = {
            ticker: symbol,
            price: barData.bar.c, // 終値を使用
            name: `${symbol} Bond ETF`,
            currency: 'USD',
            lastUpdated: barData.bar.t || new Date().toISOString(),
            source: 'Alpaca (Alternative)',
            isStock: false,
            isMutualFund: false,
            isBondETF: true,
            // 債券ETF特有の情報
            dividendYield: 3.0, // デフォルト利回り
            hasDividend: true
          };
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: result
            })
          };
        }
        
        console.log(`No valid bar data found for bond ETF ${symbol} from alternative endpoint`);
        throw new Error('Alternative endpoint returned no valid data');
        
      } catch (alternativeError) {
        console.warn(`Alternative Alpaca endpoint failed for bond ETF ${symbol}:`, alternativeError.message);
        
        // 3. 最後にフォールバック値を使用
        console.log(`Using fallback data for bond ETF ${symbol}`);
        return generateBondETFFallbackResponse(symbol, headers, '利用可能なAPIエンドポイントからデータを取得できませんでした');
      }
    }
  } catch (error) {
    console.error(`Bond ETF handler error for ${symbol}:`, error);
    return generateBondETFFallbackResponse(symbol, headers, `債券ETF ${symbol} の処理中にエラーが発生しました`);
  }
}

/**
 * 債券ETF用のフォールバックレスポンスを生成する
 * @param {string} symbol - ティッカーシンボル（債券ETF）
 * @param {Object} headers - レスポンスヘッダー
 * @param {string} message - メッセージ
 * @returns {Object} レスポンスオブジェクト
 */
function generateBondETFFallbackResponse(symbol, headers, message) {
  const upperSymbol = symbol.toUpperCase();
  
  // 債券ETFのデフォルト価格を取得（なければ一般的な値を使用）
  const price = BOND_ETF_DEFAULTS[upperSymbol] || 100;
  
  // LQDの場合は特別ログを出力
  if (upperSymbol === 'LQD') {
    console.log(`[Alpaca] Special handling for LQD with price: ${price}`);
  }
  
  // フォールバック値を設定（債券ETF向け強化版）
  const fallbackData = {
    ticker: upperSymbol,
    price: price,
    name: `${upperSymbol} Bond ETF`,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    source: 'Fallback (Bond ETF)',
    isStock: false,
    isMutualFund: false,
    isBondETF: true,
    // 債券ETF特有の情報
    dividendYield: 3.0, // デフォルト利回り
    hasDividend: true,
    priceLabel: '株価'
  };
  
  console.log(`Returning enhanced fallback data for bond ETF ${symbol}`);
  
  return {
    statusCode: 200, // エラーでもクライアントには200を返す
    headers,
    body: JSON.stringify({
      success: true, // フォールバックデータを返すので成功とみなす
      message: message,
      data: fallbackData
    })
  };
}

/**
 * フォールバックレスポンスを生成する
 * @param {string} symbol - ティッカーシンボル
 * @param {Object} headers - レスポンスヘッダー
 * @param {string} message - エラーメッセージ
 * @returns {Object} レスポンスオブジェクト
 */
function generateFallbackResponse(symbol, headers, message) {
  // 債券ETFかチェック
  if (BOND_ETFS.includes(symbol.toUpperCase())) {
    return generateBondETFFallbackResponse(symbol, headers, message);
  }
  
  // 通常のフォールバック値を設定
  const fallbackData = {
    ticker: symbol,
    price: 100, // 米国株のデフォルト価格
    name: symbol,
    currency: 'USD',
    lastUpdated: new Date().toISOString(),
    source: 'Fallback',
    isStock: true,
    isMutualFund: false
  };
  
  console.log(`Returning fallback data for ${symbol} due to API error`);
  
  return {
    statusCode: 200, // エラーでもクライアントには200を返す
    headers,
    body: JSON.stringify({
      success: true, // フォールバックデータを返すので成功とみなす
      message: message,
      data: fallbackData
    })
  };
}
