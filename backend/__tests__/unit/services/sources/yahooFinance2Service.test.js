const {
  getStockDataFromYahooFinance2,
  getBatchStockData,
  getHistoricalData,
  getExchangeRate,
  isAvailable
} = require('../../../../src/services/sources/yahooFinance2Service');

const { withRetry } = require('../../../../src/utils/retry');
const { DATA_TYPES } = require('../../../../src/config/constants');

jest.mock('../../../../src/utils/retry');
jest.mock('yahoo-finance2', () => ({
  default: {
    quote: jest.fn(),
    historical: jest.fn()
  }
}), { virtual: true });

describe('yahooFinance2Service', () => {
  let mockYahooFinance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the yahoo-finance2 module
    mockYahooFinance = require('yahoo-finance2').default;
    
    // Mock withRetry to simply execute the function
    withRetry.mockImplementation(async (fn) => await fn());
    
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when yahoo-finance2 is available', () => {
      expect(isAvailable()).toBe(true);
    });
  });

  describe('getStockDataFromYahooFinance2', () => {
    it('should fetch US stock data successfully', async () => {
      const mockQuote = {
        regularMarketPrice: 150.50,
        regularMarketChange: 2.50,
        regularMarketChangePercent: 1.69,
        longName: 'Apple Inc.',
        currency: 'USD',
        regularMarketVolume: 50000000,
        marketCap: 2500000000000,
        regularMarketPreviousClose: 148.00,
        regularMarketDayHigh: 151.00,
        regularMarketDayLow: 149.00,
        fiftyTwoWeekHigh: 180.00,
        fiftyTwoWeekLow: 120.00
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getStockDataFromYahooFinance2('AAPL', DATA_TYPES.US_STOCK);

      expect(result).toMatchObject({
        ticker: 'AAPL',
        price: 150.50,
        change: 2.50,
        changePercent: 1.69,
        name: 'Apple Inc.',
        currency: 'USD',
        source: 'Yahoo Finance2 (npm)',
        isStock: true,
        isMutualFund: false,
        volume: 50000000,
        marketCap: 2500000000000,
        previousClose: 148.00,
        dayHigh: 151.00,
        dayLow: 149.00,
        week52High: 180.00,
        week52Low: 120.00
      });
      expect(result.lastUpdated).toBeDefined();
    });

    it('should fetch Japanese stock data with .T suffix', async () => {
      const mockQuote = {
        regularMarketPrice: 2850.5,
        regularMarketChange: 25.0,
        regularMarketChangePercent: 0.88,
        longName: 'Toyota Motor Corporation',
        currency: 'JPY',
        regularMarketVolume: 8500000,
        marketCap: 250000000000,
        regularMarketPreviousClose: 2825.5
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getStockDataFromYahooFinance2('7203', DATA_TYPES.JP_STOCK);

      expect(mockYahooFinance.quote).toHaveBeenCalledWith('7203.T');
      expect(result).toMatchObject({
        ticker: '7203',
        price: 2850.5,
        change: 25.0,
        changePercent: 0.88,
        name: 'Toyota Motor Corporation',
        currency: 'JPY'
      });
    });

    it('should handle symbol that already has suffix', async () => {
      const mockQuote = {
        regularMarketPrice: 2850.5,
        longName: 'Toyota Motor Corporation'
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      await getStockDataFromYahooFinance2('7203.T', DATA_TYPES.JP_STOCK);

      expect(mockYahooFinance.quote).toHaveBeenCalledWith('7203.T');
    });

    it('should handle missing optional fields', async () => {
      const mockQuote = {
        regularMarketPrice: 100.0,
        shortName: 'TEST'
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getStockDataFromYahooFinance2('TEST', DATA_TYPES.US_STOCK);

      expect(result).toMatchObject({
        ticker: 'TEST',
        price: 100.0,
        change: 0,
        changePercent: 0,
        name: 'TEST',
        currency: 'USD',
        volume: 0,
        marketCap: 0
      });
    });

    it('should default to symbol name when no name is provided', async () => {
      const mockQuote = {
        regularMarketPrice: 100.0
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getStockDataFromYahooFinance2('UNKNOWN', DATA_TYPES.US_STOCK);

      expect(result.name).toBe('UNKNOWN');
    });

    it('should use price as previousClose when regularMarketPreviousClose is missing', async () => {
      const mockQuote = {
        regularMarketPrice: 100.0,
        price: 99.5
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getStockDataFromYahooFinance2('TEST', DATA_TYPES.US_STOCK);

      expect(result.previousClose).toBe(99.5);
    });

    it('should handle invalid quote data', async () => {
      mockYahooFinance.quote.mockResolvedValue(null);

      await expect(getStockDataFromYahooFinance2('INVALID', DATA_TYPES.US_STOCK))
        .rejects.toThrow('Invalid quote data received');
    });

    it('should handle quote without price', async () => {
      mockYahooFinance.quote.mockResolvedValue({
        name: 'Test Stock'
      });

      await expect(getStockDataFromYahooFinance2('INVALID', DATA_TYPES.US_STOCK))
        .rejects.toThrow('Invalid quote data received');
    });

    it('should handle API errors', async () => {
      mockYahooFinance.quote.mockRejectedValue(new Error('API Error'));

      await expect(getStockDataFromYahooFinance2('ERROR', DATA_TYPES.US_STOCK))
        .rejects.toThrow('API Error');
    });

    it('should apply retry logic', async () => {
      const mockQuote = {
        regularMarketPrice: 100.0
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      await getStockDataFromYahooFinance2('TEST', DATA_TYPES.US_STOCK);

      expect(withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { maxRetries: 2, delay: 1000 }
      );
    });

    it('should set correct currency for Japanese stocks', async () => {
      const mockQuote = {
        regularMarketPrice: 2850.5
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getStockDataFromYahooFinance2('7203', DATA_TYPES.JP_STOCK);

      expect(result.currency).toBe('JPY');
    });

    it('should set correct currency for US stocks', async () => {
      const mockQuote = {
        regularMarketPrice: 150.50
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getStockDataFromYahooFinance2('AAPL', DATA_TYPES.US_STOCK);

      expect(result.currency).toBe('USD');
    });
  });

  describe('getBatchStockData', () => {
    it('should fetch multiple stocks successfully', async () => {
      const mockQuote1 = {
        regularMarketPrice: 150.50,
        longName: 'Apple Inc.'
      };
      const mockQuote2 = {
        regularMarketPrice: 2850.5,
        longName: 'Toyota Motor'
      };

      mockYahooFinance.quote
        .mockResolvedValueOnce(mockQuote1)
        .mockResolvedValueOnce(mockQuote2);

      const result = await getBatchStockData(['AAPL', '7203'], DATA_TYPES.US_STOCK);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['AAPL']).toMatchObject({
        ticker: 'AAPL',
        price: 150.50,
        name: 'Apple Inc.'
      });
      expect(result['7203']).toMatchObject({
        ticker: '7203',
        price: 2850.5,
        name: 'Toyota Motor'
      });
    });

    it('should handle partial failures', async () => {
      const mockQuote = {
        regularMarketPrice: 150.50,
        longName: 'Apple Inc.'
      };

      mockYahooFinance.quote
        .mockResolvedValueOnce(mockQuote)
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await getBatchStockData(['AAPL', 'ERROR'], DATA_TYPES.US_STOCK);

      expect(result['AAPL']).toBeTruthy();
      expect(result['ERROR']).toBeNull();
    });

    it('should handle empty symbols array', async () => {
      const result = await getBatchStockData([], DATA_TYPES.US_STOCK);

      expect(result).toEqual({});
      expect(mockYahooFinance.quote).not.toHaveBeenCalled();
    });

    it('should process all symbols even with some failures', async () => {
      mockYahooFinance.quote
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockRejectedValueOnce(new Error('Error 3'));

      const result = await getBatchStockData(['ERR1', 'ERR2', 'ERR3'], DATA_TYPES.US_STOCK);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['ERR1']).toBeNull();
      expect(result['ERR2']).toBeNull();
      expect(result['ERR3']).toBeNull();
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch historical data successfully', async () => {
      const mockHistoricalData = [
        {
          date: new Date('2024-01-15'),
          open: 149.0,
          high: 151.0,
          low: 148.5,
          close: 150.5,
          volume: 50000000,
          adjClose: 150.5
        },
        {
          date: new Date('2024-01-16'),
          open: 150.5,
          high: 152.0,
          low: 149.0,
          close: 151.0,
          volume: 45000000,
          adjClose: 151.0
        }
      ];

      mockYahooFinance.historical.mockResolvedValue(mockHistoricalData);

      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-16');
      const result = await getHistoricalData('AAPL', startDate, endDate);

      expect(mockYahooFinance.historical).toHaveBeenCalledWith('AAPL', {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        date: new Date('2024-01-15'),
        open: 149.0,
        high: 151.0,
        low: 148.5,
        close: 150.5,
        volume: 50000000,
        adjustedClose: 150.5
      });
    });

    it('should handle historical data API errors', async () => {
      mockYahooFinance.historical.mockRejectedValue(new Error('Historical API Error'));

      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-16');

      await expect(getHistoricalData('AAPL', startDate, endDate))
        .rejects.toThrow('Historical API Error');
    });

    it('should handle empty historical data', async () => {
      mockYahooFinance.historical.mockResolvedValue([]);

      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-16');
      const result = await getHistoricalData('AAPL', startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('getExchangeRate', () => {
    it('should fetch exchange rate successfully', async () => {
      const mockQuote = {
        regularMarketPrice: 148.5,
        regularMarketChange: -1.2,
        regularMarketChangePercent: -0.8
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getExchangeRate('USD', 'JPY');

      expect(mockYahooFinance.quote).toHaveBeenCalledWith('USDJPY=X');
      expect(result).toMatchObject({
        pair: 'USD-JPY',
        rate: 148.5,
        change: -1.2,
        changePercent: -0.8,
        source: 'Yahoo Finance2 (npm)'
      });
      expect(result.lastUpdated).toBeDefined();
    });

    it('should handle missing change data', async () => {
      const mockQuote = {
        regularMarketPrice: 148.5
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      const result = await getExchangeRate('USD', 'JPY');

      expect(result).toMatchObject({
        pair: 'USD-JPY',
        rate: 148.5,
        change: 0,
        changePercent: 0
      });
    });

    it('should handle exchange rate API errors', async () => {
      mockYahooFinance.quote.mockRejectedValue(new Error('Exchange Rate API Error'));

      await expect(getExchangeRate('USD', 'JPY'))
        .rejects.toThrow('Exchange Rate API Error');
    });

    it('should construct correct symbol for different currency pairs', async () => {
      const mockQuote = {
        regularMarketPrice: 1.1
      };

      mockYahooFinance.quote.mockResolvedValue(mockQuote);

      await getExchangeRate('EUR', 'USD');

      expect(mockYahooFinance.quote).toHaveBeenCalledWith('EURUSD=X');
    });
  });

  describe('package availability', () => {
    // Note: Testing the actual module import behavior would require more complex setup
    // These tests cover the behavior when the package is available
    it('should handle when yahoo-finance2 is available', () => {
      expect(isAvailable()).toBe(true);
    });
  });
});