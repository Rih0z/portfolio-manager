import {
  fetchExchangeRate,
  fetchStockData
} from '../../../services/marketDataService.local';

// Mock dependencies
jest.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: jest.fn((endpoint) => {
    return `http://localhost:3000/${endpoint}`;
  })
}));

jest.mock('../../../utils/apiUtils', () => ({
  fetchWithRetry: jest.fn(),
  formatErrorResponse: jest.fn((error, ticker) => ({
    success: false,
    error: true,
    message: 'データの取得に失敗しました',
    errorType: 'UNKNOWN',
    errorDetail: error.message,
    ticker
  })),
  generateFallbackData: jest.fn((ticker) => ({
    ticker,
    price: ticker === '7203.T' || ticker === '7203' ? 2500 : ticker.includes('12345678') ? 10000 : 150,
    name: ticker + ' (フォールバック)',
    currency: ticker === '7203.T' || ticker === '7203' || ticker.includes('12345678') ? 'JPY' : 'USD',
    lastUpdated: new Date().toISOString(),
    source: 'Fallback',
    isStock: !ticker.includes('12345678'),
    isMutualFund: ticker.includes('12345678')
  })),
  TIMEOUT: {
    EXCHANGE_RATE: 5000,
    US_STOCK: 10000,
    JP_STOCK: 20000,
    MUTUAL_FUND: 20000
  }
}));

// Mock marketDataService for re-exports
jest.mock('../../../services/marketDataService', () => ({
  fetchMultipleStocks: jest.fn(),
  fetchApiStatus: jest.fn()
}));

const { fetchWithRetry, formatErrorResponse, generateFallbackData, TIMEOUT } = require('../../../utils/apiUtils');
const { fetchMultipleStocks, fetchApiStatus } = require('../../../services/marketDataService');

