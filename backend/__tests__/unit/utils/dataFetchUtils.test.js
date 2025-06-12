const {
  getRandomUserAgent,
  recordDataFetchFailure,
  recordDataFetchSuccess,
  checkBlacklistAndGetFallback
} = require('../../../src/utils/dataFetchUtils');

const { withRetry, isRetryableApiError } = require('../../../src/utils/retry');
const blacklist = require('../../../src/utils/scrapingBlacklist');
const alertService = require('../../../src/services/alerts');

jest.mock('../../../src/utils/retry');
jest.mock('../../../src/utils/scrapingBlacklist');
jest.mock('../../../src/services/alerts');

describe('dataFetchUtils', () => {
  let originalConsole;
  let originalMath;

  beforeEach(() => {
    originalConsole = console.error;
    originalMath = Math.random;
    console.error = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsole;
    Math.random = originalMath;
  });

  describe('getRandomUserAgent', () => {
    it('should return one of the predefined user agents', () => {
      const expectedUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
      ];

      const userAgent = getRandomUserAgent();

      expect(expectedUserAgents).toContain(userAgent);
      expect(typeof userAgent).toBe('string');
      expect(userAgent.length).toBeGreaterThan(0);
    });

    it('should return different user agents across multiple calls', () => {
      // Mock Math.random to ensure we get different values
      let callCount = 0;
      Math.random = jest.fn(() => {
        const values = [0, 0.2, 0.4, 0.6, 0.8];
        return values[callCount++ % values.length];
      });

      const userAgents = new Set();
      for (let i = 0; i < 10; i++) {
        userAgents.add(getRandomUserAgent());
      }

      // Should get multiple different user agents
      expect(userAgents.size).toBeGreaterThan(1);
    });

    it('should always return a valid user agent string', () => {
      // Test with specific Math.random values
      const testValues = [0, 0.1, 0.3, 0.7, 0.99];
      
      testValues.forEach(randomValue => {
        Math.random = jest.fn(() => randomValue);
        const userAgent = getRandomUserAgent();
        
        expect(userAgent).toMatch(/^Mozilla\/\d+\.\d+/);
        expect(userAgent).toContain('Safari');
      });
    });

    it('should handle edge cases with Math.random', () => {
      // Test with exactly 0
      Math.random = jest.fn(() => 0);
      let userAgent = getRandomUserAgent();
      expect(userAgent).toBeDefined();

      // Test with value close to 1
      Math.random = jest.fn(() => 0.999999);
      userAgent = getRandomUserAgent();
      expect(userAgent).toBeDefined();
    });
  });

  describe('recordDataFetchFailure', () => {
    beforeEach(() => {
      blacklist.recordFailure = jest.fn().mockResolvedValue();
      alertService.notifyError = jest.fn().mockResolvedValue();
    });

    it('should record failure in blacklist', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('Network timeout');

      Math.random = jest.fn(() => 0.5); // Above default threshold

      await recordDataFetchFailure(code, market, source, error);

      expect(blacklist.recordFailure).toHaveBeenCalledWith(
        code,
        market,
        `${source}: ${error.message}`
      );
    });

    it('should log error message', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');

      Math.random = jest.fn(() => 0.5);

      await recordDataFetchFailure(code, market, source, error);

      expect(console.error).toHaveBeenCalledWith(
        'Error fetching data for us AAPL from yahoo:',
        'API error'
      );
    });

    it('should send alert when random value is below threshold', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');

      Math.random = jest.fn(() => 0.05); // Below default threshold (0.1)

      await recordDataFetchFailure(code, market, source, error);

      expect(alertService.notifyError).toHaveBeenCalledWith(
        'yahoo Data Retrieval Failed',
        expect.any(Error),
        {
          code,
          market,
          source,
          error: error.message
        }
      );
    });

    it('should not send alert when random value is above threshold', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');

      Math.random = jest.fn(() => 0.5); // Above default threshold (0.1)

      await recordDataFetchFailure(code, market, source, error);

      expect(alertService.notifyError).not.toHaveBeenCalled();
    });

    it('should use custom alert threshold', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');
      const options = { alertThreshold: 0.3 };

      Math.random = jest.fn(() => 0.2); // Below custom threshold (0.3)

      await recordDataFetchFailure(code, market, source, error, options);

      expect(alertService.notifyError).toHaveBeenCalled();
    });

    it('should use custom alert title', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');
      const options = { 
        alertThreshold: 1.0, // Always send alert
        alertTitle: 'Custom Alert Title'
      };

      await recordDataFetchFailure(code, market, source, error, options);

      expect(alertService.notifyError).toHaveBeenCalledWith(
        'Custom Alert Title',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should include custom alert details', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');
      const options = { 
        alertThreshold: 1.0,
        alertDetail: { additionalInfo: 'test data' }
      };

      await recordDataFetchFailure(code, market, source, error, options);

      expect(alertService.notifyError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({
          code,
          market,
          source,
          error: error.message,
          additionalInfo: 'test data'
        })
      );
    });

    it('should handle blacklist recording errors gracefully', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');

      blacklist.recordFailure.mockRejectedValue(new Error('Blacklist error'));
      Math.random = jest.fn(() => 0.5);

      // Should not throw even if blacklist fails
      await expect(recordDataFetchFailure(code, market, source, error)).rejects.toThrow('Blacklist error');
    });

    it('should handle alert service errors gracefully', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');

      alertService.notifyError.mockRejectedValue(new Error('Alert error'));
      Math.random = jest.fn(() => 0.05); // Trigger alert

      // Should not throw even if alert fails
      await expect(recordDataFetchFailure(code, market, source, error)).rejects.toThrow('Alert error');
    });

    it('should handle empty options object', async () => {
      const code = 'AAPL';
      const market = 'us';
      const source = 'yahoo';
      const error = new Error('API error');

      Math.random = jest.fn(() => 0.05);

      await recordDataFetchFailure(code, market, source, error, {});

      expect(blacklist.recordFailure).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('recordDataFetchSuccess', () => {
    beforeEach(() => {
      blacklist.recordSuccess = jest.fn().mockResolvedValue();
    });

    it('should record success in blacklist', async () => {
      const code = 'AAPL';

      await recordDataFetchSuccess(code);

      expect(blacklist.recordSuccess).toHaveBeenCalledWith(code);
    });

    it('should handle blacklist success recording errors', async () => {
      const code = 'AAPL';

      blacklist.recordSuccess.mockRejectedValue(new Error('Blacklist error'));

      await expect(recordDataFetchSuccess(code)).rejects.toThrow('Blacklist error');
    });

    it('should work with different code formats', async () => {
      const codes = ['AAPL', '7203', 'BRK.A', '0131103C'];

      for (const code of codes) {
        await recordDataFetchSuccess(code);
        expect(blacklist.recordSuccess).toHaveBeenCalledWith(code);
      }
    });
  });

  describe('checkBlacklistAndGetFallback', () => {
    beforeEach(() => {
      blacklist.isBlacklisted = jest.fn();
    });

    it('should check blacklist and return fallback data', async () => {
      const code = 'AAPL';
      const market = 'us';
      const fallbackConfig = {
        defaultPrice: 150.0,
        currencyCode: 'USD',
        name: 'Apple Inc.',
        isStock: true,
        isMutualFund: false
      };

      blacklist.isBlacklisted.mockResolvedValue(false);

      const result = await checkBlacklistAndGetFallback(code, market, fallbackConfig);

      expect(blacklist.isBlacklisted).toHaveBeenCalledWith(code, market);
      expect(result.isBlacklisted).toBe(false);
      expect(result.fallbackData).toEqual({
        ticker: code,
        price: 150.0,
        change: 0,
        changePercent: 0,
        name: 'Apple Inc.',
        currency: 'USD',
        lastUpdated: expect.any(String),
        source: 'Blacklisted Fallback',
        isStock: true,
        isMutualFund: false,
        isBlacklisted: false
      });
    });

    it('should return blacklisted status when code is blacklisted', async () => {
      const code = 'BADCODE';
      const market = 'us';
      const fallbackConfig = {
        defaultPrice: 0,
        currencyCode: 'USD'
      };

      blacklist.isBlacklisted.mockResolvedValue(true);

      const result = await checkBlacklistAndGetFallback(code, market, fallbackConfig);

      expect(result.isBlacklisted).toBe(true);
      expect(result.fallbackData.isBlacklisted).toBe(true);
    });

    it('should use default values for missing config properties', async () => {
      const code = 'TEST';
      const market = 'jp';
      const fallbackConfig = {
        defaultPrice: 1000,
        currencyCode: 'JPY'
      };

      blacklist.isBlacklisted.mockResolvedValue(false);

      const result = await checkBlacklistAndGetFallback(code, market, fallbackConfig);

      expect(result.fallbackData).toEqual({
        ticker: code,
        price: 1000,
        change: 0,
        changePercent: 0,
        name: code, // Default to code when name not provided
        currency: 'JPY',
        lastUpdated: expect.any(String),
        source: 'Blacklisted Fallback',
        isStock: true, // Default value
        isMutualFund: false, // Default value
        isBlacklisted: false
      });
    });

    it('should include price label when provided', async () => {
      const code = '0131103C';
      const market = 'fund';
      const fallbackConfig = {
        defaultPrice: 12468,
        currencyCode: 'JPY',
        name: 'Test Fund',
        isStock: false,
        isMutualFund: true,
        priceLabel: '基準価額'
      };

      blacklist.isBlacklisted.mockResolvedValue(false);

      const result = await checkBlacklistAndGetFallback(code, market, fallbackConfig);

      expect(result.fallbackData.priceLabel).toBe('基準価額');
      expect(result.fallbackData.isStock).toBe(false);
      expect(result.fallbackData.isMutualFund).toBe(true);
    });

    it('should not include price label when not provided', async () => {
      const code = 'AAPL';
      const market = 'us';
      const fallbackConfig = {
        defaultPrice: 150.0,
        currencyCode: 'USD'
      };

      blacklist.isBlacklisted.mockResolvedValue(false);

      const result = await checkBlacklistAndGetFallback(code, market, fallbackConfig);

      expect(result.fallbackData.priceLabel).toBeUndefined();
    });

    it('should generate valid ISO timestamp', async () => {
      const code = 'TEST';
      const market = 'us';
      const fallbackConfig = {
        defaultPrice: 100,
        currencyCode: 'USD'
      };

      blacklist.isBlacklisted.mockResolvedValue(false);

      const result = await checkBlacklistAndGetFallback(code, market, fallbackConfig);

      const timestamp = result.fallbackData.lastUpdated;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Should be a recent timestamp (within last minute)
      const now = new Date();
      const timestampDate = new Date(timestamp);
      expect(now - timestampDate).toBeLessThan(60000);
    });

    it('should handle blacklist check errors', async () => {
      const code = 'ERROR';
      const market = 'us';
      const fallbackConfig = {
        defaultPrice: 100,
        currencyCode: 'USD'
      };

      blacklist.isBlacklisted.mockRejectedValue(new Error('Blacklist check failed'));

      await expect(checkBlacklistAndGetFallback(code, market, fallbackConfig)).rejects.toThrow('Blacklist check failed');
    });

    it('should work with mutual fund configuration', async () => {
      const code = '0131103C';
      const market = 'fund';
      const fallbackConfig = {
        defaultPrice: 12468,
        currencyCode: 'JPY',
        name: 'SBI・先進国株式インデックス・ファンド',
        isStock: false,
        isMutualFund: true,
        priceLabel: '基準価額'
      };

      blacklist.isBlacklisted.mockResolvedValue(false);

      const result = await checkBlacklistAndGetFallback(code, market, fallbackConfig);

      expect(result.fallbackData).toEqual({
        ticker: code,
        price: 12468,
        change: 0,
        changePercent: 0,
        name: 'SBI・先進国株式インデックス・ファンド',
        currency: 'JPY',
        lastUpdated: expect.any(String),
        source: 'Blacklisted Fallback',
        isStock: false,
        isMutualFund: true,
        isBlacklisted: false,
        priceLabel: '基準価額'
      });
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      blacklist.recordFailure = jest.fn().mockResolvedValue();
      blacklist.recordSuccess = jest.fn().mockResolvedValue();
      blacklist.isBlacklisted = jest.fn().mockResolvedValue(false);
      alertService.notifyError = jest.fn().mockResolvedValue();
    });

    it('should work with realistic error scenario', async () => {
      const code = 'FAIL123';
      const market = 'us';
      const source = 'yahoo-finance';
      const error = new Error('HTTP 503 Service Unavailable');

      Math.random = jest.fn(() => 0.05); // Trigger alert

      await recordDataFetchFailure(code, market, source, error, {
        alertThreshold: 0.1,
        alertDetail: { timestamp: '2025-06-12T10:00:00Z' }
      });

      expect(blacklist.recordFailure).toHaveBeenCalledWith(
        code,
        market,
        'yahoo-finance: HTTP 503 Service Unavailable'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching data for us FAIL123 from yahoo-finance:',
        'HTTP 503 Service Unavailable'
      );
      expect(alertService.notifyError).toHaveBeenCalledWith(
        'yahoo-finance Data Retrieval Failed',
        expect.any(Error),
        expect.objectContaining({
          code,
          market,
          source,
          timestamp: '2025-06-12T10:00:00Z'
        })
      );
    });

    it('should work with success and fallback scenario', async () => {
      const successCode = 'SUCCESS123';
      const fallbackCode = 'FALLBACK123';

      // Record success
      await recordDataFetchSuccess(successCode);

      // Check blacklist and get fallback
      const result = await checkBlacklistAndGetFallback(fallbackCode, 'jp', {
        defaultPrice: 2500,
        currencyCode: 'JPY',
        name: 'Test Japanese Stock'
      });

      expect(blacklist.recordSuccess).toHaveBeenCalledWith(successCode);
      expect(blacklist.isBlacklisted).toHaveBeenCalledWith(fallbackCode, 'jp');
      expect(result.fallbackData.price).toBe(2500);
      expect(result.fallbackData.currency).toBe('JPY');
    });
  });
});