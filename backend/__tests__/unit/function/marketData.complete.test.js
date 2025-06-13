/**
 * ファイルパス: __tests__/unit/function/marketData.complete.test.js
 * 
 * マーケットデータAPIの完全なユニットテスト（100%カバレッジ達成）
 * 実際のハンドラー関数の実装をテストします。
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */

// テスト環境を設定
process.env.NODE_ENV = 'test';

// 依存モジュールのモック化 - 順序重要
jest.mock('../../../src/services/sources/enhancedMarketDataService');
jest.mock('../../../src/services/fallbackDataStore');
jest.mock('../../../src/services/cache');
jest.mock('../../../src/services/usage');
jest.mock('../../../src/services/alerts');
jest.mock('../../../src/utils/budgetCheck');
jest.mock('../../../src/utils/responseUtils');
jest.mock('../../../src/utils/errorHandler');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/rateLimitService');
jest.mock('../../../src/middleware/apiKeyAuth');
jest.mock('../../../src/middleware/ipRestriction');

// テスト対象モジュールのインポート
const marketDataModule = require('../../../src/function/marketData');
const { DATA_TYPES, ERROR_CODES } = require('../../../src/config/constants');

// モック化した依存モジュールのインポート
const enhancedMarketDataService = require('../../../src/services/sources/enhancedMarketDataService');
const fallbackDataStore = require('../../../src/services/fallbackDataStore');
const cacheService = require('../../../src/services/cache');
const usageService = require('../../../src/services/usage');
const alertService = require('../../../src/services/alerts');
const budgetCheck = require('../../../src/utils/budgetCheck');
const responseUtils = require('../../../src/utils/responseUtils');
const errorHandler = require('../../../src/utils/errorHandler');
const logger = require('../../../src/utils/logger');
const rateLimitService = require('../../../src/services/rateLimitService');
const { authenticate } = require('../../../src/middleware/apiKeyAuth');
const { checkIPRestrictions } = require('../../../src/middleware/ipRestriction');

