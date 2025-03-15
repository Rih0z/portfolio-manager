// Yahoo Finance APIプロキシ関数
exports.handler = async function(event, context) {
    const axios = require('axios');
    
    try {
      // リクエストからクエリパラメータを取得
      const { symbols } = event.queryStringParameters || {};
      
      if (!symbols) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'symbols parameter is required' })
        };
      }
      
      // Yahoo Finance APIにリクエスト
      const response = await axios.get(`https://query1.finance.yahoo.com/v7/finance/quote`, {
        params: {
          symbols: symbols
        },
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      // CORSヘッダーを追加して結果を返す
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(response.data)
      };
    } catch (error) {
      console.error('Yahoo Finance API error:', error);
      
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch data from Yahoo Finance API' })
      };
    }
  };