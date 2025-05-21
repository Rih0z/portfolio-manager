#!/usr/bin/env node

/**
 * ファイルパス: script/view-test-results.js
 * 
 * テスト結果レポート表示スクリプト
 * test-resultsフォルダのHTMLレポートをブラウザで開きます
 * 
 * 使い方:
 *   node script/view-test-results.js [レポート名]
 *   
 *   例:
 *   node script/view-test-results.js unit-all  # 単体テスト全体のレポートを表示
 *   node script/view-test-results.js           # 最新のレポートを表示
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 現在の作業ディレクトリを取得
const cwd = process.cwd();
const testResultsDir = path.join(cwd, 'test-results');

// 引数からレポート名を取得
const reportPrefix = process.argv[2];

console.log('========================================');
console.log('📊 テスト結果レポート表示');
console.log('========================================');

// test-resultsディレクトリが存在するか確認
if (!fs.existsSync(testResultsDir)) {
  console.error('❌ test-resultsディレクトリが見つかりません。');
  console.error('テストを実行して結果を生成してください。');
  process.exit(1);
}

// レポートファイルを検索
const files = fs.readdirSync(testResultsDir)
  .filter(file => file.endsWith('-report.html'))
  .sort((a, b) => {
    const statA = fs.statSync(path.join(testResultsDir, a));
    const statB = fs.statSync(path.join(testResultsDir, b));
    return statB.mtime.getTime() - statA.mtime.getTime(); // 最新順
  });

if (files.length === 0) {
  console.error('❌ HTMLレポートファイルが見つかりません。');
  console.error('テストを実行して結果を生成してください。');
  process.exit(1);
}

// レポートを選択
let reportFile;

if (reportPrefix) {
  // 指定されたプレフィックスに一致するレポートを検索
  reportFile = files.find(file => file.startsWith(`${reportPrefix}-report.html`));
  
  if (!reportFile) {
    console.error(`❌ "${reportPrefix}" で始まるレポートが見つかりません。`);
    console.log('利用可能なレポート:');
    files.forEach(file => {
      console.log(`  - ${file.replace('-report.html', '')}`);
    });
    process.exit(1);
  }
} else {
  // 最新のレポートを使用
  reportFile = files[0];
  console.log('最新のレポートを表示します');
}

const reportPath = path.join(testResultsDir, reportFile);
console.log(`レポート: ${reportFile}`);

// プラットフォームに応じたブラウザオープンコマンド
let command;
switch (process.platform) {
  case 'darwin': // macOS
    command = `open "${reportPath}"`;
    break;
  case 'win32': // Windows
    command = `start "" "${reportPath}"`;
    break;
  default: // Linux など
    command = `xdg-open "${reportPath}"`;
}

console.log('レポートをブラウザで開いています...');

exec(command, (error) => {
  if (error) {
    console.error('❌ レポートを開く際にエラーが発生しました:', error.message);
    console.log(`レポートの場所: ${reportPath}`);
    process.exit(1);
  }
  console.log('✅ レポートをブラウザで開きました');
});
