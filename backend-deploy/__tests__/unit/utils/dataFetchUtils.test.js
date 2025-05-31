/**
 * ファイルパス: __tests__/unit/utils/dataFetchUtils.test.js
 *
 * dataFetchUtilsユーティリティのユニットテスト
 * getRandomUserAgent, recordDataFetchFailure, recordDataFetchSuccess,
 * checkBlacklistAndGetFallback の挙動を検証する
 */

const {
  getRandomUserAgent,
  recordDataFetchFailure,
  recordDataFetchSuccess,
  checkBlacklistAndGetFallback
} = require('../../../src/utils/dataFetchUtils');
const blacklist = require('../../../src/utils/scrapingBlacklist');
const alertService = require('../../../src/services/alerts');

jest.mock('../../../src/utils/scrapingBlacklist');
jest.mock('../../../src/services/alerts');

describe('dataFetchUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRandomUserAgent', () => {
    test('returns the first agent when Math.random() is 0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const agent = getRandomUserAgent();
      expect(agent).toMatch(/^Mozilla\/5.0/);
      Math.random.mockRestore();
    });

    test('returns the last agent when Math.random() is near 1', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const agent = getRandomUserAgent();
      expect(agent).toMatch(/^Mozilla\/5.0/);
      Math.random.mockRestore();
    });
  });

  describe('recordDataFetchFailure', () => {
    test('records failure and sends alert when threshold met', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05);
      const error = new Error('fail');
      await recordDataFetchFailure('AAA', 'us', 'Yahoo', error);
      expect(blacklist.recordFailure).toHaveBeenCalledWith(
        'AAA',
        'us',
        'Yahoo: fail'
      );
      expect(alertService.notifyError).toHaveBeenCalledWith(
        'Yahoo Data Retrieval Failed',
        expect.any(Error),
        expect.objectContaining({ code: 'AAA', market: 'us', source: 'Yahoo' })
      );
      Math.random.mockRestore();
    });

    test('does not send alert when random above threshold', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      await recordDataFetchFailure('AAA', 'us', 'Yahoo', new Error('fail'), {
        alertThreshold: 0.5
      });
      expect(alertService.notifyError).not.toHaveBeenCalled();
      Math.random.mockRestore();
    });
  });

  describe('recordDataFetchSuccess', () => {
    test('records success via blacklist module', async () => {
      await recordDataFetchSuccess('AAA');
      expect(blacklist.recordSuccess).toHaveBeenCalledWith('AAA');
    });
  });

  describe('checkBlacklistAndGetFallback', () => {
    test('returns fallback data with blacklist flag', async () => {
      blacklist.isBlacklisted.mockResolvedValue(true);
      const result = await checkBlacklistAndGetFallback('AAA', 'us', {
        defaultPrice: 100,
        currencyCode: 'USD',
        name: 'Alpha',
        priceLabel: 'NAV'
      });
      expect(result.isBlacklisted).toBe(true);
      expect(result.fallbackData).toEqual(
        expect.objectContaining({
          ticker: 'AAA',
          price: 100,
          currency: 'USD',
          name: 'Alpha',
          priceLabel: 'NAV',
          isStock: true,
          isMutualFund: false,
          isBlacklisted: true
        })
      );
    });

    test('omits priceLabel when not provided', async () => {
      blacklist.isBlacklisted.mockResolvedValue(false);
      const result = await checkBlacklistAndGetFallback('BBB', 'jp', {
        defaultPrice: 50,
        currencyCode: 'JPY'
      });
      expect(result.isBlacklisted).toBe(false);
      expect(result.fallbackData.priceLabel).toBeUndefined();
    });
  });
});
