// functions/yahoo-finance-proxy.js

/**
 * Yahoo Finance APIへのプロキシ関数
 * CORSの問題を回避し、リクエスト制限やIPブロックを軽減するためのサーバーレス関数
 */
const axios = require('axios');

exports.handler = async function(event, context) {
  // CORS ヘッダーを設定 - すべてのオリジンからのリクエストを許可
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300' // 5分間キャッシュ
  };
  
  // プリフライトリクエスト（OPTIONS）をハンドリング
  if (event.httpMethod === 'OPTIONS') {
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'symbols parameter is required',
          message: 'symbols パラメータが必要です'
        })
      };
    }
    
    console.log(`Yahoo Finance API request for symbols: ${params.symbols}`);
    
    // UA文字列の設定 - ブラウザからのリクエストに見せる
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    // Yahoo Finance APIにリクエスト
    const response = await axios({
      method: 'get',
      url: 'https://query1.finance.yahoo.com/v7/finance/quote',
      params,
      headers: {
        'User-Agent': userAgent
      },
      timeout: 10000 // 10秒タイムアウト
    });
    
    console.log(`Yahoo Finance API response received for ${params.symbols}`);
    
    // 空のレスポンスのチェック
    if (!response.data || 
        !response.data.quoteResponse || 
        !response.data.quoteResponse.result || 
        response.data.quoteResponse.result.length === 0) {
      console.warn(`No data found for symbol: ${params.symbols}`);
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Yahoo Finance API error:', error.message);
    
    // エラーの種類に応じたレスポンス
    let statusCode = error.response?.status || 500;
    let errorMessage = 'Yahoo Finance APIからのデータ取得に失敗しました';
    
    if (error.code === 'ECONNABORTED') {
      statusCode = 504; // Gateway Timeout
      errorMessage = 'Yahoo Finance APIへのリクエストがタイムアウトしました';
    } else if (error.code === 'ENOTFOUND') {
      statusCode = 502; // Bad Gateway
      errorMessage = 'Yahoo Finance APIへの接続に失敗しました';
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