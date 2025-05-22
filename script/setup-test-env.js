/**
 * テスト環境セットアップスクリプト（修正版）
 * テストディレクトリの作成、環境変数設定、モックファイル準備を行います
 * カバレッジ率の正確なビジュアル化に対応
 * 
 * @file script/setup-test-env.js
 * @updated 2025-05-22 - カバレッジビジュアル化対応
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

// デバッグモードの判定
const isDebugMode = process.env.DEBUG === 'true' || process.env.VERBOSE_COVERAGE === 'true';

// ログ関数
const log = {
  info: message => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: message => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  warning: message => console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`),
  error: message => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
  step: message => console.log(`${colors.cyan}[STEP]${colors.reset} ${message}`),
  debug: message => {
    if (isDebugMode) {
      console.log(`${colors.cyan}[DEBUG]${colors.reset} ${message}`);
    }
  }
};

/**
 * テスト用ディレクトリの作成
 */
function createTestDirectories() {
  log.step('テストディレクトリを作成しています...');
  
  const directories = [
    './test-results',
    './test-results/junit',
    './test-results/screenshots', // E2Eテスト用
    './coverage',
    './coverage/lcov-report',
    './.jest-cache',
    './__tests__',
    './__tests__/unit',
    './__tests__/integration', 
    './__tests__/e2e',
    './__mocks__',
    './__mocks__/axios'
  ];
  
  let createdCount = 0;
  let existingCount = 0;
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        log.success(`ディレクトリを作成しました: ${dir}`);
        createdCount++;
      } catch (error) {
        log.error(`ディレクトリの作成に失敗しました: ${dir} - ${error.message}`);
      }
    } else {
      log.debug(`ディレクトリは既に存在します: ${dir}`);
      existingCount++;
    }
  });
  
  log.info(`ディレクトリ作成結果: 新規作成 ${createdCount}個、既存 ${existingCount}個`);
}

/**
 * 環境変数の設定と検証
 */
function setupEnvironmentVariables() {
  log.step('テスト環境変数を設定しています...');
  
  // .env.test ファイルのパス
  const envFile = path.join(process.cwd(), '.env.test');
  
  // カバレッジ目標段階の取得
  const coverageTarget = process.env.COVERAGE_TARGET || 'initial';
  
  // ポートフォリオマネージャー向けのデフォルト環境変数設定
  const defaultEnv = `# テスト環境用の環境変数
NODE_ENV=test
REACT_APP_MARKET_DATA_API_URL=https://api.example.com
REACT_APP_API_STAGE=test
REACT_APP_GOOGLE_CLIENT_ID=test-client-id
REACT_APP_DEFAULT_EXCHANGE_RATE=150.0
USE_API_MOCKS=true

# カバレッジ関連設定
JEST_COVERAGE=true
COLLECT_COVERAGE=true
FORCE_COLLECT_COVERAGE=true
ENABLE_COVERAGE=true
COVERAGE_TARGET=${coverageTarget}

# デバッグ設定
DEBUG=${process.env.DEBUG || 'false'}
VERBOSE_COVERAGE=${process.env.VERBOSE_COVERAGE || 'false'}
`;
  
  // .env.test ファイルの処理
  if (fs.existsSync(envFile)) {
    log.info('.env.test ファイルが見つかりました');
    
    try {
      const content = fs.readFileSync(envFile, 'utf8');
      
      // 必要な環境変数が含まれているか確認
      const requiredVars = [
        'NODE_ENV',
        'REACT_APP_MARKET_DATA_API_URL',
        'REACT_APP_API_STAGE',
        'REACT_APP_GOOGLE_CLIENT_ID',
        'REACT_APP_DEFAULT_EXCHANGE_RATE',
        'JEST_COVERAGE',
        'COLLECT_COVERAGE',
        'COVERAGE_TARGET'
      ];
      
      const missingVars = requiredVars.filter(varName => !content.includes(`${varName}=`));
      
      if (missingVars.length > 0) {
        log.warning(`.env.test ファイルに不足している環境変数があります: ${missingVars.join(', ')}`);
        
        // 自動更新するかユーザーに確認
        const readline = require('readline-sync');
        let shouldUpdate = true;
        
        // CI環境では自動的に更新
        if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
          log.info('CI環境のため自動的に更新します');
        } else {
          try {
            const answer = readline.question('ファイルを更新しますか？ (y/n): ');
            shouldUpdate = answer.toLowerCase() === 'y';
          } catch (e) {
            log.debug('readline-syncが利用できません。自動的に更新します。');
            shouldUpdate = true;
          }
        }
        
        if (shouldUpdate) {
          // 既存の内容に追加
          const additionalVars = missingVars.map(varName => {
            const defaultValue = defaultEnv.match(new RegExp(`${varName}=(.*)`))?.[1] || '';
            return `${varName}=${defaultValue}`;
          }).join('\n');
          
          const updatedContent = content + '\n# 追加された環境変数\n' + additionalVars + '\n';
          
          fs.writeFileSync(envFile, updatedContent);
          log.success('.env.test ファイルを更新しました');
        }
      } else {
        log.success('.env.test ファイルの環境変数は完全です');
      }
    } catch (error) {
      log.error(`.env.test ファイルの読み込みに失敗しました: ${error.message}`);
    }
  } else {
    // .env.test ファイルがなければ作成
    log.warning('.env.test ファイルが見つかりません。デフォルト設定で作成します。');
    try {
      fs.writeFileSync(envFile, defaultEnv);
      log.success('.env.test ファイルを作成しました');
    } catch (error) {
      log.error(`.env.test ファイルの作成に失敗しました: ${error.message}`);
    }
  }
  
  // 現在のプロセスの環境変数を設定
  const envVars = {
    NODE_ENV: 'test',
    REACT_APP_MARKET_DATA_API_URL: 'https://api.example.com',
    REACT_APP_API_STAGE: 'test',
    REACT_APP_GOOGLE_CLIENT_ID: 'test-client-id',
    REACT_APP_DEFAULT_EXCHANGE_RATE: '150.0',
    USE_API_MOCKS: 'true',
    JEST_COVERAGE: 'true',
    COLLECT_COVERAGE: 'true',
    FORCE_COLLECT_COVERAGE: 'true',
    ENABLE_COVERAGE: 'true',
    COVERAGE_TARGET: coverageTarget
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
      log.debug(`環境変数を設定: ${key}=${value}`);
    }
  });
  
  log.success('環境変数の設定が完了しました');
  
  // カバレッジ設定の検証
  validateCoverageConfiguration();
}

