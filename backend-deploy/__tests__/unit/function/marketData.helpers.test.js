const marketData = require('../../../src/function/marketData');
const enhancedService = require('../../../src/services/sources/enhancedMarketDataService');
const fallbackDataStore = require('../../../src/services/fallbackDataStore');
const { DATA_TYPES } = require('../../../src/config/constants');

describe('marketData helper functions', () => {
  describe('validateParams', () => {
    test('returns error when type is missing', () => {
      const result = marketData.validateParams({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: type');
    });

    test('returns error when type is invalid', () => {
      const result = marketData.validateParams({ type: 'unknown' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch('Invalid type');
    });

    test('returns error when symbols missing for stock', () => {
      const result = marketData.validateParams({ type: 'us-stock' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: symbols');
    });

    test('returns error when symbols is empty string', () => {
      const result = marketData.validateParams({ type: 'us-stock', symbols: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('symbols parameter cannot be empty');
    });

    test('returns error when more than 100 symbols provided', () => {
      const manySymbols = Array.from({ length: 101 }, (_, i) => `SYM${i}`).join(',');
      const result = marketData.validateParams({ type: 'us-stock', symbols: manySymbols });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many symbols. Maximum 100 symbols allowed');
    });

    test('valid exchange rate params with base and target', () => {
      const result = marketData.validateParams({ type: 'exchange-rate', base: 'USD', target: 'JPY' });
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('exchange rate params missing base and target', () => {
      const result = marketData.validateParams({ type: 'exchange-rate' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter for exchange rate: base');
      expect(result.errors).toContain('Missing required parameter for exchange rate: target');
    });
  });

  describe('getMultipleExchangeRates', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('returns default pairs when isTest and pairs not provided', async () => {
      const result = await marketData.getMultipleExchangeRates(undefined, false, true);
      expect(result['USD-JPY']).toBeDefined();
      expect(result['EUR-JPY']).toBeDefined();
      expect(result['GBP-JPY']).toBeDefined();
      expect(result['USD-EUR']).toBeDefined();
    });

    test('throws error when pairs not provided in non test mode', async () => {
      await expect(marketData.getMultipleExchangeRates(undefined, false, false))
        .rejects
        .toThrow('Currency pairs array is required');
    });

    test('calls enhanced service when not in test', async () => {
      enhancedService.getExchangeRateData = jest.fn().mockResolvedValue({ rate: 1, pair: 'AAA-BBB' });
      const result = await marketData.getMultipleExchangeRates(['AAA-BBB'], false, false);
      expect(enhancedService.getExchangeRateData).toHaveBeenCalledWith('AAA', 'BBB', false);
      expect(result['AAA-BBB']).toEqual({ rate: 1, pair: 'AAA-BBB' });
    });

    test('returns dummy data when service returns null', async () => {
      enhancedService.getExchangeRateData = jest.fn().mockResolvedValue(null);
      fallbackDataStore.recordFailedFetch = jest.fn();
      const result = await marketData.getMultipleExchangeRates(['AAA-BBB'], false, false);
      expect(enhancedService.getExchangeRateData).toHaveBeenCalledWith('AAA', 'BBB', false);
      expect(fallbackDataStore.recordFailedFetch).not.toHaveBeenCalled();
      expect(result['AAA-BBB'].pair).toBe('AAA-BBB');
      expect(result['AAA-BBB'].source).toBe('Default Fallback');
    });

    test('returns error object for invalid pair format', async () => {
      const result = await marketData.getMultipleExchangeRates(['INVALID'], false, false);
      expect(result['INVALID'].source).toBe('Error');
      expect(result['INVALID'].error).toMatch('Invalid currency pair format');
    });

    test('accepts comma separated string for pairs', async () => {
      enhancedService.getExchangeRateData = jest.fn().mockResolvedValue({ rate: 1, pair: 'USD-JPY' });
      const result = await marketData.getMultipleExchangeRates('USD-JPY', false, false);
      expect(enhancedService.getExchangeRateData).toHaveBeenCalledWith('USD', 'JPY', false);
      expect(result['USD-JPY']).toEqual({ rate: 1, pair: 'USD-JPY' });
    });
  });

  describe('dummy data creators', () => {
    test('createDummyUsStockSymbol returns expected structure', () => {
      const data = marketData.createDummyUsStockSymbol('AAPL');
      expect(data.ticker).toBe('AAPL');
      expect(data.currency).toBe('USD');
      expect(data.isStock).toBe(true);
    });

    test('createDummyJpStockSymbol returns expected structure', () => {
      const data = marketData.createDummyJpStockSymbol('7203');
      expect(data.ticker).toBe('7203');
      expect(data.currency).toBe('JPY');
    });

    test('createDummyMutualFundSymbol returns expected structure', () => {
      const data = marketData.createDummyMutualFundSymbol('0131103C');
      expect(data.ticker).toBe('0131103C');
      expect(data.priceLabel).toBe('基準価額');
    });

    test('createDummyExchangeRateData returns expected pair', () => {
      const data = marketData.createDummyExchangeRateData('USD', 'JPY');
      expect(data.pair).toBe('USD-JPY');
      expect(data.base).toBe('USD');
      expect(data.target).toBe('JPY');
    });

    test('createTestExchangeRateData uses defaults', () => {
      const data = marketData.createTestExchangeRateData();
      expect(data.pair).toBe('USD-JPY');
      expect(data.source).toBe('Test Data');
    });
  });
});
