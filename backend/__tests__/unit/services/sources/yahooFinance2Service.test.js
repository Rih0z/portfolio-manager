const sinon = require('sinon');
const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
const { DATA_TYPES } = require('../../../../src/config/constants');

describe('yahooFinance2Service', () => {
  let yahooFinanceMock;

  beforeEach(() => {
    // Reset module cache to ensure clean mocks
    jest.resetModules();
    
    // Create mock for yahoo-finance2
    yahooFinanceMock = {
      quote: sinon.stub()
    };
    
    // Mock the yahoo-finance2 module
    jest.doMock('yahoo-finance2', () => ({
      default: yahooFinanceMock
    }));
  });

  afterEach(() => {
    sinon.restore();
    jest.clearAllMocks();
  });

  describe('getStockDataFromYahooFinance2', () => {
    it('should fetch US stock data successfully', async () => {
      const mockQuote = {
        symbol: 'AAPL',
        regularMarketPrice: 195.89,
        regularMarketChange: 1.23,
        regularMarketChangePercent: 0.63,
        regularMarketVolume: 50123456,
        regularMarketDayHigh: 196.50,
        regularMarketDayLow: 194.20,
        regularMarketOpen: 194.80,
        regularMarketPreviousClose: 194.66,
        marketCap: 3048000000000,
        currency: 'USD',
        displayName: 'Apple Inc.',
        longName: 'Apple Inc.',
        regularMarketTime: new Date('2024-01-15T16:00:00.000Z')
      };

      yahooFinanceMock.quote.resolves(mockQuote);

      // Re-require the module to use the mocked version
      const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
      
      const result = await getStockDataFromYahooFinance2('AAPL', DATA_TYPES.US_STOCK);

      expect(result).toMatchObject({
        ticker: 'AAPL',
        price: 195.89,
        change: 1.23,
        changePercent: 0.63,
        volume: 50123456,
        high: 196.50,
        low: 194.20,
        open: 194.80,
        previousClose: 194.66,
        marketCap: 3048000000000,
        currency: 'USD',
        name: 'Apple Inc.',
        source: 'yahoo-finance2'
      });

      expect(yahooFinanceMock.quote).toHaveBeenCalledWith('AAPL');
    });

    it('should fetch Japanese stock data with .T suffix', async () => {
      const mockQuote = {
        symbol: '7203.T',
        regularMarketPrice: 2850.50,
        regularMarketChange: 25.00,
        regularMarketChangePercent: 0.88,
        regularMarketVolume: 8500000,
        currency: 'JPY',
        displayName: 'トヨタ自動車',
        longName: 'Toyota Motor Corporation'
      };

      yahooFinanceMock.quote.resolves(mockQuote);

      const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
      
      const result = await getStockDataFromYahooFinance2('7203', DATA_TYPES.JP_STOCK);

      expect(result.ticker).toBe('7203');
      expect(result.price).toBe(2850.50);
      expect(result.currency).toBe('JPY');
      expect(yahooFinanceMock.quote).toHaveBeenCalledWith('7203.T');
    });

    it('should handle stocks already with .T suffix', async () => {
      const mockQuote = {
        symbol: '7203.T',
        regularMarketPrice: 2850.50,
        currency: 'JPY'
      };

      yahooFinanceMock.quote.resolves(mockQuote);

      const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
      
      await getStockDataFromYahooFinance2('7203.T', DATA_TYPES.JP_STOCK);

      expect(yahooFinanceMock.quote).toHaveBeenCalledWith('7203.T');
    });

    it('should throw error when yahoo-finance2 is not installed', async () => {
      // Mock module not found
      jest.doMock('yahoo-finance2', () => {
        throw new Error('Cannot find module');
      });

      const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
      
      await expect(getStockDataFromYahooFinance2('AAPL', DATA_TYPES.US_STOCK))
        .rejects.toThrow('yahoo-finance2 package not installed');
    });

    it('should throw error when quote returns invalid data', async () => {
      yahooFinanceMock.quote.resolves(null);

      const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
      
      await expect(getStockDataFromYahooFinance2('AAPL', DATA_TYPES.US_STOCK))
        .rejects.toThrow('Invalid quote data received');
    });

    it('should throw error when regularMarketPrice is missing', async () => {
      yahooFinanceMock.quote.resolves({
        symbol: 'AAPL',
        // Missing regularMarketPrice
      });

      const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
      
      await expect(getStockDataFromYahooFinance2('AAPL', DATA_TYPES.US_STOCK))
        .rejects.toThrow('Invalid quote data received');
    });

    it('should handle API errors with retry', async () => {
      const error = new Error('API Error');
      yahooFinanceMock.quote.onFirstCall().rejects(error);
      yahooFinanceMock.quote.onSecondCall().resolves({
        symbol: 'AAPL',
        regularMarketPrice: 195.89,
        currency: 'USD'
      });

      const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
      
      const result = await getStockDataFromYahooFinance2('AAPL', DATA_TYPES.US_STOCK);

      expect(result.price).toBe(195.89);
      expect(yahooFinanceMock.quote).toHaveBeenCalledTimes(2);
    });

    it('should handle exchange rate queries', async () => {
      const mockQuote = {
        symbol: 'USDJPY=X',
        regularMarketPrice: 150.25,
        regularMarketChange: 0.35,
        regularMarketChangePercent: 0.23,
        currency: 'JPY'
      };

      yahooFinanceMock.quote.resolves(mockQuote);

      const { getStockDataFromYahooFinance2 } = require('../../../../src/services/sources/yahooFinance2Service');
      
      const result = await getStockDataFromYahooFinance2('USDJPY=X', DATA_TYPES.EXCHANGE_RATE);

      expect(result.ticker).toBe('USDJPY=X');
      expect(result.price).toBe(150.25);
      expect(yahooFinanceMock.quote).toHaveBeenCalledWith('USDJPY=X');
    });
  });
});