/**
 * カバレッジ設定の検証
 */
function validateCoverageConfiguration() {
  log.debug('カバレッジ設定を検証しています...');
  
  const coverageTarget = process.env.COVERAGE_TARGET;
  const validTargets = ['initial', 'mid', 'final'];
  
  if (!validTargets.includes(coverageTarget)) {
    log.warning(`無効なカバレッジ目標: ${coverageTarget}。'initial'に設定します。`);
    process.env.COVERAGE_TARGET = 'initial';
  }
  
  // カバレッジ目標値の表示
  const thresholds = {
    initial: { statements: 30, branches: 20, functions: 25, lines: 30 },
    mid: { statements: 60, branches: 50, functions: 60, lines: 60 },
    final: { statements: 80, branches: 70, functions: 80, lines: 80 }
  };
  
  const currentThresholds = thresholds[process.env.COVERAGE_TARGET];
  log.info(`カバレッジ目標段階: ${process.env.COVERAGE_TARGET}`);
  log.debug(`目標値 - ステートメント: ${currentThresholds.statements}%, ブランチ: ${currentThresholds.branches}%, 関数: ${currentThresholds.functions}%, 行: ${currentThresholds.lines}%`);
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
  
  // styleMockファイルの確認・作成
  const styleMockFile = './__mocks__/styleMock.js';
  if (!fs.existsSync(styleMockFile)) {
    const styleMockContent = `// Style mock for Jest
module.exports = {};`;
    
    fs.writeFileSync(styleMockFile, styleMockContent);
    log.success(`モックファイルを作成しました: ${styleMockFile}`);
  }
  
  // fileMockファイルの確認・作成
  const fileMockFile = './__mocks__/fileMock.js';
  if (!fs.existsSync(fileMockFile)) {
    const fileMockContent = `// File mock for Jest
module.exports = 'test-file-stub';`;
    
    fs.writeFileSync(fileMockFile, fileMockContent);
    log.success(`モックファイルを作成しました: ${fileMockFile}`);
  }
  
  // Axiosモックファイルの確認・作成
  const axiosMockFile = './__mocks__/axios.js';
  if (!fs.existsSync(axiosMockFile)) {
    const axiosMockContent = `/**
 * Axios モック
 * @file __mocks__/axios.js
 * @description APIコールをモック化し、テストの独立性を確保
 */

const mockAxios = {
  get: jest.fn(() => Promise.resolve({
    status: 200,
    statusText: 'OK',
    data: { success: true, data: {} },
    headers: {},
    config: {}
  })),
  
  post: jest.fn(() => Promise.resolve({
    status: 201,
    statusText: 'Created',
    data: { success: true, data: {} },
    headers: {},
    config: {}
  })),
  
  put: jest.fn(() => Promise.resolve({
    status: 200,
    statusText: 'OK',
    data: { success: true, data: {} },
    headers: {},
    config: {}
  })),
  
  patch: jest.fn(() => Promise.resolve({
    status: 200,
    statusText: 'OK',
    data: { success: true, data: {} },
    headers: {},
    config: {}
  })),
  
  delete: jest.fn(() => Promise.resolve({
    status: 204,
    statusText: 'No Content',
    data: {},
    headers: {},
    config: {}
  })),
  
  request: jest.fn(() => Promise.resolve({
    status: 200,
    statusText: 'OK',
    data: { success: true, data: {} },
    headers: {},
    config: {}
  })),
  
  create: jest.fn(function(config) {
    return { ...mockAxios, defaults: { ...mockAxios.defaults, ...config } };
  }),
  
  defaults: {
    headers: {
      common: {},
      get: {},
      post: {},
      put: {},
      patch: {},
      delete: {}
    },
    timeout: 5000,
    baseURL: ''
  },
  
  interceptors: {
    request: { 
      use: jest.fn(), 
      eject: jest.fn(),
      clear: jest.fn()
    },
    response: { 
      use: jest.fn(), 
      eject: jest.fn(),
      clear: jest.fn()
    }
  },
  
  // よく使用されるメソッドのエイリアス
  all: jest.fn(() => Promise.resolve([])),
  spread: jest.fn(callback => callback),
  
  // カスタムヘルパー（テスト用）
  mockResolvedValue: function(data) {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && this[key].mockResolvedValue) {
        this[key].mockResolvedValue({ status: 200, data });
      }
    });
  },
  
  mockRejectedValue: function(error) {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && this[key].mockRejectedValue) {
        this[key].mockRejectedValue(error);
      }
    });
  },
  
  // モックのリセット
  mockReset: function() {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && this[key].mockReset) {
        this[key].mockReset();
      }
    });
  }
};

module.exports = mockAxios;`;
    
    fs.writeFileSync(axiosMockFile, axiosMockContent);
    log.success(`モックファイルを作成しました: ${axiosMockFile}`);
  }
  
  // src/setupTests.js ファイルの確認・作成
  const setupTestsDir = './src';
  if (!fs.existsSync(setupTestsDir)) {
    fs.mkdirSync(setupTestsDir, { recursive: true });
  }
  
  const setupFile = './src/setupTests.js';
  if (!fs.existsSync(setupFile)) {
    const setupContent = `// Jest testing setup
import '@testing-library/jest-dom';

// カバレッジ設定の確認
if (process.env.DEBUG === 'true') {
  console.log('setupTests.js loaded');
  console.log('Coverage enabled:', process.env.JEST_COVERAGE);
  console.log('Coverage target:', process.env.COVERAGE_TARGET);
}

// テスト環境の追加設定
global.testHelpers = {
  // テスト用のユーティリティ関数をここに追加
  mockDate: (dateString) => {
    const mockDate = new Date(dateString);
    jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
    return mockDate;
  },
  
  restoreDate: () => {
    jest.restoreAllMocks();
  }
};`;

    fs.writeFileSync(setupFile, setupContent);
    log.success(`セットアップファイルを作成しました: ${setupFile}`);
  }
  
  log.success('モックファイルの確認が完了しました');
}