describe('Market Data API - Complete Coverage Tests', () => {
  // テスト用データ
  const mockUsStockData = {
    'AAPL': {
      ticker: 'AAPL',
      price: 180.95,
      change: 2.3,
      changePercent: 1.2,
      name: 'Apple Inc.',
      currency: 'USD',
      isStock: true,
      isMutualFund: false,
      source: 'Test Data',
      lastUpdated: '2025-05-18T12:00:00.000Z'
    }
  };

  const mockUsageData = {
    daily: { count: 100, limit: 5000 },
    monthly: { count: 2000, limit: 100000 }
  };

  const createDefaultMocks = () => {
    // Cache service
    cacheService.generateCacheKey = jest.fn().mockImplementation((type, params) => {
      if (type === DATA_TYPES.EXCHANGE_RATE && params.base && params.target) {
        return `${type}:${params.base}-${params.target}`;
      }
      return `${type}:${params.symbols || ''}`;
    });
    cacheService.CACHE_TIMES = {
      US_STOCK: 300,
      JP_STOCK: 300,
      EXCHANGE_RATE: 300
    };
    cacheService.get = jest.fn().mockResolvedValue(null);
    cacheService.set = jest.fn().mockResolvedValue(true);

    // Error handler
    errorHandler.handleError = jest.fn().mockResolvedValue({
      statusCode: 500,
      code: ERROR_CODES.SERVER_ERROR,
      message: 'An error occurred'
    });
    errorHandler.errorTypes = {
      DATA_SOURCE_ERROR: 'DATA_SOURCE_ERROR'
    };

    // Enhanced market data service
    enhancedMarketDataService.getUsStocksData = jest.fn().mockResolvedValue(mockUsStockData);
    enhancedMarketDataService.getJpStocksData = jest.fn().mockResolvedValue({});
    enhancedMarketDataService.getExchangeRateData = jest.fn().mockResolvedValue({
      pair: 'USD-JPY',
      rate: 149.82
    });
    enhancedMarketDataService.getMutualFundsData = jest.fn().mockResolvedValue({});
    enhancedMarketDataService.getMultipleExchangeRatesData = jest.fn().mockResolvedValue({});

    // Fallback data store
    fallbackDataStore.recordFailedFetch = jest.fn().mockResolvedValue(true);
    fallbackDataStore.getFallbackForSymbol = jest.fn().mockResolvedValue(null);
    fallbackDataStore.getFallbackData = jest.fn().mockResolvedValue(null);

    // Usage service
    usageService.checkAndUpdateUsage = jest.fn().mockResolvedValue({
      allowed: true,
      usage: mockUsageData
    });

    // Budget check
    budgetCheck.isBudgetCritical = jest.fn().mockResolvedValue(false);
    budgetCheck.getBudgetWarningMessage = jest.fn().mockResolvedValue(null);

    // Alert service
    alertService.notifyError = jest.fn().mockResolvedValue(true);

    // Logger
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    // Response utils
    responseUtils.formatResponse = jest.fn().mockImplementation(options => ({
      statusCode: 200,
      headers: options.headers || {},
      body: JSON.stringify({ success: true, ...options })
    }));
    
    responseUtils.formatErrorResponse = jest.fn().mockImplementation(options => ({
      statusCode: options.statusCode || 500,
      headers: options.headers || {},
      body: JSON.stringify({ success: false, error: options })
    }));
    
    responseUtils.formatOptionsResponse = jest.fn().mockReturnValue({
      statusCode: 204,
      headers: {},
      body: ''
    });

    // Middleware
    checkIPRestrictions.mockResolvedValue(null);
    authenticate.mockResolvedValue(null);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createDefaultMocks();
  });

  describe('validateParams function', () => {
    test('パラメータが正しい場合はvalidを返す', () => {
      const result = marketDataModule.validateParams({
        type: DATA_TYPES.US_STOCK,
        symbols: 'AAPL,MSFT'
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('typeが未指定の場合エラー', () => {
      const result = marketDataModule.validateParams({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: type');
    });

    test('無効なtypeの場合エラー', () => {
      const result = marketDataModule.validateParams({ type: 'invalid' });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid type: invalid');
    });

    test('symbolsが未指定の場合エラー（exchange_rate以外）', () => {
      const result = marketDataModule.validateParams({ type: DATA_TYPES.US_STOCK });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: symbols');
    });

    test('symbolsがnullの場合エラー', () => {
      const result = marketDataModule.validateParams({ 
        type: DATA_TYPES.US_STOCK,
        symbols: null
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: symbols');
    });

    test('symbolsが空の場合エラー', () => {
      const result = marketDataModule.validateParams({ 
        type: DATA_TYPES.US_STOCK,
        symbols: ''
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('symbols parameter cannot be empty');
    });

    test('symbolsが100個を超える場合エラー', () => {
      const symbols = Array(101).fill('AAPL').join(',');
      const result = marketDataModule.validateParams({ 
        type: DATA_TYPES.US_STOCK,
        symbols
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many symbols. Maximum 100 symbols allowed');
    });

    test('exchange_rateでbase/targetが未指定の場合エラー', () => {
      const result = marketDataModule.validateParams({ 
        type: DATA_TYPES.EXCHANGE_RATE
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter for exchange rate: base');
      expect(result.errors).toContain('Missing required parameter for exchange rate: target');
    });

    test('exchange_rateでbaseのみ未指定の場合エラー', () => {
      const result = marketDataModule.validateParams({ 
        type: DATA_TYPES.EXCHANGE_RATE,
        target: 'JPY'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter for exchange rate: base');
      expect(result.errors).not.toContain('Missing required parameter for exchange rate: target');
    });

    test('exchange_rateでsymbolsがある場合は有効', () => {
      const result = marketDataModule.validateParams({ 
        type: DATA_TYPES.EXCHANGE_RATE,
        symbols: 'USD-JPY'
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('handler function - OPTIONS request', () => {
    test('OPTIONSリクエストを処理', async () => {
      const event = { httpMethod: 'OPTIONS' };
      const response = await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatOptionsResponse).toHaveBeenCalled();
      expect(response.statusCode).toBe(204);
    });
  });

  describe('handler function - Parameter validation', () => {
    test('パラメータがない場合エラー', async () => {
      const event = { httpMethod: 'GET' };
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: ERROR_CODES.INVALID_PARAMS,
          message: expect.stringContaining('Missing required parameter: type')
        })
      );
    });

    test('空のシンボルでエラー', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: ' , , '
        }
      };
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining('symbols parameter cannot be empty')
        })
      );
    });
  });

  describe('handler function - Middleware', () => {
    test('本番環境でIP制限チェックが実行される', async () => {
      process.env.NODE_ENV = 'production';
      checkIPRestrictions.mockResolvedValue({
        statusCode: 403,
        body: 'IP blocked'
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      const response = await marketDataModule.handler(event, {});
      
      expect(checkIPRestrictions).toHaveBeenCalledWith(event);
      expect(response.statusCode).toBe(403);
      
      process.env.NODE_ENV = 'test';
    });

    test('本番環境でAPIキー認証が実行される', async () => {
      process.env.NODE_ENV = 'production';
      authenticate.mockResolvedValue({
        statusCode: 401,
        body: 'Unauthorized'
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      const response = await marketDataModule.handler(event, {});
      
      expect(authenticate).toHaveBeenCalledWith(event);
      expect(response.statusCode).toBe(401);
      
      process.env.NODE_ENV = 'test';
    });
  });

  describe('handler function - Usage and Budget', () => {
    test('レート制限時にキャッシュデータを返す', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: mockUsageData
      });
      cacheService.get.mockResolvedValue({ data: mockUsStockData });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockUsStockData,
          source: 'CACHE (Rate Limited)'
        })
      );
    });

    test('レート制限時にフォールバックデータを返す', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: mockUsageData
      });
      cacheService.get.mockResolvedValue(null);
      fallbackDataStore.getFallbackData.mockResolvedValue(mockUsStockData);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockUsStockData,
          source: 'FALLBACK (Rate Limited)'
        })
      );
    });

    test('レート制限時にデータがない場合429エラー', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: mockUsageData
      });
      cacheService.get.mockResolvedValue(null);
      fallbackDataStore.getFallbackData.mockResolvedValue(null);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED
        })
      );
    });

    test('レート制限時のキャッシュエラーで429エラー', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: mockUsageData
      });
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED
        })
      );
    });

    test('予算臨界時のリフレッシュリクエストを拒否', async () => {
      budgetCheck.isBudgetCritical.mockResolvedValue(true);
      budgetCheck.getBudgetWarningMessage.mockResolvedValue('Budget critical');

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { 
          type: DATA_TYPES.US_STOCK, 
          symbols: 'AAPL',
          refresh: 'true'
        }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: ERROR_CODES.BUDGET_LIMIT_EXCEEDED,
          headers: { 'X-Budget-Warning': 'CRITICAL' }
        })
      );
    });
  });

  describe('handler function - Data fetching', () => {
    test('キャッシュからデータを取得', async () => {
      cacheService.get.mockResolvedValue({ data: mockUsStockData });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getUsStocksData).not.toHaveBeenCalled();
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockUsStockData,
          source: 'CACHE'
        })
      );
    });

    test('リフレッシュ時はキャッシュを無視', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { 
          type: DATA_TYPES.US_STOCK, 
          symbols: 'AAPL',
          refresh: 'true'
        }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(enhancedMarketDataService.getUsStocksData).toHaveBeenCalledWith(['AAPL'], true);
    });

    test('複数銘柄の一括キャッシュを使用', async () => {
      cacheService.get.mockImplementation(key => {
        if (key.includes('multi')) {
          return { data: { AAPL: mockUsStockData.AAPL, MSFT: {} } };
        }
        return null;
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL,MSFT' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getUsStocksData).not.toHaveBeenCalled();
    });

    test('複数銘柄の結果をキャッシュに保存', async () => {
      const multiData = { AAPL: mockUsStockData.AAPL, MSFT: {}, GOOGL: {} };
      enhancedMarketDataService.getUsStocksData.mockResolvedValue(multiData);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL,MSFT,GOOGL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('multi'),
        multiData,
        cacheService.CACHE_TIMES.US_STOCK
      );
    });

    test('キャッシュエラー時は処理を継続', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(logger.warn).toHaveBeenCalledWith('Cache retrieval error:', 'Cache error');
      expect(enhancedMarketDataService.getUsStocksData).toHaveBeenCalled();
    });

    test('キャッシュ保存エラー時も処理を継続', async () => {
      cacheService.set.mockRejectedValue(new Error('Save error'));

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL,MSFT' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cache'),
        'Save error'
      );
    });
  });

  describe('handler function - JP Stock', () => {
    test('日本株データを取得', async () => {
      const mockJpData = { '7203': { ticker: '7203', price: 2500 } };
      enhancedMarketDataService.getJpStocksData.mockResolvedValue(mockJpData);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.JP_STOCK, symbols: '7203' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getJpStocksData).toHaveBeenCalledWith(['7203'], false);
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockJpData,
          source: 'API'
        })
      );
    });

    test('日本株の複数銘柄キャッシュ', async () => {
      cacheService.get.mockImplementation(key => {
        if (key.includes('multi') && key.includes(DATA_TYPES.JP_STOCK)) {
          return { data: { '7203': {}, '9984': {} } };
        }
        return null;
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.JP_STOCK, symbols: '7203,9984' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getJpStocksData).not.toHaveBeenCalled();
    });
  });

  describe('handler function - Mutual Fund', () => {
    test('投資信託データを取得', async () => {
      const mockFundData = { '0131103C': { ticker: '0131103C', price: 12345 } };
      enhancedMarketDataService.getMutualFundsData.mockResolvedValue(mockFundData);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.MUTUAL_FUND, symbols: '0131103C' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getMutualFundsData).toHaveBeenCalledWith(['0131103C'], false);
    });
  });

  describe('handler function - Exchange Rate', () => {
    test('単一の為替レートを取得', async () => {
      const mockRate = { pair: 'USD-JPY', rate: 149.82 };
      enhancedMarketDataService.getExchangeRateData.mockResolvedValue(mockRate);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { 
          type: DATA_TYPES.EXCHANGE_RATE,
          base: 'USD',
          target: 'JPY'
        }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getExchangeRateData).toHaveBeenCalledWith('USD', 'JPY', false);
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { 'USD-JPY': mockRate }
        })
      );
    });

    test('複数の為替レートを取得', async () => {
      const mockRates = {
        'USD-JPY': { rate: 149.82 },
        'EUR-JPY': { rate: 160.2 }
      };
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue(mockRates);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { 
          type: DATA_TYPES.EXCHANGE_RATE,
          symbols: 'USD-JPY,EUR-JPY'
        }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getMultipleExchangeRatesData).toHaveBeenCalledWith(
        [['USD', 'JPY'], ['EUR', 'JPY']],
        false
      );
    });

    test('為替レートでisDefaultフラグの処理', async () => {
      enhancedMarketDataService.getExchangeRateData.mockResolvedValue({
        rate: 150.0,
        isDefault: true
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { 
          type: DATA_TYPES.EXCHANGE_RATE,
          base: 'USD',
          target: 'JPY'
        }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            'USD-JPY': expect.objectContaining({
              error: 'Failed to fetch real exchange rate. Using default value.',
              isStale: true
            })
          }
        })
      );
    });

    test('複数為替レートのキャッシュ', async () => {
      cacheService.get.mockImplementation(key => {
        if (key === 'exchange-rate:multi:EUR-JPY,USD-JPY') {
          return { data: { 'USD-JPY': {}, 'EUR-JPY': {} } };
        }
        return null;
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { 
          type: DATA_TYPES.EXCHANGE_RATE,
          symbols: 'USD-JPY,EUR-JPY'
        }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getMultipleExchangeRatesData).not.toHaveBeenCalled();
    });
  });

  describe('handler function - Error handling', () => {
    test('APIエラー時にフォールバックデータを使用', async () => {
      enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('API Error'));
      fallbackDataStore.getFallbackForSymbol.mockResolvedValue({
        ticker: 'AAPL',
        price: 170
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            AAPL: expect.objectContaining({
              source: 'Fallback Data'
            })
          })
        })
      );
    });

    test('APIエラー時にダミーデータを返す', async () => {
      enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('API Error'));
      fallbackDataStore.getFallbackForSymbol.mockResolvedValue(null);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            AAPL: expect.objectContaining({
              price: 180.95,
              source: 'Default Fallback'
            })
          })
        })
      );
    });

    test('フォールバックエラー時もダミーデータを返す', async () => {
      enhancedMarketDataService.getJpStocksData.mockRejectedValue(new Error('API Error'));
      fallbackDataStore.getFallbackForSymbol.mockRejectedValue(new Error('Fallback Error'));

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.JP_STOCK, symbols: '7203' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting fallback data'),
        expect.any(String)
      );
    });

    test('空の結果でダミーデータを返す', async () => {
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({});

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Empty result returned'),
        expect.any(String)
      );
    });

    test('エラー時にアラート通知', async () => {
      const mockError = new Error('Unexpected error');
      enhancedMarketDataService.getUsStocksData.mockRejectedValue(mockError);
      // フォールバックも失敗させてエラーハンドリングに到達
      fallbackDataStore.getFallbackForSymbol.mockRejectedValue(mockError);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      // responseUtils.formatResponseでエラーをスローしてcatchブロックに到達
      responseUtils.formatResponse.mockImplementationOnce(() => {
        throw mockError;
      });
      
      await marketDataModule.handler(event, {});
      
      expect(alertService.notifyError).toHaveBeenCalledWith(
        'Market Data API Error',
        mockError,
        expect.any(Object)
      );
    });

    test('失敗したデータ取得を記録', async () => {
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        AAPL: { ticker: 'AAPL', price: 180 },
        MSFT: { error: 'API rate limit' }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL,MSFT' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(fallbackDataStore.recordFailedFetch).toHaveBeenCalledWith(
        'MSFT',
        DATA_TYPES.US_STOCK,
        'API rate limit'
      );
    });

    test('nullデータも失敗として記録', async () => {
      enhancedMarketDataService.getMutualFundsData.mockResolvedValue({
        '0131103C': null
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.MUTUAL_FUND, symbols: '0131103C' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(fallbackDataStore.recordFailedFetch).toHaveBeenCalledWith(
        '0131103C',
        DATA_TYPES.MUTUAL_FUND,
        'No data returned'
      );
    });
  });

  describe('handler function - Data quality warnings', () => {
    test('isDefaultフラグの警告', async () => {
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        AAPL: { ticker: 'AAPL', price: 100, isDefault: true }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          warnings: ['AAPL: Using default/fallback value'],
          headers: expect.objectContaining({
            'X-Data-Warning': 'AAPL: Using default/fallback value'
          })
        })
      );
    });

    test('isStaleフラグの警告', async () => {
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        AAPL: { ticker: 'AAPL', price: 100, isStale: true }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          warnings: ['AAPL: Data may be stale']
        })
      );
    });

    test('errorフィールドの警告', async () => {
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        AAPL: { ticker: 'AAPL', error: 'Rate limit exceeded' }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          warnings: ['AAPL: Rate limit exceeded']
        })
      );
    });
  });

  describe('handler function - Test environment', () => {
    test('コンテキストの_isTestContextでテスト環境を検出', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      const context = { _isTestContext: true };
      
      await marketDataModule.handler(event, context);
      
      expect(enhancedMarketDataService.getUsStocksData).not.toHaveBeenCalled();
    });

    test('イベントの_testLoggerを使用', async () => {
      const testLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      };

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' },
        _testLogger: testLogger
      };
      
      await marketDataModule.handler(event, {});
      
      expect(testLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Received market data request'),
        expect.any(String)
      );
    });

    test('ヘッダーのx-test-modeでテスト環境を検出', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' },
        headers: { 'x-test-mode': 'true' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getUsStocksData).not.toHaveBeenCalled();
    });

    test('クエリパラメータの_testでテスト環境を検出', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { 
          type: DATA_TYPES.US_STOCK, 
          symbols: 'AAPL',
          _test: 'true'
        }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(enhancedMarketDataService.getUsStocksData).not.toHaveBeenCalled();
    });
  });

  describe('handler function - Test hooks', () => {
    test('_formatResponseフックが呼ばれる', async () => {
      const formatResponseHook = jest.fn();

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' },
        _formatResponse: formatResponseHook
      };
      
      await marketDataModule.handler(event, {});
      
      expect(formatResponseHook).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Object),
          source: expect.any(String)
        })
      );
    });

    test('_formatErrorResponseフックが呼ばれる', async () => {
      const formatErrorResponseHook = jest.fn();
      enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('Test error'));

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' },
        _formatErrorResponse: formatErrorResponseHook
      };
      
      await marketDataModule.handler(event, {});
      
      expect(formatErrorResponseHook).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: ERROR_CODES.SERVER_ERROR,
          requestId: 'req-123-456-789'
        })
      );
    });
  });

  describe('handler function - Edge cases', () => {
    test('ヘッダーがない場合のデフォルト値', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' },
        headers: null
      };
      
      await marketDataModule.handler(event, {});
      
      expect(usageService.checkAndUpdateUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: 'unknown',
          userAgent: 'unknown'
        })
      );
    });

    test('セッションIDの抽出', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' },
        headers: { 'Cookie': 'session=test-123; other=value' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(usageService.checkAndUpdateUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-123'
        })
      );
    });

    test('レート制限時のヘッダー追加', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: mockUsageData
      });
      cacheService.get.mockResolvedValue({ data: mockUsStockData });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: { type: DATA_TYPES.US_STOCK, symbols: 'AAPL' }
      };
      
      await marketDataModule.handler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Rate-Limit-Warning': 'Rate limit exceeded, serving cached data'
          })
        })
      );
    });
  });

  describe('combinedDataHandler function', () => {
    test('OPTIONSリクエストを処理', async () => {
      const event = { httpMethod: 'OPTIONS' };
      const response = await marketDataModule.combinedDataHandler(event, {});
      
      expect(responseUtils.formatOptionsResponse).toHaveBeenCalled();
    });

    test('複数種類のデータを取得', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          stocks: { us: ['AAPL'], jp: ['7203'] },
          rates: ['USD-JPY'],
          mutualFunds: ['0131103C']
        })
      };
      
      await marketDataModule.combinedDataHandler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stocks: expect.any(Object),
            rates: expect.any(Object),
            mutualFunds: expect.any(Object)
          })
        })
      );
    });

    test('空のボディも処理', async () => {
      const event = {
        httpMethod: 'POST',
        body: null
      };
      
      await marketDataModule.combinedDataHandler(event, {});
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stocks: {}, rates: {}, mutualFunds: {} }
        })
      );
    });

    test('JSONパースエラーを処理', async () => {
      const event = {
        httpMethod: 'POST',
        body: 'invalid json'
      };
      
      await marketDataModule.combinedDataHandler(event, {});
      
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: ERROR_CODES.SERVER_ERROR
        })
      );
    });

    test('テスト環境でダミーデータを返す', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({ stocks: { us: ['AAPL'] } }),
        _testLogger: { info: jest.fn() }
      };
      
      const response = await marketDataModule.combinedDataHandler(event, {});
      const data = JSON.parse(response.body);
      
      expect(data.data.stocks).toHaveProperty('AAPL');
      expect(data.data.rates).toHaveProperty('USD-JPY');
    });
  });

  describe('highLatencyHandler function', () => {
    test('OPTIONSリクエストを処理', async () => {
      const event = { httpMethod: 'OPTIONS' };
      const response = await marketDataModule.highLatencyHandler(event, {});
      
      expect(responseUtils.formatOptionsResponse).toHaveBeenCalled();
    });

    test('遅延後にデータを返す', async () => {
      const event = { httpMethod: 'GET' };
      
      // Promiseベースのテスト
      const promise = marketDataModule.highLatencyHandler(event, {});
      await promise;
      
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'High latency request completed',
          processingTime: '2500ms'
        })
      );
    });

    test('エラーを処理', async () => {
      const event = { httpMethod: 'GET' };
      
      // setTimeoutでエラーをスロー
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation(() => {
        throw new Error('Timer error');
      });
      
      await marketDataModule.highLatencyHandler(event, {});
      
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: ERROR_CODES.SERVER_ERROR
        })
      );
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('getMultipleExchangeRates function', () => {
    test('文字列入力を配列に変換', async () => {
      const result = await marketDataModule.getMultipleExchangeRates('USD-JPY,EUR-JPY', false, true);
      
      expect(result).toHaveProperty('USD-JPY');
      expect(result).toHaveProperty('EUR-JPY');
    });

    test('空の入力でテスト環境ならデフォルトペア', async () => {
      const result = await marketDataModule.getMultipleExchangeRates(null, false, true);
      
      expect(result).toHaveProperty('USD-JPY');
      expect(result).toHaveProperty('EUR-JPY');
      expect(result).toHaveProperty('GBP-JPY');
      expect(result).toHaveProperty('USD-EUR');
    });

    test('空の入力で本番環境ならエラー', async () => {
      await expect(marketDataModule.getMultipleExchangeRates(null, false, false))
        .rejects.toThrow('Currency pairs array is required');
    });

    test('無効なペアフォーマットの処理', async () => {
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({});
      
      const result = await marketDataModule.getMultipleExchangeRates(['INVALID', 'USD-JPY'], false, false);
      
      expect(result.INVALID).toHaveProperty('error');
      expect(result.INVALID.error).toContain('Invalid currency pair format');
    });

    test('キャッシュから取得', async () => {
      cacheService.get.mockImplementation(key => {
        if (key.includes('exchange-rate:multi:')) {
          return { data: { 'USD-JPY': { rate: 149.82 } } };
        }
        return null;
      });
      
      const result = await marketDataModule.getMultipleExchangeRates(['USD-JPY'], false, false);
      
      expect(enhancedMarketDataService.getMultipleExchangeRatesData).not.toHaveBeenCalled();
      expect(result).toHaveProperty('USD-JPY');
    });

    test('キャッシュチェックエラーでも継続', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({
        'USD-JPY': { rate: 149.82 }
      });
      
      const result = await marketDataModule.getMultipleExchangeRates(['USD-JPY'], false, false);
      
      expect(logger.warn).toHaveBeenCalledWith('Multi-pair cache check failed:', 'Cache error');
      expect(result).toHaveProperty('USD-JPY');
    });

    test('結果をキャッシュに保存', async () => {
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({
        'USD-JPY': { rate: 149.82 }
      });
      
      await marketDataModule.getMultipleExchangeRates(['USD-JPY'], false, false);
      
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('exchange-rate:multi:'),
        expect.objectContaining({ 'USD-JPY': expect.any(Object) }),
        cacheService.CACHE_TIMES.EXCHANGE_RATE
      );
    });

    test('キャッシュ保存エラーでも継続', async () => {
      cacheService.set.mockRejectedValue(new Error('Save error'));
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({
        'USD-JPY': { rate: 149.82 }
      });
      
      const result = await marketDataModule.getMultipleExchangeRates(['USD-JPY'], false, false);
      
      expect(logger.warn).toHaveBeenCalledWith('Failed to cache multi-pair data:', 'Save error');
      expect(result).toHaveProperty('USD-JPY');
    });

    test('APIエラー時はダミーデータ', async () => {
      enhancedMarketDataService.getMultipleExchangeRatesData.mockRejectedValue(new Error('API Error'));
      
      const result = await marketDataModule.getMultipleExchangeRates(['USD-JPY'], false, false);
      
      expect(result).toHaveProperty('USD-JPY');
      expect(result['USD-JPY']).toHaveProperty('source', 'Default Fallback');
    });

    test('結果がない場合はダミーデータで補完', async () => {
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({});
      
      const result = await marketDataModule.getMultipleExchangeRates(['USD-JPY'], false, false);
      
      expect(result).toHaveProperty('USD-JPY');
      expect(result['USD-JPY']).toHaveProperty('source', 'Default Fallback');
    });
  });

  describe('Helper functions', () => {
    test('createDummyUsStockSymbol', () => {
      const dummy = marketDataModule.createDummyUsStockSymbol('TEST');
      
      expect(dummy).toEqual({
        ticker: 'TEST',
        price: 100,
        change: 2.3,
        changePercent: 1.2,
        name: 'TEST',
        currency: 'USD',
        isStock: true,
        isMutualFund: false,
        source: 'Default Fallback',
        lastUpdated: expect.any(String)
      });
    });

    test('createDummyJpStockSymbol', () => {
      const dummy = marketDataModule.createDummyJpStockSymbol('1234');
      
      expect(dummy).toEqual({
        ticker: '1234',
        price: 2000,
        change: 50,
        changePercent: 2.0,
        name: '日本株 1234',
        currency: 'JPY',
        isStock: true,
        isMutualFund: false,
        source: 'Default Fallback',
        lastUpdated: expect.any(String)
      });
    });

    test('createDummyMutualFundSymbol', () => {
      const dummy = marketDataModule.createDummyMutualFundSymbol('TEST123');
      
      expect(dummy).toEqual({
        ticker: 'TEST123',
        price: 12345,
        change: 25,
        changePercent: 0.2,
        name: '投資信託 TEST123',
        currency: 'JPY',
        isStock: false,
        isMutualFund: true,
        priceLabel: '基準価額',
        source: 'Default Fallback',
        lastUpdated: expect.any(String)
      });
    });

    test('createDummyExchangeRateData', () => {
      const dummy = marketDataModule.createDummyExchangeRateData('USD', 'EUR');
      
      expect(dummy).toEqual({
        pair: 'USD-EUR',
        base: 'USD',
        target: 'EUR',
        rate: 0.93,
        change: 0.32,
        changePercent: 0.21,
        lastUpdated: expect.any(String),
        source: 'Default Fallback'
      });
    });

    test('createTestExchangeRateData', () => {
      const testData = marketDataModule.createTestExchangeRateData('EUR', 'JPY');
      
      expect(testData).toEqual({
        pair: 'EUR-JPY',
        base: 'EUR',
        target: 'JPY',
        rate: 160.2,
        change: 0.32,
        changePercent: 0.21,
        lastUpdated: expect.any(String),
        source: 'Test Data'
      });
    });
  });

  describe('_testExports', () => {
    test('テスト環境で内部関数がエクスポートされる', () => {
      expect(marketDataModule._testExports).toBeDefined();
      expect(marketDataModule._testExports.getUsStockData).toBeDefined();
      expect(marketDataModule._testExports.getJpStockData).toBeDefined();
      expect(marketDataModule._testExports.getMutualFundData).toBeDefined();
      expect(marketDataModule._testExports.getExchangeRateData).toBeDefined();
      expect(marketDataModule._testExports.getMultipleExchangeRates).toBeDefined();
    });
  });
});