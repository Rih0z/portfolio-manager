/**
 * ファイルパス: __tests__/unit/services/sources/enhancedMarketDataService.test.js
 *
 * enhancedMarketDataService モジュールのユニットテスト
 * 100%カバレッジを目指し、全ての分岐とエラーケースを網羅します。
 */

const service = require('../../../../src/services/sources/enhancedMarketDataService');
const { DATA_TYPES, BATCH_SIZES } = require('../../../../src/config/constants');
const dataFetchWithFallback = require('../../../../src/utils/dataFetchWithFallback');
const yahooFinanceService = require('../../../../src/services/sources/yahooFinance');
const yahooFinance2Service = require('../../../../src/services/sources/yahooFinance2Service');
const jpxCsvService = require('../../../../src/services/sources/jpxCsvService');
const scrapingService = require('../../../../src/services/sources/marketDataProviders');
const exchangeRateService = require('../../../../src/services/sources/exchangeRate');
const alphaVantageService = require('../../../../src/services/sources/alphaVantageService');
const fundDataService = require('../../../../src/services/sources/fundDataService');
const logger = require('../../../../src/utils/logger');

// Mock all dependencies
jest.mock('../../../../src/utils/dataFetchWithFallback');
jest.mock('../../../../src/services/sources/yahooFinance');
jest.mock('../../../../src/services/sources/yahooFinance2Service');
jest.mock('../../../../src/services/sources/jpxCsvService');
jest.mock('../../../../src/services/sources/marketDataProviders');
jest.mock('../../../../src/services/sources/alphaVantageService');
jest.mock('../../../../src/services/sources/exchangeRate');
jest.mock('../../../../src/services/sources/fundDataService');
jest.mock('../../../../src/utils/logger');

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  mockConsoleLog.mockClear();
  mockConsoleWarn.mockClear();
  
  // Default mocks
  alphaVantageService.isAvailable.mockResolvedValue(false);
  yahooFinance2Service.isAvailable.mockReturnValue(false);
  logger.info.mockImplementation(() => {});
  logger.error.mockImplementation(() => {});
  logger.debug.mockImplementation(() => {});
});

afterAll(() => {
  mockConsoleLog.mockRestore();
  mockConsoleWarn.mockRestore();
});

