/**
 * テスト環境セットアップスクリプト
 * テストディレクトリの作成、環境変数設定、モックファイル準備を行います
 * 
 * @file script/setup-test-env.js
 * @updated 2025-05-21 - ポートフォリオマネージャー向けに調整
 */

const fs = require('fs');
const path = require('path');

// 色の設定
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// ログ関数
const log = {
  info: message => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: message => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  warning: message => console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`),
  error: message => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
  step: message => console.log(`${colors.cyan}[STEP]${colors.reset} ${message}`)
};

/**
 * テスト用ディレクトリの作成
 */
function createTestDirectories() {
  log.step('テストディレクトリを作成しています...');
  
  const directories = [
    './test-results',
    './test-results/junit',
    './coverage',
    './.jest-cache',
    './__tests__',
    './__mocks__'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.success(`ディレクトリを作成しました: ${dir}`);
    } else {
      log.info(`ディレクトリは既に存在します: ${dir}`);
    }
  });
}

/**
 * 環境変数の設定
 */
function setupEnvironmentVariables() {
  log.step('テスト環境変数を設定しています...');
  
  // .env.test ファイルのパス
  const envFile = path.join(process.cwd(), '.env.test');
  
  // ポートフォリオマネージャー向けのデフォルト環境変数設定
  const defaultEnv = `# テスト環境用の環境変数
NODE_ENV=test
REACT_APP_MARKET_DATA_API_URL=https://api.example.com
REACT_APP_API_STAGE=test
REACT_APP_GOOGLE_CLIENT_ID=test-client-id
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
USE_API_MOCKS=true
`;
  
  // .env.test ファイルが存在するか確認
  if (fs.existsSync(envFile)) {
    log.info('.env.test ファイルが見つかりました');
    
    // ファイルの内容を読み込む
    const content = fs.readFileSync(envFile, 'utf8');
    
    // 必要な環境変数が含まれているか確認
    const requiredVars = [
      'NODE_ENV',
      'REACT_APP_MARKET_DATA_API_URL',
      'REACT_APP_API_STAGE',
      'REACT_APP_GOOGLE_CLIENT_ID',
      'REACT_APP_DEFAULT_EXCHANGE_RATE'
    ];
    
    const missingVars = requiredVars.filter(varName => !content.includes(`${varName}=`));
    
    if (missingVars.length > 0) {
      log.warning(`.env.test ファイルに不足している環境変数があります: ${missingVars.join(', ')}`);
      log.info('ファイルを更新しますか？ (y/n)');
      
      // ユーザーの入力を待つ（同期的に）
      const readline = require('readline-sync');
      const answer = readline.question('> ');
      
      if (answer.toLowerCase() === 'y') {
        // 既存の内容に追加
        const updatedContent = content + '\n' + missingVars.map(varName => {
          const defaultValue = defaultEnv.match(new RegExp(`${varName}=(.*)`))[1];
          return `${varName}=${defaultValue}`;
        }).join('\n') + '\n';
        
        fs.writeFileSync(envFile, updatedContent);
        log.success('.env.test ファイルを更新しました');
      }
    }
  } else {
    // .env.test ファイルがなければ作成
    log.warning('.env.test ファイルが見つかりません。デフォルト設定で作成します。');
    fs.writeFileSync(envFile, defaultEnv);
    log.success('.env.test ファイルを作成しました');
  }
  
  // 現在のプロセスの環境変数を設定
  process.env.NODE_ENV = 'test';
  process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
  process.env.REACT_APP_API_STAGE = 'test';
  process.env.REACT_APP_GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '150.0';
  process.env.USE_API_MOCKS = 'true';
  
  log.success('環境変数の設定が完了しました');
}

/**
 * モックセットアップファイルの確認と生成
 */
function checkMockSetup() {
  log.step('モックセットアップファイルを確認しています...');
  
  const mockDirs = [
    './__mocks__',
    './__mocks__/axios'
  ];
  
  // ディレクトリがなければ作成
  mockDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.success(`ディレクトリを作成しました: ${dir}`);
    }
  });
  
  // styleMockファイルの確認
  const styleMockFile = './__mocks__/styleMock.js';
  if (!fs.existsSync(styleMockFile)) {
    const styleMockContent = `// Style mock
module.exports = {};`;
    
    fs.writeFileSync(styleMockFile, styleMockContent);
    log.success(`モックファイルを作成しました: ${styleMockFile}`);
  }
  
  // fileMockファイルの確認
  const fileMockFile = './__mocks__/fileMock.js';
  if (!fs.existsSync(fileMockFile)) {
    const fileMockContent = `// File mock
module.exports = 'test-file-stub';`;
    
    fs.writeFileSync(fileMockFile, fileMockContent);
    log.success(`モックファイルを作成しました: ${fileMockFile}`);
  }
  
  // Axiosモックファイルの確認
  const axiosMockFile = './__mocks__/axios.js';
  if (!fs.existsSync(axiosMockFile)) {
    const axiosMockContent = `/**
 * Axios モック
 * @file __mocks__/axios.js
 */

module.exports = {
  get: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true, data: {} }
  }),
  post: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true, data: {} }
  }),
  put: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true, data: {} }
  }),
  delete: jest.fn().mockResolvedValue({
    status: 200,
    data: { success: true, data: {} }
  }),
  create: jest.fn().mockReturnThis(),
  defaults: {
    headers: {
      common: {}
    }
  },
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
};`;
    
    fs.writeFileSync(axiosMockFile, axiosMockContent);
    log.success(`モックファイルを作成しました: ${axiosMockFile}`);
  }
  
  // setup.js ファイルの確認（空でも存在しているか）
  const setupFile = './__tests__/setup.js';
  if (!fs.existsSync(setupFile)) {
    const setupContent = `// テスト実行前後のグローバル設定
