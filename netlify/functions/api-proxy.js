// Netlify Function: APIプロキシ
// このファイルはNetlifyのサーバーレス関数として動作し、CORSの問題を回避します

const axios = require('axios');

const API_URL = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_MARKET_DATA_API_URL;
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';

exports.handler = async (event, context) => {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // OPTIONSリクエストの処理
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // クエリパラメータを取得
    const params = event.queryStringParameters || {};
    
    // プロキシ先のパスを構築
    const path = event.path.replace('/.netlify/functions/api-proxy', '');
    const targetUrl = `${API_URL}/${API_STAGE}/api/market-data`;
    
    console.log('Proxying request to:', targetUrl, 'with params:', params);
    
    // 実際のAPIにリクエスト
    const response = await axios({
      method: event.httpMethod,
      url: targetUrl,
      params: params,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // レスポンスを返す
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response.data)
    };
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    return {
      statusCode: error.response?.status || 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      })
    };
  }
};