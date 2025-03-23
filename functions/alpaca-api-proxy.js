// functions/alpaca-api-proxy.js
const axios = require('axios');

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
  const { symbol } = event.queryStringParameters || {};
  
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

  try {
    // リクエスト情報をログ出力
    console.log(`Alpaca API request for symbol: ${symbol}`);
    
    // Alpaca APIを呼び出す
    const response = await axios.get(`https://data.alpaca.markets/v2/stocks/${symbol}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET
      },
      timeout: 10000
    });
    
    // レスポンスからデータを抽出
    const quoteData = response.data;
    
    if (!quoteData || !quoteData.quote || !quoteData.quote.ap) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: `${symbol}の株価データが見つかりません`
        })
      };
    }
    
    // 結果を整形
    const result = {
      ticker: symbol,
      price: quoteData.quote.ap, // 気配値（ask price）
      name: quoteData.symbol || symbol, // Alpaca APIは銘柄名を直接提供しないため
      currency: 'USD',
      lastUpdated: new Date().toISOString(),
      source: 'Alpaca'
    };
    
    // 正常終了をログ出力
    console.log(`Alpaca API successfully returned data for ${symbol}: ${result.price} USD`);
    
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
    
    // エラーレスポンスの詳細をログ出力
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data));
      console.error('Headers:', JSON.stringify(error.response.headers));
    }
    
    // エラーメッセージを生成
    let errorMessage = 'Alpaca APIからの取得に失敗しました';
    let statusCode = error.response?.status || 500;
    
    // エラータイプによってメッセージを変更
    if (error.response?.status === 401 || error.response?.status === 403) {
      errorMessage = 'Alpaca APIの認証に失敗しました。APIキーを確認してください。';
    } else if (error.response?.status === 404) {
      errorMessage = `銘柄 ${symbol} はAlpaca APIで見つかりませんでした。銘柄コードを確認してください。`;
    } else if (error.response?.status === 429) {
      errorMessage = 'Alpaca APIの使用制限に達しました。しばらく時間をおいて再試行してください。';
    } else if (error.response?.status >= 500) {
      errorMessage = 'Alpaca APIサーバーでエラーが発生しました。時間をおいて再試行してください。';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Alpaca APIからの応答がタイムアウトしました。接続状況を確認してください。';
      statusCode = 408;
    } else if (error.message.includes('Network Error')) {
      errorMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      statusCode = 503;
    }
    
    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        message: errorMessage,
        error: {
          status: error.response?.status,
          data: error.response?.data
        }
      })
    };
  }
};
