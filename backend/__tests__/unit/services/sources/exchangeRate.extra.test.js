jest.mock('axios');
jest.mock('../../../../src/services/alerts');

const axios = require('axios');
const alertService = require('../../../../src/services/alerts');
const exchangeRateService = require('../../../../src/services/sources/exchangeRate');

const { DEFAULT_EXCHANGE_RATE } = require('../../../../src/config/constants');

describe('exchangeRate service additional coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 1 when base and target are the same', async () => {
    const result = await exchangeRateService.getExchangeRate('EUR', 'EUR');
    expect(result.rate).toBe(1);
    expect(result.base).toBe('EUR');
    expect(result.target).toBe('EUR');
    expect(result.source).toBe('Internal (same currencies)');
  });

  test('JPY to USD falls back to hardcoded rate when API fails', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-05-22T00:00:00Z'));

    axios.get.mockRejectedValueOnce(new Error('network failure'));
    alertService.notifyError.mockResolvedValueOnce();

    const result = await exchangeRateService.getExchangeRate('JPY', 'USD');
    jest.useRealTimers();

    const expected = parseFloat((1 / DEFAULT_EXCHANGE_RATE).toFixed(4));

    expect(result.base).toBe('JPY');
    expect(result.target).toBe('USD');
    expect(result.source).toBe('dynamic-calculation');
    expect(result.rate).toBeCloseTo(expected, 4);
  });

  test('getBatchExchangeRates throws error on invalid input', async () => {
    await expect(exchangeRateService.getBatchExchangeRates([])).rejects.toThrow('Invalid currency pairs array');
  });
});
