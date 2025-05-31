/**
 * データソースの失敗をシミュレートするユーティリティ
 * 
 * @file __tests__/testUtils/failureSimulator.js
 * @updated 2025-05-20 - クエリパラメータマッチング改善に対応
 */

const nock = require('nock');

// 失敗させるデータソースを追跡する
let failingDataSources = [];

/**
 * 特定のデータソースの失敗をシミュレートする
 * @param {string} dataSourceName - 失敗させるデータソースの名前
 * （例：'yahoo-finance-api', 'yahoo-finance-scraping', 'exchangerate-api'）
 */
const simulateDataSourceFailure = async (dataSourceName) => {
  // 既に失敗するように設定されているか確認
  if (failingDataSources.includes(dataSourceName)) {
    return;
  }
  
  failingDataSources.push(dataSourceName);
  
  // 既存のnockをクリア
  nock.cleanAll();
  
  // 各データソースの失敗を設定
  if (dataSourceName === 'yahoo-finance-api') {
    nock('https://yh-finance.p.rapidapi.com')
      .persist()
      .get('/v8/finance/quote')
      .query(true)
      .reply(500, { error: 'Internal Server Error' });
  }
  
  if (dataSourceName === 'yahoo-finance-scraping') {
    nock('https://finance.yahoo.com')
      .persist()
      .get(/.*/)
      .reply(404, 'Not Found');
    
    nock('https://finance.yahoo.co.jp')
      .persist()
      .get(/.*/)
      .reply(404, 'Not Found');
  }
  
  if (dataSourceName === 'exchangerate-api') {
    nock('https://api.exchangerate.host')
      .persist()
      .get('/latest')
      .query(true)
      .reply(500, { error: 'Service Unavailable' });
  }
  
  if (dataSourceName === 'google-drive-api') {
    nock('https://www.googleapis.com')
      .persist()
      .get(/^\/drive\/v3\/files.*/)
      .reply(403, { error: 'Access Denied' });
    
    nock('https://www.googleapis.com')
      .persist()
      .post(/^\/drive\/v3\/files.*/)
      .reply(403, { error: 'Access Denied' });
  }
  
  // 特定のAPI呼び出しを失敗させつつ他のモックは正常に保つため
  // Fallback APIモックも再設定
  await setupFallbackMocks();
  
  console.log(`Data source failure simulated for: ${dataSourceName}`);
};

/**
 * 失敗するデータソース以外のフォールバックモックを設定
 */
