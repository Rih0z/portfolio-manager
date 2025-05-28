/**
 * ファイルパス: __tests__/testUtils/environment.js
 * 
 * テスト環境のセットアップと破棄を管理するユーティリティ
 * 
 * @author Koki Riho
 * @created 2025-05-12
 * @updated 2025-05-12 修正: APIサーバー自動起動機能の追加、E2Eテスト実行条件の改善
 * @updated 2025-05-14 修正: 環境変数の拡張サポート、デバッグログの追加
 * @updated 2025-05-15 修正: モック初期化プロセスの改善、エラーハンドリング強化
 * @updated 2025-05-20 修正: モック設定順序の改善、テスト安定性向上
 */
const { startDynamoDBLocal, stopDynamoDBLocal, createTestTable } = require('./dynamodbLocal');
const { setupMockServer, stopMockServer } = require('./mockServer');
const { startApiServer, stopApiServer } = require('./apiServer');
const { mockExternalApis, setupFallbackResponses, resetApiMocks } = require('./apiMocks');
const axios = require('axios');

// デバッグログを表示
console.log('==== ENVIRONMENT SETUP DEBUG INFO ====');
console.log('現在の環境変数:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('USE_API_MOCKS:', process.env.USE_API_MOCKS);
console.log('RUN_E2E_TESTS:', process.env.RUN_E2E_TESTS);
console.log('FORCE_TESTS:', process.env.FORCE_TESTS);
console.log('API_TEST_URL:', process.env.API_TEST_URL);
console.log('DEBUG:', process.env.DEBUG);
console.log('MOCK_DEBUG:', process.env.MOCK_DEBUG);
console.log('================================');

/**
 * テスト環境をセットアップする
 */
const setupTestEnvironment = async () => {
  try {
    console.log('テスト環境のセットアップを開始します...');
    
    // テスト用の環境変数をセット
    process.env.NODE_ENV = 'test';
    process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
    
    // 強制実行フラグをサポート
    if (process.env.FORCE_TESTS !== 'true' && process.env.FORCE_TESTS !== 'false') {
      process.env.FORCE_TESTS = 'false';
    }
    
    // モック使用フラグを設定（優先度：環境変数 > デフォルト）
    if (process.env.USE_API_MOCKS === undefined || process.env.USE_API_MOCKS === '') {
      process.env.USE_API_MOCKS = 'true'; // テスト安定性のため、デフォルトでモックを有効化
    }
    
    // デバッグフラグの設定
    if (process.env.DEBUG === undefined) {
      process.env.DEBUG = 'false';
    }
    
    // モックデバッグフラグの設定
    if (process.env.MOCK_DEBUG === undefined) {
      process.env.MOCK_DEBUG = process.env.DEBUG; // DEBUGと同じ値を設定
    }
    
    // 変数にも値を持たせておく（参照の容易さのため）
    const useMocks = process.env.USE_API_MOCKS === 'true';
    const debugMode = process.env.DEBUG === 'true';
    
    // 既存のモックをクリア
    if (useMocks) {
      try {
        resetApiMocks();
        if (debugMode) {
          console.log('✅ Existing API mocks cleared');
        }
      } catch (e) {
        // 無視 - 初回実行時には何もないかもしれない
      }
    }
    
    // モックAPIをセットアップ（USE_API_MOCKSが有効な場合）- 早期に設定
    if (useMocks) {
      console.log('モックAPIをセットアップします...');
      try {
        // 1. モックサーバーをセットアップ
        await setupMockServer().catch(error => {
          console.warn(`Mock server setup warning: ${error.message}`);
          console.warn('Will continue with other mock setup');
        });
        
        // 2. 外部APIモックを設定
        await mockExternalApis();
        
        // 3. フォールバックレスポンスも設定（未処理リクエスト対応）
        await setupFallbackResponses();
        
        console.log('✅ Mock API setup completed');
      } catch (mockError) {
        console.warn(`Mock setup warning: ${mockError.message}`);
        console.warn('Will attempt to continue with tests using available mocks');
      }
    }
    
    // E2Eテストを実行する場合、APIサーバーを起動
    if (process.env.RUN_E2E_TESTS === 'true') {
      try {
        await startApiServer();
        console.log('✅ API server started successfully for E2E tests');
      } catch (apiError) {
        console.warn(`⚠️ Could not start API server: ${apiError.message}`);
        console.warn('E2E tests that require a real API server will be skipped.');
        
        if (!useMocks) {
          console.warn('Setting USE_API_MOCKS=true to allow tests to run with mock API server');
          process.env.USE_API_MOCKS = 'true';
        }
      }
    } else {
      // API サーバーが稼働しているか確認（手動起動の場合）
      const apiBaseUrl = process.env.API_TEST_URL || 'http://localhost:3000';
      try {
        await axios.get(`${apiBaseUrl}/health`, { timeout: 5000 });
        console.log(`✅ API server is running at ${apiBaseUrl}`);
      } catch (apiError) {
        console.warn(`⚠️ API server at ${apiBaseUrl} may not be running or not responding: ${apiError.message}`);
        
        if (useMocks) {
          console.log('✅ Using mock APIs instead of real server');
        } else {
          console.warn('If you plan to run E2E tests, please either:');
          console.warn('  1. Start the API server manually: npm run dev');
          console.warn('  2. Set RUN_E2E_TESTS=true to auto-start the API server');
          console.warn('  3. Set USE_API_MOCKS=true to use mock API server');
          console.warn('  4. Set FORCE_TESTS=true to run tests regardless of server status');
          
          // 開発者による設定がない場合は、自動的にモックを有効化
          if (process.env.FORCE_TESTS !== 'true' && process.env.USE_API_MOCKS !== 'true') {
            console.log('Auto-enabling USE_API_MOCKS=true to allow tests to run');
            process.env.USE_API_MOCKS = 'true';
            
            // モックを再設定
            try {
              await mockExternalApis();
              await setupFallbackResponses();
              console.log('✅ Mock API setup completed (auto-enabled)');
            } catch (mockError) {
              console.warn(`Auto-enabled mock setup warning: ${mockError.message}`);
            }
          }
        }
      }
    }
    
    // DynamoDB Localを起動
    try {
      await startDynamoDBLocal();
      console.log('✅ DynamoDB Local started successfully');
    } catch (dbError) {
      console.warn(`DynamoDB Local startup warning: ${dbError.message}`);
      console.warn('Continuing with tests, but DynamoDB-dependent tests may fail');
    }
    
    // テスト用のテーブルを作成 - 並列に処理して高速化
    try {
      const tableCreationPromises = [
        createTestTable(process.env.SESSION_TABLE || 'test-sessions', { sessionId: 'S' }),
        createTestTable(`${process.env.DYNAMODB_TABLE_PREFIX || 'test-'}cache`, { key: 'S' }),
        createTestTable(`${process.env.DYNAMODB_TABLE_PREFIX || 'test-'}scraping-blacklist`, { symbol: 'S' })
      ];
      
      // すべてのテーブル作成が完了するか、エラーが発生するまで待機
      const results = await Promise.allSettled(tableCreationPromises);
      
      // 結果をログに出力（オプショナル）
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      if (successCount === tableCreationPromises.length) {
        console.log('✅ All test tables created successfully');
      } else {
        console.warn(`⚠️ Some test tables could not be created (${successCount}/${tableCreationPromises.length})`);
      }
    } catch (tableError) {
      console.warn(`Test table creation error: ${tableError.message}`);
      console.warn('Continuing with tests, but table-dependent tests may fail');
    }
    
    console.log('✅ テスト環境のセットアップが完了しました');
    
    // 最終的な環境設定を表示
    console.log('==== FINAL ENVIRONMENT CONFIG ====');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('USE_API_MOCKS:', process.env.USE_API_MOCKS);
    console.log('RUN_E2E_TESTS:', process.env.RUN_E2E_TESTS);
    console.log('FORCE_TESTS:', process.env.FORCE_TESTS);
    console.log('DEBUG:', process.env.DEBUG);
    console.log('MOCK_DEBUG:', process.env.MOCK_DEBUG);
    console.log('================================');
    
  } catch (error) {
    console.error(`Test environment setup error: ${error.message}`);
    console.warn('Continuing with tests, but some tests may fail');
  }
};

/**
 * テスト環境を破棄する
 */
const teardownTestEnvironment = async () => {
  try {
    console.log('テスト環境のクリーンアップを開始...');
    
    // APIサーバーを停止（自動起動した場合のみ）
    if (process.env.RUN_E2E_TESTS === 'true') {
      stopApiServer();
    }
    
    // DynamoDB Localを停止
    stopDynamoDBLocal();
    
    // モックサーバーを停止
    if (process.env.USE_API_MOCKS === 'true') {
      stopMockServer();
      resetApiMocks();
    }
    
    console.log('✅ Test environment cleaned up');
  } catch (error) {
    console.error(`Test environment teardown error: ${error.message}`);
  }
};

module.exports = {
  setupTestEnvironment,
  teardownTestEnvironment
};
