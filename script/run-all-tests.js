#!/usr/bin/env node

/**
 * 全テストを実行するスクリプト
 * タイムアウトを回避するため、バッチごとにテストを実行
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// テストディレクトリのパターン
const testBatches = [
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

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;
let totalPending = 0;

async function runTestBatch(batch) {
  return new Promise((resolve) => {
    console.log(`\n🚀 実行中: ${batch}`);
    
    const args = [
      'run', 'test:custom', '--',
      batch,
      '--maxWorkers=1',
      '--testTimeout=10000',
      '--forceExit',
      '--json',
      '--outputFile=temp-results.json'
    ];
    
    const child = spawn('npm', args, {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      // 結果ファイルを読み込む
      try {
        const results = JSON.parse(fs.readFileSync('temp-results.json', 'utf8'));
        totalTests += results.numTotalTests || 0;
        totalPassed += results.numPassedTests || 0;
        totalFailed += results.numFailedTests || 0;
        totalPending += results.numPendingTests || 0;
        
        console.log(`✅ ${batch}: ${results.numTotalTests} tests (${results.numPassedTests} passed, ${results.numFailedTests} failed)`);
      } catch (e) {
        console.log(`⚠️  ${batch}: 結果を読み込めませんでした`);
      }
      
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('🧪 全テストを実行します...\n');
  
  for (const batch of testBatches) {
    await runTestBatch(batch);
  }
  
  console.log('\n========================================');
  console.log('📊 総合結果');
  console.log('========================================');
  console.log(`総テスト数: ${totalTests}`);
  console.log(`成功: ${totalPassed}`);
  console.log(`失敗: ${totalFailed}`);
  console.log(`保留: ${totalPending}`);
  console.log('========================================');
  
  // 最終的なレポートを生成
  console.log('\n📄 最終レポートを生成中...');
  spawn('npm', ['run', 'test:custom', '--', '--listTests'], {
    stdio: 'inherit'
  });
}

runAllTests().catch(console.error);