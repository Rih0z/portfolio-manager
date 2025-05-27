#!/usr/bin/env node
/**
 * カスタムテストランナー
 * Create React Appをバイパスしてカスタムレポーターを使用
 */

// 環境変数設定
process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';

// メモリ不足対策
process.env.NODE_OPTIONS = '--max_old_space_size=4096';

// カバレッジを強制有効化
process.env.JEST_COVERAGE = 'true';
process.env.COLLECT_COVERAGE = 'true';
process.env.FORCE_COLLECT_COVERAGE = 'true';

// エラーハンドリング
process.on('unhandledRejection', err => {
  throw err;
});

const spawn = require('child_process').spawn;
const path = require('path');

console.log('🚀 カスタムテストランナーを起動します...');
console.log('📊 カスタムレポーターが有効になっています');

// Jest実行引数
const jestArgs = [
  '--config', path.resolve(__dirname, '../jest.config.custom.js'),
  '--watchAll=false',
  '--forceExit',
  '--detectOpenHandles'
];

// コマンドライン引数を追加
const userArgs = process.argv.slice(2);
jestArgs.push(...userArgs);

// Jestパス
const jestPath = path.resolve(__dirname, '../node_modules/.bin/jest');

// Jest実行
const jest = spawn(jestPath, jestArgs, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // CRAの環境変数を追加
    REACT_APP_MARKET_DATA_API_URL: process.env.REACT_APP_MARKET_DATA_API_URL || 'https://api.example.com',
    REACT_APP_API_STAGE: process.env.REACT_APP_API_STAGE || 'test',
    REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'test-client-id',
    REACT_APP_DEFAULT_EXCHANGE_RATE: process.env.REACT_APP_DEFAULT_EXCHANGE_RATE || '150.0',
    USE_API_MOCKS: 'true'
  }
});

jest.on('exit', (code) => {
  if (code === 0) {
    console.log('\n✅ テストが正常に完了しました');
    console.log('📁 test-results/visual-report.html を確認してください');
  } else {
    console.log('\n❌ テストが失敗しました (exit code: ' + code + ')');
  }
  process.exit(code);
});