#!/usr/bin/env node

/**
 * ファイルパス: script/prepare-test-dirs.js
 * 
 * テスト関連ディレクトリを準備するスクリプト
 * test-resultsフォルダなどの必要なディレクトリを作成します
 * 
 * 使い方:
 *   node script/prepare-test-dirs.js
 */

const fs = require('fs');
const path = require('path');

// 現在の作業ディレクトリを取得
const cwd = process.cwd();

console.log('========================================');
console.log('🔧 テスト環境ディレクトリ作成スクリプト');
console.log('========================================');

// 作成するディレクトリのリスト
const directories = [
  'test-results',      // テスト結果の出力先
  'coverage',          // カバレッジレポートの出力先
  '__mocks__'          // モックファイル格納用
];

// ディレクトリが存在しない場合は作成
directories.forEach(dir => {
  const dirPath = path.join(cwd, dir);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ ${dir} ディレクトリを作成しました`);
  } else {
    console.log(`ℹ️ ${dir} ディレクトリは既に存在します`);
  }
});

console.log('----------------------------------------');
console.log('テスト環境ディレクトリの準備が完了しました');
console.log('----------------------------------------');
