/**
 * @jest-environment node
 */
'use strict';

const toushinDataService = require('../../services/sources/toushinDataService');
const axios = require('axios');
const { recordDataFetchFailure, recordDataFetchSuccess } = require('../../utils/dataFetchUtils');

// モック設定
jest.mock('axios');
jest.mock('../../utils/retry', () => ({
  withRetry: jest.fn((fn) => fn()),
  isRetryableApiError: jest.fn(() => true)
}));
jest.mock('../../utils/dataFetchUtils');
jest.mock('../../services/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  generateCacheKey: jest.fn()
}));

describe('toushinDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('getToushinApiData', () => {
    it('should fetch fund data from Toushin API successfully', async () => {
      const mockApiResponse = {
        data: {
          data: {
            nav: 15234.56,
            navChange: 123.45,
            navChangeRate: 0.82,
            fundName: 'SBI・V・S&P500インデックスファンド',
            navDate: '2025-06-12',
            totalAssets: 1234567890000,
            managementCompany: 'SBIアセットマネジメント'
          }
        }
      };

      axios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await toushinDataService.getToushinApiData('03311187');

      expect(result).toEqual({
        ticker: '03311187',
        price: 15234.56,
        change: 123.45,
        changePercent: 0.82,
        name: 'SBI・V・S&P500インデックスファンド',
        currency: 'JPY',
        lastUpdated: '2025-06-12',
        source: 'Toushin API',
        priceLabel: '基準価額',
        isStock: false,
        isMutualFund: true,
        totalAssets: 1234567890000,
        managementCompany: 'SBIアセットマネジメント'
      });

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.toushin.or.jp/openapi/fund/nav/03311187',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(toushinDataService.getToushinApiData('03311187'))
        .rejects.toThrow('API Error');
    });
  });

  describe('getYahooJapanFundData', () => {
    it('should extract fund data from Yahoo Japan HTML', async () => {
      const mockHtml = `
        <html>
          <body>
            基準価額 12,345円
            前日比 +123円 (+1.01%)
          </body>
        </html>
      `;

      axios.get.mockResolvedValueOnce({ data: mockHtml });

      const result = await toushinDataService.getYahooJapanFundData('03311187');

      expect(result).toEqual({
        ticker: '03311187',
        price: 12345,
        change: 123,
        changePercent: 1.01,
        name: '投資信託 03311187',
        currency: 'JPY',
        lastUpdated: expect.any(String),
        source: 'Yahoo Japan',
        priceLabel: '基準価額',
        isStock: false,
        isMutualFund: true
      });
    });
  });

  describe('getRakutenFundData', () => {
    it('should extract fund data from Rakuten HTML', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>eMAXIS Slim 全世界株式</h1>
            基準価額 20,123円
          </body>
        </html>
      `;

      axios.get.mockResolvedValueOnce({ data: mockHtml });

      const result = await toushinDataService.getRakutenFundData('0131109A');

      expect(result).toEqual({
        ticker: '0131109A',
        price: 20123,
        change: 0,
        changePercent: 0,
        name: 'eMAXIS Slim 全世界株式',
        currency: 'JPY',
        lastUpdated: expect.any(String),
        source: 'Rakuten Securities',
        priceLabel: '基準価額',
        isStock: false,
        isMutualFund: true
      });
    });
  });

  describe('getEnhancedMutualFundData', () => {
    const cacheService = require('../../services/cache');

    it('should return cached data if available', async () => {
      const cachedData = {
        ticker: '03311187',
        price: 15000,
        source: 'Cache'
      };

      cacheService.get.mockResolvedValueOnce(cachedData);

      const result = await toushinDataService.getEnhancedMutualFundData('03311187');

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith('mutual-fund:03311187');
    });

    it('should try multiple sources in order', async () => {
      cacheService.get.mockResolvedValueOnce(null);

      // Toushin API fails
      axios.get.mockRejectedValueOnce(new Error('Toushin API Error'));

      // Yahoo Japan succeeds
      const mockHtml = `
        <html>
          <body>
            基準価額 12,345円
          </body>
        </html>
      `;
      axios.get.mockResolvedValueOnce({ data: mockHtml });

      const result = await toushinDataService.getEnhancedMutualFundData('03311187');

      expect(result.source).toBe('Yahoo Japan');
      expect(result.price).toBe(12345);
      expect(recordDataFetchSuccess).toHaveBeenCalledWith('03311187');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should handle all sources failing', async () => {
      cacheService.get.mockResolvedValueOnce(null);

      // All sources fail
      axios.get.mockRejectedValue(new Error('Network Error'));

      await expect(toushinDataService.getEnhancedMutualFundData('03311187'))
        .rejects.toThrow('All sources failed');

      expect(recordDataFetchFailure).toHaveBeenCalledTimes(3); // 3 sources
    });
  });
});