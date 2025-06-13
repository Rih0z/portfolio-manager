/**
 * yahooFinance.js の100%カバレッジを達成するためのテスト
 */

// モックの設定
jest.mock('axios');
jest.mock('../../../../src/services/alerts');

const axios = require('axios');
const alertService = require('../../../../src/services/alerts');
const yahooFinanceService = require('../../../../src/services/sources/yahooFinance');

describe('Yahoo Finance Service - 100% Coverage', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock alertService
    alertService.notifyError = jest.fn().mockResolvedValue({});
    
    // 環境変数の設定
    process.env.YAHOO_FINANCE_API_KEY = 'test-api-key';
    process.env.YAHOO_FINANCE_API_HOST = 'test-api-host';
    process.env.YAHOO_FINANCE_API_TIMEOUT = '5000';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
    
    // 環境変数のクリア
    delete process.env.YAHOO_FINANCE_API_KEY;
    delete process.env.YAHOO_FINANCE_API_HOST;
    delete process.env.YAHOO_FINANCE_API_TIMEOUT;
  });

  describe('getStockData', () => {
    test('シンボルがない場合エラーを投げる', async () => {
      await expect(yahooFinanceService.getStockData('')).rejects.toThrow('Symbol is required');
      await expect(yahooFinanceService.getStockData(null)).rejects.toThrow('Symbol is required');
      await expect(yahooFinanceService.getStockData()).rejects.toThrow('Symbol is required');
    });

    test('APIキーがない場合は無料版を使用', async () => {
      delete process.env.YAHOO_FINANCE_API_KEY;
      
      // 無料版APIのモック
      axios.get.mockResolvedValueOnce({
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 150.50,
                previousClose: 148.00,
                currency: 'USD',
                shortName: 'Apple Inc.'
              }
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStockData('AAPL');

      expect(axios.get).toHaveBeenCalledWith(
        'https://query1.finance.yahoo.com/v8/finance/chart/AAPL',
        expect.objectContaining({
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
      );

      expect(result).toMatchObject({
        ticker: 'AAPL',
        price: 150.50,
        change: 2.50,
        changePercent: expect.closeTo(1.689, 2),
        currency: 'USD',
        name: 'Apple Inc.',
        source: 'Yahoo Finance (Free)'
      });
    });

    test('無料版API - データなしの場合', async () => {
      delete process.env.YAHOO_FINANCE_API_KEY;
      
      axios.get.mockResolvedValueOnce({
        data: {}
      });

      await expect(yahooFinanceService.getStockData('INVALID'))
        .rejects.toThrow('Invalid Yahoo Finance response format');
    });

    test('無料版API - resultが空の場合', async () => {
      delete process.env.YAHOO_FINANCE_API_KEY;
      
      axios.get.mockResolvedValueOnce({
        data: {
          chart: {
            result: []
          }
        }
      });

      await expect(yahooFinanceService.getStockData('INVALID'))
        .rejects.toThrow('Invalid Yahoo Finance response format');
    });

    test('無料版API - metaデータがない場合', async () => {
      delete process.env.YAHOO_FINANCE_API_KEY;
      
      axios.get.mockResolvedValueOnce({
        data: {
          chart: {
            result: [{}]
          }
        }
      });

      await expect(yahooFinanceService.getStockData('INVALID'))
        .rejects.toThrow('No meta data found in Yahoo Finance response');
    });

    test('無料版API - regularMarketPriceがない場合はpreviousCloseを使用', async () => {
      delete process.env.YAHOO_FINANCE_API_KEY;
      
      axios.get.mockResolvedValueOnce({
        data: {
          chart: {
            result: [{
              meta: {
                previousClose: 148.00,
                currency: 'USD'
              }
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStockData('AAPL');

      expect(result.price).toBe(148.00);
      expect(result.change).toBe(0);
      expect(result.changePercent).toBe(0);
    });

    test('有料版APIが成功する場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: [{
              symbol: 'AAPL',
              regularMarketPrice: 150.50,
              regularMarketChange: 2.50,
              regularMarketChangePercent: 1.69,
              shortName: 'Apple Inc.',
              currency: 'USD',
              regularMarketTime: 1234567890,
              regularMarketVolume: 50000000,
              marketCap: 2500000000000
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStockData('AAPL');

      expect(result).toMatchObject({
        ticker: 'AAPL',
        price: 150.50,
        change: 2.50,
        changePercent: 1.69,
        name: 'Apple Inc.',
        currency: 'USD',
        source: 'Yahoo Finance API',
        volume: 50000000,
        marketCap: 2500000000000
      });
    });

    test('有料版API - longNameのみの場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: [{
              symbol: 'AAPL',
              regularMarketPrice: 150.50,
              regularMarketChange: 2.50,
              regularMarketChangePercent: 1.69,
              longName: 'Apple Inc. Long Name',
              currency: 'USD',
              regularMarketTime: 1234567890
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStockData('AAPL');

      expect(result.name).toBe('Apple Inc. Long Name');
    });

    test('有料版API - 名前がない場合はシンボルを使用', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: [{
              symbol: 'UNKNOWN',
              regularMarketPrice: 150.50,
              regularMarketChange: 2.50,
              regularMarketChangePercent: 1.69,
              regularMarketTime: 1234567890
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStockData('UNKNOWN');

      expect(result.name).toBe('UNKNOWN');
    });

    test('有料版API - データ形式が不正な場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {}
      });

      const result = await yahooFinanceService.getStockData('AAPL');

      // 無料版にフォールバック
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('有料版API - エラーレスポンスの場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            error: 'Invalid symbol'
          }
        }
      });

      // 無料版APIのモック
      axios.get.mockResolvedValueOnce({
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 150.50,
                previousClose: 148.00
              }
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStockData('AAPL');

      expect(result.source).toBe('Yahoo Finance (Free)');
    });

    test('有料版API - resultがない場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {}
        }
      });

      // 無料版APIのモック
      axios.get.mockResolvedValueOnce({
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 150.50,
                previousClose: 148.00
              }
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStockData('AAPL');

      expect(result.source).toBe('Yahoo Finance (Free)');
    });

    test('有料版API - 空の結果配列の場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: []
          }
        }
      });

      const result = await yahooFinanceService.getStockData('AAPL');

      expect(result).toEqual({});
    });

    test('有料版API - 401エラーの場合はアラート通知', async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      axios.get.mockRejectedValueOnce(error);

      // 無料版APIのモック
      axios.get.mockResolvedValueOnce({
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 150.50,
                previousClose: 148.00
              }
            }]
          }
        }
      });

      await yahooFinanceService.getStockData('AAPL');

      expect(alertService.notifyError).toHaveBeenCalledWith(
        'Yahoo Finance API Key Error',
        expect.any(Error),
        { symbol: 'AAPL' }
      );
    });

    test('有料版API - 403エラーの場合もアラート通知', async () => {
      const error = new Error('Forbidden');
      error.response = { status: 403 };
      axios.get.mockRejectedValueOnce(error);

      // 無料版APIのモック
      axios.get.mockResolvedValueOnce({
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 150.50,
                previousClose: 148.00
              }
            }]
          }
        }
      });

      await yahooFinanceService.getStockData('AAPL');

      expect(alertService.notifyError).toHaveBeenCalledWith(
        'Yahoo Finance API Key Error',
        expect.any(Error),
        { symbol: 'AAPL' }
      );
    });

    test('すべての方法が失敗する場合', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(yahooFinanceService.getStockData('AAPL'))
        .rejects.toThrow('Failed to retrieve stock data for AAPL: Network error');
    });

    test('環境変数でタイムアウトを設定', async () => {
      process.env.YAHOO_FINANCE_API_TIMEOUT = '10000';
      
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: [{
              symbol: 'AAPL',
              regularMarketPrice: 150.50
            }]
          }
        }
      });

      await yahooFinanceService.getStockData('AAPL');

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 10000
        })
      );
    });

    test('環境変数でAPIホストを設定', async () => {
      process.env.YAHOO_FINANCE_API_HOST = 'custom-host.com';
      
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: [{
              symbol: 'AAPL',
              regularMarketPrice: 150.50
            }]
          }
        }
      });

      await yahooFinanceService.getStockData('AAPL');

      expect(axios.get).toHaveBeenCalledWith(
        'https://custom-host.com/market/v2/get-quotes',
        expect.any(Object)
      );
    });
  });

  describe('getStocksData', () => {
    test('シンボル配列がない場合エラーを投げる', async () => {
      await expect(yahooFinanceService.getStocksData()).rejects.toThrow('Symbols array is required');
      await expect(yahooFinanceService.getStocksData(null)).rejects.toThrow('Symbols array is required');
      await expect(yahooFinanceService.getStocksData([])).rejects.toThrow('Symbols array is required');
    });

    test('文字列シンボルを配列に変換', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: [{
              symbol: 'AAPL',
              regularMarketPrice: 150.50,
              regularMarketChange: 2.50,
              regularMarketChangePercent: 1.69,
              shortName: 'Apple Inc.',
              regularMarketTime: 1234567890
            }]
          }
        }
      });

      const result = await yahooFinanceService.getStocksData('AAPL');

      expect(result).toHaveProperty('AAPL');
      expect(result['AAPL'].price).toBe(150.50);
    });

    test('大量のシンボルをバッチ処理', async () => {
      const symbols = Array.from({ length: 25 }, (_, i) => `STOCK${i}`);
      
      // 最初のバッチ（20個）
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: Array.from({ length: 20 }, (_, i) => ({
              symbol: `STOCK${i}`,
              regularMarketPrice: 100 + i,
              regularMarketChange: 1,
              regularMarketChangePercent: 1,
              regularMarketTime: 1234567890
            }))
          }
        }
      });

      // 2番目のバッチ（5個）
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: Array.from({ length: 5 }, (_, i) => ({
              symbol: `STOCK${i + 20}`,
              regularMarketPrice: 120 + i,
              regularMarketChange: 1,
              regularMarketChangePercent: 1,
              regularMarketTime: 1234567890
            }))
          }
        }
      });

      const result = await yahooFinanceService.getStocksData(symbols);

      expect(Object.keys(result)).toHaveLength(25);
      expect(result['STOCK0'].price).toBe(100);
      expect(result['STOCK20'].price).toBe(120);
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('バッチ処理で一部のシンボルが見つからない場合', async () => {
      const symbols = ['AAPL', 'INVALID', 'GOOGL'];
      
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            result: [
              {
                symbol: 'AAPL',
                regularMarketPrice: 150.50,
                regularMarketChange: 2.50,
                regularMarketChangePercent: 1.69,
                regularMarketTime: 1234567890
              },
              {
                symbol: 'GOOGL',
                regularMarketPrice: 2800.00,
                regularMarketChange: 50.00,
                regularMarketChangePercent: 1.82,
                regularMarketTime: 1234567890
              }
            ]
          }
        }
      });

      const result = await yahooFinanceService.getStocksData(symbols);

      expect(result['AAPL']).toBeDefined();
      expect(result['GOOGL']).toBeDefined();
      expect(result['INVALID']).toBeUndefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No data found for symbols: INVALID')
      );
    });

    test('APIキーエラー（401）でアラート通知', async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      axios.get.mockRejectedValueOnce(error);

      await expect(yahooFinanceService.getStocksData(['AAPL']))
        .rejects.toThrow('Failed to retrieve stocks data: Unauthorized');

      expect(alertService.notifyError).toHaveBeenCalledWith(
        'Yahoo Finance API Key Error',
        expect.any(Error),
        { symbols: 'AAPL' }
      );
    });

    test('APIキーエラー（403）でアラート通知', async () => {
      const error = new Error('Forbidden');
      error.response = { status: 403 };
      axios.get.mockRejectedValueOnce(error);

      await expect(yahooFinanceService.getStocksData(['AAPL', 'GOOGL']))
        .rejects.toThrow('Failed to retrieve stocks data: Forbidden');

      expect(alertService.notifyError).toHaveBeenCalledWith(
        'Yahoo Finance API Key Error',
        expect.any(Error),
        { symbols: 'AAPL,GOOGL' }
      );
    });

    test('データ形式が不正な場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {}
      });

      await expect(yahooFinanceService.getStocksData(['AAPL']))
        .rejects.toThrow('Invalid API response format');
    });

    test('エラーレスポンスの場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {
            error: 'Invalid request'
          }
        }
      });

      await expect(yahooFinanceService.getStocksData(['AAPL']))
        .rejects.toThrow('Invalid API response format');
    });

    test('resultがない場合', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          quoteResponse: {}
        }
      });

      await expect(yahooFinanceService.getStocksData(['AAPL']))
        .rejects.toThrow('Invalid API response format');
    });

    test('バッチ間の遅延が正しく機能する', async () => {
      jest.useFakeTimers();
      const symbols = Array.from({ length: 40 }, (_, i) => `STOCK${i}`);
      
      // 2つのバッチのモック
      axios.get
        .mockResolvedValueOnce({
          data: {
            quoteResponse: {
              result: Array.from({ length: 20 }, (_, i) => ({
                symbol: `STOCK${i}`,
                regularMarketPrice: 100 + i,
                regularMarketTime: 1234567890
              }))
            }
          }
        })
        .mockResolvedValueOnce({
          data: {
            quoteResponse: {
              result: Array.from({ length: 20 }, (_, i) => ({
                symbol: `STOCK${i + 20}`,
                regularMarketPrice: 120 + i,
                regularMarketTime: 1234567890
              }))
            }
          }
        });

      const promise = yahooFinanceService.getStocksData(symbols);
      
      // 最初のバッチはすぐに処理される
      await Promise.resolve();
      
      // タイマーを進める
      jest.advanceTimersByTime(500);
      
      const result = await promise;

      expect(Object.keys(result)).toHaveLength(40);
      jest.useRealTimers();
    });
  });
});