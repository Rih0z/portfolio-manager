const marketDataProviders = require('../../../../src/services/sources/marketDataProviders');
const blacklist = require('../../../../src/utils/scrapingBlacklist');
const alertService = require('../../../../src/services/alerts');
const yahooFinanceService = require('../../../../src/services/sources/yahooFinance');
const retryUtils = require('../../../../src/utils/retry');

jest.mock('../../../../src/utils/scrapingBlacklist');
jest.mock('../../../../src/services/alerts');
jest.mock('../../../../src/services/sources/yahooFinance');
jest.mock('../../../../src/utils/retry', () => ({
  withRetry: jest.fn(fn => fn()),
  isRetryableApiError: jest.fn(() => false),
  sleep: jest.fn(() => Promise.resolve())
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getJpStocksParallel', () => {
  test('handles blacklist and returns fetched data', async () => {
    blacklist.isBlacklisted.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(false);
    const result = await marketDataProviders.getJpStocksParallel(['7203', '7201']);
    // 2 checks during pre-filter and one inside getJpStockData
    expect(blacklist.isBlacklisted).toHaveBeenCalledTimes(3);
    expect(result['7203']).toMatchObject({ ticker: '7203', isBlacklisted: true, source: 'Blacklisted Fallback' });
    // 正常取得された銘柄はpriceを持つ
    expect(result['7201'].ticker).toBe('7201');
  });

  test('sends alert when fetch errors exceed threshold', async () => {
    // Pre-check succeeds but inner check throws to trigger an error path
    blacklist.isBlacklisted
      .mockResolvedValueOnce(false) // check in getJpStocksParallel
      .mockRejectedValueOnce(new Error('fail')); // check inside getJpStockData

    const result = await marketDataProviders.getJpStocksParallel(['7201']);

    expect(alertService.notifyError).toHaveBeenCalled();
    expect(result['7201']).toMatchObject({ ticker: '7201', source: 'Error', error: 'fail' });
  });
});

describe('getUsStocksParallel', () => {
  test('returns batch results when API succeeds', async () => {
    yahooFinanceService.getStocksData.mockResolvedValue({ AAPL: { price: 1 }, MSFT: { price: 2 } });
    const result = await marketDataProviders.getUsStocksParallel(['AAPL', 'MSFT']);
    expect(yahooFinanceService.getStocksData).toHaveBeenCalledWith(['AAPL', 'MSFT']);
    expect(result).toEqual({ AAPL: { price: 1 }, MSFT: { price: 2 } });
  });

  test('falls back to individual fetch with blacklist handling', async () => {
    yahooFinanceService.getStocksData.mockRejectedValue(new Error('api fail'));
    blacklist.isBlacklisted.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    // inner call to check blacklist inside getUsStockData should succeed
    blacklist.isBlacklisted.mockResolvedValueOnce(false);
    // avoid real network by forcing getUsStockData to throw via blacklist rejection
    marketDataProviders.getUsStockData = jest.fn().mockResolvedValue({ ticker: 'AAPL', price: 3 });
    const result = await marketDataProviders.getUsStocksParallel(['AAPL', 'MSFT']);
    // getUsStockData is called for non-blacklisted symbol
    expect(marketDataProviders.getUsStockData).toHaveBeenCalled();
    expect(result['MSFT']).toMatchObject({ ticker: 'MSFT', isBlacklisted: true, source: 'Blacklisted Fallback' });
    expect(result['AAPL']).toEqual({ ticker: 'AAPL', price: 3 });
  });
});
