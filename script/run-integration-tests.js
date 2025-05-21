#!/usr/bin/env node

/**
 * ファイルパス: script/run-integration-tests.js
 * 
 * 統合テスト実行スクリプト
 * 複数コンポーネントの連携や、API通信の統合テストを実行します
 * 
 * 使い方:
 *   node script/run-integration-tests.js [追加のJestオプション]
 *   node script/run-integration-tests.js auth  # auth関連の統合テストのみ実行
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 現在の作業ディレクトリを取得
const cwd = process.cwd();

// スクリプト実行時の引数
const args = process.argv.slice(2);

// test-resultsディレクトリの準備
const testResultsDir = path.join(cwd, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
  console.log('test-resultsディレクトリを作成しました');
}

console.log('========================================');
console.log('🧪 統合テスト実行スクリプト');
console.log('========================================');
console.log('実行日時:', new Date().toISOString());
console.log('----------------------------------------');

// 統合テストの実行
const testPattern = '**/__test__/integration/**/*.test.js';

// 特定のカテゴリのみテストする場合の処理
let specificCategory = null;
if (args.length > 0 && !args[0].startsWith('-')) {
  specificCategory = args.shift();
  console.log(`指定カテゴリ: ${specificCategory}`);
}

const finalPattern = specificCategory 
  ? `**/__test__/integration/${specificCategory}/**/*.test.js`
  : testPattern;

console.log(`テストパターン: ${finalPattern}`);
console.log('----------------------------------------');

// レポート出力先設定
const reportBaseName = specificCategory 
  ? `integration-${specificCategory.toLowerCase()}`
  : 'integration-all';

// Jestコマンドの実行
const result = spawnSync('npx', [
  'jest', 
  finalPattern, 
  '--verbose', 
  '--testResultsProcessor=jest-junit',
  ...args
], {
  cwd,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    JEST_JUNIT_OUTPUT_DIR: './test-results',
    JEST_JUNIT_OUTPUT_NAME: `${reportBaseName}-results.xml`,
    JEST_HTML_REPORTER_OUTPUT_PATH: `./test-results/${reportBaseName}-report.html`,
    JEST_HTML_REPORTER_PAGE_TITLE: '統合テスト実行結果'
  }
});

// 終了コードの設定
process.exit(result.status);
