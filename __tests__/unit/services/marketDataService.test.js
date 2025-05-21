/**
 * ファイルパス: __test__/unit/services/marketDataService.test.js
 * 
 * 市場データサービスの単体テスト
 * 為替レート取得、銘柄データ取得、複数銘柄一括取得機能のテスト
 * 
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

// テスト対象モジュールのインポート
import {
  fetchExchangeRate,
  fetchStockData,
  fetchMultipleStocks,
  fetchApiStatus
} from '@/services/marketDataService';

// 依存モジュールのモック
import * as apiUtils from '@/utils/apiUtils';
import * as envUtils from '@/utils/envUtils';

// APIユーティリティモック
jest.mock('@/utils/apiUtils', () => ({
  fetchWithRetry: jest.fn(),
  formatErrorResponse: jest.fn().mockImplementation((error, ticker) => ({
    success: false,
    error: true,
    message: 'API エラー',
    errorType: 'API_ERROR',
    ...(ticker ? { ticker } : {})
  })),
  generateFallbackData: jest.fn().mockImplementation(ticker => ({
    ticker,
    price: 100,
    name: `${ticker} (Fallback)`,
    currency: ticker.includes('.T') ? 'JPY' : 'USD',
    source: 'Fallback'
  })),
  TIMEOUT: {
    DEFAULT: 10000,
    EXCHANGE_RATE: 5000,
    US_STOCK: 10000,
    JP_STOCK: 20000,
    MUTUAL_FUND: 20000
  }
}));

// 環境ユーティリティモック
jest.mock('@/utils/envUtils', () => ({
  getApiEndpoint: jest.fn().mockReturnValue('https://api.example.com/dev/api/market-data')
}));

describe('市場データサービス', () => {
  // 成功レスポンスのモックデータ
  const mockExchangeRateResponse = {
    success: true,
    data: {
      base: 'USD',
      target: 'JPY',
      rate: 150.0,
      source: 'Market Data API',
      lastUpdated: '2025-05-12T14:23:45.678Z'
    },
    message: '為替レートを取得しました'
  };
  
  const mockStockDataResponse = {
    success: true,
    data: {
      'AAPL': {
        ticker: 'AAPL',
        price: 174.79,
        name: 'Apple Inc.',
        currency: 'USD',
        source: 'Market Data API',
        lastUpdated: '2025-05-12T14:23:45.678Z'
      }
    },
    message: 'データを取得しました'
  };
  
  const mockMultipleStocksResponse = {
    success: true,
    data: {
      'AAPL': {
        ticker: 'AAPL',
        price: 174.79,
        name: 'Apple Inc.',
        currency: 'USD',
        source: 'Market Data API'
      },
      'MSFT': {
        ticker: 'MSFT',
        price: 335.25,
        name: 'Microsoft Corporation',
        currency: 'USD',
        source: 'Market Data API'
      }
    },
    source: 'Market Data API',
    message: 'データを取得しました'
  };
  
  const mockApiStatusResponse = {
    success: true,
    status: 'running',
    uptime: '5d 12h 34m',
    usageCount: {
      'market-data': 1250,
      'exchange-rate': 526
    },
    lastReset: '2025-05-15T00:00:00.000Z'
  };
  
  // 各テスト前の準備
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // デフォルトのモック実装
    apiUtils.fetchWithRetry.mockResolvedValue({});
    envUtils.getApiEndpoint.mockReturnValue('https://api.example.com/dev/api/market-data');
  });
  
  describe('fetchExchangeRate', () => {
    it('為替レートを正常に取得できる場合', async () => {
      // モックの設定
      apiUtils.fetchWithRetry.mockResolvedValue(mockExchangeRateResponse);
      
      // テスト実行
      const result = await fetchExchangeRate('USD', 'JPY');
      
      // API呼び出しが正しく行われたことを検証
      expect(envUtils.getApiEndpoint).toHaveBeenCalledWith('api/market-data');
      expect(apiUtils.fetchWithRetry).toHaveBeenCalledWith(
        'https://api.example.com/dev/api/market-data',
        {
          type: 'exchange-rate',
          base: 'USD',
          target: 'JPY',
          refresh: 'false'
        },
        apiUtils.TIMEOUT.EXCHANGE_RATE
      );
      
      // 結果を検証
      expect(result).toEqual(mockExchangeRateResponse);
    });
    
    it('リフレッシュオプションが正しく機能する', async () => {
      // モックの設定
      apiUtils.fetchWithRetry.mockResolvedValue(mockExchangeRateResponse);
      
      // テスト実行
      await fetchExchangeRate('USD', 'JPY', true);
      
      // リフレッシュパラメータが正しく設定されていることを検証
      expect(apiUtils.fetchWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          refresh: 'true'
        }),
        expect.any(Number)
      );
    });
    
    it('エラー発生時はフォールバック値を返す', async () => {
      // モックの設定
      const mockError = new Error('API error');
      apiUtils.fetchWithRetry.mockRejectedValue(mockError);
      
      // テスト実行
      const result = await fetchExchangeRate('USD', 'JPY');
      
      // API呼び出しが正しく行われたことを検証
      expect(apiUtils.fetchWithRetry).toHaveBeenCalled();
      
      // エラーハンドリングが正しく行われたことを検証
      expect(apiUtils.formatErrorResponse).toHaveBeenCalledWith(mockError);
      
      // 結果がフォールバック値を含むことを検証
      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: true,
        rate: expect.any(Number)
      }));
    });
  });
  
  describe('fetchStockData', () => {
    it('株式データを正常に取得できる場合', async () => {
      // モックの設定
      apiUtils.fetchWithRetry.mockResolvedValue(mockStockDataResponse);
      
      // テスト実行
      const result = await fetchStockData('AAPL');
      
      // API呼び出しが正しく行われたことを検証
      expect(envUtils.getApiEndpoint).toHaveBeenCalledWith('api/market-data');
      expect(apiUtils.fetchWithRetry).toHaveBeenCalledWith(
        'https://api.example.com/dev/api/market-data',
        {
          type: 'us-stock',
          symbols: 'AAPL',
          refresh: 'false'
        },
        apiUtils.TIMEOUT.US_STOCK
      );
      
      // 結果を検証
      expect(result).toEqual(mockStockDataResponse);
    });
    
    it('日本株のデータを正しく取得する', async () => {
      // モックの設定
      apiUtils.fetchWithRetry.mockResolvedValue({
        success: true,
        data: {
          '7203.T': {
            ticker: '7203.T',
            price: 2100,
            name: 'トヨタ自動車',
            currency: 'JPY',
            source: 'Market Data API'
          }
        }
      });
      
      // テスト実行
      await fetchStockData('7203.T');
      
      // 日本株のタイプとタイムアウトが正しく設定されていることを検証
      expect(apiUtils.fetchWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'jp-stock',
          symbols: '7203.T'
        }),
        apiUtils.TIMEOUT.JP_STOCK
      );
    });
    
    it('投資信託のデータを正しく取得する', async () => {
      // モックの設定
      apiUtils.fetchWithRetry.mockResolvedValue({
        success: true,
        data: {
          '2931082C.T': {
            ticker: '2931082C.T',
            price: 10567,
            name: 'ひふみプラス',
            currency: 'JPY',
            source: 'Market Data API'
          }
        }
      });
      
      // テスト実行
      await fetchStockData('2931082C.T');
      
      // 投資信託のタイプとタイムアウトが正しく設定されていることを検証
      expect(apiUtils.fetchWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'mutual-fund',
          symbols: '2931082C.T'
        }),
        apiUtils.TIMEOUT.MUTUAL_FUND
      );
    });
    
    it('エラー発生時はフォールバックデータを返す', async () => {
      // モックの設定
      const mockError = new Error('API error');
      apiUtils.fetchWithRetry.mockRejectedValue(mockError);
      
      // テスト実行
      const result = await fetchStockData('AAPL');
      
      // エラーハンドリングが正しく行われたことを検証
      expect(apiUtils.formatErrorResponse).toHaveBeenCalledWith(mockError, 'AAPL');
      expect(apiUtils.generateFallbackData).toHaveBeenCalledWith('AAPL');
      
      // 結果がフォールバックデータを含むことを検証
      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: true,
        data: expect.objectContaining({
          AAPL: expect.objectContaining({
            ticker: 'AAPL',
            source: 'Fallback'
          })
        })
      }));
    });
  });
  
  describe('fetchMultipleStocks', () => {
    it('空の配列が渡された場合は空のオブジェクトを返す', async () => {
      // テスト実行
      const result = await fetchMultipleStocks([]);
      
      // API呼び出しが行われていないことを検証
      expect(apiUtils.fetchWithRetry).not.toHaveBeenCalled();
      
      // 結果を検証
      expect(result).toEqual(expect.objectContaining({
        success: true,
        data: {}
      }));
    });
    
    it('複数銘柄を正常に取得できる場合', async () => {
      // モックの設定
      apiUtils.fetchWithRetry.mockResolvedValue(mockMultipleStocksResponse);
      
      // テスト実行
      const result = await fetchMultipleStocks(['AAPL', 'MSFT']);
      
      // API呼び出しが正しく行われたことを検証
      expect(apiUtils.fetchWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'us-stock',
          symbols: 'AAPL,MSFT'
        }),
        expect.any(Number)
      );
      
      // 結果を検証
      expect(result).toEqual(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          AAPL: expect.any(Object),
          MSFT: expect.any(Object)
        })
      }));
    });
    
    it('異なるタイプの複数銘柄を正しく取得する', async () => {
      // モックの設定 - 米国株
      apiUtils.fetchWithRetry.mockResolvedValueOnce({
        success: true,
        data: {
          'AAPL': {
            ticker: 'AAPL',
            price: 174.79,
            source: 'Market Data API'
          }
        },
        source: 'Market Data API'
      });
      
      // モックの設定 - 日本株
      apiUtils.fetchWithRetry.mockResolvedValueOnce({
        success: true,
        data: {
          '7203.T': {
            ticker: '7203.T',
            price: 2100,
            source: 'Market Data API'
          }
        },
        source: 'Market Data API'
      });
      
      // モックの設定 - 投資信託
      apiUtils.fetchWithRetry.mockResolvedValueOnce({
        success: true,
        data: {
          '2931082C.T': {
            ticker: '2931082C.T',
            price: 10567,
            source: 'Market Data API'
          }
        },
        source: 'Market Data API'
      });
      
      // テスト実行
      const result = await fetchMultipleStocks(['AAPL', '7203.T', '2931082C.T']);
      
      // 各タイプのAPI呼び出しが行われたことを検証
      expect(apiUtils.fetchWithRetry).toHaveBeenCalledTimes(3);
      
      // 結果を検証
      expect(result).toEqual(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          'AAPL': expect.any(Object),
          '7203.T': expect.any(Object),
          '2931082C.T': expect.any(Object)
        }),
        sourcesSummary: expect.any(String)
      }));
    });
    
    it('一部の銘柄でエラーが発生した場合も部分的な結果を返す', async () => {
      // モックの設定 - 米国株（成功）
      apiUtils.fetchWithRetry.mockResolvedValueOnce({
        success: true,
        data: {
          'AAPL': {
            ticker: 'AAPL',
            price: 174.79,
            source: 'Market Data API'
          }
        },
        source: 'Market Data API'
      });
      
      // モックの設定 - 日本株（エラー）
      const mockError = new Error('API error');
      apiUtils.fetchWithRetry.mockRejectedValueOnce(mockError);
      
      // テスト実行
      const result = await fetchMultipleStocks(['AAPL', '7203.T']);
      
      // 結果を検証 - 成功した銘柄のデータと、エラーの銘柄のフォールバックデータが含まれる
      expect(result).toEqual(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          'AAPL': expect.objectContaining({
            source: 'Market Data API'
          }),
          '7203.T': expect.objectContaining({
            source: 'Fallback'
          })
        })
      }));
      
      // ソース情報のサマリーが含まれることを検証
      expect(result.sourcesSummary).toContain('Market Data API');
      expect(result.sourcesSummary).toContain('Fallback');
    });
  });
  
  describe('fetchApiStatus', () => {
    it('API状態を正常に取得できる場合', async () => {
      // モックの設定
      apiUtils.fetchWithRetry.mockResolvedValue(mockApiStatusResponse);
      
      // テスト実行
      const result = await fetchApiStatus();
      
      // API呼び出しが正しく行われたことを検証
      expect(envUtils.getApiEndpoint).toHaveBeenCalledWith('admin/status');
      expect(apiUtils.fetchWithRetry).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          apiKey: expect.any(String)
        })
      );
      
      // 結果を検証
      expect(result).toEqual(mockApiStatusResponse);
    });
    
    it('エラー発生時は適切なエラーレスポンスを返す', async () => {
      // モックの設定
      const mockError = new Error('API error');
      apiUtils.fetchWithRetry.mockRejectedValue(mockError);
      
      // テスト実行
      const result = await fetchApiStatus();
      
      // エラーハンドリングが正しく行われたことを検証
      expect(apiUtils.formatErrorResponse).toHaveBeenCalledWith(mockError);
      
      // 結果を検証
      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: expect.any(Object)
      }));
    });
  });
});
