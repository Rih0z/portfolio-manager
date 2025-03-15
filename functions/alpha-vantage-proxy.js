// functions/alpha-vantage-proxy.js

/**
 * Alpha Vantage APIへのプロキシ関数
 * CORSの問題を回避し、APIキーを安全に管理するためのサーバーレス関数
 */
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
    
    // クエリパラメータを取得
    const queryParams = event.queryStringParameters || {};
    
    // APIキーを環境変数から取得（または提供されたものを使用）
    // 環境変数名を統一
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'GC4EBI5YHFKOJEXY';
    
    // 必須パラメータ
    const functionType = queryParams.function;
    
    if (!functionType) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'function parameter is required' })
        };
    }
    
    try {
        // パラメータからAPIキーを除外して新しいパラメータオブジェクトを作成
        const params = { ...queryParams };
        if (params.apikey) delete params.apikey;
        
        // APIキーを追加
        params.apikey = apiKey;
        
        console.log(`Requesting Alpha Vantage API with function: ${functionType}`);
        
        // Alpha Vantage APIにリクエスト
        const response = await axios.get('https://www.alphavantage.co/query', {
            params,
            headers: {
                'User-Agent': 'PortfolioManager/1.0'
            }
        });
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        console.error('Alpha Vantage API error:', error);
        
        // エラーレスポンス
        return {
            statusCode: error.response?.status || 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch data from Alpha Vantage API',
                details: error.response?.data || error.message
            })
        };
    }
};