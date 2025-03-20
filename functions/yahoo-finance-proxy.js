// functions/yahoo-finance-proxy.js

/**
 * Yahoo Finance APIへのプロキシ関数
 * CORSの問題を回避し、リクエスト制限やIPブロックを軽減するためのサーバーレス関数
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
    
    // シンボルは必須
    if (!params.symbols) {
      console.error('Missing required parameter: symbols');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'symbols parameter is required',
          message: 'symbols パラメータが必要です'
        })
      };
    }
    
    // 日本株のティッカー調整（数字のみの場合は.Tを追加）
    let symbols = params.symbols;
    const symbolsArray = symbols.split(',').map(symbol => {
      if (/^\d{4}$/.test(symbol)) {
        return `${symbol}.T`;
      }
      return symbol;
    });
    
    const adjustedSymbols = symbolsArray.join(',');
    console.log(`Requesting Yahoo Finance API for symbols: ${adjustedSymbols}`);
    
    // UA文字列とリファラーの設定 - より本物らしいブラウザからのリクエストに見せる
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36';
    
    // Yahoo Finance API v7/quote エンドポイントにリクエスト
    const response = await axios({
      method: 'get',
      url: 'https://query1.finance.yahoo.com/v7/finance/quote',
      params: {
        symbols: adjustedSymbols,
        fields: 'regularMarketPrice,shortName,longName,currency,regularMarketChange,regularMarketChangePercent'
      },
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com',
        'Origin': 'https://finance.yahoo.com',
        'X-Requested-With': 'XMLHttpRequest',
        'sec-ch-ua': '"Chromium";v="92", " Not A;Brand";v="99", "Google Chrome";v="92"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      },
      timeout: 15000 // 15秒タイムアウト
    });
    
    // レスポンスをログ出力（開発用）
    console.log(`Yahoo Finance API response status: ${response.status}`);
    
    // 空のレスポンスのチェック
    if (!response.data || 
        !response.data.quoteResponse || 
        !response.data.quoteResponse.result || 
        response.data.quoteResponse.result.length === 0) {
      console.warn(`No data found for symbols: ${adjustedSymbols}`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No data found',
          message: `シンボル「${params.symbols}」のデータが見つかりませんでした`,
          quoteResponse: {
            result: []
          }
        })
      };
    }
    
    // 正常なレスポンス
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    // エラー情報の詳細をログに出力
    console.error('Yahoo Finance API error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.response) {
      // サーバーからのレスポンスがあった場合
      console.error('Error status:', error.response.status);
      console.error('Error headers:', JSON.stringify(error.response.headers));
      console.error('Error data:', JSON.stringify(error.response.data));
    } else if (error.request) {
      // リクエストは送信されたがレスポンスがない場合
      console.error('No response received:', error.request);
    }
    
    // エラーの種類に応じたレスポンス
    let statusCode = error.response?.status || 500;
    let errorMessage = 'Yahoo Finance APIからのデータ取得に失敗しました';
    
    if (error.code === 'ECONNABORTED') {
      statusCode = 504; // Gateway Timeout
      errorMessage = 'Yahoo Finance APIへのリクエストがタイムアウトしました';
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 502; // Bad Gateway
      errorMessage = 'Yahoo Finance APIへの接続に失敗しました';
    } else if (statusCode === 401) {
      errorMessage = 'Yahoo Finance APIへのアクセスが認証エラーで失敗しました。APIの仕様変更の可能性があります。';
    }
    
    // エラーレスポンス
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch data from Yahoo Finance API',
        message: errorMessage,
        details: error.response?.data || error.message,
        quoteResponse: {
          result: []
        }
      })
    };
  }
};
