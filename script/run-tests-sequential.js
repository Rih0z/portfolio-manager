#!/usr/bin/env node
/**
 * テストを順番に実行して問題のあるテストを特定
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// テストファイルを取得
const testFiles = [];
function findTestFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findTestFiles(fullPath);
    } else if (file.endsWith('.test.js')) {
      testFiles.push(fullPath);
    }
  });
}
findTestFiles(path.resolve(__dirname, '../__tests__'));

console.log(`🔍 ${testFiles.length}個のテストファイルが見つかりました\n`);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let timedOutTests = [];
let errorTests = [];

// 各テストファイルを実行
testFiles.forEach((testFile, index) => {
  const relativePath = path.relative(process.cwd(), testFile);
  console.log(`\n[${index + 1}/${testFiles.length}] 実行中: ${relativePath}`);
  
  try {
    const result = execSync(
      `npm run test:custom -- "${testFile}" --testTimeout=5000 --json --outputFile=temp-test-result.json`,
      {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 15000 // 15秒でタイムアウト
      }
    );
    
    // 結果を読み込む
    try {
      const testResult = JSON.parse(fs.readFileSync('temp-test-result.json', 'utf8'));
      totalTests += testResult.numTotalTests || 0;
      passedTests += testResult.numPassedTests || 0;
      failedTests += testResult.numFailedTests || 0;
      
      console.log(`  ✓ 完了: ${testResult.numTotalTests}テスト (成功: ${testResult.numPassedTests}, 失敗: ${testResult.numFailedTests})`);
    } catch (e) {
      console.log(`  ⚠️  結果ファイルを読み込めませんでした`);
    }
    
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      console.log(`  ❌ タイムアウト！`);
      timedOutTests.push(relativePath);
    } else {
      console.log(`  ❌ エラー: ${error.status || 'unknown'}`);
      errorTests.push(relativePath);
    }
  }
});

// クリーンアップ
try {
  fs.unlinkSync('temp-test-result.json');
} catch (e) {}

// サマリー表示
console.log('\n========================================');
console.log('📊 実行結果サマリー');
console.log('========================================');
console.log(`総テストファイル数: ${testFiles.length}`);
console.log(`実行済みテスト数: ${totalTests}`);
console.log(`成功: ${passedTests}`);
console.log(`失敗: ${failedTests}`);
console.log('\nタイムアウトしたファイル:');
timedOutTests.forEach(f => console.log(`  - ${f}`));
console.log('\nエラーが発生したファイル:');
errorTests.forEach(f => console.log(`  - ${f}`));
console.log('========================================');