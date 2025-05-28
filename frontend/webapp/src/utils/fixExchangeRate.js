/**
 * 為替レート修復ユーティリティ
 * ブラウザのコンソールから実行可能
 */

import { clearExchangeRateCache } from './exchangeRateDebounce';

// グローバルに公開する修復関数
const fixExchangeRate = function() {
  console.log('=== 為替レート修復を開始します ===');
  
  try {
    // 1. 為替レートキャッシュをクリア
    console.log('1. 為替レートキャッシュをクリア中...');
    clearExchangeRateCache();
    
    // 2. ポートフォリオデータから不正な為替レートを修正
    console.log('2. ポートフォリオデータを確認中...');
    const portfolioData = localStorage.getItem('portfolioData');
    
    if (portfolioData) {
      try {
        // 簡易的な復号化（実際の復号化ロジックに合わせて調整が必要）
        const data = JSON.parse(atob(portfolioData));
        
        if (data.exchangeRate) {
          if (!data.exchangeRate.rate || typeof data.exchangeRate.rate !== 'number') {
            console.log('不正な為替レートを検出しました。修正します。');
            data.exchangeRate = {
              rate: 150.0,
              lastUpdated: new Date().toISOString(),
              isDefault: true,
              source: 'fix-utility'
            };
            
            // データを再保存
            const encrypted = btoa(JSON.stringify(data));
            localStorage.setItem('portfolioData', encrypted);
            console.log('為替レートを修正しました。');
          } else {
            console.log('為替レートは正常です。');
          }
        } else {
          console.log('為替レートデータが存在しません。デフォルト値を設定します。');
          data.exchangeRate = {
            rate: 150.0,
            lastUpdated: new Date().toISOString(),
            isDefault: true,
            source: 'fix-utility'
          };
          
          const encrypted = btoa(JSON.stringify(data));
          localStorage.setItem('portfolioData', encrypted);
        }
      } catch (error) {
        console.error('ポートフォリオデータの解析に失敗しました:', error);
      }
    }
    
    console.log('3. 修復完了！ページをリロードしてください。');
    console.log('=== 修復処理が完了しました ===');
    
    return true;
  } catch (error) {
    console.error('修復中にエラーが発生しました:', error);
    return false;
  }
};

// グローバルに公開
window.fixExchangeRate = fixExchangeRate;

// 使用方法を表示
console.log('%c為替レート修復ツールが利用可能です', 'color: blue; font-weight: bold;');
console.log('修復するには、コンソールで以下を実行してください:');
console.log('%cfixExchangeRate()', 'color: green; font-family: monospace;');

export { fixExchangeRate };