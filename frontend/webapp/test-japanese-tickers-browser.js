/**
 * ブラウザコンソールで実行するための日本投資信託・株式価格取得テスト
 * 
 * 使い方:
 * 1. https://portfolio-wise.com/ にアクセス
 * 2. F12キーを押して開発者ツールを開く
 * 3. Consoleタブを選択
 * 4. このファイルの内容をコピーしてコンソールに貼り付け
 * 5. Enterキーを押して実行
 */

// すでに関数が定義されているか確認
if (typeof testJapaneseTickers === 'function') {
  console.log('テスト関数が利用可能です。実行中...');
  testJapaneseTickers();
} else {
  console.log('テスト関数が見つかりません。手動でテストを実行します...');
  
  // 手動テスト実行
  (async () => {
    const testTickers = {
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

    console.log('=== 日本の投資信託・株式価格取得テスト（手動実行） ===\n');
    
    // APIエンドポイントの確認
    const apiUrl = process.env.REACT_APP_API_BASE_URL || '/api-proxy';
    console.log(`API URL: ${apiUrl}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // 個別テスト
    console.log('\n【個別取得テスト】');
    
    for (const ticker of [...testTickers.mutualFunds, ...testTickers.jpStocks]) {
      console.log(`\nテスト中: ${ticker}`);
      
      try {
        const response = await fetch(`${apiUrl}/api/market-data?type=${ticker.endsWith('.T') ? 'jp-stock' : 'mutual-fund'}&symbols=${ticker}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success && data.data && data.data[ticker]) {
          console.log(`✅ 成功: ¥${data.data[ticker].price?.toLocaleString()} (${data.data[ticker].source || 'Unknown'})`);
        } else {
          console.log(`❌ 失敗:`, data.message || 'データなし');
        }
      } catch (error) {
        console.log(`❌ エラー: ${error.message}`);
      }
    }
    
    console.log('\n=== テスト完了 ===');
  })();
}