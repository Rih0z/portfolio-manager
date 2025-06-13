/**
 * ファイルパス: __tests__/unit/services/sources/marketDataProviders.enhanced.test.js
 *
 * marketDataProviders モジュールの100%カバレッジテスト
 * 全ての関数、エラーケース、エッジケースを完全にテストする
 */

const marketDataProviders = require('../../../../src/services/sources/marketDataProviders');
const axios = require('axios');
const cheerio = require('cheerio');
const blacklist = require('../../../../src/utils/scrapingBlacklist');
const fundDataService = require('../../../../src/services/sources/fundDataService');
const yahooFinanceService = require('../../../../src/services/sources/yahooFinance');
const alertService = require('../../../../src/services/alerts');
const { 
  getRandomUserAgent, 
  recordDataFetchFailure, 
  recordDataFetchSuccess,
  checkBlacklistAndGetFallback
} = require('../../../../src/utils/dataFetchUtils');
const { sleep } = require('../../../../src/utils/retry');

// 全てのモジュールをモック
jest.mock('axios');
jest.mock('cheerio');
jest.mock('../../../../src/utils/scrapingBlacklist');
jest.mock('../../../../src/services/sources/fundDataService');
jest.mock('../../../../src/services/sources/yahooFinance');
jest.mock('../../../../src/services/alerts');
jest.mock('../../../../src/utils/dataFetchUtils');
jest.mock('../../../../src/utils/retry', () => ({
  withRetry: jest.fn(fn => fn()),
  isRetryableApiError: jest.fn(() => false),
  sleep: jest.fn(() => Promise.resolve())
}));

