/**
 * @jest-environment node
 */
'use strict';

const japanBankExchangeService = require('../../services/sources/japanBankExchangeService');
const axios = require('axios');
const cacheService = require('../../services/cache');

// モック設定
jest.mock('axios');
jest.mock('../../utils/retry', () => ({
  withRetry: jest.fn((fn) => fn()),
  isRetryableApiError: jest.fn(() => true)
}));
jest.mock('../../services/cache');
jest.mock('../../services/sources/yahooFinance2Service');

describe('japanBankExchangeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('getBOJExchangeRate', () => {
    it('should fetch USD/JPY rate from Bank of Japan API', async () => {
      const mockBOJResponse = {
        data: {
          data: [
            { date: '2025-06-10', USD: '148.50' },
            { date: '2025-06-11', USD: '149.25' }
          ]
        }
      };

      axios.get.mockResolvedValueOnce(mockBOJResponse);

      const result = await japanBankExchangeService.getBOJExchangeRate('USD', 'JPY');

      expect(result).toEqual({
        ticker: 'USD-JPY',
        pair: 'USD-JPY',
        base: 'USD',
        target: 'JPY',
        rate: 149.25,
        change: 0.75,
        changePercent: expect.closeTo(0.505, 2),
        lastUpdated: expect.any(String),
        source: 'Bank of Japan',
        isOfficial: true
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('boj.or.jp'),
        expect.any(Object)
      );
    });

    it('should throw error for unsupported currency pairs', async () => {
      await expect(japanBankExchangeService.getBOJExchangeRate('EUR', 'USD'))
        .rejects.toThrow('Unsupported currency pair: EUR/USD');
    });
  });

  describe('getECBExchangeRate', () => {
    it('should fetch EUR/JPY rate from ECB API', async () => {
      const mockECBResponse = {
        data: {
          rates: { JPY: 165.50 },
          date: '2025-06-12'
        }
      };

      axios.get.mockResolvedValueOnce(mockECBResponse);

      const result = await japanBankExchangeService.getECBExchangeRate('EUR', 'JPY');

      expect(result).toEqual({
        ticker: 'EUR-JPY',
        pair: 'EUR-JPY',
        base: 'EUR',
        target: 'JPY',
        rate: 165.50,
        change: 0,
        changePercent: 0,
        lastUpdated: '2025-06-12',
        source: 'European Central Bank (via Frankfurter)',
        isOfficial: true
      });
    });
  });

  describe('getYahooExchangeRate', () => {
    it('should fetch exchange rate from Yahoo Finance', async () => {
      const yahooFinance2Service = require('../../services/sources/yahooFinance2Service');
      
      yahooFinance2Service.getStockData.mockResolvedValueOnce({
        price: 149.50,
        change: 0.25,
        changePercent: 0.17,
        lastUpdated: '2025-06-12T10:00:00Z',
        dayHigh: 150.00,
        dayLow: 149.00,
        previousClose: 149.25
      });

      const result = await japanBankExchangeService.getYahooExchangeRate('USD', 'JPY');

      expect(result).toEqual({
        ticker: 'USD-JPY',
        pair: 'USD-JPY',
        base: 'USD',
        target: 'JPY',
        rate: 149.50,
        change: 0.25,
        changePercent: 0.17,
        lastUpdated: '2025-06-12T10:00:00Z',
        source: 'Yahoo Finance',
        dayHigh: 150.00,
        dayLow: 149.00,
        previousClose: 149.25
      });

      expect(yahooFinance2Service.getStockData).toHaveBeenCalledWith('USDJPY=X');
    });
  });

  describe('getEnhancedExchangeRate', () => {
    it('should return cached data if available', async () => {
      const cachedData = {
        ticker: 'USD-JPY',
        rate: 149.00,
        source: 'Cache'
      };

      cacheService.get.mockResolvedValueOnce(cachedData);

      const result = await japanBankExchangeService.getEnhancedExchangeRate('USD', 'JPY');

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith('exchange-rate:USD-JPY');
    });

    it('should prioritize BOJ for JPY pairs', async () => {
      cacheService.get.mockResolvedValueOnce(null);

      const mockBOJResponse = {
        data: {
          data: [
            { date: '2025-06-11', USD: '149.25' }
          ]
        }
      };

      axios.get.mockResolvedValueOnce(mockBOJResponse);

      const result = await japanBankExchangeService.getEnhancedExchangeRate('USD', 'JPY');

      expect(result.source).toBe('Bank of Japan');
      expect(result.rate).toBe(149.25);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should fall back to default value when all sources fail', async () => {
      cacheService.get.mockResolvedValueOnce(null);
      axios.get.mockRejectedValue(new Error('Network Error'));

      const yahooFinance2Service = require('../../services/sources/yahooFinance2Service');
      yahooFinance2Service.getStockData.mockRejectedValueOnce(new Error('Yahoo Error'));

      const result = await japanBankExchangeService.getEnhancedExchangeRate('USD', 'JPY');

      expect(result).toEqual({
        ticker: 'USD-JPY',
        pair: 'USD-JPY',
        base: 'USD',
        target: 'JPY',
        rate: 150.0,
        change: 0,
        changePercent: 0,
        lastUpdated: expect.any(String),
        source: 'Default Fallback',
        isDefault: true,
        error: expect.stringContaining('All sources failed')
      });

      // Short TTL for fallback
      expect(cacheService.set).toHaveBeenCalledWith(
        'exchange-rate:USD-JPY',
        expect.any(Object),
        300
      );
    });

    it('should prioritize ECB for EUR pairs', async () => {
      cacheService.get.mockResolvedValueOnce(null);

      const mockECBResponse = {
        data: {
          rates: { USD: 1.10 },
          date: '2025-06-12'
        }
      };

      axios.get.mockResolvedValueOnce(mockECBResponse);

      const result = await japanBankExchangeService.getEnhancedExchangeRate('EUR', 'USD');

      expect(result.source).toBe('European Central Bank (via Frankfurter)');
      expect(result.rate).toBe(1.10);
    });
  });
});