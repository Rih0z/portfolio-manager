const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  if (!params.symbols) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Missing required parameter',
        message: '必須パラメータ「symbols」が指定されていません。'
      })
    };
  }

  try {
    const response = await axios.get('https://query1.finance.yahoo.com/v7/finance/quote', {
      params: { symbols: params.symbols },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com',
        'Origin': 'https://finance.yahoo.com',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 20000 // タイムアウトを20秒に増加
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('API request failed:', error.message);

    let statusCode = 500;
    let message = 'Yahoo Finance APIからのデータ取得に失敗しました。';

    if (error.code === 'ECONNABORTED') {
      statusCode = 504;
      message = 'リクエストがタイムアウトしました。';
    } else if (error.response) {
      statusCode = error.response.status;
      message = 'Yahoo Finance APIがエラーを返しました。';
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: 'Bad Gateway',
        message,
        details: error.message
      })
    };
  } catch (unexpectedError) {
    console.error('Internal error:', unexpected.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: '予期せぬエラーが発生しました。',
        details: unexpected.message
      })
    };
  }
};
