/**
 * ファイルパス: __tests__/unit/services/sources/marketDataProviders.test.js
 *
 * marketDataProviders モジュールのユニットテスト
 * cleanupBlacklist, getBlacklistedSymbols, getMutualFundData の基本動作を検証する
 */

const marketDataProviders = require('../../../../src/services/sources/marketDataProviders');
const blacklist = require('../../../../src/utils/scrapingBlacklist');
const fundDataService = require('../../../../src/services/sources/fundDataService');

jest.mock('../../../../src/utils/scrapingBlacklist');
jest.mock('../../../../src/services/sources/fundDataService');

describe('marketDataProviders utility functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMutualFundData', () => {
    test('delegates to fundDataService and returns its result', async () => {
      const mockData = { code: '0131103C', price: 123 };
      fundDataService.getMutualFundData.mockResolvedValue(mockData);

      const result = await marketDataProviders.getMutualFundData('0131103C');

      expect(fundDataService.getMutualFundData).toHaveBeenCalledWith('0131103C');
      expect(result).toBe(mockData);
    });

    test('throws error with descriptive message on failure', async () => {
      fundDataService.getMutualFundData.mockRejectedValue(new Error('network'));

      await expect(marketDataProviders.getMutualFundData('0131103C'))
        .rejects.toThrow('Mutual fund data retrieval failed for 0131103C: network');
    });
  });

  describe('cleanupBlacklist', () => {
    test('returns value from blacklist.cleanupBlacklist', async () => {
      const mockRes = { cleanedItems: 2 };
      blacklist.cleanupBlacklist.mockResolvedValue(mockRes);

      const result = await marketDataProviders.cleanupBlacklist();

      expect(blacklist.cleanupBlacklist).toHaveBeenCalled();
      expect(result).toBe(mockRes);
    });

    test('returns error object when cleanup fails', async () => {
      blacklist.cleanupBlacklist.mockRejectedValue(new Error('fail'));

      const result = await marketDataProviders.cleanupBlacklist();

      expect(result).toEqual({ success: false, error: 'fail' });
    });
  });

  describe('getBlacklistedSymbols', () => {
    test('groups symbols by market and returns count', async () => {
      const symbols = [
        { market: 'jp', symbol: '7203', failureCount: 1, lastFailure: 'd1', cooldownUntil: 'c1', reason: 'r1' },
        { market: 'us', symbol: 'AAPL', failureCount: 2, lastFailure: 'd2', cooldownUntil: 'c2', reason: 'r2' }
      ];
      blacklist.getBlacklistedSymbols.mockResolvedValue(symbols);

      const result = await marketDataProviders.getBlacklistedSymbols();

      expect(blacklist.getBlacklistedSymbols).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        count: 2,
        blacklist: {
          jp: [symbols[0]],
          us: [symbols[1]],
          fund: []
        }
      });
    });

    test('returns error object when retrieval fails', async () => {
      blacklist.getBlacklistedSymbols.mockRejectedValue(new Error('boom'));

      const result = await marketDataProviders.getBlacklistedSymbols();

      expect(result).toEqual({ success: false, error: 'boom' });
    });
  });
});