import '@testing-library/jest-dom';

// この後にテストグローバル設定を追加
`;
    
    fs.writeFileSync(setupFile, setupContent);
    log.success(`セットアップファイルを作成しました: ${setupFile}`);
  }
  
  log.success('モックファイルの確認が完了しました');
}

/**
 * テスト実行前の設定とクリーンアップ
 */
function prepareTestEnvironment() {
  log.step('テスト実行前の準備...');
  
  // 古いレポートファイルのクリーンアップ
  const reportPatterns = [
    './test-results/junit.xml',
    './test-results/test-report.html',
    './test-results/test-log.md'
  ];
  
  reportPatterns.forEach(pattern => {
    if (fs.existsSync(pattern)) {
      try {
        fs.unlinkSync(pattern);
        log.info(`古いレポートを削除しました: ${pattern}`);
      } catch (error) {
        log.warning(`レポートファイルの削除に失敗しました: ${pattern}`);
      }
    }
  });
  
  // テストモードフラグファイルの作成
  fs.writeFileSync('./test-results/.test-mode', new Date().toISOString());
  
  log.success('テスト実行前の準備が完了しました');
}

/**
 * メイン処理
 */
async function main() {
  log.info('テスト環境のセットアップを開始します...');
  console.log('=====================================');
  
  try {
    // テストディレクトリの作成
    createTestDirectories();
    
    // モックのセットアップ
    checkMockSetup();
    
    // 環境変数の設定
    setupEnvironmentVariables();
    
    // 前処理
    prepareTestEnvironment();
    
    console.log('=====================================');
    
    log.success('テスト環境のセットアップが完了しました！');
    log.info('テストを実行するには:');
    log.info('  npm test');
    log.info('  または');
    log.info('  npm run test:unit');
    log.info('  npm run test:integration');
    log.info('  npm run test:e2e');
    log.info('  npm run test:all');
    
    return 0;
  } catch (error) {
    log.error(`テスト環境のセットアップに失敗しました: ${error.message}`);
    log.error(error.stack);
    return 1;
  }
}

// スクリプトを実行
main().then(exitCode => {
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

