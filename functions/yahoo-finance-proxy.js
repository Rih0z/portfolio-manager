const axios = require('axios');

exports.handler = async function(event, context) {
  console.log('Yahoo Finance Proxy - Request received:');
  console.log('Method:', event.httpMethod);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const params = event.queryStringParameters || {};

  if (!params.symbols) {
    console.error('Missing required parameter: symbols');
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
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com',
        'Origin': 'https://finance.yahoo.com',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 15000
    });

    console.log(`Yahoo Finance API response status: ${response.status}`);

    if (!response.data || !response.data.chart || response.data.chart.error) {
      console.error('API returned no data or error:', response.data);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No data found',
          message: `シンボル「${params.symbols}」のデータが見つかりませんでした。`,
          details: response.data.chart.error || {}
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
    const statusCode = error.response ? error.response.status : (error.code === 'ECONNABORTED' ? 504 : 500);
    const errorMessage = error.code === 'ECONNABORTED' 
      ? 'リクエストがタイムアウトしました。'
      : 'Yahoo Finance APIからのデータ取得に失敗しました。';

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: 'API request failed',
        message: errorMessage,
        details: error.response?.data || error.message
      })
    };
  } catch (unexpectedError) {
    console.error('Unexpected error:', unexpectedError);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: '予期せぬエラーが発生しました。',
        details: unexpected.message
      })
    };
  }
};
