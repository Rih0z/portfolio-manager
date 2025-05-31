/**
 * ファイルパス: __tests__/testUtils/apiServer.js
 * 
 * テスト実行時に自動的にAPIサーバーを起動・停止するためのユーティリティ
 * 
 * @file __tests__/testUtils/apiServer.js
 * @author Koki Riho
 * @created 2025-05-12
 * @updated 2025-05-12
 * @updated 2025-05-14 修正: デバッグ情報の追加、エラーハンドリングの強化
 */

const { spawn } = require('child_process');
const axios = require('axios');
let apiProcess = null;

// デバッグログを追加
console.log('==== API SERVER DEBUG INFO ====');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('API_TEST_URL:', process.env.API_TEST_URL);
console.log('USE_API_MOCKS:', process.env.USE_API_MOCKS);
console.log('=============================');

/**
 * テスト用APIサーバーを起動する
 * @param {number} port - APIサーバーを起動するポート番号
 * @returns {Promise} サーバー起動完了を表すPromise
 */
const startApiServer = async (port = 3000) => {
  if (apiProcess) {
    console.log('API server is already running');
    return apiProcess;
  }
  
  return new Promise((resolve, reject) => {
    console.log('Starting API server for testing...');
    
    try {
      // サーバー起動コマンド
      apiProcess = spawn('npm', ['run', 'dev'], {
        env: {
          ...process.env,
          PORT: port.toString(),
          NODE_ENV: 'test'
        },
        detached: false
      });
      
      // 標準出力を監視して、サーバー起動を検知
      apiProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`API: ${output}`);
        
        // サーバー起動完了のメッセージを検出
        if (output.includes('Server is running') || output.includes('listening on port')) {
          console.log(`✅ API server started on port ${port}`);
          resolve(apiProcess);
        }
      });
      
      // エラー処理
      apiProcess.stderr.on('data', (data) => {
        console.error(`API Error: ${data.toString()}`);
      });
      
      apiProcess.on('error', (error) => {
        console.error('Failed to start API server:', error);
        apiProcess = null;
        reject(error);
      });
      
      // プロセス終了処理
      apiProcess.on('exit', (code, signal) => {
        console.log(`API server process exited with code ${code} and signal ${signal}`);
        apiProcess = null;
      });
      
      // タイムアウト処理
      setTimeout(() => {
        if (apiProcess) {
          console.log('API server startup timeout reached, checking if it is responsive...');
          // サーバーが応答するか確認
          checkApiServerResponse(port)
            .then(() => {
              console.log('✅ API server is responsive');
              resolve(apiProcess);
            })
            .catch(error => {
              console.warn('API server is not responsive:', error.message);
              resolve(apiProcess); // それでも続行
            });
        } else {
          reject(new Error('API server failed to start within timeout period'));
        }
      }, 5000);
    } catch (error) {
      console.error('Exception when starting API server:', error);
      reject(error);
    }
  });
};

/**
 * APIサーバーのレスポンスを確認する
 * @param {number} port - サーバーポート
 * @returns {Promise} チェック結果
 */
const checkApiServerResponse = async (port) => {
  try {
    const apiBaseUrl = `http://localhost:${port}`;
    const response = await axios.get(`${apiBaseUrl}/health`, { timeout: 2000 });
    if (response.status === 200) {
      return true;
    } else {
      throw new Error(`API server returned status ${response.status}`);
    }
  } catch (error) {
    throw new Error(`API server check failed: ${error.message}`);
  }
};

/**
 * テスト用APIサーバーを停止する
 */
const stopApiServer = () => {
  if (apiProcess) {
    console.log('Stopping API server...');
    try {
      // プロセスとその子プロセスをすべて終了
      process.kill(-apiProcess.pid, 'SIGTERM');
    } catch (error) {
      console.error('Error stopping API server:', error);
      // 強制終了を試みる
      try {
        apiProcess.kill('SIGKILL');
      } catch (killError) {
        console.error('Failed to kill API server process:', killError);
      }
    } finally {
      apiProcess = null;
    }
  } else {
    console.log('No API server process to stop');
  }
};

/**
 * APIサーバーの実行状態を確認する
 * @returns {boolean} サーバーが実行中かどうか
 */
const isApiServerRunning = () => {
  return apiProcess !== null;
};

/**
 * APIサーバーへの接続をチェックする
 * @param {string} url - チェックするURL
 * @param {number} timeout - タイムアウト時間（ミリ秒）
 * @returns {Promise<boolean>} 接続が成功したかどうか
 */
const checkApiServerConnection = async (url = 'http://localhost:3000/health', timeout = 2000) => {
  try {
    console.log(`Checking API server connection at ${url}...`);
    const response = await axios.get(url, { timeout });
    console.log(`API server responded with status ${response.status}`);
    return true;
  } catch (error) {
    console.warn(`API server connection check failed: ${error.message}`);
    return false;
  }
};

module.exports = {
  startApiServer,
  stopApiServer,
  isApiServerRunning,
  checkApiServerConnection
};