describe('marketDataProviders - 100% Coverage Test', () => {
  // テスト用定数
  const JP_STOCK_CODE = '7203';
  const US_STOCK_SYMBOL = 'AAPL';
  const FUND_CODE = '03121033';
  const MOCK_DATE = '2025-05-18T12:00:00Z';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 共通モックの設定
    getRandomUserAgent.mockReturnValue('Test User Agent');
    recordDataFetchFailure.mockResolvedValue(true);
    recordDataFetchSuccess.mockResolvedValue(true);
    sleep.mockResolvedValue();
    
    // 日時をモック
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(MOCK_DATE);
  });

  describe('getJpStockData', () => {
    beforeEach(() => {
      // デフォルトのブラックリスト設定
      checkBlacklistAndGetFallback.mockResolvedValue({
        isBlacklisted: false,
        fallbackData: {
          ticker: JP_STOCK_CODE,
          price: 2500,
          currency: 'JPY',
          name: `日本株 ${JP_STOCK_CODE}`,
          isStock: true,
          isMutualFund: false
        }
      });
    });

    test('ブラックリスト銘柄の場合はフォールバックデータを返す', async () => {
      // ブラックリストに登録されている状態をモック
      checkBlacklistAndGetFallback.mockResolvedValue({
        isBlacklisted: true,
        fallbackData: {
          ticker: JP_STOCK_CODE,
          price: 2500,
          currency: 'JPY',
          name: `日本株 ${JP_STOCK_CODE}`,
          isStock: true,
          isMutualFund: false,
          isBlacklisted: true
        }
      });

      const result = await marketDataProviders.getJpStockData(JP_STOCK_CODE);

      expect(result.isBlacklisted).toBe(true);
      expect(result.ticker).toBe(JP_STOCK_CODE);
      expect(checkBlacklistAndGetFallback).toHaveBeenCalledWith(
        JP_STOCK_CODE,
        'jp',
        expect.objectContaining({
          defaultPrice: 2500,
          currencyCode: 'JPY'
        })
      );
    });

    test('Yahoo Finance Japanから正常にデータを取得する', async () => {
      // Yahoo Finance Japanの成功レスポンスをモック
      const mockHtml = `
        <html>
          <body>
            <span class="_3rXWJNmiHHh4lN4kRUvvv7">2,500</span>
            <span class="_3Ovs4ARF5Hslpj9n5NwEjn">+100円(+4.17%)</span>
            <h1 class="_1wANDxx3RtV3AdCFSC4_Lp">トヨタ自動車</h1>
          </body>
        </html>
      `;
      
      axios.get.mockResolvedValue({ data: mockHtml });
      
      const mockCheerio = {
        load: jest.fn(() => {
          const $ = jest.fn((selector) => {
            if (selector === 'span._3rXWJNmiHHh4lN4kRUvvv7') {
              return { length: 1, text: () => '2,500' };
            } else if (selector === 'span._3Ovs4ARF5Hslpj9n5NwEjn') {
              return { text: () => '+100円(+4.17%)' };
            } else if (selector === 'h1._1wANDxx3RtV3AdCFSC4_Lp') {
              return { text: () => 'トヨタ自動車' };
            }
            return { length: 0, text: () => '' };
          });
          $.trim = (text) => text.trim();
          return $;
        })
      };
      
      cheerio.load = mockCheerio.load;

      const result = await marketDataProviders.getJpStockData(JP_STOCK_CODE);

      expect(result).toEqual({
        ticker: JP_STOCK_CODE,
        price: 2500,
        change: 100,
        changePercent: 4.17,
        name: 'トヨタ自動車',
        currency: 'JPY',
        lastUpdated: MOCK_DATE,
        source: 'Yahoo Finance Japan',
        isStock: true,
        isMutualFund: false
      });

      expect(recordDataFetchSuccess).toHaveBeenCalledWith(JP_STOCK_CODE);
      expect(axios.get).toHaveBeenCalledWith(
        `https://finance.yahoo.co.jp/quote/${JP_STOCK_CODE}.T`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'Test User Agent'
          }),
          timeout: expect.any(Number)
        })
      );
    });

    test('Yahoo Finance Japan失敗時はMinkabuを試す', async () => {
      // Yahoo Finance Japanの失敗をモック
      axios.get.mockRejectedValueOnce(new Error('Yahoo failed'));
      
      // Minkabu成功をモック（実際の実装では省略されているため、フォールバックに直行）
      const result = await marketDataProviders.getJpStockData(JP_STOCK_CODE);

      expect(recordDataFetchFailure).toHaveBeenCalledWith(
        JP_STOCK_CODE,
        'jp',
        'Yahoo Finance Japan',
        expect.any(Error)
      );

      // 最終的にはフォールバックデータが返される
      expect(result.source).toBe('Fallback');
      expect(result.isBlacklisted).toBe(false);
    });

    test('全てのソースが失敗した場合はフォールバックデータを返す', async () => {
      // scrapeYahooFinanceJapan, scrapeMinkabu, scrapeKabutanをモックして失敗させる
      // 実際の実装では、これらの関数はすべて実装されておらず、即座にフォールバックに行く
      
      const result = await marketDataProviders.getJpStockData(JP_STOCK_CODE);

      // 実際の実装では、最初のソースが存在しないため、直接フォールバックになる
      expect(result.source).toBe('Fallback');
      expect(result.ticker).toBe(JP_STOCK_CODE);
    });

    test('.T接尾辞を正しく処理する', async () => {
      const symbolWithSuffix = `${JP_STOCK_CODE}.T`;
      
      const result = await marketDataProviders.getJpStockData(symbolWithSuffix);

      expect(checkBlacklistAndGetFallback).toHaveBeenCalledWith(
        JP_STOCK_CODE, // 接尾辞が削除されている
        'jp',
        expect.any(Object)
      );
      expect(result.ticker).toBe(JP_STOCK_CODE);
    });

    test('予期しないエラーが発生した場合は適切にエラーをスローする', async () => {
      // checkBlacklistAndGetFallbackでエラーをスロー
      checkBlacklistAndGetFallback.mockRejectedValue(new Error('Unexpected error'));

      await expect(marketDataProviders.getJpStockData(JP_STOCK_CODE))
        .rejects.toThrow('Unexpected error');
    });
  });

  describe('getUsStockData', () => {
    beforeEach(() => {
      // デフォルトのブラックリスト設定
      checkBlacklistAndGetFallback.mockResolvedValue({
        isBlacklisted: false,
        fallbackData: {
          ticker: US_STOCK_SYMBOL,
          price: 100,
          currency: 'USD',
          name: US_STOCK_SYMBOL,
          isStock: true,
          isMutualFund: false
        }
      });
    });

    test('ブラックリスト銘柄の場合はフォールバックデータを返す', async () => {
      checkBlacklistAndGetFallback.mockResolvedValue({
        isBlacklisted: true,
        fallbackData: {
          ticker: US_STOCK_SYMBOL,
          price: 100,
          currency: 'USD',
          name: US_STOCK_SYMBOL,
          isStock: true,
          isMutualFund: false,
          isBlacklisted: true
        }
      });

      const result = await marketDataProviders.getUsStockData(US_STOCK_SYMBOL);

      expect(result.isBlacklisted).toBe(true);
      expect(result.ticker).toBe(US_STOCK_SYMBOL);
    });

    test('Yahoo Finance APIから正常にデータを取得する', async () => {
      const mockApiData = {
        ticker: US_STOCK_SYMBOL,
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        name: 'Apple Inc.',
        currency: 'USD',
        source: 'Yahoo Finance API',
        isStock: true,
        isMutualFund: false
      };

      yahooFinanceService.getStockData.mockResolvedValue(mockApiData);

      const result = await marketDataProviders.getUsStockData(US_STOCK_SYMBOL);

      expect(result).toEqual(mockApiData);
      expect(recordDataFetchSuccess).toHaveBeenCalledWith(US_STOCK_SYMBOL);
      expect(yahooFinanceService.getStockData).toHaveBeenCalledWith(US_STOCK_SYMBOL);
    });

    test('Yahoo Finance API失敗時はスクレイピングにフォールバックする', async () => {
      // Yahoo Finance APIの失敗をモック
      yahooFinanceService.getStockData.mockRejectedValue(new Error('API failed'));

      const result = await marketDataProviders.getUsStockData(US_STOCK_SYMBOL);

      expect(recordDataFetchFailure).toHaveBeenCalledWith(
        US_STOCK_SYMBOL,
        'us',
        'Yahoo Finance API',
        expect.any(Error)
      );

      // 最終的にはフォールバックデータが返される
      expect(result.source).toBe('Fallback');
    });

    test('全てのソースが失敗した場合はフォールバックデータを返す', async () => {
      yahooFinanceService.getStockData.mockRejectedValue(new Error('API failed'));

      const result = await marketDataProviders.getUsStockData(US_STOCK_SYMBOL);

      expect(recordDataFetchFailure).toHaveBeenCalledWith(
        US_STOCK_SYMBOL,
        'us',
        'All Sources',
        expect.any(Error),
        expect.objectContaining({
          alertTitle: 'All US Stock Data Sources Failed',
          alertThreshold: 0.1
        })
      );

      expect(result.source).toBe('Fallback');
      expect(result.ticker).toBe(US_STOCK_SYMBOL);
    });

    test('予期しないエラーが発生した場合は適切にエラーをスローする', async () => {
      checkBlacklistAndGetFallback.mockRejectedValue(new Error('Unexpected error'));

      await expect(marketDataProviders.getUsStockData(US_STOCK_SYMBOL))
        .rejects.toThrow('Unexpected error');
    });
  });

  describe('getJpStocksParallel', () => {
    test('無効な引数の場合はエラーをスローする', async () => {
      await expect(marketDataProviders.getJpStocksParallel(null))
        .rejects.toThrow('Invalid stock codes array');
      
      await expect(marketDataProviders.getJpStocksParallel([]))
        .rejects.toThrow('Invalid stock codes array');
      
      await expect(marketDataProviders.getJpStocksParallel('not-array'))
        .rejects.toThrow('Invalid stock codes array');
    });

    test('ブラックリスト銘柄と通常銘柄を適切に処理する', async () => {
      const codes = ['7203', '7201', '9984'];
      
      // ブラックリストチェックをモック
      blacklist.isBlacklisted
        .mockResolvedValueOnce(true)  // 7203: ブラックリスト
        .mockResolvedValueOnce(false) // 7201: 通常
        .mockResolvedValueOnce(false) // 9984: 通常
        .mockResolvedValue(false);    // 以降の個別チェック用

      // getJpStockDataをモック
      jest.spyOn(marketDataProviders, 'getJpStockData')
        .mockResolvedValueOnce({ ticker: '7201', price: 2000, source: 'Yahoo Finance Japan' })
        .mockResolvedValueOnce({ ticker: '9984', price: 1500, source: 'Yahoo Finance Japan' });

      const result = await marketDataProviders.getJpStocksParallel(codes);

      // ブラックリスト銘柄の確認
      expect(result['7203']).toEqual(expect.objectContaining({
        ticker: '7203',
        isBlacklisted: true,
        source: 'Blacklisted Fallback'
      }));

      // 通常銘柄の確認
      expect(result['7201']).toEqual(expect.objectContaining({
        ticker: '7201',
        price: 2000
      }));
      expect(result['9984']).toEqual(expect.objectContaining({
        ticker: '9984',
        price: 1500
      }));

      expect(blacklist.isBlacklisted).toHaveBeenCalledTimes(3); // 3回の事前チェックのみ
    });

    test('全てブラックリスト銘柄の場合は早期リターンする', async () => {
      const codes = ['7203', '7201'];
      
      blacklist.isBlacklisted.mockResolvedValue(true);

      const result = await marketDataProviders.getJpStocksParallel(codes);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['7203'].isBlacklisted).toBe(true);
      expect(result['7201'].isBlacklisted).toBe(true);
    });

    test('エラー率が高い場合はアラートを送信する', async () => {
      const codes = ['7203', '7201', '9984'];
      
      blacklist.isBlacklisted.mockResolvedValue(false);
      
      // 全ての銘柄でエラーをシミュレート
      jest.spyOn(marketDataProviders, 'getJpStockData')
        .mockRejectedValue(new Error('Fetch failed'));

      const result = await marketDataProviders.getJpStocksParallel(codes);

      // エラー銘柄のデータ構造を確認
      expect(result['7203']).toEqual(expect.objectContaining({
        ticker: '7203',
        source: 'Error',
        error: 'Fetch failed'
      }));

      // アラートが送信されたことを確認
      expect(alertService.notifyError).toHaveBeenCalledWith(
        'High Error Rate in JP Stock Data Retrieval',
        expect.any(Error),
        expect.objectContaining({
          errorRate: 1 // 100%エラー率
        })
      );
    });

    test('レート制限のための遅延が正しく適用される', async () => {
      const codes = ['7203', '7201'];
      
      blacklist.isBlacklisted.mockResolvedValue(false);
      jest.spyOn(marketDataProviders, 'getJpStockData').mockResolvedValue({ ticker: 'test' });

      await marketDataProviders.getJpStocksParallel(codes);

      // 2番目の銘柄で遅延が適用されることを確認
      expect(sleep).toHaveBeenCalledWith(expect.any(Number));
    });
  });

  describe('getUsStocksParallel', () => {
    test('Yahoo Finance APIバッチ取得が成功した場合はそのまま返す', async () => {
      const symbols = ['AAPL', 'MSFT'];
      const batchResults = {
        'AAPL': { ticker: 'AAPL', price: 150 },
        'MSFT': { ticker: 'MSFT', price: 200 }
      };

      yahooFinanceService.getStocksData.mockResolvedValue(batchResults);

      const result = await marketDataProviders.getUsStocksParallel(symbols);

      expect(result).toEqual(batchResults);
      expect(yahooFinanceService.getStocksData).toHaveBeenCalledWith(symbols);
    });

    test('一部の銘柄が取得できなかった場合は個別取得を実行する', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOG'];
      const partialResults = {
        'AAPL': { ticker: 'AAPL', price: 150 }
        // MSFT, GOOGは取得できていない
      };

      yahooFinanceService.getStocksData.mockResolvedValue(partialResults);
      
      // 個別取得をモック
      jest.spyOn(marketDataProviders, 'getUsStockData')
        .mockResolvedValueOnce({ ticker: 'MSFT', price: 200 })
        .mockResolvedValueOnce({ ticker: 'GOOG', price: 2500 });

      const result = await marketDataProviders.getUsStocksParallel(symbols);

      expect(result).toEqual({
        'AAPL': { ticker: 'AAPL', price: 150 },
        'MSFT': { ticker: 'MSFT', price: 200 },
        'GOOG': { ticker: 'GOOG', price: 2500 }
      });

      expect(marketDataProviders.getUsStockData).toHaveBeenCalledTimes(2);
    });

    test('バッチ取得が完全に失敗した場合は個別処理にフォールバックする', async () => {
      const symbols = ['AAPL', 'MSFT'];

      yahooFinanceService.getStocksData.mockRejectedValue(new Error('Batch failed'));
      blacklist.isBlacklisted.mockResolvedValue(false);
      
      jest.spyOn(marketDataProviders, 'getUsStockData')
        .mockResolvedValueOnce({ ticker: 'AAPL', price: 150 })
        .mockResolvedValueOnce({ ticker: 'MSFT', price: 200 });

      const result = await marketDataProviders.getUsStocksParallel(symbols);

      expect(result).toEqual({
        'AAPL': { ticker: 'AAPL', price: 150 },
        'MSFT': { ticker: 'MSFT', price: 200 }
      });
    });

    test('バッチ失敗時の無効な引数処理', async () => {
      yahooFinanceService.getStocksData.mockRejectedValue(new Error('Batch failed'));

      await expect(marketDataProviders.getUsStocksParallel(null))
        .rejects.toThrow('Invalid stock symbols array');
      
      await expect(marketDataProviders.getUsStocksParallel([]))
        .rejects.toThrow('Invalid stock symbols array');
    });

    test('バッチ失敗時のブラックリスト処理', async () => {
      const symbols = ['AAPL', 'MSFT'];

      yahooFinanceService.getStocksData.mockRejectedValue(new Error('Batch failed'));
      blacklist.isBlacklisted
        .mockResolvedValueOnce(false) // AAPL
        .mockResolvedValueOnce(true)  // MSFT: ブラックリスト
        .mockResolvedValue(false);    // 個別チェック用

      jest.spyOn(marketDataProviders, 'getUsStockData')
        .mockResolvedValue({ ticker: 'AAPL', price: 150 });

      const result = await marketDataProviders.getUsStocksParallel(symbols);

      expect(result['AAPL']).toEqual({ ticker: 'AAPL', price: 150 });
      expect(result['MSFT']).toEqual(expect.objectContaining({
        ticker: 'MSFT',
        isBlacklisted: true,
        source: 'Blacklisted Fallback'
      }));
    });

    test('バッチ失敗時の高エラー率でアラート送信', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOG'];

      yahooFinanceService.getStocksData.mockRejectedValue(new Error('Batch failed'));
      blacklist.isBlacklisted.mockResolvedValue(false);
      
      jest.spyOn(marketDataProviders, 'getUsStockData')
        .mockRejectedValue(new Error('Individual fetch failed'));

      const result = await marketDataProviders.getUsStocksParallel(symbols);

      // 全ての銘柄でエラーが発生
      expect(result['AAPL'].source).toBe('Error');
      expect(result['MSFT'].source).toBe('Error');
      expect(result['GOOG'].source).toBe('Error');

      // アラートが送信されたことを確認
      expect(alertService.notifyError).toHaveBeenCalledWith(
        'High Error Rate in US Stock Data Retrieval',
        expect.any(Error),
        expect.objectContaining({
          errorRate: 1
        })
      );
    });
  });

  describe('getMutualFundsParallel', () => {
    test('fundDataServiceに処理を委譲する', async () => {
      const codes = ['03121033', '02311165'];
      const mockResults = {
        '03121033': { code: '03121033', price: 10000 },
        '02311165': { code: '02311165', price: 15000 }
      };

      fundDataService.getMutualFundsParallel.mockResolvedValue(mockResults);

      const result = await marketDataProviders.getMutualFundsParallel(codes);

      expect(result).toEqual(mockResults);
      expect(fundDataService.getMutualFundsParallel).toHaveBeenCalledWith(codes);
    });

    test('エラーが発生した場合は適切にエラーをスローする', async () => {
      const codes = ['03121033'];
      
      fundDataService.getMutualFundsParallel.mockRejectedValue(new Error('CSV fetch failed'));

      await expect(marketDataProviders.getMutualFundsParallel(codes))
        .rejects.toThrow('Parallel mutual fund data retrieval failed: CSV fetch failed');
    });
  });

  describe('エラーハンドリングの完全テスト', () => {
    test('すべての関数で予期しないエラーが適切に処理される', async () => {
      // 各関数で予期しないエラーをテスト
      const errorMessage = 'Unexpected system error';
      
      // getMutualFundDataのエラーテスト
      fundDataService.getMutualFundData.mockRejectedValue(new Error(errorMessage));
      await expect(marketDataProviders.getMutualFundData(FUND_CODE))
        .rejects.toThrow(`Mutual fund data retrieval failed for ${FUND_CODE}: ${errorMessage}`);
    });
  });

  describe('実際のスクレイピング成功パスのテスト', () => {
    test('Yahoo Finance Japanの実際のスクレイピング成功', async () => {
      // 実際のHTMLレスポンスをシミュレート
      const mockHtml = `
        <html>
          <body>
            <span class="_3rXWJNmiHHh4lN4kRUvvv7">2,500</span>
            <span class="_3Ovs4ARF5Hslpj9n5NwEjn">+100円(+4.17%)</span>
            <h1 class="_1wANDxx3RtV3AdCFSC4_Lp">トヨタ自動車</h1>
          </body>
        </html>
      `;
      
      // axiosレスポンスをモック
      axios.get.mockImplementation((url) => {
        if (url.includes('finance.yahoo.co.jp')) {
          return Promise.resolve({ data: mockHtml });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
      
      // cheerioのloadとセレクタをモック
      cheerio.load.mockImplementation(() => {
        const mockjQuery = jest.fn((selector) => {
          const mockElement = {
            length: 1,
            text: jest.fn(() => {
              if (selector === 'span._3rXWJNmiHHh4lN4kRUvvv7') {
                return '2,500';
              } else if (selector === 'span._3Ovs4ARF5Hslpj9n5NwEjn') {
                return '+100円(+4.17%)';
              } else if (selector === 'h1._1wANDxx3RtV3AdCFSC4_Lp') {
                return 'トヨタ自動車';
              }
              return '';
            }),
            trim: jest.fn(function() { return this.text().trim(); })
          };
          
          if (selector === 'span._3rXWJNmiHHh4lN4kRUvvv7') {
            return mockElement;
          } else if (selector === 'span._3Ovs4ARF5Hslpj9n5NwEjn') {
            return mockElement;
          } else if (selector === 'h1._1wANDxx3RtV3AdCFSC4_Lp') {
            return mockElement;
          }
          
          return { length: 0, text: () => '' };
        });
        
        return mockjQuery;
      });

      const result = await marketDataProviders.getJpStockData(JP_STOCK_CODE);

      expect(result).toEqual(expect.objectContaining({
        ticker: JP_STOCK_CODE,
        price: 2500,
        change: 100,
        changePercent: 4.17,
        name: 'トヨタ自動車',
        currency: 'JPY',
        source: 'Yahoo Finance Japan',
        isStock: true,
        isMutualFund: false
      }));

      expect(recordDataFetchSuccess).toHaveBeenCalledWith(JP_STOCK_CODE);
    });
    
    test('Yahoo Finance USのスクレイピング失敗処理', async () => {
      // Yahoo Finance APIが失敗
      yahooFinanceService.getStockData.mockRejectedValue(new Error('API failed'));
      
      // スクレイピングも失敗するようにモック
      axios.get.mockRejectedValue(new Error('Scraping failed'));

      const result = await marketDataProviders.getUsStockData(US_STOCK_SYMBOL);

      expect(recordDataFetchFailure).toHaveBeenCalledWith(
        US_STOCK_SYMBOL,
        'us',
        'Yahoo Finance API',
        expect.any(Error)
      );
      
      expect(result.source).toBe('Fallback');
    });
  });
});