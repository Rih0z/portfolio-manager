jest.mock('axios');
const axios = require('axios');
const exchangeRateService = require('../../../../src/services/sources/exchangeRate');

describe('exchangeRate additional cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('JPY to USD pair inverts rate from API', async () => {
    axios.get.mockResolvedValueOnce({
      data: { rates: { JPY: 150 }, date: '2025-05-01' }
    });

    const result = await exchangeRateService.getExchangeRate('JPY', 'USD');
    expect(result.base).toBe('JPY');
    expect(result.target).toBe('USD');
    expect(result.rate).toBeCloseTo(1 / 150);
  });

  test('getBatchExchangeRates throws on invalid input', async () => {
    await expect(exchangeRateService.getBatchExchangeRates(null)).rejects.toThrow('Invalid currency pairs array');
  });

  test('getBatchExchangeRates handles individual failures', async () => {
    const spy = jest.spyOn(exchangeRateService, 'getExchangeRate');
    spy.mockImplementationOnce(() => Promise.resolve({ rate: 100, base: 'USD', target: 'JPY', pair: 'USDJPY' }));
    spy.mockImplementationOnce(() => Promise.reject(new Error('fail')));

    const result = await exchangeRateService.getBatchExchangeRates([
      { base: 'USD', target: 'JPY' },
      { base: 'EUR', target: 'USD' }
    ]);

    expect(result['USD-JPY'].rate).toBe(100);
    expect(result['EUR-USD'].source).toBe('Error');
    expect(result['EUR-USD'].error).toBe('fail');
  });
});


