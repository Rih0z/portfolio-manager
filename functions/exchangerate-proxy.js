// functions/exchangerate-proxy.js
const axios = require('axios');

// デフォルト為替レート
const DEFAULT_EXCHANGE_RATE = 150.0;

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  // パラメータを取得
  let base = event.queryStringParameters?.base || 'USD';
  let symbols = event.queryStringParameters?.symbols || 'JPY';
  
  // 要求されたオリジナルの通貨ペアを記録
  const originalBase = base;
  const originalSymbols = symbols;
  
  // JPY/USDの場合のフラグ
  const isJpyToUsd = base === 'JPY' && symbols === 'USD';
  
  // JPY/USDの場合はUSD/JPYとして取得して後で逆数を計算
  if (isJpyToUsd) {
    base = 'USD';
    symbols = 'JPY';
  }
  
  // 環境変数からデフォルト値を取得、または固定値を使用
  const defaultRate = process.env.DEFAULT_EXCHANGE_RATE 
    ? parseFloat(process.env.DEFAULT_EXCHANGE_RATE) 
    : DEFAULT_EXCHANGE_RATE;
    
  // リクエスト情報をログ出力
  console.log(`Exchange rate API request for ${originalBase}/${originalSymbols} (converted to ${base}/${symbols} for API call)`);
  
  try {
    // exchangerate.host APIを呼び出す
    const response = await axios.get('https://api.exchangerate.host/latest', {
      params: {
        base: base,
        symbols: symbols
      },
      timeout: 5000
    });
    
    const data = response.data;
    
    if (!data || !data.rates || !data.rates[symbols]) {
      console.warn(`No exchange rate data found for ${base}/${symbols}, using fallback value: ${defaultRate}`);
      return {
        statusCode: 200, // 404ではなく200を返して処理を継続
        headers,
        body: JSON.stringify({
          success: true, // フォールバック値を返すので成功とする
          message: `為替レートが見つからないため、デフォルト値を使用します`,
          data: {
            rate: isJpyToUsd ? (1 / defaultRate) : defaultRate,
            source: 'Fallback',
            base: originalBase,
            currency: originalSymbols,
            timestamp: new Date().toISOString()
          }
        })
      };
    }
    
    // レートを取得
    let rate = data.rates[symbols];
    
    // JPY/USDの場合は逆数を計算
    if (isJpyToUsd) {
      rate = 1 / rate;
    }
    
    // 正常終了をログ出力
    console.log(`Exchange rate API successfully returned rate for ${originalBase}/${originalSymbols}: ${rate}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          rate: rate,
          source: 'exchangerate.host',
          base: originalBase,
          currency: originalSymbols,
          timestamp: data.date || new Date().toISOString()
        }
      })
    };
  } catch (error) {
    console.error('Exchange rate API error:', error);
    
    // エラーの詳細をログ出力
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data));
    }
    
    // エラーメッセージを生成
    let errorMessage = '為替レートの取得に失敗したため、デフォルト値を使用します';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = '為替レートの取得がタイムアウトしました。デフォルト値を使用します。';
    } else if (error.message.includes('Network Error')) {
      errorMessage = 'ネットワーク接続に問題があります。デフォルト値を使用します。';
    }
    
    // JPY/USDの場合はデフォルト値の逆数を使用
    let fallbackRate = isJpyToUsd ? (1 / defaultRate) : defaultRate;
    
    console.warn(`Using fallback exchange rate: ${fallbackRate} for ${originalBase}/${originalSymbols} due to error: ${error.message}`);
    
    // エラー時はフォールバック値を返す
    return {
      statusCode: 200, // エラーでもクライアントには200を返す
      headers,
      body: JSON.stringify({
        success: true, // フォールバック値を返すので成功とみなす
        message: errorMessage,
        data: {
          rate: fallbackRate,
          source: 'Fallback',
          base: originalBase,
          currency: originalSymbols,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};
