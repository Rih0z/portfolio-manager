/**
 * ファイルパス: __tests__/unit/services/sources/yahooFinance.test.js
 * 
 * Yahoo Finance APIサービスのユニットテスト
 * APIリクエスト、レスポンス処理、エラーハンドリングを検証
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-10
 * @modified 2025-05-16 ファイルパスの修正（yahooFinanceApi.js → yahooFinance.js）
 */

// モックの設定
jest.mock('axios');
jest.mock('../../../../src/services/alerts');

// テスト対象モジュールのインポート
const yahooFinanceService = require('../../../../src/services/sources/yahooFinance');
const axios = require('axios');
const alertService = require('../../../../src/services/alerts');

// モック関数
alertService.notifyError = jest.fn();

// テストデータ
const TEST_DATA = {
  symbol: 'AAPL',
  price: 180.95,
  change: 2.5,
  changePercent: 1.4,
  name: 'Apple Inc.',
  currency: 'USD',
  marketCap: 2900000000000
};

describe('Yahoo Finance APIサービス', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
    
    // 環境変数のモック
    process.env.YAHOO_FINANCE_API_KEY = 'test-api-key';
    process.env.YAHOO_FINANCE_API_HOST = 'test-api-host';
  });
  
  afterEach(() => {
    // 各テスト後にモックをクリア
    jest.clearAllMocks();
    
    // 環境変数のリセット
    delete process.env.YAHOO_FINANCE_API_KEY;
    delete process.env.YAHOO_FINANCE_API_HOST;
  });
  
  describe('getStockData', () => {
    test('単一シンボルのデータを取得する', async () => {
      // APIレスポンスのモック
      const mockResponse = {
        data: {
          quoteResponse: {
            result: [
              {
                symbol: TEST_DATA.symbol,
                regularMarketPrice: TEST_DATA.price,
                regularMarketChange: TEST_DATA.change,
                regularMarketChangePercent: TEST_DATA.changePercent,
                shortName: TEST_DATA.name,
                currency: TEST_DATA.currency,
                regularMarketTime: Math.floor(Date.now() / 1000),
                marketCap: TEST_DATA.marketCap,
                regularMarketVolume: 50000000
              }
            ],
            error: null
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      const result = await yahooFinanceService.getStockData(TEST_DATA.symbol);
      
      // axiosが正しいパラメータで呼ばれたか確認
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/market/v2/get-quotes"),
        {
          params: {
            region: 'US',
            symbols: TEST_DATA.symbol
          },
          headers: {
            'X-RapidAPI-Key': 'test-api-key',
            'X-RapidAPI-Host': 'test-api-host'
          },
          timeout: expect.any(Number)
        }
      );
      
      // 結果の検証
      expect(result).toBeDefined();
      expect(result.ticker).toBe(TEST_DATA.symbol);
      expect(result.price).toBe(TEST_DATA.price);
      expect(result.change).toBe(TEST_DATA.change);
      expect(result.changePercent).toBe(TEST_DATA.changePercent);
      expect(result.name).toBe(TEST_DATA.name);
      expect(result.currency).toBe(TEST_DATA.currency);
      expect(result.lastUpdated).toBeDefined();
      expect(result.source).toBe('Yahoo Finance API');
      expect(result.isStock).toBe(true);
      expect(result.marketCap).toBe(TEST_DATA.marketCap);
    });
    
    test('複数シンボルのデータを取得する', async () => {
      // 複数シンボルのモックレスポンス
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const mockResponse = {
        data: {
          quoteResponse: {
            result: [
              {
                symbol: 'AAPL',
                regularMarketPrice: 180.95,
                regularMarketChange: 2.5,
                regularMarketChangePercent: 1.4,
                shortName: 'Apple Inc.',
                currency: 'USD',
                regularMarketTime: Math.floor(Date.now() / 1000),
                marketCap: 2900000000000,
                regularMarketVolume: 50000000
              },
              {
                symbol: 'MSFT',
                regularMarketPrice: 310.5,
                regularMarketChange: 5.2,
                regularMarketChangePercent: 1.7,
                shortName: 'Microsoft Corporation',
                currency: 'USD',
                regularMarketTime: Math.floor(Date.now() / 1000),
                marketCap: 2300000000000,
                regularMarketVolume: 30000000
              },
              {
                symbol: 'GOOGL',
                regularMarketPrice: 175.2,
                regularMarketChange: -0.8,
                regularMarketChangePercent: -0.45,
                shortName: 'Alphabet Inc.',
                currency: 'USD',
                regularMarketTime: Math.floor(Date.now() / 1000),
                marketCap: 2200000000000,
                regularMarketVolume: 20000000
              }
            ],
            error: null
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      const result = await yahooFinanceService.getStocksData(symbols);
      
      // axiosが正しいパラメータで呼ばれたか確認
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/market/v2/get-quotes"),
        {
          params: {
            region: 'US',
            symbols: symbols.join(',')
          },
          headers: {
            'X-RapidAPI-Key': 'test-api-key',
            'X-RapidAPI-Host': 'test-api-host'
          },
          timeout: expect.any(Number)
        }
      );
      
      // 結果の検証
      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBe(3);
      
      // 各シンボルのデータを検証
      expect(result['AAPL']).toBeDefined();
      expect(result['MSFT']).toBeDefined();
      expect(result['GOOGL']).toBeDefined();
      
      expect(result['AAPL'].price).toBe(180.95);
      expect(result['MSFT'].price).toBe(310.5);
      expect(result['GOOGL'].price).toBe(175.2);
    });
    
    test('シンボルを文字列で渡した場合も処理する', async () => {
      // APIレスポンスのモック
      const mockResponse = {
        data: {
          quoteResponse: {
            result: [
              {
                symbol: TEST_DATA.symbol,
                regularMarketPrice: TEST_DATA.price,
                regularMarketChange: TEST_DATA.change,
                regularMarketChangePercent: TEST_DATA.changePercent,
                shortName: TEST_DATA.name,
                currency: TEST_DATA.currency,
                regularMarketTime: Math.floor(Date.now() / 1000)
              }
            ],
            error: null
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行 - 文字列として渡す
      const result = await yahooFinanceService.getStocksData(TEST_DATA.symbol);
      
      // axiosが正しいパラメータで呼ばれたか確認
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/market/v2/get-quotes"),
        expect.objectContaining({
          params: {
            region: 'US',
            symbols: TEST_DATA.symbol
          }
        })
      );
      
      // 結果の検証
      expect(result).toBeDefined();
      expect(result[TEST_DATA.symbol]).toBeDefined();
    });
    
    test('結果が空の場合は空のオブジェクトを返す', async () => {
      // 空の結果を返すモックレスポンス
      const mockResponse = {
        data: {
          quoteResponse: {
            result: [],
            error: null
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      const result = await yahooFinanceService.getStockData('NONEXISTENT');
      
      // 結果の検証 - 空のオブジェクトまたは未定義のオブジェクト
      expect(Object.keys(result).length).toBe(0);
    });
    
    test('APIエラーが発生した場合は例外をスロー', async () => {
      // エラーをスローするモック
      axios.get.mockRejectedValueOnce(new Error('API connection failed'));
      
      // テスト対象の関数の実行と例外の検証
      await expect(yahooFinanceService.getStockData(TEST_DATA.symbol))
        .rejects.toThrow('Failed to retrieve stock data');
    });
    
    test('APIレスポンスにエラーが含まれる場合は例外をスロー', async () => {
      // エラーを含むモックレスポンス
      const mockResponse = {
        data: {
          quoteResponse: {
            result: [],
            error: 'Invalid symbol'
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数の実行と例外の検証
      await expect(yahooFinanceService.getStockData(TEST_DATA.symbol))
        .rejects.toThrow('Failed to retrieve stock data for AAPL: Invalid Yahoo Finance response format');
    });
    
    test('非200レスポンスの場合は例外をスロー', async () => {
      // 400エラーをスローするモック
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: 'Bad Request',
            message: 'Invalid parameters'
          }
        }
      };
      
      axios.get.mockRejectedValueOnce(errorResponse);
      
      // テスト対象の関数の実行と例外の検証
      await expect(yahooFinanceService.getStockData(TEST_DATA.symbol))
        .rejects.toThrow('Failed to retrieve stock data');
    });
    
    test('環境変数からAPI Keyを取得する', async () => {
      // APIレスポンスのモック
      const mockResponse = {
        data: {
          quoteResponse: {
            result: [
              {
                symbol: TEST_DATA.symbol,
                regularMarketPrice: TEST_DATA.price,
                regularMarketChange: TEST_DATA.change,
                regularMarketChangePercent: TEST_DATA.changePercent,
                shortName: TEST_DATA.name,
                currency: TEST_DATA.currency,
                regularMarketTime: Math.floor(Date.now() / 1000)
              }
            ],
            error: null
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      await yahooFinanceService.getStockData(TEST_DATA.symbol);
      
      // 環境変数のAPI Keyが使われているか確認
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-RapidAPI-Host': 'test-api-host',
            'X-RapidAPI-Key': 'test-api-key'
          })
        })
      );
    });
    
    test('環境変数が設定されていない場合はデフォルト値を使用', async () => {
      // 環境変数をクリア
      delete process.env.YAHOO_FINANCE_API_KEY;
      delete process.env.YAHOO_FINANCE_API_HOST;
      
      // APIレスポンスのモック
      const mockResponse = {
        data: {
          quoteResponse: {
            result: [
              {
                symbol: TEST_DATA.symbol,
                regularMarketPrice: TEST_DATA.price,
                regularMarketChange: TEST_DATA.change,
                regularMarketChangePercent: TEST_DATA.changePercent,
                shortName: TEST_DATA.name,
                currency: TEST_DATA.currency,
                regularMarketTime: Math.floor(Date.now() / 1000)
              }
            ],
            error: null
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行（失敗が予想される）
      try {
        await yahooFinanceService.getStockData(TEST_DATA.symbol);
      } catch (error) {
        // 環境変数がない場合のエラーは予想される
      }
      
      // デフォルト値が使われているか確認
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("query1.finance.yahoo.com"),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          })
        })
      );
    });
  });
});