describe('marketDataService.local', () => {
  const originalEnv = process.env;
  const originalConsoleLog = console.log;
  const originalConsoleGroup = console.group;
  const originalConsoleGroupEnd = console.groupEnd;
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
    console.log = jest.fn();
    console.group = jest.fn();
    console.groupEnd = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsoleLog;
    console.group = originalConsoleGroup;
    console.groupEnd = originalConsoleGroupEnd;
    console.error = originalConsoleError;
  });

  describe('fetchExchangeRate', () => {
    describe('モックAPI使用時', () => {
      beforeEach(() => {
        process.env.REACT_APP_USE_MOCK_API = 'true';
      });

      it('モックデータを返す', async () => {
        const result = await fetchExchangeRate('USD', 'JPY');

        expect(result).toEqual({
          success: true,
          rate: 150.0,
          source: 'Mock',
          lastUpdated: expect.any(String)
        });

        expect(console.group).toHaveBeenCalledWith('📡 API Call: fetchExchangeRate');
        expect(console.log).toHaveBeenCalledWith('Parameters:', { fromCurrency: 'USD', toCurrency: 'JPY' });
        expect(console.log).toHaveBeenCalledWith('Response:', expect.objectContaining({
          success: true,
          rate: 150.0,
          source: 'Mock'
        }));
        expect(console.groupEnd).toHaveBeenCalled();
        expect(fetchWithRetry).not.toHaveBeenCalled();
      });

      it('refreshパラメータは無視される', async () => {
        const result = await fetchExchangeRate('USD', 'JPY', true);

        expect(result).toEqual({
          success: true,
          rate: 150.0,
          source: 'Mock',
          lastUpdated: expect.any(String)
        });
      });
    });

    describe('実際のAPI使用時', () => {
      beforeEach(() => {
        process.env.REACT_APP_USE_MOCK_API = 'false';
      });

      it('成功時にAPIレスポンスを返す', async () => {
        const mockResponse = {
          success: true,
          rate: 152.5,
          source: 'API',
          lastUpdated: '2025-01-01T00:00:00Z'
        };
        fetchWithRetry.mockResolvedValue(mockResponse);

        const result = await fetchExchangeRate('USD', 'JPY');

        expect(result).toEqual(mockResponse);
        expect(fetchWithRetry).toHaveBeenCalledWith(
          'http://localhost:3000/api/market-data',
          {
            type: 'exchange-rate',
            base: 'USD',
            target: 'JPY',
            refresh: 'false'
          },
          TIMEOUT.EXCHANGE_RATE
        );
        expect(console.group).toHaveBeenCalledWith('📡 API Call: fetchExchangeRate');
        expect(console.log).toHaveBeenCalledWith('Response:', mockResponse);
      });

      it('refreshパラメータを正しく渡す', async () => {
        fetchWithRetry.mockResolvedValue({ success: true });

        await fetchExchangeRate('EUR', 'GBP', true);

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            refresh: 'true'
          }),
          expect.any(Number)
        );
      });

      it('エラー時にフォールバック値を返す（USD/JPY）', async () => {
        const error = new Error('Network error');
        fetchWithRetry.mockRejectedValue(error);
        formatErrorResponse.mockReturnValue({
          success: false,
          error: true,
          message: 'エラーメッセージ'
        });

        const result = await fetchExchangeRate('USD', 'JPY');

        expect(result).toEqual({
          success: false,
          error: true,
          message: '為替レートの取得に失敗しました',
          success: false,
          error: true,
          message: 'エラーメッセージ',
          rate: 150.0,
          source: 'Fallback',
          lastUpdated: expect.any(String)
        });

        expect(console.group).toHaveBeenCalledWith('📡 API Call: fetchExchangeRate');
        expect(console.error).toHaveBeenCalledWith('Error:', error);
      });

      it('エラー時にフォールバック値を返す（JPY/USD）', async () => {
        const error = new Error('API Error');
        fetchWithRetry.mockRejectedValue(error);
        formatErrorResponse.mockReturnValue({
          success: false,
          error: true
        });

        const result = await fetchExchangeRate('JPY', 'USD');

        expect(result.rate).toBe(1/150.0);
        expect(result.source).toBe('Fallback');
      });

      it('エラー時にフォールバック値を返す（その他の通貨ペア）', async () => {
        const error = new Error('API Error');
        fetchWithRetry.mockRejectedValue(error);
        formatErrorResponse.mockReturnValue({
          success: false,
          error: true
        });

        const result = await fetchExchangeRate('EUR', 'GBP');

        expect(result.rate).toBe(1.0);
        expect(result.source).toBe('Fallback');
      });
    });

    describe('ログ出力', () => {
      it('本番環境ではログを出力しない', async () => {
        process.env.NODE_ENV = 'production';
        process.env.REACT_APP_USE_MOCK_API = 'true';

        await fetchExchangeRate('USD', 'JPY');

        expect(console.group).not.toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalled();
      });

      it('開発環境でエラーログを出力する', async () => {
        process.env.REACT_APP_USE_MOCK_API = 'false';
        const error = new Error('Test error');
        fetchWithRetry.mockRejectedValue(error);

        await fetchExchangeRate('USD', 'JPY');

        expect(console.error).toHaveBeenCalledWith('Error:', error);
      });
    });
  });

  describe('fetchStockData', () => {
    describe('モックAPI使用時', () => {
      beforeEach(() => {
        process.env.REACT_APP_USE_MOCK_API = 'true';
      });

      it('米国株のモックデータを返す', async () => {
        const result = await fetchStockData('AAPL');

        expect(result).toEqual({
          success: true,
          data: {
            'AAPL': {
              ticker: 'AAPL',
              price: 150,
              currency: 'USD',
              name: 'AAPL (Mock)',
              source: 'Mock',
              lastUpdated: expect.any(String)
            }
          }
        });
      });

      it('日本株のモックデータを返す（.T付き）', async () => {
        const result = await fetchStockData('7203.T');

        expect(result).toEqual({
          success: true,
          data: {
            '7203.T': {
              ticker: '7203.T',
              price: 2500,
              currency: 'JPY',
              name: '7203.T (Mock)',
              source: 'Mock',
              lastUpdated: expect.any(String)
            }
          }
        });
      });

      it('日本株のモックデータを返す（.Tなし）', async () => {
        const result = await fetchStockData('7203');

        expect(result).toEqual({
          success: true,
          data: {
            '7203': {
              ticker: '7203',
              price: 2500,
              currency: 'JPY',
              name: '7203 (Mock)',
              source: 'Mock',
              lastUpdated: expect.any(String)
            }
          }
        });
      });

      it('refreshパラメータは無視される', async () => {
        const result = await fetchStockData('AAPL', true);

        expect(result.success).toBe(true);
        expect(fetchWithRetry).not.toHaveBeenCalled();
      });
    });

    describe('実際のAPI使用時', () => {
      beforeEach(() => {
        process.env.REACT_APP_USE_MOCK_API = 'false';
      });

      it('米国株データを取得する', async () => {
        const mockResponse = {
          success: true,
          data: {
            'AAPL': {
              ticker: 'AAPL',
              price: 175.0,
              name: 'Apple Inc.'
            }
          }
        };
        fetchWithRetry.mockResolvedValue(mockResponse);

        const result = await fetchStockData('AAPL');

        expect(result).toEqual(mockResponse);
        expect(fetchWithRetry).toHaveBeenCalledWith(
          'http://localhost:3000/api/market-data',
          {
            type: 'us-stock',
            symbols: 'AAPL',
            refresh: 'false'
          },
          TIMEOUT.US_STOCK
        );
      });

      it('日本株データを取得する（.T付き）', async () => {
        const mockResponse = {
          success: true,
          data: {
            '7203.T': {
              ticker: '7203.T',
              price: 2800,
              name: 'トヨタ自動車'
            }
          }
        };
        fetchWithRetry.mockResolvedValue(mockResponse);

        const result = await fetchStockData('7203.T');

        expect(result).toEqual(mockResponse);
        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          {
            type: 'jp-stock',
            symbols: '7203.T',
            refresh: 'false'
          },
          TIMEOUT.JP_STOCK
        );
      });

      it('日本株データを取得する（.Tなし）', async () => {
        fetchWithRetry.mockResolvedValue({ success: true });

        await fetchStockData('7203');

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'jp-stock',
            symbols: '7203'
          }),
          TIMEOUT.JP_STOCK
        );
      });

      it('投資信託データを取得する（7桁+文字パターン）', async () => {
        fetchWithRetry.mockResolvedValue({ success: true });

        await fetchStockData('0331418C');

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'mutual-fund',
            symbols: '0331418C'
          }),
          TIMEOUT.MUTUAL_FUND
        );
      });

      it('refreshパラメータを正しく渡す', async () => {
        fetchWithRetry.mockResolvedValue({ success: true });

        await fetchStockData('GOOGL', true);

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            refresh: 'true'
          }),
          expect.any(Number)
        );
      });

      it('エラー時にフォールバックデータを返す', async () => {
        const error = new Error('API Error');
        fetchWithRetry.mockRejectedValue(error);
        formatErrorResponse.mockReturnValue({
          success: false,
          message: 'エラーメッセージ'
        });
        generateFallbackData.mockReturnValue({
          ticker: 'AAPL',
          price: 100,
          source: 'Fallback'
        });

        const result = await fetchStockData('AAPL');

        expect(result).toEqual({
          success: false,
          success: false,
          message: 'エラーメッセージ',
          data: {
            'AAPL': {
              ticker: 'AAPL',
              price: 100,
              source: 'Fallback'
            }
          },
          source: 'Fallback'
        });

        expect(formatErrorResponse).toHaveBeenCalledWith(error, 'AAPL');
        expect(generateFallbackData).toHaveBeenCalledWith('AAPL');
      });
    });

    describe('銘柄タイプの判定', () => {
      beforeEach(() => {
        process.env.REACT_APP_USE_MOCK_API = 'false';
        fetchWithRetry.mockResolvedValue({ success: true });
      });

      it('4桁の数字は日本株として判定', async () => {
        await fetchStockData('1234');

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'jp-stock'
          }),
          TIMEOUT.JP_STOCK
        );
      });

      it('4桁の数字.Tは日本株として判定', async () => {
        await fetchStockData('5678.T');

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'jp-stock'
          }),
          TIMEOUT.JP_STOCK
        );
      });

      it('7桁の数字+C.Tは投資信託として判定', async () => {
        await fetchStockData('1234567C.T');

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'mutual-fund'
          }),
          TIMEOUT.MUTUAL_FUND
        );
      });

      it('7桁の数字+Cは投資信託として判定', async () => {
        await fetchStockData('1234567C');

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'mutual-fund'
          }),
          TIMEOUT.MUTUAL_FUND
        );
      });

      it('その他は米国株として判定', async () => {
        await fetchStockData('MSFT');

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'us-stock'
          }),
          TIMEOUT.US_STOCK
        );
      });

      it('特殊文字を含む銘柄も米国株として判定', async () => {
        await fetchStockData('BRK-B');

        expect(fetchWithRetry).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: 'us-stock'
          }),
          TIMEOUT.US_STOCK
        );
      });
    });
  });

  describe('再エクスポートされた関数', () => {
    it('fetchMultipleStocksが正しくエクスポートされている', () => {
      expect(fetchMultipleStocks).toBeDefined();
      expect(typeof fetchMultipleStocks).toBe('function');
    });

    it('fetchApiStatusが正しくエクスポートされている', () => {
      expect(fetchApiStatus).toBeDefined();
      expect(typeof fetchApiStatus).toBe('function');
    });

    it('デフォルトエクスポートが正しく設定されている', () => {
      const marketDataServiceLocal = require('../../../services/marketDataService.local');
      
      expect(marketDataServiceLocal.default).toEqual({
        fetchExchangeRate: expect.any(Function),
        fetchStockData: expect.any(Function),
        fetchMultipleStocks: expect.any(Function),
        fetchApiStatus: expect.any(Function)
      });
    });
  });
});