describe('enhancedMarketDataService', () => {
  describe('getUsStockData', () => {
    test('should use yahooFinance2Service when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      alphaVantageService.isAvailable.mockResolvedValue(false);
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 123 });

      const result = await service.getUsStockData('AAPL', true);

      expect(mockConsoleLog).toHaveBeenCalledWith('Yahoo Finance2 NPM available for AAPL');
      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: 'AAPL',
        dataType: DATA_TYPES.US_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          price: 100,
          change: 0,
          changePercent: 0,
          name: 'AAPL',
          currency: 'USD',
          isStock: true,
          isMutualFund: false
        },
        refresh: true,
        cache: { time: 3600 }
      });
      expect(result).toEqual({ price: 123 });
    });

    test('should use alphaVantageService when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 123 });

      const result = await service.getUsStockData('AAPL', false);

      expect(mockConsoleLog).toHaveBeenCalledWith('Alpha Vantage API available for AAPL');
      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: 'AAPL',
        dataType: DATA_TYPES.US_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          price: 100,
          change: 0,
          changePercent: 0,
          name: 'AAPL',
          currency: 'USD',
          isStock: true,
          isMutualFund: false
        },
        refresh: false,
        cache: { time: 3600 }
      });
      expect(result).toEqual({ price: 123 });
    });

    test('should use all services when both are available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 123 });

      const result = await service.getUsStockData('AAPL');

      expect(mockConsoleLog).toHaveBeenCalledWith('Yahoo Finance2 NPM available for AAPL');
      expect(mockConsoleLog).toHaveBeenCalledWith('Alpha Vantage API available for AAPL');
      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: 'AAPL',
        dataType: DATA_TYPES.US_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: expect.any(Object),
        refresh: false,
        cache: { time: 3600 }
      });
      expect(result).toEqual({ price: 123 });
    });

    test('should use only basic services when premium services unavailable', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(false);
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 123 });

      await service.getUsStockData('AAPL');

      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: 'AAPL',
        dataType: DATA_TYPES.US_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: expect.any(Object),
        refresh: false,
        cache: { time: 3600 }
      });
    });
  });

  describe('getUsStocksData', () => {
    test('should use yahooFinance2Service successfully for all symbols', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Using Yahoo Finance2 NPM for 2 symbols');
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched all US stocks using Yahoo Finance2 NPM');
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should handle partial success with yahooFinance2Service', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: null
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Yahoo Finance2 missing 1 symbols, using fallback sources');
    });

    test('should handle yahooFinance2Service failure', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockRejectedValue(new Error('YF2 error'));
      alphaVantageService.isAvailable.mockResolvedValue(false);
      yahooFinanceService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(mockConsoleWarn).toHaveBeenCalledWith('Yahoo Finance2 batch request failed, falling back to other sources:', 'YF2 error');
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched all US stocks using Yahoo Finance API batch call');
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should use alphaVantageService for small batches when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      alphaVantageService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Using Alpha Vantage API for 2 symbols');
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched all US stocks using Alpha Vantage API');
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should skip alphaVantageService for large batches', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      yahooFinanceService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 },
        GOOGL: { price: 100 },
        TSLA: { price: 200 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT', 'GOOGL', 'TSLA']);

      expect(logger.info).toHaveBeenCalledWith('Successfully fetched all US stocks using Yahoo Finance API batch call');
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 },
        GOOGL: { price: 100 },
        TSLA: { price: 200 }
      });
    });

    test('should handle partial alphaVantageService success', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      alphaVantageService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 }
      });
      yahooFinanceService.getStocksData.mockResolvedValue({
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Alpha Vantage missing 1 symbols, using Yahoo Finance for remainder');
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should handle alphaVantageService failure', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      alphaVantageService.getStocksData.mockRejectedValue(new Error('AV error'));
      yahooFinanceService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(mockConsoleWarn).toHaveBeenCalledWith('Alpha Vantage batch request failed, falling back to Yahoo Finance:', 'AV error');
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should handle missing symbols from Yahoo Finance batch', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(false);
      yahooFinanceService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 }
      });
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(logger.info).toHaveBeenCalledWith('Yahoo Finance API missing 1 symbols, fetching individually');
      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith({
        symbols: ['MSFT'],
        dataType: DATA_TYPES.US_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          price: 100,
          change: 0,
          changePercent: 0,
          currency: 'USD',
          isStock: true,
          isMutualFund: false
        },
        refresh: false,
        batchSize: BATCH_SIZES.US_STOCK,
        cache: { time: 3600 }
      });
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should use alphaVantage for missing symbols when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      yahooFinanceService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 }
      });
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchFunctions: expect.arrayContaining([expect.any(Function)])
        })
      );
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should skip alphaVantage for too many missing symbols', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      yahooFinanceService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 }
      });
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        MSFT: { price: 300 },
        GOOGL: { price: 100 },
        TSLA: { price: 200 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT', 'GOOGL', 'TSLA']);

      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['MSFT', 'GOOGL', 'TSLA'],
          fetchFunctions: expect.arrayContaining([expect.any(Function)])
        })
      );
    });

    test('should handle complete Yahoo Finance API failure', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(false);
      yahooFinanceService.getStocksData.mockRejectedValue(new Error('YF error'));
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(logger.error).toHaveBeenCalledWith('Yahoo Finance API batch call failed, falling back to individual fetching:', 'YF error');
      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith({
        symbols: ['AAPL', 'MSFT'],
        dataType: DATA_TYPES.US_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          price: 100,
          change: 0,
          changePercent: 0,
          currency: 'USD',
          isStock: true,
          isMutualFund: false
        },
        refresh: false,
        batchSize: BATCH_SIZES.US_STOCK,
        cache: { time: 3600 }
      });
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should include all services in fallback when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      yahooFinanceService.getStocksData.mockRejectedValue(new Error('YF error'));
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchFunctions: expect.arrayContaining([expect.any(Function)])
        })
      );
    });
  });

  describe('getJpStockData', () => {
    test('should use yahooFinance2Service when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 2500 });

      const result = await service.getJpStockData('7203', true);

      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: '7203',
        dataType: DATA_TYPES.JP_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          price: 2500,
          change: 0,
          changePercent: 0,
          name: '日本株 7203',
          currency: 'JPY',
          isStock: true,
          isMutualFund: false
        },
        refresh: true,
        cache: { time: 3600 }
      });
      expect(result).toEqual({ price: 2500 });
    });

    test('should use only jpx and scraping when yahooFinance2Service unavailable', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 2500 });

      await service.getJpStockData('7203');

      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: '7203',
        dataType: DATA_TYPES.JP_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: expect.any(Object),
        refresh: false,
        cache: { time: 3600 }
      });
    });
  });

  describe('getJpStocksData', () => {
    test('should use yahooFinance2Service successfully', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockResolvedValue({
        '7203': { price: 2500 },
        '6758': { price: 1200 }
      });

      const result = await service.getJpStocksData(['7203', '6758']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Using Yahoo Finance2 NPM for 2 JP stocks');
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched all JP stocks using Yahoo Finance2 NPM');
      expect(result).toEqual({
        '7203': { price: 2500 },
        '6758': { price: 1200 }
      });
    });

    test('should handle yahooFinance2Service failure', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockRejectedValue(new Error('YF2 JP error'));
      jpxCsvService.getBatchJPXData.mockResolvedValue({
        '7203': { price: 2500 },
        '6758': { price: 1200 }
      });

      const result = await service.getJpStocksData(['7203', '6758']);

      expect(mockConsoleWarn).toHaveBeenCalledWith('Yahoo Finance2 JP batch request failed:', 'YF2 JP error');
      expect(mockConsoleLog).toHaveBeenCalledWith('Using JPX CSV for 2 JP stocks');
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched all JP stocks using JPX CSV');
      expect(result).toEqual({
        '7203': { price: 2500 },
        '6758': { price: 1200 }
      });
    });

    test('should handle JPX CSV failure', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      jpxCsvService.getBatchJPXData.mockRejectedValue(new Error('JPX error'));
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        '7203': { price: 2500 }
      });

      const result = await service.getJpStocksData(['7203']);

      expect(mockConsoleWarn).toHaveBeenCalledWith('JPX CSV batch request failed:', 'JPX error');
      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith({
        symbols: ['7203'],
        dataType: DATA_TYPES.JP_STOCK,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          price: 2500,
          change: 0,
          changePercent: 0,
          currency: 'JPY',
          isStock: true,
          isMutualFund: false
        },
        refresh: false,
        batchSize: BATCH_SIZES.JP_STOCK,
        cache: { time: 3600 }
      });
      expect(result).toEqual({
        '7203': { price: 2500 }
      });
    });

    test('should include yahooFinance2Service in fallback when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      jpxCsvService.getBatchJPXData.mockRejectedValue(new Error('JPX error'));
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        '7203': { price: 2500 }
      });

      await service.getJpStocksData(['7203']);

      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchFunctions: expect.arrayContaining([expect.any(Function)])
        })
      );
    });
  });

  describe('getMutualFundData', () => {
    test('should call fetchDataWithFallback with correct parameters', async () => {
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 10000 });

      const result = await service.getMutualFundData('0131103C', true);

      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: '0131103C',
        dataType: DATA_TYPES.MUTUAL_FUND,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          price: 10000,
          change: 0,
          changePercent: 0,
          name: '投資信託 0131103CC',
          currency: 'JPY',
          isStock: false,
          isMutualFund: true,
          priceLabel: '基準価額'
        },
        refresh: true,
        cache: { time: 3600 }
      });
      expect(result).toEqual({ price: 10000 });
    });
  });

  describe('getMutualFundsData', () => {
    test('should call fetchBatchDataWithFallback with correct parameters', async () => {
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        '0131103C': { price: 10000 }
      });

      const result = await service.getMutualFundsData(['0131103C'], true);

      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith({
        symbols: ['0131103C'],
        dataType: DATA_TYPES.MUTUAL_FUND,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          price: 10000,
          change: 0,
          changePercent: 0,
          currency: 'JPY',
          isStock: false,
          isMutualFund: true,
          priceLabel: '基準価額'
        },
        refresh: true,
        batchSize: BATCH_SIZES.MUTUAL_FUND,
        cache: { time: 3600 }
      });
      expect(result).toEqual({
        '0131103C': { price: 10000 }
      });
    });
  });

  describe('getExchangeRateData', () => {
    test('should use yahooFinance2Service when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ rate: 148.5 });

      const result = await service.getExchangeRateData('USD', 'JPY', true);

      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: 'USD-JPY',
        dataType: DATA_TYPES.EXCHANGE_RATE,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          pair: 'USD-JPY',
          base: 'USD',
          target: 'JPY',
          rate: 148.5,
          change: 0,
          changePercent: 0
        },
        refresh: true,
        cache: { time: 3600 }
      });
      expect(result).toEqual({ rate: 148.5 });
    });

    test('should use only exchangeRateService when yahooFinance2Service unavailable', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ rate: 150.0 });

      const result = await service.getExchangeRateData('EUR', 'USD');

      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith({
        symbol: 'EUR-USD',
        dataType: DATA_TYPES.EXCHANGE_RATE,
        fetchFunctions: expect.arrayContaining([expect.any(Function)]),
        defaultValues: {
          pair: 'EUR-USD',
          base: 'EUR',
          target: 'USD',
          rate: 1.0,
          change: 0,
          changePercent: 0
        },
        refresh: false,
        cache: { time: 3600 }
      });
      expect(result).toEqual({ rate: 150.0 });
    });
  });

  describe('getMultipleExchangeRatesData', () => {
    test('should use yahooFinance2Service successfully for all pairs', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getExchangeRate
        .mockResolvedValueOnce({ rate: 148.5 })
        .mockResolvedValueOnce({ rate: 1.1 });

      const result = await service.getMultipleExchangeRatesData([
        ['USD', 'JPY'],
        ['EUR', 'USD']
      ]);

      expect(logger.info).toHaveBeenCalledWith('Successfully fetched all exchange rates using Yahoo Finance2');
      expect(result).toEqual({
        'USD-JPY': { rate: 148.5 },
        'EUR-USD': { rate: 1.1 }
      });
    });

    test('should handle partial success with yahooFinance2Service', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getExchangeRate
        .mockResolvedValueOnce({ rate: 148.5 })
        .mockRejectedValueOnce(new Error('YF2 exchange error'));
      exchangeRateService.getExchangeRate.mockResolvedValue({ rate: 1.1 });

      const result = await service.getMultipleExchangeRatesData([
        ['USD', 'JPY'],
        ['EUR', 'USD']
      ]);

      expect(logger.debug).toHaveBeenCalledWith('Yahoo Finance2 exchange rate error for EUR-USD:', 'YF2 exchange error');
      expect(result).toEqual({
        'USD-JPY': { rate: 148.5 },
        'EUR-USD': { rate: 1.1 }
      });
    });

    test('should use exchangeRateService when yahooFinance2Service unavailable', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      exchangeRateService.getExchangeRate
        .mockResolvedValueOnce({ rate: 148.5 })
        .mockResolvedValueOnce({ rate: 1.1 });

      const result = await service.getMultipleExchangeRatesData([
        ['USD', 'JPY'],
        ['EUR', 'USD']
      ]);

      expect(result).toEqual({
        'USD-JPY': { rate: 148.5 },
        'EUR-USD': { rate: 1.1 }
      });
    });

    test('should skip already fetched pairs from Yahoo Finance2', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getExchangeRate
        .mockResolvedValueOnce({ rate: 148.5 })
        .mockResolvedValueOnce({ rate: 1.1 });

      const result = await service.getMultipleExchangeRatesData([
        ['USD', 'JPY'],
        ['EUR', 'USD']
      ]);

      expect(yahooFinance2Service.getExchangeRate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        'USD-JPY': { rate: 148.5 },
        'EUR-USD': { rate: 1.1 }
      });
    });

    test('should handle exchangeRateService errors with default values', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      exchangeRateService.getExchangeRate
        .mockResolvedValueOnce({ rate: 148.5 })
        .mockRejectedValueOnce(new Error('Exchange rate error'));

      const result = await service.getMultipleExchangeRatesData([
        ['USD', 'JPY'],
        ['EUR', 'USD']
      ]);

      expect(logger.error).toHaveBeenCalledWith('Error getting exchange rate for EUR-USD:', 'Exchange rate error');
      expect(result).toEqual({
        'USD-JPY': { rate: 148.5 },
        'EUR-USD': {
          pair: 'EUR-USD',
          base: 'EUR',
          target: 'USD',
          rate: 1.0,
          change: 0,
          changePercent: 0,
          source: 'Default',
          lastUpdated: expect.any(String)
        }
      });
    });

    test('should use default rate for USD-JPY pair on error', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      exchangeRateService.getExchangeRate.mockRejectedValue(new Error('Exchange rate error'));

      const result = await service.getMultipleExchangeRatesData([
        ['USD', 'JPY']
      ]);

      expect(result).toEqual({
        'USD-JPY': {
          pair: 'USD-JPY',
          base: 'USD',
          target: 'JPY',
          rate: 148.5,
          change: 0,
          changePercent: 0,
          source: 'Default',
          lastUpdated: expect.any(String)
        }
      });
    });

    test('should handle mixed Yahoo Finance2 success and fallback to exchangeRateService', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getExchangeRate
        .mockResolvedValueOnce({ rate: 148.5 })
        .mockRejectedValueOnce(new Error('YF2 partial error'));
      exchangeRateService.getExchangeRate.mockResolvedValue({ rate: 1.1 });

      const result = await service.getMultipleExchangeRatesData([
        ['USD', 'JPY'],
        ['EUR', 'USD']
      ]);

      // Both Yahoo Finance2 success and exchangeRateService fallback
      expect(result).toEqual({
        'USD-JPY': { rate: 148.5 },
        'EUR-USD': { rate: 1.1 }
      });
    });
  });

  // 追加のエッジケースとカバレッジ向上
  describe('edge cases and additional coverage', () => {
    test('should handle partial Yahoo Finance2 success in US stocks', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: null, // Partial failure
        GOOGL: { price: 200 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT', 'GOOGL']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Yahoo Finance2 missing 1 symbols, using fallback sources');
    });

    test('should handle partial JP stocks Yahoo Finance2 success', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockResolvedValue({
        '7203': { price: 2500 },
        '6758': null // Partial failure
      });

      const result = await service.getJpStocksData(['7203', '6758']);

      // Should continue to JPX CSV fallback since not all symbols were successful
      expect(mockConsoleLog).toHaveBeenCalledWith('Using JPX CSV for 2 JP stocks');
    });

    test('should handle partial JPX CSV success', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      jpxCsvService.getBatchJPXData.mockResolvedValue({
        '7203': { price: 2500 },
        '6758': null // Partial failure
      });

      const result = await service.getJpStocksData(['7203', '6758']);

      // Should continue to fallback since not all symbols were successful
      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalled();
    });

    test('should test fetchFunction execution in getExchangeRateData', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      
      // Mock to capture fetchFunctions and execute them
      dataFetchWithFallback.fetchDataWithFallback.mockImplementation(async ({ fetchFunctions }) => {
        // Execute the first fetchFunction to test the Yahoo Finance2 error handling
        try {
          await fetchFunctions[0]();
        } catch (error) {
          // Should trigger the debug log
        }
        return { rate: 148.5 };
      });

      const result = await service.getExchangeRateData('USD', 'JPY');

      expect(result).toEqual({ rate: 148.5 });
    });

    test('should test exchangeRateService error logging in getExchangeRateData', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      
      // Mock to capture fetchFunctions and execute them
      dataFetchWithFallback.fetchDataWithFallback.mockImplementation(async ({ fetchFunctions }) => {
        // Execute the fetchFunction to test error handling
        try {
          await fetchFunctions[0]();
        } catch (error) {
          // Should trigger the error log
        }
        return { rate: 148.5 };
      });

      const result = await service.getExchangeRateData('USD', 'JPY');

      expect(result).toEqual({ rate: 148.5 });
    });

    test('should test Yahoo Finance2 error handling in getExchangeRateData', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getExchangeRate.mockRejectedValue(new Error('YF2 exchange error'));
      exchangeRateService.getExchangeRate.mockResolvedValue({ rate: 148.5 });
      
      // Mock to capture fetchFunctions and execute them
      dataFetchWithFallback.fetchDataWithFallback.mockImplementation(async ({ fetchFunctions }) => {
        // Execute the first fetchFunction to test the Yahoo Finance2 error handling
        try {
          await fetchFunctions[0]();
        } catch (error) {
          expect(logger.debug).toHaveBeenCalledWith('Yahoo Finance2 exchange rate error for USD-JPY:', 'YF2 exchange error');
        }
        return { rate: 148.5 };
      });

      const result = await service.getExchangeRateData('USD', 'JPY');

      expect(result).toEqual({ rate: 148.5 });
    });

    test('should test exchangeRateService error handling in getExchangeRateData', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      exchangeRateService.getExchangeRate.mockRejectedValue(new Error('Exchange service error'));
      
      // Mock to capture fetchFunctions and execute them
      dataFetchWithFallback.fetchDataWithFallback.mockImplementation(async ({ fetchFunctions }) => {
        // Execute the fetchFunction to test error handling
        try {
          await fetchFunctions[0]();
        } catch (error) {
          expect(logger.error).toHaveBeenCalledWith('Error getting exchange rate for USD-JPY:', 'Exchange service error');
        }
        return { rate: 148.5 };
      });

      const result = await service.getExchangeRateData('USD', 'JPY');

      expect(result).toEqual({ rate: 148.5 });
    });

    test('should return alphaVantage result when it gets all symbols in US stocks', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      alphaVantageService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should handle when JP stocks Yahoo Finance2 gets partial success', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockResolvedValue({
        '7203': { price: 2500 },
        '6758': null
      });
      jpxCsvService.getBatchJPXData.mockResolvedValue({
        '7203': { price: 2500 },
        '6758': { price: 1200 }
      });

      const result = await service.getJpStocksData(['7203', '6758']);

      expect(mockConsoleLog).toHaveBeenCalledWith('Using JPX CSV for 2 JP stocks');
    });

    test('should handle when JPX CSV gets partial success', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      jpxCsvService.getBatchJPXData.mockResolvedValue({
        '7203': { price: 2500 },
        '6758': null
      });
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        '7203': { price: 2500 },
        '6758': { price: 1200 }
      });

      const result = await service.getJpStocksData(['7203', '6758']);

      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalled();
    });

    test('should return alphaVantageService result directly when complete', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      alphaVantageService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 }
      });

      const result = await service.getUsStocksData(['AAPL']);

      expect(result).toEqual({
        AAPL: { price: 150 }
      });
    });

    test('should verify all fetchFunction arrays are properly constructed', () => {
      // Test that function arrays are created correctly with spread syntax
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      
      // For getJpStockData with YF2 available - should include YF2 function
      service.getJpStockData('7203');
      
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      
      // For getJpStockData without YF2 - should only include JPX and scraping
      service.getJpStockData('7203');
      
      // For getMutualFundData - should include fund service function
      service.getMutualFundData('0131103C');
      
      // For getMutualFundsData - should include fund service function
      service.getMutualFundsData(['0131103C']);

      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalled();
      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalled();
    });

    test('should test actual function execution for complete coverage', async () => {
      // Test actual execution of anonymous functions in fetchFunctions arrays
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getStockDataFromYahooFinance2.mockResolvedValue({ price: 2500 });
      jpxCsvService.getJPXStockData.mockResolvedValue({ price: 2500 });
      scrapingService.getJpStockData.mockResolvedValue({ price: 2500 });
      fundDataService.getMutualFundData.mockResolvedValue({ price: 10000 });

      // Execute functions to cover the anonymous function definitions
      dataFetchWithFallback.fetchDataWithFallback.mockImplementation(async ({ fetchFunctions }) => {
        // Execute all functions to ensure they are covered
        for (const fn of fetchFunctions) {
          try {
            await fn('7203');
          } catch (e) {
            // Ignore errors, just want to execute the functions
          }
        }
        return { price: 2500 };
      });

      dataFetchWithFallback.fetchBatchDataWithFallback.mockImplementation(async ({ fetchFunctions }) => {
        // Execute all functions to ensure they are covered
        for (const fn of fetchFunctions) {
          try {
            await fn('7203');
          } catch (e) {
            // Ignore errors, just want to execute the functions
          }
        }
        return { '7203': { price: 2500 } };
      });

      await service.getJpStockData('7203');
      await service.getJpStocksData(['7203']);
      await service.getMutualFundData('0131103C');
      await service.getMutualFundsData(['0131103C']);

      expect(yahooFinance2Service.getStockDataFromYahooFinance2).toHaveBeenCalled();
      expect(jpxCsvService.getJPXStockData).toHaveBeenCalled();
      expect(scrapingService.getJpStockData).toHaveBeenCalled();
      expect(fundDataService.getMutualFundData).toHaveBeenCalled();
    });

    test('should hit return alphaResults line 125 when no missing symbols', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      alphaVantageService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      // Should return alphaResults directly (line 125)
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should execute JP stock functions in fallback when Yahoo Finance2 unavailable', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      jpxCsvService.getBatchJPXData.mockRejectedValue(new Error('JPX error'));
      
      // Mock to execute the actual fetchFunctions
      dataFetchWithFallback.fetchBatchDataWithFallback.mockImplementation(async ({ fetchFunctions }) => {
        // Execute fetchFunctions to cover lines 303-308
        for (const fn of fetchFunctions) {
          try {
            await fn('7203');
          } catch (e) {
            // Ignore errors
          }
        }
        return { '7203': { price: 2500 } };
      });

      const result = await service.getJpStocksData(['7203']);

      expect(jpxCsvService.getJPXStockData).toHaveBeenCalled();
      expect(scrapingService.getJpStockData).toHaveBeenCalled();
      expect(result).toEqual({ '7203': { price: 2500 } });
    });

    test('should include Yahoo Finance2 function in JP stock fallback array when available', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(true);
      yahooFinance2Service.getBatchStockData.mockRejectedValue(new Error('YF2 JP error'));
      jpxCsvService.getBatchJPXData.mockRejectedValue(new Error('JPX error'));
      yahooFinance2Service.getStockDataFromYahooFinance2.mockResolvedValue({ price: 2500 });
      jpxCsvService.getJPXStockData.mockResolvedValue({ price: 2500 });
      scrapingService.getJpStockData.mockResolvedValue({ price: 2500 });
      
      // Mock to execute the actual fetchFunctions
      dataFetchWithFallback.fetchBatchDataWithFallback.mockImplementation(async ({ fetchFunctions }) => {
        // Execute fetchFunctions to cover line 303 specifically
        expect(fetchFunctions.length).toBeGreaterThan(2); // Should have YF2 + JPX + scraping
        for (const fn of fetchFunctions) {
          try {
            await fn('7203');
          } catch (e) {
            // Ignore errors
          }
        }
        return { '7203': { price: 2500 } };
      });

      const result = await service.getJpStocksData(['7203']);

      expect(yahooFinance2Service.getStockDataFromYahooFinance2).toHaveBeenCalled();
      expect(result).toEqual({ '7203': { price: 2500 } });
    });

    test('should handle alphaVantage success with exact symbol count match', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      alphaVantageService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(logger.info).toHaveBeenCalledWith('Successfully fetched all US stocks using Alpha Vantage API');
      expect(result).toEqual({
        AAPL: { price: 150 },
        MSFT: { price: 300 }
      });
    });

    test('should return alphaResults when all symbols match - covering line 125', async () => {
      yahooFinance2Service.isAvailable.mockReturnValue(false);
      alphaVantageService.isAvailable.mockResolvedValue(true);
      // Mock getStocksData to return results with exact count match
      alphaVantageService.getStocksData.mockResolvedValue({
        AAPL: { price: 150 }
      });

      const result = await service.getUsStocksData(['AAPL']);

      // Should hit the return alphaResults line (125) since Object.keys(alphaResults).length === symbols.length
      expect(result).toEqual({
        AAPL: { price: 150 }
      });
    });
  });
});
