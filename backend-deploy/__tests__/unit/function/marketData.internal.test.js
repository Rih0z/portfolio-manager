/**
 * ファイルパス: __tests__/unit/function/marketData.internal.test.js
 *
 * marketData.js 内部関数のユニットテスト
 */

const marketData = require('../../../src/function/marketData');
const enhancedService = require('../../../src/services/sources/enhancedMarketDataService');
const fallbackDataStore = require('../../../src/services/fallbackDataStore');
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/services/sources/enhancedMarketDataService');
jest.mock('../../../src/services/fallbackDataStore');
jest.mock('../../../src/utils/logger');

const {
  getUsStockData,
  getExchangeRateData,
  getMultipleExchangeRates
} = marketData._testExports;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('marketData internal functions', () => {
  test('getUsStockData returns test data when isTest=true', async () => {
    const result = await getUsStockData(['AAPL'], false, true);
    expect(result).toHaveProperty('AAPL');
    expect(result.AAPL.isStock).toBe(true);
  });

  test('getUsStockData falls back to dummy data on empty service result', async () => {
    enhancedService.getUsStocksData.mockResolvedValue({});
    const result = await getUsStockData(['AAPL'], false, false);
    expect(enhancedService.getUsStocksData).toHaveBeenCalled();
    expect(result.AAPL.source).toBe('Default Fallback');
  });

  test('getExchangeRateData uses service when available', async () => {
    enhancedService.getExchangeRateData.mockResolvedValue({ rate: 1, pair: 'USD-JPY' });
    const result = await getExchangeRateData('USD', 'JPY', false, false);
    expect(enhancedService.getExchangeRateData).toHaveBeenCalledWith('USD', 'JPY', false);
    expect(result['USD-JPY']).toEqual({ rate: 1, pair: 'USD-JPY' });
  });

  test('getExchangeRateData returns dummy on service error', async () => {
    enhancedService.getExchangeRateData.mockRejectedValue(new Error('boom'));
    fallbackDataStore.getFallbackForSymbol.mockResolvedValue(null);
    const result = await getExchangeRateData('USD', 'JPY', false, false);
    expect(fallbackDataStore.getFallbackForSymbol).toHaveBeenCalled();
    expect(result['USD-JPY'].source).toBe('Default Fallback');
  });

  test('getMultipleExchangeRates handles invalid pair format', async () => {
    const res = await getMultipleExchangeRates(['INVALID'], false, false);
    expect(res['INVALID'].error).toMatch('Invalid currency pair format');
  });
});
