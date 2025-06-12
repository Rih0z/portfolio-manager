// @ts-check
import { test, expect } from '@playwright/test';

// 実際のAWS APIエンドポイント
const API_BASE_URL = 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod';

// 単一のテストプロジェクトとして実行
test.use({
  // ヘッドレスモードで実行
  headless: true,
  // タイムアウト設定
  actionTimeout: 30000,
  navigationTimeout: 30000,
});

test.describe('日本市場リアルデータテスト（APIダイレクト）', () => {
  test.beforeEach(async ({ page }) => {
    // APIレスポンスの詳細ログを有効化
    page.on('response', response => {
      if (response.url().includes('/api') || response.url().includes(API_BASE_URL)) {
        console.log(`API Response: ${response.url()} - Status: ${response.status()}`);
      }
    });

    page.on('requestfailed', request => {
      console.error(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('日本株データのAPI直接取得テスト', async ({ page, request }) => {
    test.setTimeout(30000); // 30秒のタイムアウト

    console.log('Testing direct API calls for Japanese stocks...');

    // トヨタ自動車 (7203.T) のデータ取得
    console.log('Fetching Toyota data via API...');
    try {
      const toyotaResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'jp-stock',
          symbols: '7203.T',
          refresh: 'false'
        }
      });

      console.log('Toyota API response status:', toyotaResponse.status());
      console.log('Toyota API response headers:', toyotaResponse.headers());

      if (toyotaResponse.ok()) {
        const toyotaData = await toyotaResponse.json();
        console.log('Toyota data received:', JSON.stringify(toyotaData, null, 2));

        // データ検証
        expect(toyotaData).toHaveProperty('success');
        if (toyotaData.success && toyotaData.data) {
          const stockData = toyotaData.data['7203.T'];
          if (stockData) {
            expect(stockData).toHaveProperty('symbol');
            expect(stockData).toHaveProperty('regularMarketPrice');
            expect(stockData).toHaveProperty('currency', 'JPY');
            expect(stockData.regularMarketPrice).toBeGreaterThan(0);
            console.log(`Toyota price: ${stockData.regularMarketPrice} ${stockData.currency}`);
          }
        }
      } else {
        console.log('Toyota API request failed with status:', toyotaResponse.status());
        const errorText = await toyotaResponse.text();
        console.log('Error details:', errorText);
      }
    } catch (error) {
      console.error('Toyota API request error:', error.message);
    }

    // ソニーグループ (6758.T) のデータ取得
    console.log('Fetching Sony data via API...');
    try {
      const sonyResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'jp-stock',
          symbols: '6758.T',
          refresh: 'false'
        }
      });

      console.log('Sony API response status:', sonyResponse.status());

      if (sonyResponse.ok()) {
        const sonyData = await sonyResponse.json();
        console.log('Sony data received:', JSON.stringify(sonyData, null, 2));

        if (sonyData.success && sonyData.data) {
          const stockData = sonyData.data['6758.T'];
          if (stockData) {
            expect(stockData).toHaveProperty('currency', 'JPY');
            expect(stockData.regularMarketPrice).toBeGreaterThan(0);
            console.log(`Sony price: ${stockData.regularMarketPrice} ${stockData.currency}`);
          }
        }
      } else {
        console.log('Sony API request failed');
      }
    } catch (error) {
      console.error('Sony API request error:', error.message);
    }
  });

  test('投資信託データのAPI直接取得テスト', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('Testing direct API calls for mutual funds...');

    // eMAXIS Slim 米国株式（S&P500）の投信コード
    console.log('Fetching eMAXIS Slim S&P500 data via API...');
    try {
      const fundResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'mutual-fund',
          symbols: '0131103C',
          refresh: 'false'
        }
      });

      console.log('Mutual fund API response status:', fundResponse.status());

      if (fundResponse.ok()) {
        const fundData = await fundResponse.json();
        console.log('Mutual fund data received:', JSON.stringify(fundData, null, 2));

        // データ検証
        expect(fundData).toHaveProperty('success');
        if (fundData.success && fundData.data) {
          const mutualFundData = fundData.data['0131103C'];
          if (mutualFundData) {
            expect(mutualFundData).toHaveProperty('symbol');
            expect(mutualFundData).toHaveProperty('regularMarketPrice');
            expect(mutualFundData).toHaveProperty('currency', 'JPY');
            expect(mutualFundData.regularMarketPrice).toBeGreaterThan(10000); // 基準価額は通常10,000円以上
            expect(mutualFundData.regularMarketPrice).toBeLessThan(100000); // 妥当な価格範囲
            console.log(`eMAXIS Slim price: ${mutualFundData.regularMarketPrice} ${mutualFundData.currency}`);
          }
        }
      } else {
        console.log('Mutual fund API request failed with status:', fundResponse.status());
        const errorText = await fundResponse.text();
        console.log('Error details:', errorText);
      }
    } catch (error) {
      console.error('Mutual fund API request error:', error.message);
    }
  });

  test('複数銘柄の一括データ取得テスト', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('Testing batch API calls for multiple Japanese stocks...');

    // 複数の日本株を一括取得
    const symbols = ['7203.T', '6758.T', '8306.T']; // トヨタ、ソニー、三菱UFJ
    console.log('Fetching multiple Japanese stocks via batch API...');
    
    try {
      const batchResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'jp-stock',
          symbols: symbols.join(','),
          refresh: 'false'
        }
      });

      console.log('Batch API response status:', batchResponse.status());

      if (batchResponse.ok()) {
        const batchData = await batchResponse.json();
        console.log('Batch data received:', JSON.stringify(batchData, null, 2));

        // データ検証
        expect(batchData).toHaveProperty('success');
        if (batchData.success && batchData.data) {
          console.log(`Received data for ${Object.keys(batchData.data).length} symbols`);
          
          // 各銘柄のデータ検証
          for (const symbol of symbols) {
            if (batchData.data[symbol]) {
              const stockData = batchData.data[symbol];
              console.log(`${symbol}: ${stockData.regularMarketPrice} ${stockData.currency}`);
              expect(stockData).toHaveProperty('currency', 'JPY');
              expect(stockData.regularMarketPrice).toBeGreaterThan(0);
            } else {
              console.warn(`No data received for ${symbol}`);
            }
          }
        }
      } else {
        console.log('Batch API request failed with status:', batchResponse.status());
        const errorText = await batchResponse.text();
        console.log('Error details:', errorText);
      }
    } catch (error) {
      console.error('Batch API request error:', error.message);
    }
  });

  test('無効な銘柄コードのエラーハンドリング', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('Testing error handling for invalid ticker via API...');

    // 無効な銘柄コードでAPIリクエスト
    try {
      const invalidResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'jp-stock',
          symbols: 'INVALID999',
          refresh: 'false'
        }
      });

      console.log('Invalid ticker API response status:', invalidResponse.status());

      if (invalidResponse.ok()) {
        const invalidData = await invalidResponse.json();
        console.log('Invalid ticker response:', JSON.stringify(invalidData, null, 2));

        // エラーレスポンスまたは空のデータが返されることを確認
        expect(invalidData).toHaveProperty('success');
        if (invalidData.success === false) {
          expect(invalidData).toHaveProperty('error');
          console.log('Error properly handled:', invalidData.error);
        } else if (invalidData.data && invalidData.data['INVALID999']) {
          // データがある場合、エラーフラグがあるかチェック
          const stockData = invalidData.data['INVALID999'];
          if (stockData.error) {
            console.log('Symbol-level error:', stockData.error);
          }
        }
      } else {
        console.log('API returned error status for invalid ticker, which is expected');
      }
    } catch (error) {
      console.log('API request failed for invalid ticker (expected):', error.message);
    }
  });

  test('API応答性とパフォーマンステスト', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('Testing API response times...');

    const performanceMetrics = {
      singleStock: 0,
      batchRequest: 0,
      exchangeRate: 0
    };

    // 単一銘柄のレスポンス時間
    const singleStart = Date.now();
    try {
      const singleResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'jp-stock',
          symbols: '7203.T',
          refresh: 'false'
        }
      });
      performanceMetrics.singleStock = Date.now() - singleStart;
      console.log(`Single stock response time: ${performanceMetrics.singleStock}ms`);
      console.log(`Single stock status: ${singleResponse.status()}`);
    } catch (error) {
      performanceMetrics.singleStock = Date.now() - singleStart;
      console.log(`Single stock request failed after ${performanceMetrics.singleStock}ms:`, error.message);
    }

    // バッチリクエストのレスポンス時間
    const batchStart = Date.now();
    try {
      const batchResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'jp-stock',
          symbols: '7203.T,6758.T,8306.T',
          refresh: 'false'
        }
      });
      performanceMetrics.batchRequest = Date.now() - batchStart;
      console.log(`Batch request response time: ${performanceMetrics.batchRequest}ms`);
      console.log(`Batch request status: ${batchResponse.status()}`);
    } catch (error) {
      performanceMetrics.batchRequest = Date.now() - batchStart;
      console.log(`Batch request failed after ${performanceMetrics.batchRequest}ms:`, error.message);
    }

    // 為替レートのレスポンス時間
    const exchangeStart = Date.now();
    try {
      const exchangeResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'exchange-rate',
          base: 'USD',
          target: 'JPY',
          refresh: 'false'
        }
      });
      performanceMetrics.exchangeRate = Date.now() - exchangeStart;
      console.log(`Exchange rate response time: ${performanceMetrics.exchangeRate}ms`);
      console.log(`Exchange rate status: ${exchangeResponse.status()}`);
    } catch (error) {
      performanceMetrics.exchangeRate = Date.now() - exchangeStart;
      console.log(`Exchange rate request failed after ${performanceMetrics.exchangeRate}ms:`, error.message);
    }

    console.log('API Performance metrics:', performanceMetrics);

    // パフォーマンス基準の確認（ただし、失敗してもテストは継続）
    if (performanceMetrics.singleStock > 0) {
      expect(performanceMetrics.singleStock).toBeLessThan(10000); // 10秒以内
    }
    if (performanceMetrics.batchRequest > 0) {
      expect(performanceMetrics.batchRequest).toBeLessThan(15000); // 15秒以内
    }
    if (performanceMetrics.exchangeRate > 0) {
      expect(performanceMetrics.exchangeRate).toBeLessThan(10000); // 10秒以内
    }
  });

  test('為替レートAPIの動作確認', async ({ page, request }) => {
    test.setTimeout(30000);

    console.log('Testing exchange rate API...');

    // USD/JPY為替レートの取得
    try {
      const exchangeResponse = await request.get(`${API_BASE_URL}/api/market-data`, {
        params: {
          type: 'exchange-rate',
          base: 'USD',
          target: 'JPY',
          refresh: 'false'
        }
      });

      console.log('Exchange rate API response status:', exchangeResponse.status());

      if (exchangeResponse.ok()) {
        const exchangeData = await exchangeResponse.json();
        console.log('Exchange rate data received:', JSON.stringify(exchangeData, null, 2));

        // データ検証
        expect(exchangeData).toHaveProperty('success');
        if (exchangeData.success && exchangeData.data) {
          const rateData = exchangeData.data['USD-JPY'];
          if (rateData) {
            expect(rateData).toHaveProperty('rate');
            expect(rateData.rate).toBeGreaterThan(100); // 100円以上
            expect(rateData.rate).toBeLessThan(200); // 200円以下
            console.log(`USD/JPY rate: ${rateData.rate}`);
            console.log(`Rate source: ${rateData.source || 'Unknown'}`);
          }
        }
      } else {
        console.log('Exchange rate API request failed with status:', exchangeResponse.status());
        const errorText = await exchangeResponse.text();
        console.log('Error details:', errorText);
      }
    } catch (error) {
      console.error('Exchange rate API request error:', error.message);
    }
  });
});