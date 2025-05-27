#!/usr/bin/env node

/**
 * テスト実行前に環境変数をセットアップするスクリプト
 * .env.testファイルが存在しない場合は.env.test.exampleからコピー
 */

const fs = require('fs');
const path = require('path');

const envTestPath = path.join(__dirname, '..', '.env.test');
const envTestExamplePath = path.join(__dirname, '..', '.env.test.example');

// .env.testファイルが存在しない場合
if (!fs.existsSync(envTestPath)) {
  console.log('⚠️  .env.testファイルが見つかりません。');
  
  // .env.test.exampleが存在する場合はコピー
  if (fs.existsSync(envTestExamplePath)) {
    console.log('📋 .env.test.exampleから.env.testを作成します...');
    fs.copyFileSync(envTestExamplePath, envTestPath);
    console.log('✅ .env.testファイルを作成しました。');
    console.log('');
    console.log('⚠️  重要: .env.testファイルのYOUR_AWS_API_URL_HEREを実際のバックエンドURLに置き換えてください。');
    console.log('');
    process.exit(1);
  } else {
    console.error('❌ .env.test.exampleファイルも見つかりません。');
    process.exit(1);
  }
}

// 環境変数をチェック
require('dotenv').config({ path: envTestPath });

if (process.env.REACT_APP_MARKET_DATA_API_URL === 'YOUR_AWS_API_URL_HERE') {
  console.log('');
  console.log('⚠️  警告: REACT_APP_MARKET_DATA_API_URLがまだ設定されていません。');
  console.log('📝 .env.testファイルを編集して、実際のバックエンドURLを設定してください。');
  console.log('');
  console.log('モックAPIを使用してテストを実行します...');
  console.log('');
}

console.log('✅ テスト環境の準備が完了しました。');