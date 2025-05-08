/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: functions/alpha-vantage-proxy.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2023/04/15 10:30:00 
 * 
 * 更新履歴: 
 * - 2023/04/15 10:30:00 Koki Riho 初回作成
 * - 2023/05/01 11:45:00 Yuta Sato エラーハンドリングを強化
 * 
 * 説明: 
 * Alpha Vantage APIへのプロキシとして機能し、株価データを取得するサーバーレス関数。
 * CORSの問題を回避し、APIキーを安全に管理するための層として機能する。
 * Alpaca APIが利用できない場合のバックアップデータソースとして使用される。
 * API使用制限やタイムアウトを適切に処理し、エラー情報を詳細に提供する。
 */

const axios = require('axios');

exports.handler = async function(event, context) {
    // リクエスト情報をログ出力
    console.log('Alpha Vantage Proxy - Request received:');
    console.log('Method:', event.httpMethod);
    console.log('Path:', event.path);
    console.log('Query parameters:', JSON.stringify(event.queryStringParameters));
    
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
    
    // シンボルの取得とフォーマット
    const originalSymbol = queryParams.symbol || '';
    let symbol = originalSymbol;
    
    // Alpha Vantage用にシンボルを処理（必要に応じて）
    // 米国シンボルの場合のフォーマットを調整
    if (symbol && !symbol.includes('.')) {
        const knownUSETFs = [
            'VXUS', 'IBIT', 'LQD', 'GLD', 'SPY', 'VOO', 'VTI', 'QQQ', 'IVV', 'VGT', 'VYM', 
            'VEA', 'VWO', 'BND', 'BNDX', 'AGG', 'VNQ'
        ];
        
        if (knownUSETFs.includes(symbol.toUpperCase())) {
            console.log(`Known US ETF detected: ${symbol}`);
        }
    }
    
    console.log(`Alpha Vantage API request: function=${functionType}, original symbol=${originalSymbol}, processed symbol=${symbol}`);
    
    try {
        // パラメータからAPIキーを除外して新しいパラメータオブジェクトを作成
        const params = { ...queryParams };
        if (params.apikey) delete params.apikey;
        if (params.symbol) params.symbol = symbol; // 処理後のシンボルを使用
        
        // APIキーを追加（Alpha Vantageのパラメータ形式に合わせる）
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
        
        // レスポンスデータが存在するか確認
        if (!response.data) {
            console.warn(`Empty response from Alpha Vantage for function: ${functionType}, symbol: ${symbol}`);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'No data received',
                    message: 'APIからデータを受信できませんでした',
                    symbol: originalSymbol
                })
            };
        }
        
        // レスポンスをログ出力（開発用）
        console.log(`Alpha Vantage API response status: ${response.status}`);
        console.log(`Response for ${functionType} (${symbol}):`, JSON.stringify(response.data).substring(0, 200) + '...');
        
        // Alpha Vantageのレート制限チェック
        if (response.data && response.data.Note && response.data.Note.includes('API call frequency')) {
            console.warn('Alpha Vantage API rate limit reached:', response.data.Note);
            return {
                statusCode: 429, // Too Many Requests
                headers,
                body: JSON.stringify({
                    error: 'API rate limit exceeded',
                    message: 'Alpha Vantage APIのレート制限に達しました。しばらく待ってから再試行してください。',
                    data: response.data,
                    symbol: originalSymbol
                })
            };
        }
        
        // APIエラーメッセージのチェック
        if (response.data && response.data['Error Message']) {
            console.error('Alpha Vantage API returned an error:', response.data['Error Message']);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Alpha Vantage API error',
                    message: response.data['Error Message'],
                    data: response.data,
                    symbol: originalSymbol
                })
            };
        }
        
        // Information メッセージのチェック (これはエラーではないが、情報提供)
        if (response.data && response.data['Information']) {
            console.log('Alpha Vantage API returned information:', response.data['Information']);
            // 情報は表示するが、正常なレスポンスとして処理
        }
        
        // Global Quoteがある場合の追加チェック
        if (functionType === 'GLOBAL_QUOTE' && response.data['Global Quote']) {
            const quoteData = response.data['Global Quote'];
            
            // Global Quoteが空オブジェクトの場合（シンボルが見つからない）
            if (Object.keys(quoteData).length === 0) {
                console.warn(`Empty Global Quote from Alpha Vantage for symbol: ${symbol}`);
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({
                        error: 'No quote data found',
                        message: `銘柄「${originalSymbol}」の価格データが見つかりませんでした`,
                        data: response.data,
                        symbol: originalSymbol
                    })
                };
            }
            
            // 価格データが存在するか確認
            if (!quoteData['05. price']) {
                console.warn(`Missing price data in Global Quote for symbol: ${symbol}`);
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({
                        error: 'Price data not found',
                        message: `銘柄「${originalSymbol}」の価格データが取得できませんでした`,
                        data: response.data,
                        symbol: originalSymbol
                    })
                };
            }
        }
        
        // 空のレスポンスチェック (データが完全に空の場合)
        if (response.data && Object.keys(response.data).length === 0) {
            console.warn(`Empty response from Alpha Vantage for function: ${functionType}, symbol: ${symbol}`);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'No data found',
                    message: `関数「${functionType}」の応答データが空でした (シンボル: ${originalSymbol})`,
                    data: {},
                    symbol: originalSymbol
                })
            };
        }
        
        // 正常なレスポンス
        console.log(`Successfully processed response for ${symbol}`);
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
            console.error('Error data:', JSON.stringify(error.response.data));
        } else if (error.request) {
            // リクエストは送信されたがレスポンスがない場合
            console.error('No response received:', error.request);
        }
        
        // エラーの種類に応じたレスポンス
        let statusCode = error.response?.status || 500;
        let errorMessage = `Alpha Vantage APIからのデータ取得に失敗しました (シンボル: ${originalSymbol})`;
        
        if (error.code === 'ECONNABORTED') {
            statusCode = 504; // Gateway Timeout
            errorMessage = `Alpha Vantage APIへのリクエストがタイムアウトしました (シンボル: ${originalSymbol})`;
        } else if (error.code === 'ENOTFOUND') {
            statusCode = 502; // Bad Gateway
            errorMessage = `Alpha Vantage APIへの接続に失敗しました (シンボル: ${originalSymbol})`;
        } else if (error.response?.status === 403) {
            statusCode = 403;
            errorMessage = `Alpha Vantage APIへのアクセスが拒否されました（APIキーを確認してください）`;
        }
        
        // エラーレスポンス
        return {
            statusCode,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch data from Alpha Vantage API',
                message: errorMessage,
                symbol: originalSymbol,
                details: error.response?.data || error.message
            })
        };
    }
};
