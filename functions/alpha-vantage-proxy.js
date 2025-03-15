// functions/alpha-vantage-proxy.js

/**
 * Alpha Vantage APIへのプロキシ関数
 * CORSの問題を回避し、APIキーを安全に管理するためのサーバーレス関数
 */
const axios = require('axios');

exports.handler = async function(event, context) {
    // CORS ヘッダーを設定 - すべてのオリジンからのリクエストを許可
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // プリフライトリクエスト（OPTIONS）をハンドリング
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
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
            body: JSON.stringify({ 
                error: 'function parameter is required',
                message: 'function パラメータが必要です'
            })
        };
    }
    
    console.log(`Alpha Vantage API request: function=${functionType}, symbol=${queryParams.symbol || 'N/A'}`);
    
    try {
        // パラメータからAPIキーを除外して新しいパラメータオブジェクトを作成
        const params = { ...queryParams };
        if (params.apikey) delete params.apikey;
        
        // APIキーを追加
        params.apikey = apiKey;
        
        console.log(`Requesting Alpha Vantage API with function: ${functionType}`);
        
        // Alpha Vantage APIにリクエスト
        const response = await axios({
            method: 'get',
            url: 'https://www.alphavantage.co/query',
            params,
            headers: {
                'User-Agent': 'PortfolioManager/1.0'
            },
            timeout: 8000 // 8秒タイムアウト
        });
        
        console.log(`Alpha Vantage API response received for ${functionType}`);
        
        // 注意: Alpha VantageのAPIが空のオブジェクトまたはエラーメッセージを返す場合があります
        if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
            console.warn('Alpha Vantage API rate limit reached:', response.data.Note);
            return {
                statusCode: 429, // Too Many Requests
                headers,
                body: JSON.stringify({
                    error: 'API rate limit exceeded',
                    message: 'Alpha Vantage APIのレート制限に達しました。しばらく待ってから再試行してください。',
                    data: response.data
                })
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        console.error('Alpha Vantage API error:', error.message);
        
        // エラーレスポンス
        return {
            statusCode: error.response?.status || 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch data from Alpha Vantage API',
                message: 'Alpha Vantage APIからのデータ取得に失敗しました',
                details: error.response?.data || error.message
            })
        };
    }
};