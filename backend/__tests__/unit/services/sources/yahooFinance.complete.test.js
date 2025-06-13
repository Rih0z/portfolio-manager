/**
 * yahooFinance.js の100%カバレッジを完成させるテスト
 * 未カバー行: 195
 */

jest.mock('axios');
jest.mock('../../../../src/services/alerts');

const axios = require('axios');
const alertService = require('../../../../src/services/alerts');
const yahooFinanceService = require('../../../../src/services/sources/yahooFinance');

describe('Yahoo Finance Service - Complete Coverage', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock alertService
    alertService.notifyError = jest.fn().mockResolvedValue({});
    
    // 環境変数の設定
    process.env.YAHOO_FINANCE_API_KEY = 'test-api-key';
    process.env.YAHOO_FINANCE_API_HOST = 'test-api-host';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    
    // 環境変数のクリア
    delete process.env.YAHOO_FINANCE_API_KEY;
    delete process.env.YAHOO_FINANCE_API_HOST;
  });

  describe('getStocksData - 行195のカバレッジ', () => {
    test('APIキーがない場合のエラー処理', async () => {
      // APIキーを削除
      delete process.env.YAHOO_FINANCE_API_KEY;
      
      await expect(yahooFinanceService.getStocksData(['AAPL']))
        .rejects.toThrow('Failed to retrieve stocks data');
      
      // この状態でgetStocksDataを呼び出すとAPIキーがないためエラーになる
      // しかし、実際のコードでは行195でAPIキーを使用している
    });

    test('環境変数が完全に設定されていない場合', async () => {
      // APIキーはあるがホストがない
      delete process.env.YAHOO_FINANCE_API_HOST;
      
      // APIレスポンスのモック
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: [{
              symbol: 'AAPL',
              regularMarketPrice: 150.50,
              regularMarketChange: 2.50,
              regularMarketChangePercent: 1.69,
              shortName: 'Apple Inc.',
              regularMarketTime: 1234567890
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStocksData(['AAPL']);

      // デフォルトのホストが使用される
      expect(axios.get).toHaveBeenCalledWith(
        'https://yh-finance.p.rapidapi.com/market/v2/get-quotes',
        expect.objectContaining({
          headers: {
            'X-RapidAPI-Key': 'test-api-key',
            'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
          }
        })
      );
      
      expect(result['AAPL']).toBeDefined();
    });

    test('getStocksDataでretryロジックが動作する', async () => {
      const { withRetry } = require('../../../../src/utils/retry');
      
      // 最初の呼び出しは失敗、2回目で成功
      axios.get
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          data: {
            quoteResponse: {
              result: [{
                symbol: 'AAPL',
                regularMarketPrice: 150.50,
                regularMarketChange: 2.50,
                regularMarketChangePercent: 1.69,
                shortName: 'Apple Inc.',
                regularMarketTime: 1234567890
              }]
            }
          }
        });

      const result = await yahooFinanceService.getStocksData(['AAPL']);

      expect(result['AAPL']).toBeDefined();
      expect(result['AAPL'].price).toBe(150.50);
    });
  });
});