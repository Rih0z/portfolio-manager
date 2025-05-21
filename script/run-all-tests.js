#!/usr/bin/env node

/**
 * ファイルパス: script/run-all-tests.js
 * 
 * 全テスト実行スクリプト
 * すべてのテスト（単体/統合/E2E）を実行します
 * 
 * 使い方:
 *   node script/run-all-tests.js
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
console.log('🧪 ポートフォリオマネージャー テスト実行');
console.log('========================================');
console.log('実行日時:', new Date().toISOString());
console.log('作業ディレクトリ:', cwd);
console.log('----------------------------------------');

// Jestコマンドの実行
function runJest(testPattern, label) {
  console.log(`\n${label} の実行を開始します...`);
  
  const result = spawnSync('npx', [
    'jest', 
    testPattern, 
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
      JEST_JUNIT_OUTPUT_NAME: `${label.toLowerCase().replace(/\s+/g, '-')}-results.xml`,
      JEST_HTML_REPORTER_OUTPUT_PATH: `./test-results/${label.toLowerCase().replace(/\s+/g, '-')}-report.html`,
      JEST_HTML_REPORTER_PAGE_TITLE: `${label} 実行結果`
    }
  });

  if (result.status !== 0) {
    console.error(`❌ ${label} でエラーが発生しました`);
    return false;
  }
  
  console.log(`✅ ${label} が完了しました`);
  return true;
}

// テスト実行
console.log('すべてのテストを実行します...\n');

const unitTestsResult = runJest('**/__test__/unit/**/*.test.js', '単体テスト');
const integrationTestsResult = runJest('**/__test__/integration/**/*.test.js', '統合テスト');
const e2eTestsResult = runJest('**/__test__/e2e/**/*_test.js', 'E2Eテスト');

// 実行結果のサマリー
console.log('\n----------------------------------------');
console.log('📊 テスト実行結果サマリー');
console.log('----------------------------------------');
console.log('単体テスト:', unitTestsResult ? '✅ 成功' : '❌ 失敗');
console.log('統合テスト:', integrationTestsResult ? '✅ 成功' : '❌ 失敗');
console.log('E2Eテスト:', e2eTestsResult ? '✅ 成功' : '❌ 失敗');
console.log('----------------------------------------');

// 終了コードの設定
if (!unitTestsResult || !integrationTestsResult || !e2eTestsResult) {
  console.log('❌ 一部のテストが失敗しました');
  process.exit(1);
} else {
  console.log('✅ すべてのテストが成功しました');
  process.exit(0);
}
