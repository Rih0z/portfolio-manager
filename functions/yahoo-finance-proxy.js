const axios = require('axios');

exports.handler = async function(event, context) {
  // CORS ヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  // プリフライトリクエストをハンドリング
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight response' })
    };
  }
  
  try {
    // クエリパラメータを取得
    const params = event.queryStringParameters;
    const symbols = params.symbols || 'AAPL,MSFT';
    
    // Yahoo Finance APIへリクエスト
    const response = await axios.get(`https://query1.finance.yahoo.com/v7/finance/quote`, {
      params: {
        symbols,
        includePrePost: 'false',
        region: 'US',
        lang: 'en-US'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Yahoo Finance API Error:', error);
    
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        message: 'Yahoo Finance APIからのデータ取得に失敗しました'
      })
    };
  }
};