#!/usr/bin/env node

/**
 * ファイルパス: script/run-e2e-tests.js
 * 
 * E2Eテスト実行スクリプト
 * エンドツーエンドテストを実行します
 * 
 * 使い方:
 *   node script/run-e2e-tests.js [追加のJestオプション]
 *   node script/run-e2e-tests.js UserManagement  # 特定のE2Eテストのみ実行
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
console.log('🧪 E2Eテスト実行スクリプト');
console.log('========================================');
console.log('実行日時:', new Date().toISOString());
console.log('----------------------------------------');

// E2Eテストの実行
const testPattern = '**/__test__/e2e/**/*_test.js';

// 特定のE2Eテストのみ実行する場合の処理
let specificTest = null;
if (args.length > 0 && !args[0].startsWith('-')) {
  specificTest = args.shift();
  console.log(`指定テスト: ${specificTest}`);
}

const finalPattern = specificTest 
  ? `**/__test__/e2e/**/${specificTest}_test.js`
  : testPattern;

console.log(`テストパターン: ${finalPattern}`);
console.log('----------------------------------------');

// レポート出力先設定
const reportBaseName = specificTest 
  ? `e2e-${specificTest.toLowerCase()}`
  : 'e2e-all';

// Jestコマンドの実行
const result = spawnSync('npx', [
  'jest', 
  finalPattern, 
  '--verbose', 
  '--runInBand',
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
    JEST_HTML_REPORTER_PAGE_TITLE: 'E2Eテスト実行結果'
  }
});

// 終了コードの設定
process.exit(result.status);
