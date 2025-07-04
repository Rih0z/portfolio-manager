/**
 * marketDataService.js の拡張テスト
 * キャッシュ、タイムアウト、エッジケースをカバー
 */

import {
  fetchExchangeRate,
  fetchStockData,
  fetchMultipleStocks,
  fetchApiStatus
} from '../../../services/marketDataService';

// Mock dependencies
jest.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: jest.fn()
}));

jest.mock('../../../utils/apiUtils', () => ({
  fetchWithRetry: jest.fn(),
  formatErrorResponse: jest.fn((error, ticker) => ({
    success: false,
    error: true,
    message: 'データの取得に失敗しました',
    errorType: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'UNKNOWN',
    errorDetail: error.message,
    ticker
  })),
  generateFallbackData: jest.fn((ticker) => ({
    ticker,
    price: ticker === '7203.T' ? 2000 : ticker.includes('12345678') ? 10000 : 100,
    name: ticker + ' (フォールバック)',
    currency: ticker === '7203.T' || ticker.includes('12345678') ? 'JPY' : 'USD',
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

import { getApiEndpoint } from '../../../utils/envUtils';
import { fetchWithRetry, formatErrorResponse, generateFallbackData, TIMEOUT } from '../../../utils/apiUtils';

// localStorage のモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('marketDataService - extended tests', () => {
  let consoleSpy;
  const originalDate = Date;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };
    
    // getApiEndpoint のデフォルト実装
    getApiEndpoint.mockImplementation(async (endpoint) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return `https://api.example.com/${endpoint}`;
    });
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    global.Date = originalDate;
  });

  describe('fetchExchangeRate - キャッシュ機能', () => {
    it('タイムアウト時にキャッシュからフォールバックデータを使用', async () => {
      const cachedData = {
        rate: 155.5,
        lastUpdated: new Date(Date.now() - 3600000).toISOString(), // 1時間前
        timestamp: Date.now() - 3600000
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));
      
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      fetchWithRetry.mockRejectedValue(timeoutError);

      const result = await fetchExchangeRate('USD', 'JPY');

      expect(localStorageMock.getItem).toHaveBeenCalledWith('exchangeRate_USD_JPY');
      expect(result.rate).toBe(155.5);
      expect(result.source).toBe('Cached Data (Timeout Fallback)');
      expect(result.errorType).toBe('TIMEOUT');
      expect(result.isStale).toBe(true);
    });

    it('7日以上古いキャッシュは使用しない', async () => {
      const oldCachedData = {
        rate: 140.0,
        lastUpdated: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8日前
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldCachedData));
      
      const timeoutError = new Error('timeout');
      timeoutError.message = 'Request timeout';
      fetchWithRetry.mockRejectedValue(timeoutError);

      const result = await fetchExchangeRate('USD', 'JPY');

      expect(result.rate).toBe(150.0); // デフォルト値
      expect(result.source).toBe('Fallback');
      expect(result.isDefault).toBe(true);
    });

    it('無効なキャッシュデータを処理', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json data');
      
      const timeoutError = new Error('ETIMEDOUT');
      fetchWithRetry.mockRejectedValue(timeoutError);

      const result = await fetchExchangeRate('USD', 'JPY');

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'キャッシュデータの読み込みに失敗:',
        expect.any(String)
      );
      expect(result.rate).toBe(150.0);
      expect(result.source).toBe('Fallback');
    });

    it('キャッシュにレート0が含まれる場合は使用しない', async () => {
      const invalidCachedData = {
        rate: 0,
        timestamp: Date.now() - 3600000
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidCachedData));
      
      const timeoutError = new Error('timeout');
      fetchWithRetry.mockRejectedValue(timeoutError);

      const result = await fetchExchangeRate('USD', 'JPY');

      expect(result.rate).toBe(150.0); // デフォルト値
      expect(result.source).toBe('Fallback');
    });

    it('非タイムアウトエラーではキャッシュを使用しない', async () => {
      const cachedData = {
        rate: 155.5,
        timestamp: Date.now() - 3600000
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData));
      
      const apiError = new Error('API Error');
      apiError.code = 'API_ERROR';
      fetchWithRetry.mockRejectedValue(apiError);

      const result = await fetchExchangeRate('USD', 'JPY');

      expect(result.rate).toBe(150.0); // キャッシュではなくデフォルト値
      expect(result.source).toBe('Fallback');
      expect(result.errorType).toBe('API_ERROR');
    });
  });

  describe('fetchExchangeRate - 複雑なレスポンス処理', () => {
    it('バックエンドから複数の為替ペアが返される場合', async () => {
      const mockResponse = {
        success: true,
        data: {
          'USD-JPY': {
            rate: 155.0,
            lastUpdated: '2025-01-01T00:00:00Z'
          },
          'EUR-JPY': {
            rate: 165.0,
            lastUpdated: '2025-01-01T00:00:00Z'
          }
        },
        warnings: ['一部のデータソースが利用できません']
      };

      fetchWithRetry.mockResolvedValue(mockResponse);

      const result = await fetchExchangeRate('USD', 'JPY');

      expect(result.rate).toBe(155.0);
      expect(result.warnings).toEqual(['一部のデータソースが利用できません']);
    });

    it('要求したペアがレスポンスに含まれない場合', async () => {
      const mockResponse = {
        success: true,
        data: {
          'EUR-USD': {
            rate: 1.1,
            lastUpdated: '2025-01-01T00:00:00Z'
          }
        }
      };

      fetchWithRetry.mockResolvedValue(mockResponse);

      const result = await fetchExchangeRate('USD', 'JPY');

      // 元のレスポンスをそのまま返す
      expect(result).toEqual(mockResponse);
    });

    it('デフォルトレートの境界値テスト', async () => {
      const error = new Error('Test error');
      fetchWithRetry.mockRejectedValue(error);

      // EUR/JPY
      let result = await fetchExchangeRate('EUR', 'JPY');
      expect(result.rate).toBe(160.0);

      // GBP/JPY
      result = await fetchExchangeRate('GBP', 'JPY');
      expect(result.rate).toBe(185.0);

      // その他の組み合わせ
      result = await fetchExchangeRate('AUD', 'CAD');
      expect(result.rate).toBe(1.0);
    });
  });

  describe('fetchStockData - 銘柄タイプの詳細判定', () => {
    it('様々な投資信託パターンを正しく判定', async () => {
      const patterns = [
        { ticker: '03311187', expectedType: 'mutual-fund' }, // 8桁数字
        { ticker: '0331418A', expectedType: 'mutual-fund' }, // 7桁+文字
        { ticker: '9C31116A', expectedType: 'mutual-fund' }, // 英数字混合
        { ticker: 'AB123456', expectedType: 'mutual-fund' }, // 英数字混合
        { ticker: '12345678', expectedType: 'mutual-fund' }  // 8桁数字
      ];

      for (const { ticker, expectedType } of patterns) {
        fetchWithRetry.mockResolvedValueOnce({ success: true });
        
        await fetchStockData(ticker);
        
        expect(fetchWithRetry).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
            type: expectedType,
            symbols: ticker
          }),
          TIMEOUT.MUTUAL_FUND
        );
      }
    });

    it('大文字小文字を正しく処理', async () => {
      // 小文字の投資信託コード
      fetchWithRetry.mockResolvedValue({ success: true });
      
      await fetchStockData('0331418a'); // 小文字
      
      expect(fetchWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'mutual-fund'
        }),
        TIMEOUT.MUTUAL_FUND
      );
    });

    it('境界ケースの銘柄コード', async () => {
      const testCases = [
        { ticker: '123', expectedType: 'us-stock' },      // 3桁（日本株ではない）
        { ticker: '12345', expectedType: 'us-stock' },    // 5桁（日本株ではない）
        { ticker: '1234A', expectedType: 'us-stock' },    // 4桁+文字（日本株ではない）
        { ticker: '1234567', expectedType: 'us-stock' },  // 7桁のみ（投資信託ではない）
        { ticker: '123456789', expectedType: 'us-stock' } // 9桁（投資信託ではない）
      ];

      for (const { ticker, expectedType } of testCases) {
        fetchWithRetry.mockResolvedValueOnce({ success: true });
        
        await fetchStockData(ticker);
        
        expect(fetchWithRetry).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({ type: expectedType }),
          TIMEOUT.US_STOCK
        );
      }
    });
  });

  describe('fetchMultipleStocks - バッチ処理の詳細', () => {
    it('内部のfetchStockBatch関数のエラーハンドリング', async () => {
      const tickers = ['AAPL', 'GOOGL', '7203.T', '12345678'];
      
      // 米国株は成功、日本株は失敗、投資信託も失敗
      fetchWithRetry
        .mockResolvedValueOnce({
          success: true,
          data: {
            'AAPL': { ticker: 'AAPL', price: 175 },
            'GOOGL': { ticker: 'GOOGL', price: 2500 }
          },
          source: 'API'
        })
        .mockRejectedValueOnce(new Error('JP stocks API down'))
        .mockRejectedValueOnce(new Error('Mutual funds API down'));

      generateFallbackData
        .mockReturnValueOnce({ ticker: '7203.T', price: 2000, source: 'Fallback' })
        .mockReturnValueOnce({ ticker: '12345678', price: 10000, source: 'Fallback' });

      const result = await fetchMultipleStocks(tickers);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data)).toHaveLength(4);
      expect(result.sources.API).toBe(2);
      expect(result.sources.Fallback).toBe(2);
      expect(result.sourcesSummary).toBe('API: 2件, Fallback: 2件');
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error fetching JP stocks:',
        expect.any(Error)
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error fetching mutual funds:',
        expect.any(Error)
      );
    });

    it('空の結果が返された場合のソース集計', async () => {
      const tickers = ['INVALID1', 'INVALID2'];
      
      fetchWithRetry.mockResolvedValue({
        success: true,
        data: {},
        source: 'API'
      });

      const result = await fetchMultipleStocks(tickers);

      expect(result.data).toEqual({});
      expect(result.sources.API).toBe(0);
      expect(result.sourcesSummary).toBe('');
    });

    it('部分的な成功の場合のエラー情報集約', async () => {
      const tickers = ['AAPL', 'INVALID', 'GOOGL'];
      
      fetchWithRetry.mockResolvedValue({
        success: true,
        data: {
          'AAPL': { ticker: 'AAPL', price: 175 },
          'GOOGL': { ticker: 'GOOGL', price: 2500 }
        },
        errors: [
          { ticker: 'INVALID', message: 'Ticker not found' }
        ],
        source: 'API'
      });

      const result = await fetchMultipleStocks(tickers);

      expect(result.data).toHaveProperty('AAPL');
      expect(result.data).toHaveProperty('GOOGL');
      expect(result.data).not.toHaveProperty('INVALID');
      expect(result.errors).toEqual([
        { ticker: 'INVALID', message: 'Ticker not found' }
      ]);
    });

    it('非常に大量の銘柄でのメモリ効率', async () => {
      const largeTickers = Array.from({ length: 1000 }, (_, i) => `STOCK${i}`);
      
      // タイプ別に分類されることを確認
      const usStocks = largeTickers; // すべて米国株として分類される
      
      fetchWithRetry.mockImplementation(async (endpoint, params) => {
        // バッチサイズを確認
        const symbols = params.symbols.split(',');
        expect(symbols.length).toBe(1000);
        
        return {
          success: true,
          data: symbols.reduce((acc, symbol) => {
            acc[symbol] = { ticker: symbol, price: Math.random() * 1000 };
            return acc;
          }, {}),
          source: 'API'
        };
      });

      const result = await fetchMultipleStocks(largeTickers);

      expect(Object.keys(result.data)).toHaveLength(1000);
      expect(fetchWithRetry).toHaveBeenCalledTimes(1); // 1回のバッチ呼び出し
    });
  });

  describe('fetchApiStatus - 管理者機能', () => {
    it('詳細なステータス情報を処理', async () => {
      const mockStatus = {
        success: true,
        status: 'operational',
        endpoints: {
          'market-data': {
            status: 'up',
            latency: 45,
            requestsPerMinute: 1200,
            errors: 0
          },
          'exchange-rate': {
            status: 'degraded',
            latency: 250,
            requestsPerMinute: 800,
            errors: 15
          }
        },
        cache: {
          size: 2048576, // 2MB
          hitRate: 0.92,
          ttl: 300
        },
        uptime: 99.95,
        lastIncident: '2025-01-01T00:00:00Z'
      };

      fetchWithRetry.mockResolvedValue(mockStatus);

      const result = await fetchApiStatus();

      expect(result).toEqual(mockStatus);
      expect(result.cache.hitRate).toBe(0.92);
      expect(result.endpoints['exchange-rate'].status).toBe('degraded');
    });

    it('ネットワーク接続エラーの詳細処理', async () => {
      const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:3000');
      connectionError.code = 'ECONNREFUSED';
      connectionError.errno = -61;
      connectionError.syscall = 'connect';
      connectionError.address = '127.0.0.1';
      connectionError.port = 3000;

      fetchWithRetry.mockRejectedValue(connectionError);
      formatErrorResponse.mockReturnValue({
        success: false,
        error: true,
        errorType: 'NETWORK',
        message: 'ネットワーク接続に問題があります',
        details: {
          code: 'ECONNREFUSED',
          address: '127.0.0.1',
          port: 3000
        }
      });

      const result = await fetchApiStatus();

      expect(result.success).toBe(false);
      expect(result.error.errorType).toBe('NETWORK');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error fetching API status:',
        connectionError
      );
    });

    it('認証エラーの詳細情報', async () => {
      const authError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            message: 'Admin access required',
            requiredRole: 'admin',
            currentRole: 'user'
          },
          headers: {
            'x-rate-limit-remaining': '0',
            'x-rate-limit-reset': '1640995200'
          }
        }
      };

      fetchWithRetry.mockRejectedValue(authError);
      formatErrorResponse.mockReturnValue({
        success: false,
        error: true,
        errorType: 'AUTH_ERROR',
        status: 403,
        message: 'Admin access required',
        details: authError.response.data
      });

      const result = await fetchApiStatus();

      expect(result.error.errorType).toBe('AUTH_ERROR');
      expect(result.error.status).toBe(403);
    });
  });

  describe('非同期処理とタイミング', () => {
    it('getApiEndpointの遅延を適切に処理', async () => {
      let callCount = 0;
      getApiEndpoint.mockImplementation(async (endpoint) => {
        callCount++;
        // 段階的に遅延を増やす
        await new Promise(resolve => setTimeout(resolve, callCount * 50));
        return `https://api.example.com/${endpoint}`;
      });

      fetchWithRetry.mockResolvedValue({
        success: true,
        data: { 'AAPL': { price: 175 } }
      });

      const startTime = Date.now();
      
      // 並行して複数のリクエスト
      const promises = [
        fetchStockData('AAPL'),
        fetchStockData('GOOGL'),
        fetchStockData('MSFT')
      ];

      await Promise.all(promises);
      
      const endTime = Date.now();

      expect(callCount).toBe(3);
      expect(endTime - startTime).toBeGreaterThanOrEqual(150); // 最低でも150ms
    });

    it('fetchWithRetryの段階的タイムアウト増加', async () => {
      const mockResponse = { success: true, data: {} };
      let timeoutValues = [];

      fetchWithRetry.mockImplementation(async (endpoint, params, timeout) => {
        timeoutValues.push(timeout);
        return mockResponse;
      });

      await fetchStockData('AAPL');

      expect(timeoutValues[0]).toBe(TIMEOUT.US_STOCK);
      
      // リトライ時のタイムアウト増加はfetchWithRetry内部で処理される
      // ここではベースタイムアウトが正しく渡されることを確認
    });
  });

  describe('ログ出力の詳細確認', () => {
    it('為替レート取得時の完全なログ出力', async () => {
      const mockResponse = {
        success: true,
        data: {
          'USD-JPY': {
            rate: 155.0,
            lastUpdated: '2025-01-01T00:00:00Z',
            isDefault: true,
            isStale: true,
            error: 'Primary source unavailable'
          }
        },
        warnings: ['Using cached data']
      };

      fetchWithRetry.mockResolvedValue(mockResponse);

      await fetchExchangeRate('USD', 'JPY', true);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '為替レート取得開始: USD/JPY, refresh: true'
      );
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '為替レート警告 (USD-JPY):',
        {
          isDefault: true,
          isStale: true,
          error: 'Primary source unavailable'
        }
      );
    });

    it('株価データ取得時のエラーログ詳細', async () => {
      const detailedError = {
        message: 'Rate limit exceeded',
        response: {
          status: 429,
          data: {
            error: 'Too many requests',
            retryAfter: 60
          }
        },
        code: 'ERR_TOO_MANY_REQUESTS'
      };

      fetchWithRetry.mockRejectedValue(detailedError);
      generateFallbackData.mockReturnValue({ ticker: 'AAPL', price: 100 });

      await fetchStockData('AAPL');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Attempting to fetch data for AAPL from Market Data API'
      );
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error fetching AAPL from Market Data API:',
        {
          message: 'Rate limit exceeded',
          status: 429,
          data: { error: 'Too many requests', retryAfter: 60 },
          code: 'ERR_TOO_MANY_REQUESTS'
        }
      );
    });
  });
});