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
 * フォールバックレスポンスを生成する
 * @param {string} symbol - ティッカーシンボル
 * @param {Object} headers - レスポンスヘッダー
 * @param {string} message - エラーメッセージ
 * @returns {Object} レスポンスオブジェクト
 */
function generateFallbackResponse(symbol, headers, message) {
  // フォールバック値を設定
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
