#!/usr/bin/env node
/**
 * テストデバッグスクリプト
 * 問題のあるテストを特定
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// テストディレクトリ
const testDirs = [
  '__tests__/unit/components',
  '__tests__/unit/context', 
  '__tests__/unit/hooks',
  '__tests__/unit/pages',
  '__tests__/unit/services',
  '__tests__/unit/store',
  '__tests__/unit/utils',
  '__tests__/unit/scripts',
  '__tests__/integration',
  '__tests__/e2e'
];

console.log('🔍 テストディレクトリごとに実行して問題を特定します...\n');

testDirs.forEach(dir => {
  const fullPath = path.resolve(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${dir} は存在しません`);
    return;
  }
  
  console.log(`\n📁 実行中: ${dir}`);
  console.log('─'.repeat(50));
  
  try {
    const result = execSync(
      `npm run test:custom -- ${dir} --listTests 2>&1 | grep -c "test.js"`,
      {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 5000
      }
    );
    
    const fileCount = parseInt(result.trim()) || 0;
    console.log(`✅ ${fileCount}個のテストファイルが見つかりました`);
    
    // 実際にテストを実行
    try {
      const testResult = execSync(
        `npm run test:custom -- ${dir} --testTimeout=3000 --json --outputFile=temp-result.json 2>&1`,
        {
          encoding: 'utf8',
          timeout: 20000
        }
      );
      
      // 結果を読み込む
      if (fs.existsSync('temp-result.json')) {
        const result = JSON.parse(fs.readFileSync('temp-result.json', 'utf8'));
        console.log(`✅ 完了: ${result.numTotalTests}テスト (成功: ${result.numPassedTests}, 失敗: ${result.numFailedTests})`);
        fs.unlinkSync('temp-result.json');
      }
    } catch (testError) {
      if (testError.code === 'ETIMEDOUT') {
        console.log('❌ タイムアウト！このディレクトリに問題があります');
      } else {
        console.log('❌ エラーが発生しました');
      }
    }
    
  } catch (error) {
    console.log(`❌ リスト取得エラー: ${error.message}`);
  }
});

console.log('\n完了！');