const setupFallbackMocks = async () => {
  const debug = process.env.DEBUG === 'true';
  
  try {
    // マーケットデータAPIフォールバック - 米国株
    if (!failingDataSources.includes('market-data-us-stock') && !failingDataSources.includes('all-market-data')) {
      nock(/.*/)
        .persist()
        .get(/\/api\/market-data/)
        .query(params => params.type === 'us-stock')
        .reply(function(uri, requestBody) {
          if (debug) console.log(`Fallback market data US stock mock handling: ${uri}`);
          
          // URLからシンボルを抽出
          const url = new URL(`http://localhost${uri}`);
          const symbols = url.searchParams.get('symbols') || 'AAPL';
          const symbolsList = symbols.split(',');
          
          // テストデータ取得
          const TEST_DATA = require('./apiMocks').TEST_DATA;
          
          // レスポンスデータを構築
          const data = {};
          symbolsList.forEach(symbol => {
            data[symbol] = TEST_DATA.marketData.usStocks[symbol] || {
              ticker: symbol,
              price: 150 + Math.random() * 50,
              change: Math.random() * 10 - 5,
              changePercent: Math.random() * 5 - 2.5,
              currency: 'USD',
              lastUpdated: new Date().toISOString(),
              source: 'Fallback'
            };
          });
          
          return [
            200,
            {
              success: true,
              data,
              source: 'failover-fallback'
            }
          ];
        });
    }
    
    // マーケットデータAPIフォールバック - 日本株
    if (!failingDataSources.includes('market-data-jp-stock') && !failingDataSources.includes('all-market-data')) {
      nock(/.*/)
        .persist()
        .get(/\/api\/market-data/)
        .query(params => params.type === 'jp-stock')
        .reply(function(uri, requestBody) {
          if (debug) console.log(`Fallback market data JP stock mock handling: ${uri}`);
          
          // URLからシンボルを抽出
          const url = new URL(`http://localhost${uri}`);
          const symbols = url.searchParams.get('symbols') || '7203';
          const symbolsList = symbols.split(',');
          
          // テストデータ取得
          const TEST_DATA = require('./apiMocks').TEST_DATA;
          
          // レスポンスデータを構築
          const data = {};
          symbolsList.forEach(symbol => {
            data[symbol] = TEST_DATA.marketData.jpStocks[symbol] || {
              ticker: symbol,
              price: 2000 + Math.random() * 1000,
              change: Math.random() * 100 - 50,
              changePercent: Math.random() * 4 - 2,
              currency: 'JPY',
              lastUpdated: new Date().toISOString(),
              source: 'Fallback'
            };
          });
          
          return [
            200,
            {
              success: true,
              data,
              source: 'failover-fallback'
            }
          ];
        });
    }
    
    // マーケットデータAPIフォールバック - 為替レート
    if (!failingDataSources.includes('market-data-exchange-rate') && !failingDataSources.includes('all-market-data')) {
      nock(/.*/)
        .persist()
        .get(/\/api\/market-data/)
        .query(params => params.type === 'exchange-rate')
        .reply(function(uri, requestBody) {
          if (debug) console.log(`Fallback market data exchange rate mock handling: ${uri}`);
          
          // URLからシンボルを抽出
          const url = new URL(`http://localhost${uri}`);
          const symbols = url.searchParams.get('symbols') || 'USD-JPY';
          const symbolsList = symbols.split(',');
          
          // テストデータ取得
          const TEST_DATA = require('./apiMocks').TEST_DATA;
          
          // レスポンスデータを構築
          const data = {};
          symbolsList.forEach(symbol => {
            data[symbol] = TEST_DATA.marketData.exchangeRates[symbol] || {
              pair: symbol,
              rate: symbol.includes('JPY') ? 148.5 : 0.93,
              change: Math.random() * 2 - 1,
              changePercent: Math.random() * 1 - 0.5,
              base: symbol.split('-')[0],
              target: symbol.split('-')[1],
              lastUpdated: new Date().toISOString(),
              source: 'Fallback'
            };
          });
          
          return [
            200,
            {
              success: true,
              data,
              source: 'failover-fallback'
            }
          ];
        });
    }
    
    // ヘルスチェックエンドポイント
    nock(/.*/)
      .persist()
      .get(/\/health/)
      .reply(200, {
        success: true,
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
      
    return true;
  } catch (error) {
    console.error('Error setting up fallback mocks:', error);
    return false;
  }
};

/**
 * 失敗していないデータソースのモックを再設定する
 */
const resetNonFailingDataSources = async () => {
  const { mockExternalApis } = require('./apiMocks');
  
  // デフォルトのモックを設定
  await mockExternalApis();
  
  // 失敗するように設定されたデータソースを上書き（nockは後から設定したものが優先される）
  failingDataSources.forEach(dataSourceName => {
    if (dataSourceName === 'yahoo-finance-api') {
      nock('https://yh-finance.p.rapidapi.com')
        .persist()
        .get('/v8/finance/quote')
        .query(true)
        .reply(500, { error: 'Internal Server Error' });
    }
    
    // 他のデータソースも同様に設定
    if (dataSourceName === 'yahoo-finance-scraping') {
      nock('https://finance.yahoo.com')
        .persist()
        .get(/.*/)
        .reply(404, 'Not Found');
      
      nock('https://finance.yahoo.co.jp')
        .persist()
        .get(/.*/)
        .reply(404, 'Not Found');
    }
    
    if (dataSourceName === 'exchangerate-api') {
      nock('https://api.exchangerate.host')
        .persist()
        .get('/latest')
        .query(true)
        .reply(500, { error: 'Service Unavailable' });
    }
  });
  
  // フォールバックモックを設定
  await setupFallbackMocks();
};

/**
 * すべてのデータソースをリセットする
 */
const resetDataSources = async () => {
  failingDataSources = [];
  nock.cleanAll();
  
  // デフォルトのモックを再設定
  const { mockExternalApis, setupFallbackResponses } = require('./apiMocks');
  await mockExternalApis();
  await setupFallbackResponses();
  
  console.log('All data sources reset to normal operation');
};

module.exports = {
  simulateDataSourceFailure,
  resetDataSources
};