/**
 * Jest設定ファイルの検証
 */
function validateJestConfiguration() {
  log.step('Jest設定ファイルを検証しています...');
  
  const configFiles = ['jest.config.js', 'jest.config.json'];
  let configFound = false;
  
  for (const configFile of configFiles) {
    if (fs.existsSync(configFile)) {
      log.success(`Jest設定ファイルが見つかりました: ${configFile}`);
      configFound = true;
      
      // 設定ファイルの内容を簡単に検証
      try {
        const content = fs.readFileSync(configFile, 'utf8');
        
        const requiredSettings = [
          'collectCoverage',
          'coverageDirectory',
          'coverageReporters',
          'reporters'
        ];
        
        const missingSettings = requiredSettings.filter(setting => !content.includes(setting));
        
        if (missingSettings.length > 0) {
          log.warning(`Jest設定に不足している項目: ${missingSettings.join(', ')}`);
        } else {
          log.success('Jest設定の検証完了');
        }
        
        // カスタムレポーターの確認
        if (content.includes('custom-reporter.js')) {
          if (fs.existsSync('./custom-reporter.js')) {
            log.success('カスタムレポーターが見つかりました');
          } else {
            log.warning('カスタムレポーターファイルが見つかりません: ./custom-reporter.js');
          }
        }
        
      } catch (error) {
        log.warning(`Jest設定ファイルの読み込みに失敗: ${error.message}`);
      }
      break;
    }
  }
  
  if (!configFound) {
    log.warning('Jest設定ファイルが見つかりません');
    
    // package.jsonのjest設定を確認
    if (fs.existsSync('package.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        if (packageJson.jest) {
          log.info('package.jsonにJest設定が見つかりました');
        } else {
          log.warning('package.jsonにもJest設定がありません');
        }
      } catch (error) {
        log.error(`package.jsonの読み込みに失敗: ${error.message}`);
      }
    }
  }
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
    './test-results/test-log.md',
    './test-results/detailed-results.json',
    './test-results/coverage-bar-chart.svg',
    './test-results/coverage-line-chart.svg'
  ];
  
  let cleanedCount = 0;
  reportPatterns.forEach(pattern => {
    if (fs.existsSync(pattern)) {
      try {
        fs.unlinkSync(pattern);
        log.debug(`古いレポートを削除しました: ${pattern}`);
        cleanedCount++;
      } catch (error) {
        log.warning(`レポートファイルの削除に失敗しました: ${pattern} - ${error.message}`);
      }
    }
  });
  
  if (cleanedCount > 0) {
    log.info(`${cleanedCount}個の古いレポートファイルを削除しました`);
  }
  
  // テストモードフラグファイルの作成
  const flagContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    coverageTarget: process.env.COVERAGE_TARGET,
    jestCoverage: process.env.JEST_COVERAGE,
    debugMode: process.env.DEBUG
  }, null, 2);
  
  fs.writeFileSync('./test-results/.test-mode', flagContent);
  
  // カバレッジディレクトリの初期化
  if (fs.existsSync('./coverage')) {
    try {
      // 古いカバレッジファイルをクリーンアップ
      const coverageFiles = fs.readdirSync('./coverage');
      coverageFiles.forEach(file => {
        if (file.endsWith('.json') || file.endsWith('.info')) {
          try {
            fs.unlinkSync(path.join('./coverage', file));
            log.debug(`古いカバレッジファイルを削除: ${file}`);
          } catch (e) {
            log.debug(`カバレッジファイルの削除をスキップ: ${file}`);
          }
        }
      });
    } catch (error) {
      log.debug(`カバレッジディレクトリのクリーンアップに失敗: ${error.message}`);
    }
  }
  
  log.success('テスト実行前の準備が完了しました');
}

