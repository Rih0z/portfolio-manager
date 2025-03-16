// functions/alpha-vantage-proxy.js

/**
 * Alpha Vantage APIへのプロキシ関数
 * CORSの問題を回避し、APIキーを安全に管理するためのサーバーレス関数
 */
const axios = require('axios');

exports.handler = async function(event, context) {
    // リクエスト情報をログ出力
    console.log('Alpha Vantage Proxy - Request received:');
    console.log('Method:', event.httpMethod);
    console.log('Path:', event.path);
    console.log('Query parameters:', JSON.stringify(event.queryStringParameters));
    console.log('Headers:', JSON.stringify(event.headers));
    
    // CORS ヘッダーを設定 - すべてのオリジンからのリクエストを許可
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
    
    // プリフライトリクエスト（OPTIONS）をハンドリング
    if (event.httpMethod === 'OPTIONS') {
        console.log('Responding to OPTIONS request');
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }
    
    // クエリパラメータを取得
    const queryParams = event.queryStringParameters || {};
    
    // APIキーを環境変数から取得（または提供されたものを使用）
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'GC4EBI5YHFKOJEXY';
    console.log('Using API Key (first 4 chars):', apiKey.substring(0, 4));
    
    // 必須パラメータ
    const functionType = queryParams.function;
    
    if (!functionType) {
        console.error('Missing required parameter: function');
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
        
        console.log(`Requesting Alpha Vantage API with params:`, JSON.stringify(params));
        
        // Alpha Vantage APIにリクエスト
        const response = await axios({
            method: 'get',
            url: 'https://www.alphavantage.co/query',
            params,
            headers: {
                'User-Agent': 'PortfolioManager/1.0',
                'Accept': 'application/json'
            },
            timeout: 15000 // 15秒タイムアウト
        });
        
        // レスポンスをログ出力（開発用）
        console.log(`Alpha Vantage API response status: ${response.status}`);
        console.log(`Response for ${functionType}:`, JSON.stringify(response.data).substring(0, 200) + '...');
        
        // Alpha Vantageのレート制限チェック
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
        
        // 空のレスポンスチェック
        if (response.data && Object.keys(response.data).length === 0) {
            console.warn(`Empty response from Alpha Vantage for function: ${functionType}`);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'No data found',
                    message: `関数「${functionType}」の応答データが空でした`,
                })
            };
        }
        
        // 正常なレスポンス
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        // エラー情報の詳細をログに出力
        console.error('Alpha Vantage API error:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        if (error.response) {
            // サーバーからのレスポンスがあった場合
            console.error('Error status:', error.response.status);
            console.error('Error headers:', JSON.stringify(error.response.headers));
            console.error('Error data:', JSON.stringify(error.response.data));
        } else if (error.request) {
            // リクエストは送信されたがレスポンスがない場合
            console.error('No response received:', error.request);
        }
        
        // エラーの種類に応じたレスポンス
        let statusCode = error.response?.status || 500;
        let errorMessage = 'Alpha Vantage APIからのデータ取得に失敗しました';
        
        if (error.code === 'ECONNABORTED') {
            statusCode = 504; // Gateway Timeout
            errorMessage = 'Alpha Vantage APIへのリクエストがタイムアウトしました';
        } else if (error.code === 'ENOTFOUND') {
            statusCode = 502; // Bad Gateway
            errorMessage = 'Alpha Vantage APIへの接続に失敗しました';
        }
        
        // エラーレスポンス
        return {
            statusCode,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch data from Alpha Vantage API',
                message: errorMessage,
                details: error.response?.data || error.message
            })
        };
    }
};
