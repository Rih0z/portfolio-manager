/**
 * 日本の投資信託と株式の価格取得テスト
 */

import { fetchStockData, fetchMultipleStocks } from './marketDataService';
import { getJapaneseStockName } from '../utils/japaneseStockNames';

// テスト対象の銘柄
const TEST_TICKERS = {
  mutualFunds: [
    '0331418A',  // eMAXIS Slim 米国株式(S&P500)
    '03311187',  // eMAXIS Slim 全世界株式(オール・カントリー)
    '9C31116A',  // ひふみプラス
    '89311199',  // SBI・V・S&P500インデックス・ファンド
  ],
  jpStocks: [
    '7203.T',    // トヨタ自動車
    '6758.T',    // ソニーグループ
    '9432.T',    // NTT
    '7974.T',    // 任天堂
  ]
};

// 価格取得テスト関数
export const testJapaneseTickers = async () => {
  console.log('=== 日本の投資信託・株式価格取得テスト開始 ===\n');
  
  // 個別取得テスト
  console.log('【個別取得テスト】');
  
  // 投資信託テスト
  console.log('\n投資信託:');
  for (const ticker of TEST_TICKERS.mutualFunds) {
    const name = getJapaneseStockName(ticker);
    console.log(`\n- ${ticker} (${name})`);
    
    try {
      const result = await fetchStockData(ticker);
      if (result.success && result.data?.[ticker]) {
        const data = result.data[ticker];
        console.log(`  ✅ 成功: ¥${data.price?.toLocaleString()} (${data.source})`);
      } else {
        console.log(`  ❌ 失敗: ${result.message || 'データなし'}`);
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    }
  }
  
  // 日本株テスト
  console.log('\n日本株:');
  for (const ticker of TEST_TICKERS.jpStocks) {
    const name = getJapaneseStockName(ticker.replace('.T', ''));
    console.log(`\n- ${ticker} (${name})`);
    
    try {
      const result = await fetchStockData(ticker);
      if (result.success && result.data?.[ticker]) {
        const data = result.data[ticker];
        console.log(`  ✅ 成功: ¥${data.price?.toLocaleString()} (${data.source})`);
      } else {
        console.log(`  ❌ 失敗: ${result.message || 'データなし'}`);
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    }
  }
  
  // 一括取得テスト
  console.log('\n\n【一括取得テスト】');
  const allTickers = [...TEST_TICKERS.mutualFunds, ...TEST_TICKERS.jpStocks];
  
  try {
    const result = await fetchMultipleStocks(allTickers);
    console.log(`\n取得結果: ${Object.keys(result.data || {}).length}/${allTickers.length} 件成功`);
    
    if (result.sourcesSummary) {
      console.log(`データソース: ${result.sourcesSummary}`);
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\nエラー:');
      result.errors.forEach(error => {
        console.log(`  - ${error.ticker}: ${error.message}`);
      });
    }
    
    // 各銘柄の結果を表示
    console.log('\n詳細結果:');
    for (const ticker of allTickers) {
      const name = getJapaneseStockName(ticker.replace('.T', ''));
      const data = result.data?.[ticker];
      
      if (data) {
        console.log(`✅ ${ticker} (${name}): ¥${data.price?.toLocaleString()}`);
      } else {
        console.log(`❌ ${ticker} (${name}): データなし`);
      }
    }
  } catch (error) {
    console.log(`❌ 一括取得エラー: ${error.message}`);
  }
  
  console.log('\n=== テスト完了 ===');
};

// デバッグ用：グローバルに関数を公開
if (typeof window !== 'undefined') {
  window.testJapaneseTickers = testJapaneseTickers;
  console.log('テスト関数が利用可能です。コンソールで testJapaneseTickers() を実行してください。');
}

export default testJapaneseTickers;