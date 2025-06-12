const { 
  getMutualFundData, 
  getMutualFundsParallel,
  fetchFundPriceFromMorningstar 
} = require('../../../../src/services/sources/fundDataService');
const axios = require('axios');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { withRetry } = require('../../../../src/utils/retry');
const blacklist = require('../../../../src/utils/scrapingBlacklist');
const alertService = require('../../../../src/services/alerts');
const cache = require('../../../../src/services/cache');

jest.mock('axios');
jest.mock('iconv-lite');
jest.mock('csv-parse/sync');
jest.mock('../../../../src/utils/retry');
jest.mock('../../../../src/utils/scrapingBlacklist');
jest.mock('../../../../src/services/alerts');
jest.mock('../../../../src/services/cache');

describe('fundDataService Enhanced Tests', () => {
  let originalConsole;

  beforeEach(() => {
    originalConsole = console.log;
    console.log = jest.fn();
    jest.clearAllMocks();

    // Default mocks
    blacklist.isBlacklisted.mockResolvedValue(false);
    blacklist.recordSuccess.mockResolvedValue();
    blacklist.recordFailure.mockResolvedValue();
    cache.getMultiple.mockResolvedValue({});
    cache.putMultiple.mockResolvedValue();
    alertService.notifyError.mockResolvedValue();
  });

  afterEach(() => {
    console.log = originalConsole;
  });

  describe('Shift_JIS Encoding Tests', () => {
    it('should correctly convert Shift_JIS to UTF-8', async () => {
      const fundCode = '0131103C';
      const shiftJISBuffer = Buffer.from('偽のShift_JISデータ');
      const csvData = `"日付","基準価額"\n"2025/06/12","12468"`;

      axios.get.mockResolvedValue({
        data: shiftJISBuffer
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '12468' }
      ]);

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(iconv.decode).toHaveBeenCalledWith(shiftJISBuffer, 'Shift_JIS');
      expect(result.price).toBe(12468);
    });

    it('should handle encoding errors gracefully', async () => {
      const fundCode = '0131103C';

      axios.get.mockResolvedValue({
        data: Buffer.from('invalid data')
      });

      iconv.decode.mockImplementation(() => {
        throw new Error('Invalid encoding');
      });

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(result.ticker).toBe(fundCode);
      expect(result.price).toBe(10000); // Fallback value
      expect(result.source).toBe('Fallback');
    });
  });

  describe('Network Error Handling', () => {
    it('should handle timeout errors', async () => {
      const fundCode = '0131103C';
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';

      withRetry.mockRejectedValue(timeoutError);

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000);
      expect(result.source).toBe('Fallback');
      expect(blacklist.recordFailure).toHaveBeenCalledWith(
        fundCode, 
        'fund', 
        expect.stringContaining('Request timeout')
      );
    });

    it('should handle 404 errors', async () => {
      const fundCode = '0131103C';
      const notFoundError = new Error('Request failed with status code 404');
      notFoundError.response = { status: 404 };

      withRetry.mockRejectedValue(notFoundError);

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000);
      expect(result.source).toBe('Fallback');
    });

    it('should handle connection errors', async () => {
      const fundCode = '0131103C';
      const connError = new Error('ECONNREFUSED');
      connError.code = 'ECONNREFUSED';

      withRetry.mockRejectedValue(connError);

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000);
      expect(result.source).toBe('Fallback');
    });
  });

  describe('CSV Parsing Edge Cases', () => {
    it('should handle empty CSV data', async () => {
      const fundCode = '0131103C';

      axios.get.mockResolvedValue({
        data: Buffer.from('')
      });

      iconv.decode.mockReturnValue('');
      parse.mockReturnValue([]);

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000);
      expect(result.source).toBe('Fallback');
    });

    it('should handle CSV without price column', async () => {
      const fundCode = '0131103C';
      const csvData = `"日付","運用会社"\n"2025/06/12","三菱UFJ"`;

      axios.get.mockResolvedValue({
        data: Buffer.from(csvData)
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '運用会社': '三菱UFJ' }
      ]);

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000);
      expect(result.source).toBe('Fallback');
    });

    it('should handle malformed CSV data', async () => {
      const fundCode = '0131103C';
      const malformedCSV = `"日付,"基準価額"\n"2025/06/12,"12468"`;

      axios.get.mockResolvedValue({
        data: Buffer.from(malformedCSV)
      });

      iconv.decode.mockReturnValue(malformedCSV);
      parse.mockImplementation(() => {
        throw new Error('CSV parse error');
      });

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000);
      expect(result.source).toBe('Fallback');
    });

    it('should handle zero price', async () => {
      const fundCode = '0131103C';
      const csvData = `"日付","基準価額"\n"2025/06/12","0"`;

      axios.get.mockResolvedValue({
        data: Buffer.from(csvData)
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '0' }
      ]);

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000); // Should fallback
      expect(result.source).toBe('Fallback');
    });

    it('should handle negative price', async () => {
      const fundCode = '0131103C';
      const csvData = `"日付","基準価額"\n"2025/06/12","-100"`;

      axios.get.mockResolvedValue({
        data: Buffer.from(csvData)
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '-100' }
      ]);

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000); // Should fallback
      expect(result.source).toBe('Fallback');
    });
  });

  describe('Fund Code Normalization', () => {
    it('should remove .T suffix from fund code', async () => {
      const fundCode = '0131103C.T';
      const normalizedCode = '0131103C';
      const csvData = `"日付","基準価額"\n"2025/06/12","12468"`;

      axios.get.mockResolvedValue({
        data: Buffer.from(csvData)
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '12468' }
      ]);

      withRetry.mockImplementation(fn => fn());

      await getMutualFundData(fundCode);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(normalizedCode),
        expect.any(Object)
      );
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient errors', async () => {
      const fundCode = '0131103C';
      let callCount = 0;

      withRetry.mockImplementation(async (fn) => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Transient error');
        }
        return fn();
      });

      axios.get.mockResolvedValue({
        data: Buffer.from('data')
      });

      iconv.decode.mockReturnValue(`"日付","基準価額"\n"2025/06/12","12468"`);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '12468' }
      ]);

      const result = await getMutualFundData(fundCode);

      expect(callCount).toBe(3);
      expect(result.price).toBe(12468);
    });

    it('should fail after max retries', async () => {
      const fundCode = '0131103C';

      withRetry.mockRejectedValue(new Error('Permanent error'));

      const result = await getMutualFundData(fundCode);

      expect(result.price).toBe(10000);
      expect(result.source).toBe('Fallback');
    });
  });

  describe('Parallel Processing', () => {
    it('should handle rate limiting in parallel requests', async () => {
      const fundCodes = ['0131103C', '03311169', '04311057'];
      const sleepMock = jest.fn().mockResolvedValue();
      
      // Mock the sleep function
      global.sleep = sleepMock;

      blacklist.getBlacklistedItems.mockResolvedValue([]);

      const csvData = `"日付","基準価額"\n"2025/06/12","12468"`;
      axios.get.mockResolvedValue({
        data: Buffer.from(csvData)
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '12468' }
      ]);

      withRetry.mockImplementation(fn => fn());

      await getMutualFundsParallel(fundCodes);

      // Should have sleep calls between requests
      expect(sleepMock).toHaveBeenCalled();
    });

    it('should handle mixed success and failure in parallel', async () => {
      const fundCodes = ['0131103C', 'BADFUND'];

      blacklist.getBlacklistedItems.mockResolvedValue(['BADFUND']);

      const csvData = `"日付","基準価額"\n"2025/06/12","12468"`;
      
      axios.get.mockImplementation((url) => {
        if (url.includes('0131103C')) {
          return Promise.resolve({ data: Buffer.from(csvData) });
        }
        throw new Error('Fund not found');
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '12468' }
      ]);

      withRetry.mockImplementation(fn => fn());

      const results = await getMutualFundsParallel(fundCodes);

      expect(results['0131103C'].price).toBe(12468);
      expect(results['BADFUND'].price).toBe(10000);
      expect(results['BADFUND'].source).toBe('Blacklisted Fallback');
    });
  });

  describe('Alert System', () => {
    it('should send alert on multiple failures', async () => {
      const fundCode = 'ALERTTEST';
      const error = new Error('Critical error');

      withRetry.mockRejectedValue(error);

      Math.random = jest.fn().mockReturnValue(0.05); // Trigger alert

      await getMutualFundData(fundCode);

      expect(alertService.notifyError).toHaveBeenCalledWith(
        'Morningstar Scraping Failed',
        expect.any(Error),
        expect.objectContaining({
          fundCode,
          source: 'morningstar'
        })
      );
    });
  });

  describe('Cache Functionality', () => {
    it('should use cached data when available', async () => {
      const fundCode = '0131103C';
      const cachedData = {
        ticker: fundCode,
        price: 12500,
        source: 'Cache'
      };

      cache.getMultiple.mockResolvedValue({
        [`fund:${fundCode}`]: cachedData
      });

      const result = await getMutualFundData(fundCode);

      expect(result).toEqual(cachedData);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should cache successful responses', async () => {
      const fundCode = '0131103C';
      const csvData = `"日付","基準価額"\n"2025/06/12","12468"`;

      axios.get.mockResolvedValue({
        data: Buffer.from(csvData)
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '12468' }
      ]);

      withRetry.mockImplementation(fn => fn());

      await getMutualFundData(fundCode);

      expect(cache.putMultiple).toHaveBeenCalledWith(
        expect.objectContaining({
          [`fund:${fundCode}`]: expect.objectContaining({
            price: 12468
          })
        }),
        expect.any(Number)
      );
    });
  });

  describe('Date Handling', () => {
    it('should handle missing date for previous data', async () => {
      const fundCode = '0131103C';
      const csvData = `"日付","基準価額"\n"","12468"`;

      axios.get.mockResolvedValue({
        data: Buffer.from(csvData)
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '', '基準価額': '12468' }
      ]);

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(result.change).toBe(0);
      expect(result.changePercent).toBe(0);
    });

    it('should calculate change correctly when previous day data exists', async () => {
      const fundCode = '0131103C';
      const csvData = `"日付","基準価額"\n"2025/06/12","12468"\n"2025/06/11","12345"`;

      axios.get.mockResolvedValue({
        data: Buffer.from(csvData)
      });

      iconv.decode.mockReturnValue(csvData);
      parse.mockReturnValue([
        { '日付': '2025/06/12', '基準価額': '12468' },
        { '日付': '2025/06/11', '基準価額': '12345' }
      ]);

      withRetry.mockImplementation(fn => fn());

      const result = await getMutualFundData(fundCode);

      expect(result.change).toBe(123); // 12468 - 12345
      expect(result.changePercent).toBeCloseTo(0.9963); // (123/12345) * 100
    });
  });
});