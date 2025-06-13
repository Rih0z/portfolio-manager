/**
 * yahooFinance.js の最終的な100%カバレッジを達成するテスト
 */

jest.mock('axios');
jest.mock('../../../../src/services/alerts');
jest.mock('../../../../src/utils/retry');

const axios = require('axios');
const alertService = require('../../../../src/services/alerts');
const { withRetry } = require('../../../../src/utils/retry');
const yahooFinanceService = require('../../../../src/services/sources/yahooFinance');

describe('Yahoo Finance Final Coverage', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    alertService.notifyError = jest.fn().mockResolvedValue({});
    
    // withRetryを実際の関数実行にモック
    withRetry.mockImplementation(async (fn) => await fn());
    
    // 環境変数の設定
    process.env.YAHOO_FINANCE_API_KEY = 'test-api-key';
    process.env.YAHOO_FINANCE_API_HOST = 'test-api-host';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    
    delete process.env.YAHOO_FINANCE_API_KEY;
    delete process.env.YAHOO_FINANCE_API_HOST;
  });

  test('withRetryが実際に例外を再スローする場合（行195）', async () => {
    // withRetryが例外を再スローするようにモック
    withRetry.mockImplementation(async (fn) => {
      try {
        return await fn();
      } catch (error) {
        // retryの結果、やはりエラーが発生
        throw error;
      }
    });

    // APIが常に失敗
    axios.get.mockRejectedValue(new Error('Persistent API error'));

    await expect(yahooFinanceService.getStocksData(['AAPL']))
      .rejects.toThrow('Failed to retrieve stocks data: Persistent API error');
  });

  test('withRetryで異なるエラーパターン', async () => {
    // withRetryでタイムアウトエラー
    withRetry.mockRejectedValueOnce(new Error('Request timeout'));

    await expect(yahooFinanceService.getStocksData(['AAPL']))
      .rejects.toThrow('Failed to retrieve stocks data: Request timeout');
  });

  test('retryロジックが複数回試行される', async () => {
    let callCount = 0;
    withRetry.mockImplementation(async (fn, options) => {
      callCount++;
      if (callCount < 3) {
        throw new Error('Retry attempt failed');
      }
      return await fn();
    });

    // 最終的には成功
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
    expect(result['AAPL']).toBeDefined();
    expect(callCount).toBe(3);
  });
});