/**
 * 依存関係の確認
 */
function checkDependencies() {
  log.step('必要な依存関係を確認しています...');
  
  const requiredPackages = [
    'jest',
    '@testing-library/jest-dom',
    '@testing-library/react',
    'jest-junit',
    'jest-html-reporter'
  ];
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    const missing = requiredPackages.filter(pkg => !allDeps[pkg]);
    
    if (missing.length > 0) {
      log.warning(`不足している依存関係: ${missing.join(', ')}`);
      log.info('以下のコマンドでインストールしてください:');
      log.info(`npm install --save-dev ${missing.join(' ')}`);
    } else {
      log.success('必要な依存関係は全て揃っています');
    }
    
    // Jest関連パッケージのバージョン確認
    requiredPackages.forEach(pkg => {
      if (allDeps[pkg]) {
        log.debug(`${pkg}: ${allDeps[pkg]}`);
      }
    });
    
  } catch (error) {
    log.error(`package.jsonの読み込みに失敗: ${error.message}`);
  }
}

/**
 * メイン処理
 */
async function main() {
  log.info('テスト環境のセットアップを開始します...');
  console.log('=====================================');
  
  try {
    // 各セットアップ処理を実行
    createTestDirectories();
    checkMockSetup();
    setupEnvironmentVariables();
    validateJestConfiguration();
    checkDependencies();
    prepareTestEnvironment();
    
    console.log('=====================================');
    
    log.success('テスト環境のセットアップが完了しました！');
    
    // セットアップ結果の表示
    log.info('セットアップ結果:');
    log.info(`- カバレッジ目標: ${process.env.COVERAGE_TARGET}`);
    log.info(`- カバレッジ有効: ${process.env.JEST_COVERAGE}`);
    log.info(`- デバッグモード: ${process.env.DEBUG}`);
    log.info(`- APIモック: ${process.env.USE_API_MOCKS}`);
    
    log.info('テストを実行するには:');
    log.info('  npm test');
    log.info('  または');
    log.info('  npm run test:unit');
    log.info('  npm run test:integration');
    log.info('  npm run test:e2e');
    log.info('  npm run test:all');
    log.info('  ./script/run-tests.sh --chart all  # チャート付き');
    
    return 0;
  } catch (error) {
    log.error(`テスト環境のセットアップに失敗しました: ${error.message}`);
    if (isDebugMode) {
      console.error(error.stack);
    }
    return 1;
  }
}

// スクリプトを実行
if (require.main === module) {
  main().then(exitCode => {
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  createTestDirectories,
  setupEnvironmentVariables,
  checkMockSetup,
  validateJestConfiguration,
  prepareTestEnvironment,
  checkDependencies
};
