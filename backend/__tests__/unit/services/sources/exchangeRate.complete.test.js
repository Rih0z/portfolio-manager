/**
 * exchangeRate.js の100%カバレッジを完成させるテスト
 * 未カバー行: 84, 108, 132, 154-193, 243, 268-269
 */

jest.mock('axios');
jest.mock('../../../../src/services/alerts');
jest.mock('../../../../src/utils/retry');

const axios = require('axios');
const alertService = require('../../../../src/services/alerts');
const { withRetry } = require('../../../../src/utils/retry');
const exchangeRateService = require('../../../../src/services/sources/exchangeRate');
const { DEFAULT_EXCHANGE_RATE } = require('../../../../src/config/constants');

describe('ExchangeRate Service - Complete Coverage', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock alertService
    alertService.notifyError = jest.fn().mockResolvedValue({});
    
    // Mock withRetry to pass through the function
    withRetry.mockImplementation(async (fn) => await fn());
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Yahoo Finance2 エラーハンドリング', () => {
    test('Yahoo Finance2が例外を投げた時の警告ログ(行84)', async () => {
      // yahoo-finance2をモックして例外を投げる
      jest.doMock('yahoo-finance2', () => ({
        default: {
          quote: jest.fn().mockRejectedValueOnce(new Error('Yahoo Finance2 error'))
        }
      }), { virtual: true });

      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      // exchangerate-apiで成功
      axios.get.mockResolvedValueOnce({
        data: { rates: { JPY: 150.0 } }
      });

      await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Yahoo Finance2 failed: Yahoo Finance2 error'
      );
    });
  });

  describe('ExchangeRate API エラーハンドリング', () => {
    test('exchangerate-apiが例外を投げた時の警告ログ(行108)', async () => {
      // yahoo-finance2が利用不可
      jest.doMock('yahoo-finance2', () => {
        throw new Error('Module not found');
      }, { virtual: true });

      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      // exchangerate-apiで例外
      axios.get
        .mockRejectedValueOnce(new Error('ExchangeRate API error'))
        // Frankfurterで成功
        .mockResolvedValueOnce({
          data: { rates: { JPY: 150.0 } }
        });

      await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'ExchangeRate API failed: ExchangeRate API error'
      );
    });
  });

  describe('Frankfurter API エラーハンドリング', () => {
    test('Frankfurter APIが例外を投げた時の警告ログ(行132)', async () => {
      // yahoo-finance2が利用不可
      jest.doMock('yahoo-finance2', () => {
        throw new Error('Module not found');
      }, { virtual: true });

      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      // すべてのAPIが失敗
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Frankfurter API failed: All APIs failed'
      );
    });
  });

  describe('ハードコード値エラーと緊急フォールバック', () => {
    test('ハードコード値も失敗した場合のエラーログ(行154)', async () => {
      // すべてのAPIが失敗
      jest.doMock('yahoo-finance2', () => {
        throw new Error('Module not found');
      }, { virtual: true });
      
      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      // getExchangeRateFromHardcodedValuesを強制的に失敗させる
      const originalGetHardcoded = freshExchangeRateService.getExchangeRateFromHardcodedValues;
      jest.spyOn(freshExchangeRateService, 'getExchangeRateFromHardcodedValues')
        .mockImplementation(() => {
          throw new Error('Hardcoded values failed');
        });

      const result = await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Hardcoded rates also failed: Hardcoded values failed'
      );
      expect(result.source).toBe('Emergency Fallback');
    });

    test('JPY/USDで緊急フォールバック(行161-163)', async () => {
      jest.doMock('yahoo-finance2', () => {
        throw new Error('Module not found');
      }, { virtual: true });
      
      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      const result = await freshExchangeRateService.getExchangeRate('JPY', 'USD');

      expect(result.rate).toBe(1 / DEFAULT_EXCHANGE_RATE);
      expect(result.source).toBe('Emergency Fallback');
      expect(result.isDefault).toBe(true);
    });

    test('緊急フォールバックでアラート通知(行166-170)', async () => {
      jest.doMock('yahoo-finance2', () => {
        throw new Error('Module not found');
      }, { virtual: true });
      
      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(alertService.notifyError).toHaveBeenCalledWith(
        'All Exchange Rate Sources Failed',
        expect.any(Error),
        { base: 'USD', target: 'JPY', isJpyToUsd: false }
      );
    });

    test('完全に予期しないエラーの場合(行182-204)', async () => {
      jest.doMock('yahoo-finance2', () => {
        throw new TypeError('Cannot read property of undefined');
      }, { virtual: true });
      
      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      // axiosのgetメソッドを強制的にエラーにする
      axios.get = undefined;

      const result = await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error in exchange rate service:',
        expect.any(Error)
      );
      expect(result.source).toBe('Emergency Fallback');
      expect(result.isDefault).toBe(true);
      expect(result.error).toBeDefined();
    });

    test('JPY/USDで予期しないエラーの場合(行189-191)', async () => {
      jest.doMock('yahoo-finance2', () => {
        throw new TypeError('Cannot read property of undefined');
      }, { virtual: true });
      
      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      // axiosのgetメソッドを強制的にエラーにする
      axios.get = undefined;

      const result = await freshExchangeRateService.getExchangeRate('JPY', 'USD');

      expect(result.rate).toBe(1 / DEFAULT_EXCHANGE_RATE);
      expect(result.source).toBe('Emergency Fallback');
      expect(result.isDefault).toBe(true);
    });
  });

  describe('createExchangeRateResponse', () => {
    test('isDefaultがfalseの場合は含まれない(行243)', async () => {
      jest.doMock('yahoo-finance2', () => ({
        default: {
          quote: jest.fn().mockResolvedValueOnce({
            regularMarketPrice: 150.0
          })
        }
      }), { virtual: true });

      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');

      const result = await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(result.isDefault).toBeUndefined();
    });
  });

  describe('getExchangeRateFromYahooFinance2', () => {
    test('yahoo-finance2パッケージが利用できない場合(行268-269)', async () => {
      // requireでエラーを投げる
      jest.doMock('yahoo-finance2', () => {
        throw new Error('Cannot find module yahoo-finance2');
      }, { virtual: true });

      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      // exchangerate-apiで成功
      axios.get.mockResolvedValueOnce({
        data: { rates: { JPY: 150.0 } }
      });

      const result = await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleWarnSpy).toHaveBeenCalledWith('yahoo-finance2 not available');
      expect(result.source).toBe('exchangerate-api');
    });
  });
});