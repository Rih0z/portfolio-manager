// functions/yfinance-proxy.js

/**
 * Python yfinanceライブラリを使用したデータ取得プロキシ関数
 * Pythonスクリプトを子プロセスとして実行し、yfinanceライブラリからデータを取得する
 */
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.handler = async function(event, context) {
  // リクエスト情報をログ出力
  console.log('yfinance Proxy - Request received:');
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
  
  try {
    // クエリパラメータを取得
    const params = event.queryStringParameters || {};
    
    // シンボルまたは為替レートのどちらかが必要
    if (!params.symbols && !params.exchange_rate) {
      console.error('Missing required parameters: symbols or exchange_rate');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'symbols or exchange_rate parameter is required',
          message: 'symbols または exchange_rate パラメータが必要です'
        })
      };
    }
    
    // Pythonスクリプトのパスを取得
    const pythonScript = path.join(__dirname, 'python', 'yfinance_fetcher.py');
    
    // スクリプトの存在確認
    if (!fs.existsSync(pythonScript)) {
      console.error(`Python script not found: ${pythonScript}`);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Python script not found',
          message: 'サーバー内部のPythonスクリプトが見つかりません'
        })
      };
    }
    
    // コマンドライン引数を構築
    const args = [];
    if (params.symbols) {
      args.push('--symbols', params.symbols);
    } else if (params.exchange_rate) {
      args.push('--exchange_rate', params.exchange_rate);
    }
    
    console.log(`Executing Python script: ${pythonScript} with args:`, args);
    
    // Pythonスクリプトを実行
    const result = await new Promise((resolve, reject) => {
      execFile('python3', [pythonScript, ...args], { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Python execution error:', error);
          if (stderr) console.error('stderr:', stderr);
          return reject(error);
        }
        
        if (stderr && stderr.trim()) {
          console.warn('Python warnings:', stderr);
        }
        
        try {
          console.log('Python script output:', stdout.substring(0, 1000) + '...');
          const data = JSON.parse(stdout);
          resolve(data);
        } catch (parseError) {
          console.error('Failed to parse Python output:', parseError);
          console.error('Raw output sample:', stdout.substring(0, 500));
          reject(new Error(`Failed to parse Python output: ${parseError.message}`));
        }
      });
    });
    
    // 結果を返す
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    // エラー情報の詳細をログに出力
    console.error('yfinance-proxy error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // エラーの種類に応じたレスポンス
    let statusCode = 500;
    let errorMessage = 'Python yfinanceからのデータ取得に失敗しました';
    
    if (error.code === 'ENOENT') {
      statusCode = 500;
      errorMessage = 'Pythonの実行環境が見つかりません';
    } else if (error.code === 'ETIMEDOUT') {
      statusCode = 504; // Gateway Timeout
      errorMessage = 'Pythonスクリプトの実行がタイムアウトしました';
    } else if (error.code === 'EPERM') {
      statusCode = 500;
      errorMessage = 'Pythonスクリプトの実行権限がありません';
    }
    
    // エラーレスポンス
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch data from Python yfinance',
        message: errorMessage,
        details: error.message,
        quoteResponse: {
          result: []
        }
      })
    };
  }
};
