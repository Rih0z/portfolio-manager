#!/usr/bin/env node

/**
 * ファイルパス: script/generate-coverage-report.js
 * 
 * カバレッジレポート生成スクリプト
 * テストカバレッジレポートを生成します
 * 
 * 使い方:
 *   node script/generate-coverage-report.js [追加のJestオプション]
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 現在の作業ディレクトリを取得
const cwd = process.cwd();

// スクリプト実行時の引数
const args = process.argv.slice(2);

console.log('========================================');
console.log('📊 カバレッジレポート生成スクリプト');
console.log('========================================');
console.log('実行日時:', new Date().toISOString());
console.log('----------------------------------------');

// coverageディレクトリの準備
const coverageDir = path.join(cwd, 'coverage');
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
  console.log('coverageディレクトリを作成しました');
}

// テストパターン
const testPattern = '**/__test__/**/*.{test,spec}.{js,jsx}';

console.log('カバレッジレポートの生成を開始します...');
console.log('対象: すべてのテスト');
console.log('テストパターン:', testPattern);
console.log('----------------------------------------');

// Jestコマンドの実行（カバレッジ付き）
const result = spawnSync('npx', [
  'jest', 
  testPattern, 
  '--coverage', 
  '--coverageReporters=lcov', 
  '--coverageReporters=text-summary',
  '--coverageReporters=json-summary',
  '--collectCoverageFrom=src/**/*.{js,jsx}',
  ...args
], {
  cwd,
  stdio: 'inherit',
  shell: true
});

// 結果のチェック
if (result.status === 0) {
  console.log('----------------------------------------');
  console.log('✅ カバレッジレポートの生成が完了しました');
  console.log(`レポートの場所: ${path.join(coverageDir, 'lcov-report/index.html')}`);
  
  // カバレッジサマリーの表示
  try {
    const summaryCoverage = JSON.parse(
      fs.readFileSync(path.join(coverageDir, 'coverage-summary.json'), 'utf8')
    );
    
    const total = summaryCoverage.total;
    
    console.log('\n📊 カバレッジサマリー:');
    console.log(`  ライン: ${total.lines.pct.toFixed(2)}%`);
    console.log(`  ステートメント: ${total.statements.pct.toFixed(2)}%`);
    console.log(`  関数: ${total.functions.pct.toFixed(2)}%`);
    console.log(`  ブランチ: ${total.branches.pct.toFixed(2)}%`);
  } catch (error) {
    console.error('カバレッジサマリーの読み込みに失敗しました:', error.message);
  }
} else {
  console.error('❌ カバレッジレポートの生成中にエラーが発生しました');
}

// 終了コードの設定
process.exit(result.status);
