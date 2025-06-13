/**
 * exchangeRate.js の最終的な100%カバレッジを達成するテスト
 */

// モックを正しく設定
jest.mock('axios');
jest.mock('../../../../src/services/alerts');

// ランタイムでyahoo-finance2をモック
const yahooFinance2Mock = {
  default: {
    quote: jest.fn()
  }
};

const axios = require('axios');
const alertService = require('../../../../src/services/alerts');

describe('ExchangeRate Final Coverage', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    alertService.notifyError = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  test('Yahoo Finance2のrequireエラーをキャッチ', async () => {
    // モジュールキャッシュをクリア
    jest.resetModules();
    
    // yahoo-finance2をrequireエラーで失敗させる
    jest.doMock('yahoo-finance2', () => {
      throw new Error('Cannot find module yahoo-finance2');
    }, { virtual: true });

    // exchangeRateServiceを新しく読み込む
    const exchangeRateService = require('../../../../src/services/sources/exchangeRate');

    // exchangerate-apiで成功
    axios.get.mockResolvedValueOnce({
      data: {
        rates: { JPY: 150.0 }
      }
    });

    const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('yahoo-finance2 not available');
    expect(result.source).toBe('exchangerate-api');
  });

  test('Emergency Fallbackテスト', async () => {
    jest.resetModules();
    
    // すべてのAPIを失敗させる
    jest.doMock('yahoo-finance2', () => {
      throw new Error('Module not found');
    }, { virtual: true });

    const exchangeRateService = require('../../../../src/services/sources/exchangeRate');
    
    // すべてのHTTPリクエストを失敗させる
    axios.get.mockRejectedValue(new Error('Network error'));

    const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
    
    expect(result.source).toBe('Emergency Fallback');
    expect(result.isDefault).toBe(true);
    expect(alertService.notifyError).toHaveBeenCalledWith(
      'All Exchange Rate Sources Failed',
      expect.any(Error),
      { base: 'USD', target: 'JPY', isJpyToUsd: false }
    );
  });

  test('createExchangeRateResponseでisDefaultがfalseの場合', async () => {
    jest.resetModules();
    
    // Yahoo Finance2が成功する場合
    jest.doMock('yahoo-finance2', () => ({
      default: {
        quote: jest.fn().mockResolvedValueOnce({
          regularMarketPrice: 150.0,
          regularMarketChange: 1.0,
          regularMarketChangePercent: 0.67
        })
      }
    }), { virtual: true });

    const exchangeRateService = require('../../../../src/services/sources/exchangeRate');

    const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
    
    // isDefaultがfalseの場合、レスポンスに含まれない
    expect(result.isDefault).toBeUndefined();
    expect(result.source).toBe('yahoo-finance2');
  });

  test('完全に予期しないエラーの処理', async () => {
    jest.resetModules();

    // TypeError: Cannot read property of undefinedをシミュレート
    jest.doMock('yahoo-finance2', () => {
      // プロパティアクセスエラーをシミュレート
      const obj = {};
      return obj.nonExistentProperty.quote;
    }, { virtual: true });

    // モック後にモジュールを読み込む
    const exchangeRateService = require('../../../../src/services/sources/exchangeRate');
    
    // axiosも失敗させる
    axios.get.mockRejectedValue(new Error('Network error'));

    const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unexpected error in exchange rate service:',
      expect.any(Error)
    );
    expect(result.source).toBe('Emergency Fallback');
    expect(result.isDefault).toBe(true);
    expect(result.error).toBeDefined();
  });
});