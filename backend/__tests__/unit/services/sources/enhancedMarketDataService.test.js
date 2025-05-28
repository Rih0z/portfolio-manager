/**
 * ファイルパス: __tests__/unit/services/sources/enhancedMarketDataService.test.js
 *
 * enhancedMarketDataService モジュールのユニットテスト
 * fetchDataWithFallback ラッパーとしての動作と
 * getUsStocksData の分岐処理を検証します。
 */

const service = require('../../../../src/services/sources/enhancedMarketDataService');
const { DATA_TYPES, BATCH_SIZES } = require('../../../../src/config/constants');
const dataFetchWithFallback = require('../../../../src/utils/dataFetchWithFallback');
const yahooFinanceService = require('../../../../src/services/sources/yahooFinance');
const scrapingService = require('../../../../src/services/sources/marketDataProviders');
const exchangeRateService = require('../../../../src/services/sources/exchangeRate');
const alphaVantageService = require('../../../../src/services/sources/alphaVantageService');

jest.mock('../../../../src/utils/dataFetchWithFallback');
jest.mock('../../../../src/services/sources/yahooFinance');
jest.mock('../../../../src/services/sources/marketDataProviders');
jest.mock('../../../../src/services/sources/alphaVantageService');

beforeEach(() => {
  jest.clearAllMocks();
  // Mock Alpha Vantage as unavailable by default
  alphaVantageService.isAvailable.mockResolvedValue(false);
});

describe('enhancedMarketDataService', () => {
  describe('getUsStockData', () => {
    test('fetches data via fetchDataWithFallback', async () => {
      dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 123 });

      const result = await service.getUsStockData('AAPL', true);

      expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
          dataType: DATA_TYPES.US_STOCK,
          refresh: true
        })
      );
      expect(result).toEqual({ price: 123 });
    });
  });

  describe('getUsStocksData', () => {
    test('returns batch result when all symbols are retrieved', async () => {
      const batchResult = { AAPL: { price: 1 }, MSFT: { price: 2 } };
      yahooFinanceService.getStocksData.mockResolvedValue(batchResult);

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(yahooFinanceService.getStocksData).toHaveBeenCalledWith(['AAPL', 'MSFT']);
      expect(dataFetchWithFallback.fetchBatchDataWithFallback).not.toHaveBeenCalled();
      expect(result).toEqual(batchResult);
    });

    test('fetches missing symbols individually', async () => {
      yahooFinanceService.getStocksData.mockResolvedValue({ AAPL: { price: 1 } });
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({ MSFT: { price: 2 } });

      const result = await service.getUsStocksData(['AAPL', 'MSFT'], true);

      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['MSFT'],
          dataType: DATA_TYPES.US_STOCK,
          refresh: true,
          batchSize: expect.any(Number),
          fetchFunctions: expect.any(Array),
          defaultValues: expect.any(Object)
        })
      );
      expect(result).toEqual({ AAPL: { price: 1 }, MSFT: { price: 2 } });
    });

    test('falls back to individual fetching when API fails', async () => {
      yahooFinanceService.getStocksData.mockRejectedValue(new Error('api error'));
      dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({
        AAPL: { price: 1 },
        MSFT: { price: 2 }
      });

      const result = await service.getUsStocksData(['AAPL', 'MSFT']);

      expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['AAPL', 'MSFT'],
          dataType: DATA_TYPES.US_STOCK,
          batchSize: BATCH_SIZES.US_STOCK
        })
      );
      expect(result).toEqual({ AAPL: { price: 1 }, MSFT: { price: 2 } });
    });
  });
});

describe('additional enhancedMarketDataService functions', () => {
  test('getJpStockData calls fetchDataWithFallback', async () => {
    dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 2500 });
    const result = await service.getJpStockData('7203', true);
    expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '7203',
      dataType: DATA_TYPES.JP_STOCK,
      refresh: true
    }));
    expect(result).toEqual({ price: 2500 });
  });

  test('getJpStocksData calls fetchBatchDataWithFallback', async () => {
    dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({ '7203': { price: 1 } });
    const result = await service.getJpStocksData(['7203'], true);
    expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      symbols: ['7203'],
      dataType: DATA_TYPES.JP_STOCK,
      refresh: true,
      batchSize: BATCH_SIZES.JP_STOCK
    }));
    expect(result).toEqual({ '7203': { price: 1 } });
  });

  test('getMutualFundData calls fetchDataWithFallback', async () => {
    dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ price: 10000 });
    const result = await service.getMutualFundData('0131103C', true);
    expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '0131103C',
      dataType: DATA_TYPES.MUTUAL_FUND,
      refresh: true
    }));
    expect(result).toEqual({ price: 10000 });
  });

  test('getMutualFundsData calls fetchBatchDataWithFallback', async () => {
    dataFetchWithFallback.fetchBatchDataWithFallback.mockResolvedValue({ '0131103C': { price: 1 } });
    const result = await service.getMutualFundsData(['0131103C'], true);
    expect(dataFetchWithFallback.fetchBatchDataWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      symbols: ['0131103C'],
      dataType: DATA_TYPES.MUTUAL_FUND,
      refresh: true,
      batchSize: BATCH_SIZES.MUTUAL_FUND
    }));
    expect(result).toEqual({ '0131103C': { price: 1 } });
  });

  test('getExchangeRateData calls fetchDataWithFallback', async () => {
    dataFetchWithFallback.fetchDataWithFallback.mockResolvedValue({ rate: 148.5 });
    exchangeRateService.getExchangeRate = jest.fn().mockResolvedValue({ rate: 148.5 });
    const result = await service.getExchangeRateData('USD', 'JPY', true);
    expect(dataFetchWithFallback.fetchDataWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'USD-JPY',
      dataType: DATA_TYPES.EXCHANGE_RATE,
      refresh: true
    }));
    expect(result).toEqual({ rate: 148.5 });
  });
});
