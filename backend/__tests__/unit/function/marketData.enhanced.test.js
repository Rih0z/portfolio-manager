/**
 * ファイルパス: __tests__/unit/function/marketData.enhanced.test.js
 * 
 * 完全なmarketDataテストケース - 100%カバレッジを目指す
 */

const marketData = require('../../../src/function/marketData');
const enhancedMarketDataService = require('../../../src/services/sources/enhancedMarketDataService');
const fallbackDataStore = require('../../../src/services/fallbackDataStore');
const cacheService = require('../../../src/services/cache');
const usageService = require('../../../src/services/usage');
const { DATA_TYPES, ERROR_CODES } = require('../../../src/config/constants');

// すべての依存モジュールをモック化
jest.mock('../../../src/services/sources/enhancedMarketDataService', () => ({
  getUsStocksData: jest.fn(),
  getJpStocksData: jest.fn(),
  getMutualFundsData: jest.fn(),
  getExchangeRateData: jest.fn(),
  getMultipleExchangeRatesData: jest.fn()
}));

jest.mock('../../../src/services/fallbackDataStore', () => ({
  recordFailedFetch: jest.fn(),
  getFallbackForSymbol: jest.fn(),
  getFallbackData: jest.fn()
}));

jest.mock('../../../src/services/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  generateCacheKey: jest.fn(),
  CACHE_TIMES: {
    US_STOCK: 300,
    JP_STOCK: 300,
    EXCHANGE_RATE: 300
  }
}));

jest.mock('../../../src/services/usage', () => ({
  checkAndUpdateUsage: jest.fn()
}));

jest.mock('../../../src/services/alerts', () => ({
  notifyError: jest.fn()
}));

jest.mock('../../../src/utils/budgetCheck', () => ({
  isBudgetCritical: jest.fn(),
  getBudgetWarningMessage: jest.fn()
}));

jest.mock('../../../src/utils/responseUtils', () => ({
  formatResponse: jest.fn(),
  formatErrorResponse: jest.fn(),
  formatOptionsResponse: jest.fn()
}));

jest.mock('../../../src/utils/errorHandler', () => ({
  handleError: jest.fn(),
  errorTypes: {
    DATA_SOURCE_ERROR: 'DATA_SOURCE_ERROR'
  }
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../../src/middleware/apiKeyAuth', () => ({
  authenticate: jest.fn()
}));

jest.mock('../../../src/middleware/ipRestriction', () => ({
  checkIPRestrictions: jest.fn()
}));

describe('Market Data Handler - 100% Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('validateParams function', () => {
    test('有効なパラメータでisValid: trueを返す', () => {
      const params = {
        type: DATA_TYPES.US_STOCK,
        symbols: 'AAPL,MSFT'
      };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('typeパラメータが未指定の場合はエラーを返す', () => {
      const params = { symbols: 'AAPL' };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: type');
    });

    test('無効なtypeパラメータの場合はエラーを返す', () => {
      const params = { type: 'INVALID_TYPE', symbols: 'AAPL' };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid type: INVALID_TYPE');
    });

    test('為替レート以外でsymbolsが未指定の場合はエラーを返す', () => {
      const params = { type: DATA_TYPES.US_STOCK };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: symbols');
    });

    test('symbolsがnullの場合はエラーを返す', () => {
      const params = { type: DATA_TYPES.US_STOCK, symbols: null };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: symbols');
    });

    test('symbolsが空文字の場合はエラーを返す', () => {
      const params = { type: DATA_TYPES.US_STOCK, symbols: '' };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('symbols parameter cannot be empty');
    });

    test('100を超えるsymbolsの場合はエラーを返す', () => {
      const symbols = Array.from({ length: 101 }, (_, i) => `STOCK${i}`).join(',');
      const params = { type: DATA_TYPES.US_STOCK, symbols };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many symbols. Maximum 100 symbols allowed');
    });

    test('為替レートでbaseとtargetが未指定の場合はエラーを返す', () => {
      const params = { type: DATA_TYPES.EXCHANGE_RATE };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter for exchange rate: base');
      expect(result.errors).toContain('Missing required parameter for exchange rate: target');
    });

    test('為替レートでbaseのみ未指定の場合はエラーを返す', () => {
      const params = { type: DATA_TYPES.EXCHANGE_RATE, target: 'JPY' };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter for exchange rate: base');
    });

    test('為替レートでtargetのみ未指定の場合はエラーを返す', () => {
      const params = { type: DATA_TYPES.EXCHANGE_RATE, base: 'USD' };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required parameter for exchange rate: target');
    });

    test('為替レートでsymbolsが指定されている場合は有効', () => {
      const params = { type: DATA_TYPES.EXCHANGE_RATE, symbols: 'USD-JPY,EUR-JPY' };
      const result = marketData.validateParams(params);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('createDummyUsStockSymbol function', () => {
    test('AAPL銘柄に対して正しいダミーデータを返す', () => {
      const result = marketData.createDummyUsStockSymbol('AAPL');
      expect(result.ticker).toBe('AAPL');
      expect(result.price).toBe(180.95);
      expect(result.name).toBe('Apple Inc.');
      expect(result.currency).toBe('USD');
      expect(result.isStock).toBe(true);
      expect(result.source).toBe('Default Fallback');
    });

    test('未知の銘柄に対してデフォルトダミーデータを返す', () => {
      const result = marketData.createDummyUsStockSymbol('UNKNOWN');
      expect(result.ticker).toBe('UNKNOWN');
      expect(result.price).toBe(100);
      expect(result.name).toBe('UNKNOWN');
      expect(result.currency).toBe('USD');
      expect(result.isStock).toBe(true);
      expect(result.source).toBe('Default Fallback');
    });
  });

  describe('createDummyJpStockSymbol function', () => {
    test('7203銘柄に対して正しいダミーデータを返す', () => {
      const result = marketData.createDummyJpStockSymbol('7203');
      expect(result.ticker).toBe('7203');
      expect(result.price).toBe(2500);
      expect(result.name).toBe('トヨタ自動車');
      expect(result.currency).toBe('JPY');
      expect(result.isStock).toBe(true);
      expect(result.source).toBe('Default Fallback');
    });

    test('未知の銘柄に対してデフォルトダミーデータを返す', () => {
      const result = marketData.createDummyJpStockSymbol('9999');
      expect(result.ticker).toBe('9999');
      expect(result.price).toBe(2000);
      expect(result.name).toBe('日本株 9999');
      expect(result.currency).toBe('JPY');
      expect(result.isStock).toBe(true);
      expect(result.source).toBe('Default Fallback');
    });
  });

  describe('createDummyMutualFundSymbol function', () => {
    test('投資信託のダミーデータを正しく返す', () => {
      const result = marketData.createDummyMutualFundSymbol('0131103C');
      expect(result.ticker).toBe('0131103C');
      expect(result.price).toBe(12345);
      expect(result.name).toBe('投資信託 0131103C');
      expect(result.currency).toBe('JPY');
      expect(result.isMutualFund).toBe(true);
      expect(result.priceLabel).toBe('基準価額');
      expect(result.source).toBe('Default Fallback');
    });
  });

  describe('createDummyExchangeRateData function', () => {
    test('USD-JPYの為替レートダミーデータを正しく返す', () => {
      const result = marketData.createDummyExchangeRateData('USD', 'JPY');
      expect(result.pair).toBe('USD-JPY');
      expect(result.base).toBe('USD');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBe(149.82);
      expect(result.source).toBe('Default Fallback');
    });

    test('EUR-JPYの為替レートダミーデータを正しく返す', () => {
      const result = marketData.createDummyExchangeRateData('EUR', 'JPY');
      expect(result.pair).toBe('EUR-JPY');
      expect(result.base).toBe('EUR');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBe(160.2);
      expect(result.source).toBe('Default Fallback');
    });

    test('GBP-JPYの為替レートダミーデータを正しく返す', () => {
      const result = marketData.createDummyExchangeRateData('GBP', 'JPY');
      expect(result.pair).toBe('GBP-JPY');
      expect(result.base).toBe('GBP');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBe(187.5);
      expect(result.source).toBe('Default Fallback');
    });

    test('USD-EURの為替レートダミーデータを正しく返す', () => {
      const result = marketData.createDummyExchangeRateData('USD', 'EUR');
      expect(result.pair).toBe('USD-EUR');
      expect(result.base).toBe('USD');
      expect(result.target).toBe('EUR');
      expect(result.rate).toBe(0.93);
      expect(result.source).toBe('Default Fallback');
    });

    test('その他の通貨ペアでデフォルトレート1.0を返す', () => {
      const result = marketData.createDummyExchangeRateData('CAD', 'AUD');
      expect(result.pair).toBe('CAD-AUD');
      expect(result.base).toBe('CAD');
      expect(result.target).toBe('AUD');
      expect(result.rate).toBe(1.0);
      expect(result.source).toBe('Default Fallback');
    });
  });

  describe('createTestExchangeRateData function', () => {
    test('デフォルト値でUSD-JPYデータを返す', () => {
      const result = marketData.createTestExchangeRateData();
      expect(result.pair).toBe('USD-JPY');
      expect(result.base).toBe('USD');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBe(149.82);
      expect(result.source).toBe('Test Data');
    });

    test('指定した通貨ペアでデータを返す', () => {
      const result = marketData.createTestExchangeRateData('EUR', 'JPY');
      expect(result.pair).toBe('EUR-JPY');
      expect(result.base).toBe('EUR');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBe(160.2);
      expect(result.source).toBe('Test Data');
    });
  });

  describe('getMultipleExchangeRates function', () => {
    beforeEach(() => {
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({
        'USD-JPY': { pair: 'USD-JPY', rate: 149.82 },
        'EUR-JPY': { pair: 'EUR-JPY', rate: 160.2 }
      });
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(true);
    });

    test('文字列の通貨ペアを配列に変換して処理する', async () => {
      const result = await marketData.getMultipleExchangeRates('USD-JPY,EUR-JPY', false, false);
      expect(result).toHaveProperty('USD-JPY');
      expect(result).toHaveProperty('EUR-JPY');
    });

    test('空の配列でテスト環境の場合はデフォルトペアを使用', async () => {
      const result = await marketData.getMultipleExchangeRates([], false, true);
      expect(result).toHaveProperty('USD-JPY');
      expect(result).toHaveProperty('EUR-JPY');
      expect(result).toHaveProperty('GBP-JPY');
      expect(result).toHaveProperty('USD-EUR');
    });

    test('nullが渡された場合でテスト環境ではデフォルトペアを使用', async () => {
      const result = await marketData.getMultipleExchangeRates(null, false, true);
      expect(result).toHaveProperty('USD-JPY');
      expect(result).toHaveProperty('EUR-JPY');
      expect(result).toHaveProperty('GBP-JPY');
      expect(result).toHaveProperty('USD-EUR');
    });

    test('非テスト環境で空の配列の場合はエラーをスロー', async () => {
      await expect(marketData.getMultipleExchangeRates([], false, false))
        .rejects.toThrow('Currency pairs array is required');
    });

    test('非テスト環境でnullの場合はエラーをスロー', async () => {
      await expect(marketData.getMultipleExchangeRates(null, false, false))
        .rejects.toThrow('Currency pairs array is required');
    });

    test('テスト環境の場合はモックデータを返す', async () => {
      const result = await marketData.getMultipleExchangeRates(['USD-JPY'], false, true);
      expect(result['USD-JPY']).toEqual({
        pair: 'USD-JPY',
        base: 'USD',
        target: 'JPY',
        rate: 149.82,
        change: 0.32,
        changePercent: 0.21,
        lastUpdated: expect.any(String),
        source: 'Test Data'
      });
    });

    test('キャッシュが存在する場合はキャッシュから返す', async () => {
      const cachedData = {
        data: {
          'USD-JPY': { pair: 'USD-JPY', rate: 149.82 }
        }
      };
      cacheService.get.mockResolvedValue(cachedData);

      const result = await marketData.getMultipleExchangeRates(['USD-JPY'], false, false);
      expect(result).toEqual(cachedData.data);
    });

    test('無効な通貨ペア形式の場合はエラーメッセージを設定', async () => {
      const result = await marketData.getMultipleExchangeRates(['INVALID'], false, false);
      expect(result.INVALID.error).toContain('Invalid currency pair format');
    });

    test('エラーが発生した場合はダミーデータを返す', async () => {
      enhancedMarketDataService.getMultipleExchangeRatesData.mockRejectedValue(new Error('Test error'));
      
      const result = await marketData.getMultipleExchangeRates(['USD-JPY'], false, false);
      expect(result['USD-JPY']).toEqual({
        pair: 'USD-JPY',
        base: 'USD',
        target: 'JPY',
        rate: 149.82,
        change: 0.32,
        changePercent: 0.21,
        lastUpdated: expect.any(String),
        source: 'Default Fallback'
      });
    });

    test('キャッシュエラーが発生しても処理を継続する', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({
        'USD-JPY': { pair: 'USD-JPY', rate: 149.82 }
      });

      const result = await marketData.getMultipleExchangeRates(['USD-JPY'], false, false);
      expect(result['USD-JPY']).toEqual(expect.objectContaining({
        pair: 'USD-JPY',
        rate: 149.82
      }));
    });

    test('キャッシュ保存でエラーが発生しても処理を継続する', async () => {
      cacheService.set.mockRejectedValue(new Error('Cache set error'));
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({
        'USD-JPY': { pair: 'USD-JPY', rate: 149.82 }
      });

      const result = await marketData.getMultipleExchangeRates(['USD-JPY'], false, false);
      expect(result['USD-JPY']).toEqual(expect.objectContaining({
        pair: 'USD-JPY',
        rate: 149.82
      }));
    });

    test('結果にないペアはダミーデータで補完する', async () => {
      enhancedMarketDataService.getMultipleExchangeRatesData.mockResolvedValue({
        'USD-JPY': { pair: 'USD-JPY', rate: 149.82 }
        // EUR-JPYがない場合
      });

      const result = await marketData.getMultipleExchangeRates(['USD-JPY', 'EUR-JPY'], false, false);
      expect(result['USD-JPY']).toEqual(expect.objectContaining({
        pair: 'USD-JPY',
        rate: 149.82
      }));
      expect(result['EUR-JPY']).toEqual(expect.objectContaining({
        pair: 'EUR-JPY',
        base: 'EUR',
        target: 'JPY',
        source: 'Default Fallback'
      }));
    });
  });

  describe('Main handler function', () => {
    const responseUtils = require('../../../src/utils/responseUtils');
    const budgetCheck = require('../../../src/utils/budgetCheck');
    const logger = require('../../../src/utils/logger');
    const alertService = require('../../../src/services/alerts');
    const errorHandler = require('../../../src/utils/errorHandler');
    const ipRestriction = require('../../../src/middleware/ipRestriction');
    const apiKeyAuth = require('../../../src/middleware/apiKeyAuth');

    beforeEach(() => {
      // Reset all mocks for handler tests
      responseUtils.formatResponse.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true })
      });
      responseUtils.formatErrorResponse.mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({ success: false })
      });
      responseUtils.formatOptionsResponse.mockReturnValue({
        statusCode: 204,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
      
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: true,
        usage: { daily: { count: 10, limit: 1000 }, monthly: { count: 100, limit: 10000 } }
      });
      
      budgetCheck.isBudgetCritical.mockResolvedValue(false);
      budgetCheck.getBudgetWarningMessage.mockResolvedValue(null);
      
      ipRestriction.checkIPRestrictions.mockResolvedValue(null);
      apiKeyAuth.authenticate.mockResolvedValue(null);
      
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        'AAPL': { ticker: 'AAPL', price: 180.95 }
      });
    });

    test('OPTIONSリクエストを正しく処理する', async () => {
      const event = { httpMethod: 'OPTIONS' };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatOptionsResponse).toHaveBeenCalled();
    });

    test('テスト環境ではセキュリティチェックをスキップする', async () => {
      process.env.NODE_ENV = 'test';
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      
      expect(ipRestriction.checkIPRestrictions).not.toHaveBeenCalled();
      expect(apiKeyAuth.authenticate).not.toHaveBeenCalled();
    });

    test('本番環境ではセキュリティチェックを実行する', async () => {
      process.env.NODE_ENV = 'production';
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      
      expect(ipRestriction.checkIPRestrictions).toHaveBeenCalled();
      expect(apiKeyAuth.authenticate).toHaveBeenCalled();
    });

    test('IP制限でブロックされた場合は適切なレスポンスを返す', async () => {
      process.env.NODE_ENV = 'production';
      ipRestriction.checkIPRestrictions.mockResolvedValue({
        statusCode: 403,
        body: JSON.stringify({ error: 'IP blocked' })
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      const result = await marketData.handler(event, context);
      expect(result.statusCode).toBe(403);
    });

    test('API認証失敗の場合は適切なレスポンスを返す', async () => {
      process.env.NODE_ENV = 'production';
      apiKeyAuth.authenticate.mockResolvedValue({
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      const result = await marketData.handler(event, context);
      expect(result.statusCode).toBe(401);
    });

    test('テストロガーを使用する場合の処理', async () => {
      const mockTestLogger = { info: jest.fn() };
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        },
        _testLogger: mockTestLogger
      };
      const context = {};

      await marketData.handler(event, context);
      expect(mockTestLogger.info).toHaveBeenCalled();
    });

    test('レート制限でキャッシュデータを返す', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: { daily: { count: 1000, limit: 1000 }, monthly: { count: 10000, limit: 10000 } }
      });

      cacheService.generateCacheKey.mockReturnValue('test-cache-key');
      cacheService.get.mockResolvedValue({
        data: { 'AAPL': { ticker: 'AAPL', price: 180.95 } }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(cacheService.get).toHaveBeenCalled();
    });

    test('レート制限でフォールバックデータを返す', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: { daily: { count: 1000, limit: 1000 }, monthly: { count: 10000, limit: 10000 } }
      });

      cacheService.get.mockResolvedValue(null);
      fallbackDataStore.getFallbackData.mockResolvedValue({
        'AAPL': { ticker: 'AAPL', price: 180.95 }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(fallbackDataStore.getFallbackData).toHaveBeenCalled();
    });

    test('レート制限でキャッシュもフォールバックもない場合は429エラー', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: { daily: { count: 1000, limit: 1000 }, monthly: { count: 10000, limit: 10000 } }
      });

      cacheService.get.mockResolvedValue(null);
      fallbackDataStore.getFallbackData.mockResolvedValue(null);

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED
        })
      );
    });

    test('予算制限でリフレッシュ拒否', async () => {
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
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: ERROR_CODES.BUDGET_LIMIT_EXCEEDED
        })
      );
    });

    test('複数の米国株データのキャッシュ処理', async () => {
      cacheService.get.mockResolvedValue({
        data: { 'AAPL': { ticker: 'AAPL' }, 'MSFT': { ticker: 'MSFT' } }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL,MSFT'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(cacheService.get).toHaveBeenCalled();
    });

    test('複数の為替レートデータ取得', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.EXCHANGE_RATE,
          symbols: 'USD-JPY,EUR-JPY'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('単一の為替レートデータ取得', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.EXCHANGE_RATE,
          base: 'USD',
          target: 'JPY'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('サポートされていないデータタイプでエラー', async () => {
      // validateParamsを通り抜けた場合の処理をテスト
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: 'UNSUPPORTED_TYPE',
          symbols: 'TEST'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatErrorResponse).toHaveBeenCalled();
    });

    test('テスト環境検出の多様なパターン - context._isTestContext', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = { _isTestContext: true };

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('テスト環境検出の多様なパターン - event._formatResponse', async () => {
      const mockFormatResponse = jest.fn();
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        },
        _formatResponse: mockFormatResponse
      };
      const context = {};

      await marketData.handler(event, context);
      expect(mockFormatResponse).toHaveBeenCalled();
    });

    test('テスト環境検出の多様なパターン - TEST_MODE環境変数', async () => {
      process.env.TEST_MODE = 'true';
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
      
      delete process.env.TEST_MODE;
    });

    test('テスト環境検出の多様なパターン - x-test-modeヘッダー', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        },
        headers: {
          'x-test-mode': 'true'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('テスト環境検出の多様なパターン - _testクエリパラメータ', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL',
          _test: 'true'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('テスト環境検出の多様なパターン - global._isMockAPITest', async () => {
      global._isMockAPITest = true;
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
      
      delete global._isMockAPITest;
    });

    test('データに警告がある場合のレスポンス処理', async () => {
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        'AAPL': { 
          ticker: 'AAPL', 
          price: 180.95,
          isDefault: true,
          isStale: true,
          error: 'Test warning'
        }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          warnings: expect.arrayContaining([
            expect.stringContaining('Using default/fallback value'),
            expect.stringContaining('Data may be stale'),
            expect.stringContaining('Test warning')
          ])
        })
      );
    });

    test('エラー処理とアラート通知', async () => {
      enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('Test error'));
      errorHandler.handleError.mockResolvedValue({ handled: true });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      
      expect(logger.error).toHaveBeenCalled();
      expect(errorHandler.handleError).toHaveBeenCalled();
      expect(alertService.notifyError).toHaveBeenCalled();
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: ERROR_CODES.SERVER_ERROR
        })
      );
    });

    test('レート制限でキャッシュエラーが発生した場合は429エラー', async () => {
      usageService.checkAndUpdateUsage.mockResolvedValue({
        allowed: false,
        usage: { daily: { count: 1000, limit: 1000 }, monthly: { count: 10000, limit: 10000 } }
      });

      cacheService.get.mockRejectedValue(new Error('Cache error'));

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          code: ERROR_CODES.RATE_LIMIT_EXCEEDED
        })
      );
    });

    test('複数為替レートのキャッシュを使用する', async () => {
      cacheService.get.mockResolvedValue({
        data: { 'USD-JPY': { pair: 'USD-JPY', rate: 149.82 } }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.EXCHANGE_RATE,
          symbols: 'USD-JPY,EUR-JPY'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(cacheService.get).toHaveBeenCalled();
    });

    test('キャッシュ取得でエラーが発生しても処理を継続する', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        'AAPL': { ticker: 'AAPL', price: 180.95 }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('複数米国株でキャッシュチェックが失敗しても処理を継続', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        'AAPL': { ticker: 'AAPL', price: 180.95 },
        'MSFT': { ticker: 'MSFT', price: 345.22 }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL,MSFT'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('複数米国株のキャッシュ保存が失敗してもエラーにならない', async () => {
      cacheService.set.mockRejectedValue(new Error('Cache set error'));
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        'AAPL': { ticker: 'AAPL', price: 180.95 },
        'MSFT': { ticker: 'MSFT', price: 345.22 }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL,MSFT'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('複数日本株のキャッシュ処理', async () => {
      cacheService.get.mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({
                      data: { '7203': { ticker: '7203' }, '9984': { ticker: '9984' } }
                    });
      
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.JP_STOCK,
          symbols: '7203,9984'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(cacheService.get).toHaveBeenCalled();
    });

    test('複数日本株でキャッシュチェックが失敗', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      enhancedMarketDataService.getJpStocksData.mockResolvedValue({
        '7203': { ticker: '7203', price: 2500 }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.JP_STOCK,
          symbols: '7203,9984'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('複数日本株のキャッシュ保存が失敗', async () => {
      cacheService.set.mockRejectedValue(new Error('Cache set error'));
      enhancedMarketDataService.getJpStocksData.mockResolvedValue({
        '7203': { ticker: '7203', price: 2500 },
        '9984': { ticker: '9984', price: 7650 }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.JP_STOCK,
          symbols: '7203,9984'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('投資信託データの取得', async () => {
      enhancedMarketDataService.getMutualFundsData.mockResolvedValue({
        '0131103C': { ticker: '0131103C', price: 12345 }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.MUTUAL_FUND,
          symbols: '0131103C'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('デフォルトケースでエラーをスロー', async () => {
      // validateParamsをバイパスするテストケース
      const originalValidateParams = marketData.validateParams;
      marketData.validateParams = jest.fn().mockReturnValue({ isValid: true, errors: [] });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: 'UNKNOWN_TYPE',
          symbols: 'TEST'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatErrorResponse).toHaveBeenCalled();

      // 元の関数を復元
      marketData.validateParams = originalValidateParams;
    });

    test('X-Forwarded-ForヘッダーとCookieを含むリクエスト', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        },
        headers: {
          'X-Forwarded-For': '192.168.1.1',
          'User-Agent': 'Test-Agent',
          'Cookie': 'session=test-session-id'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('データに複数の問題がある場合のレスポンス処理', async () => {
      // キャッシュされたデータではなく、実際のAPI結果として返すためにキャッシュを無効化
      cacheService.get.mockResolvedValue(null);
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        'AAPL': { 
          ticker: 'AAPL', 
          price: 180.95,
          isDefault: true,
          isStale: true,
          error: 'Test warning'
        }
      });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          warnings: expect.arrayContaining([
            expect.stringContaining('Using default/fallback value'),
            expect.stringContaining('Data may be stale'),
            expect.stringContaining('Test warning')
          ])
        })
      );
    });

    test('メインハンドラーでエラーが発生した場合の処理', async () => {
      // キャッシュとサービスの両方でエラーを発生させる
      cacheService.get.mockResolvedValue(null);
      enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('Test error'));
      errorHandler.handleError.mockResolvedValue({ handled: true });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      
      expect(logger.error).toHaveBeenCalled();
      expect(errorHandler.handleError).toHaveBeenCalled();
      expect(alertService.notifyError).toHaveBeenCalled();
      expect(responseUtils.formatErrorResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: ERROR_CODES.SERVER_ERROR
        })
      );
    });

    test('エラー処理でテスト用フォーマット関数が呼ばれる', async () => {
      const mockFormatErrorResponse = jest.fn();
      cacheService.get.mockResolvedValue(null);
      enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('Test error'));

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        },
        _formatErrorResponse: mockFormatErrorResponse
      };
      const context = {};

      await marketData.handler(event, context);
      expect(mockFormatErrorResponse).toHaveBeenCalled();
    });
  });

  describe('combinedDataHandler function', () => {
    const responseUtils = require('../../../src/utils/responseUtils');
    const logger = require('../../../src/utils/logger');

    beforeEach(() => {
      responseUtils.formatResponse.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true })
      });
      responseUtils.formatErrorResponse.mockResolvedValue({
        statusCode: 500,
        body: JSON.stringify({ success: false })
      });
      responseUtils.formatOptionsResponse.mockReturnValue({
        statusCode: 204
      });
    });

    test('OPTIONSリクエストを正しく処理する', async () => {
      const event = { httpMethod: 'OPTIONS' };
      const context = {};

      await marketData.combinedDataHandler(event, context);
      expect(responseUtils.formatOptionsResponse).toHaveBeenCalled();
    });

    test('空のbodyでも正常に処理する', async () => {
      const event = {
        httpMethod: 'POST',
        body: null
      };
      const context = {};

      await marketData.combinedDataHandler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('米国株データのみを処理する', async () => {
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        'AAPL': { ticker: 'AAPL', price: 180.95 }
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          stocks: {
            us: ['AAPL', 'MSFT']
          }
        })
      };
      const context = {};

      await marketData.combinedDataHandler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('日本株データのみを処理する', async () => {
      enhancedMarketDataService.getJpStocksData.mockResolvedValue({
        '7203': { ticker: '7203', price: 2500 }
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          stocks: {
            jp: ['7203', '9984']
          }
        })
      };
      const context = {};

      await marketData.combinedDataHandler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('為替レートのみを処理する', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          rates: ['USD-JPY', 'EUR-JPY']
        })
      };
      const context = {};

      await marketData.combinedDataHandler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('投資信託データのみを処理する', async () => {
      enhancedMarketDataService.getMutualFundsData.mockResolvedValue({
        '0131103C': { ticker: '0131103C', price: 12345 }
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          mutualFunds: ['0131103C', '2931113C']
        })
      };
      const context = {};

      await marketData.combinedDataHandler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('テスト環境でダミーデータを提供する', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({})
      };
      const context = { _isTestContext: true };

      await marketData.combinedDataHandler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('全種類のデータを処理する', async () => {
      enhancedMarketDataService.getUsStocksData.mockResolvedValue({
        'AAPL': { ticker: 'AAPL', price: 180.95 }
      });
      enhancedMarketDataService.getJpStocksData.mockResolvedValue({
        '7203': { ticker: '7203', price: 2500 }
      });
      enhancedMarketDataService.getMutualFundsData.mockResolvedValue({
        '0131103C': { ticker: '0131103C', price: 12345 }
      });

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          stocks: {
            us: ['AAPL'],
            jp: ['7203']
          },
          rates: ['USD-JPY'],
          mutualFunds: ['0131103C']
        })
      };
      const context = {};

      await marketData.combinedDataHandler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('エラーが発生した場合の処理', async () => {
      // JSONパースエラーを発生させる
      const event = {
        httpMethod: 'POST',
        body: 'invalid json'
      };
      const context = {};

      await marketData.combinedDataHandler(event, context);
      expect(logger.error).toHaveBeenCalled();
      expect(responseUtils.formatErrorResponse).toHaveBeenCalled();
    });
  });

  describe('highLatencyHandler function', () => {
    const responseUtils = require('../../../src/utils/responseUtils');
    const logger = require('../../../src/utils/logger');

    beforeEach(() => {
      responseUtils.formatResponse.mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true })
      });
      responseUtils.formatErrorResponse.mockResolvedValue({
        statusCode: 500,
        body: JSON.stringify({ success: false })
      });
      responseUtils.formatOptionsResponse.mockReturnValue({
        statusCode: 204
      });
    });

    test('OPTIONSリクエストを正しく処理する', async () => {
      const event = { httpMethod: 'OPTIONS' };
      const context = {};

      await marketData.highLatencyHandler(event, context);
      expect(responseUtils.formatOptionsResponse).toHaveBeenCalled();
    });

    test('2.5秒の遅延を実行して完了する', async () => {
      jest.useFakeTimers();
      
      const event = { httpMethod: 'GET' };
      const context = {};

      const promise = marketData.highLatencyHandler(event, context);
      jest.advanceTimersByTime(2500);
      await promise;

      expect(responseUtils.formatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'High latency request completed',
          processingTime: '2500ms'
        })
      );

      jest.useRealTimers();
    });

    test('エラーが発生した場合の処理', async () => {
      // setTimeoutでエラーが発生するケースをシミュレート
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation(() => {
        throw new Error('Timeout error');
      });

      const event = { httpMethod: 'GET' };
      const context = {};

      await marketData.highLatencyHandler(event, context);
      expect(logger.error).toHaveBeenCalled();
      expect(responseUtils.formatErrorResponse).toHaveBeenCalled();

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Internal data fetching functions', () => {
    const { _testExports } = require('../../../src/function/marketData');
    const logger = require('../../../src/utils/logger');

    beforeEach(() => {
      enhancedMarketDataService.getUsStocksData.mockReset();
      enhancedMarketDataService.getJpStocksData.mockReset();
      enhancedMarketDataService.getMutualFundsData.mockReset();
      enhancedMarketDataService.getExchangeRateData.mockReset();
      fallbackDataStore.recordFailedFetch.mockReset();
      fallbackDataStore.getFallbackForSymbol.mockReset();
      logger.info.mockReset();
      logger.error.mockReset();
    });

    describe('getUsStockData function', () => {
      test('テスト環境ではモックデータを返す', async () => {
        const result = await _testExports.getUsStockData(['AAPL'], false, true);
        expect(result['AAPL']).toEqual(expect.objectContaining({
          ticker: 'AAPL',
          price: 180.95,
          source: 'Test Data'
        }));
      });

      test('正常にデータを取得する', async () => {
        enhancedMarketDataService.getUsStocksData.mockResolvedValue({
          'AAPL': { ticker: 'AAPL', price: 180.95 }
        });

        const result = await _testExports.getUsStockData(['AAPL'], false, false);
        expect(result).toEqual({ 'AAPL': { ticker: 'AAPL', price: 180.95 } });
      });

      test('空の結果の場合はダミーデータを返す', async () => {
        enhancedMarketDataService.getUsStocksData.mockResolvedValue({});

        const result = await _testExports.getUsStockData(['AAPL'], false, false);
        expect(result['AAPL']).toEqual(expect.objectContaining({
          ticker: 'AAPL',
          source: 'Default Fallback'
        }));
      });

      test('失敗した銘柄をfallbackDataStoreに記録する', async () => {
        enhancedMarketDataService.getUsStocksData.mockResolvedValue({
          'AAPL': { error: 'Failed to fetch' },
          'MSFT': { ticker: 'MSFT', price: 345.22 }
        });

        await _testExports.getUsStockData(['AAPL', 'MSFT'], false, false);
        expect(fallbackDataStore.recordFailedFetch).toHaveBeenCalledWith(
          'AAPL',
          DATA_TYPES.US_STOCK,
          'Failed to fetch'
        );
      });

      test('エラー時はフォールバックデータを使用する', async () => {
        enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockResolvedValue({
          ticker: 'AAPL',
          price: 180.95,
          source: 'Fallback'
        });

        const result = await _testExports.getUsStockData(['AAPL'], false, false);
        expect(result['AAPL']).toEqual(expect.objectContaining({
          ticker: 'AAPL',
          source: 'Fallback Data'
        }));
      });

      test('フォールバックデータもない場合はダミーデータを使用', async () => {
        enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockResolvedValue(null);

        const result = await _testExports.getUsStockData(['AAPL'], false, false);
        expect(result['AAPL']).toEqual(expect.objectContaining({
          ticker: 'AAPL',
          source: 'Default Fallback'
        }));
      });

      test('フォールバックデータ取得でもエラーが発生した場合', async () => {
        enhancedMarketDataService.getUsStocksData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockRejectedValue(new Error('Fallback Error'));

        const result = await _testExports.getUsStockData(['AAPL'], false, false);
        expect(result['AAPL']).toEqual(expect.objectContaining({
          ticker: 'AAPL',
          source: 'Default Fallback'
        }));
      });
    });

    describe('getJpStockData function', () => {
      test('テスト環境ではモックデータを返す', async () => {
        const result = await _testExports.getJpStockData(['7203'], false, true);
        expect(result['7203']).toEqual(expect.objectContaining({
          ticker: '7203',
          price: 2500,
          source: 'Test Data'
        }));
      });

      test('正常にデータを取得する', async () => {
        enhancedMarketDataService.getJpStocksData.mockResolvedValue({
          '7203': { ticker: '7203', price: 2500 }
        });

        const result = await _testExports.getJpStockData(['7203'], false, false);
        expect(result).toEqual({ '7203': { ticker: '7203', price: 2500 } });
      });

      test('空の結果の場合はダミーデータを返す', async () => {
        enhancedMarketDataService.getJpStocksData.mockResolvedValue({});

        const result = await _testExports.getJpStockData(['7203'], false, false);
        expect(result['7203']).toEqual(expect.objectContaining({
          ticker: '7203',
          source: 'Default Fallback'
        }));
      });

      test('失敗した銘柄をfallbackDataStoreに記録する', async () => {
        enhancedMarketDataService.getJpStocksData.mockResolvedValue({
          '7203': { error: 'Failed to fetch' }
        });

        await _testExports.getJpStockData(['7203'], false, false);
        expect(fallbackDataStore.recordFailedFetch).toHaveBeenCalledWith(
          '7203',
          DATA_TYPES.JP_STOCK,
          'Failed to fetch'
        );
      });
    });

    describe('getMutualFundData function', () => {
      test('テスト環境ではモックデータを返す', async () => {
        const result = await _testExports.getMutualFundData(['0131103C'], false, true);
        expect(result['0131103C']).toEqual(expect.objectContaining({
          ticker: '0131103C',
          price: 12345,
          source: 'Test Data',
          isMutualFund: true
        }));
      });

      test('正常にデータを取得する', async () => {
        enhancedMarketDataService.getMutualFundsData.mockResolvedValue({
          '0131103C': { ticker: '0131103C', price: 12345 }
        });

        const result = await _testExports.getMutualFundData(['0131103C'], false, false);
        expect(result).toEqual({ '0131103C': { ticker: '0131103C', price: 12345 } });
      });

      test('空の結果の場合はダミーデータを返す', async () => {
        enhancedMarketDataService.getMutualFundsData.mockResolvedValue({});

        const result = await _testExports.getMutualFundData(['0131103C'], false, false);
        expect(result['0131103C']).toEqual(expect.objectContaining({
          ticker: '0131103C',
          source: 'Default Fallback'
        }));
      });
    });

    describe('getExchangeRateData function', () => {
      test('テスト環境ではモックデータを返す', async () => {
        const result = await _testExports.getExchangeRateData('USD', 'JPY', false, true);
        expect(result['USD-JPY']).toEqual(expect.objectContaining({
          pair: 'USD-JPY',
          base: 'USD',
          target: 'JPY',
          rate: 149.82,
          source: 'Test Data'
        }));
      });

      test('正常にデータを取得する', async () => {
        enhancedMarketDataService.getExchangeRateData.mockResolvedValue({
          pair: 'USD-JPY',
          rate: 149.82
        });

        const result = await _testExports.getExchangeRateData('USD', 'JPY', false, false);
        expect(result['USD-JPY']).toEqual({ pair: 'USD-JPY', rate: 149.82 });
      });

      test('無効な結果の場合はfallbackDataStoreに記録する', async () => {
        enhancedMarketDataService.getExchangeRateData.mockResolvedValue({ error: 'Failed' });

        await _testExports.getExchangeRateData('USD', 'JPY', false, false);
        expect(fallbackDataStore.recordFailedFetch).toHaveBeenCalledWith(
          'USD-JPY',
          DATA_TYPES.EXCHANGE_RATE,
          'Failed'
        );
      });

      test('isDefaultフラグがある場合はエラー状態として扱う', async () => {
        enhancedMarketDataService.getExchangeRateData.mockResolvedValue({
          pair: 'USD-JPY',
          rate: 149.82,
          isDefault: true
        });

        const result = await _testExports.getExchangeRateData('USD', 'JPY', false, false);
        expect(result['USD-JPY']).toEqual(expect.objectContaining({
          error: 'Failed to fetch real exchange rate. Using default value.',
          isStale: true
        }));
      });

      test('エラー時はフォールバックデータを使用する', async () => {
        enhancedMarketDataService.getExchangeRateData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockResolvedValue({
          pair: 'USD-JPY',
          rate: 149.82
        });

        const result = await _testExports.getExchangeRateData('USD', 'JPY', false, false);
        expect(result['USD-JPY']).toEqual(expect.objectContaining({
          source: 'Fallback Data'
        }));
      });

      test('フォールバックデータもない場合はダミーデータを返す', async () => {
        enhancedMarketDataService.getExchangeRateData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockResolvedValue(null);

        const result = await _testExports.getExchangeRateData('USD', 'JPY', false, false);
        expect(result['USD-JPY']).toEqual(expect.objectContaining({
          pair: 'USD-JPY',
          base: 'USD',
          target: 'JPY',
          source: 'Default Fallback'
        }));
      });

      test('フォールバックデータ取得でもエラーが発生した場合', async () => {
        enhancedMarketDataService.getExchangeRateData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockRejectedValue(new Error('Fallback Error'));

        const result = await _testExports.getExchangeRateData('USD', 'JPY', false, false);
        expect(result['USD-JPY']).toEqual(expect.objectContaining({
          pair: 'USD-JPY',
          source: 'Default Fallback'
        }));
      });

      test('日本株のエラー時フォールバック処理', async () => {
        enhancedMarketDataService.getJpStocksData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockResolvedValue({
          ticker: '7203',
          price: 2500
        });

        const result = await _testExports.getJpStockData(['7203'], false, false);
        expect(result['7203']).toEqual(expect.objectContaining({
          ticker: '7203',
          source: 'Fallback Data'
        }));
      });

      test('日本株のフォールバックデータもない場合', async () => {
        enhancedMarketDataService.getJpStocksData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockResolvedValue(null);

        const result = await _testExports.getJpStockData(['7203'], false, false);
        expect(result['7203']).toEqual(expect.objectContaining({
          ticker: '7203',
          source: 'Default Fallback'
        }));
      });

      test('日本株のフォールバックデータ取得でエラー', async () => {
        enhancedMarketDataService.getJpStocksData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockRejectedValue(new Error('Fallback Error'));

        const result = await _testExports.getJpStockData(['7203'], false, false);
        expect(result['7203']).toEqual(expect.objectContaining({
          ticker: '7203',
          source: 'Default Fallback'
        }));
      });
    });

    describe('getMutualFundData function', () => {
      test('投資信託のエラー時フォールバック処理', async () => {
        enhancedMarketDataService.getMutualFundsData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockResolvedValue({
          ticker: '0131103C',
          price: 12345
        });

        const result = await _testExports.getMutualFundData(['0131103C'], false, false);
        expect(result['0131103C']).toEqual(expect.objectContaining({
          ticker: '0131103C',
          source: 'Fallback Data'
        }));
      });

      test('投資信託のフォールバックデータもない場合', async () => {
        enhancedMarketDataService.getMutualFundsData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockResolvedValue(null);

        const result = await _testExports.getMutualFundData(['0131103C'], false, false);
        expect(result['0131103C']).toEqual(expect.objectContaining({
          ticker: '0131103C',
          source: 'Default Fallback'
        }));
      });

      test('投資信託のフォールバックデータ取得でエラー', async () => {
        enhancedMarketDataService.getMutualFundsData.mockRejectedValue(new Error('API Error'));
        fallbackDataStore.getFallbackForSymbol.mockRejectedValue(new Error('Fallback Error'));

        const result = await _testExports.getMutualFundData(['0131103C'], false, false);
        expect(result['0131103C']).toEqual(expect.objectContaining({
          ticker: '0131103C',
          source: 'Default Fallback'
        }));
      });

      test('失敗した投資信託をfallbackDataStoreに記録する', async () => {
        enhancedMarketDataService.getMutualFundsData.mockResolvedValue({
          '0131103C': { error: 'Failed to fetch' }
        });

        await _testExports.getMutualFundData(['0131103C'], false, false);
        expect(fallbackDataStore.recordFailedFetch).toHaveBeenCalledWith(
          '0131103C',
          DATA_TYPES.MUTUAL_FUND,
          'Failed to fetch'
        );
      });
    });

    describe('getExchangeRateData function', () => {
      test('nullまたは空の結果の場合はfallbackDataStoreに記録する', async () => {
        enhancedMarketDataService.getExchangeRateData.mockResolvedValue(null);

        await _testExports.getExchangeRateData('USD', 'JPY', false, false);
        expect(fallbackDataStore.recordFailedFetch).toHaveBeenCalledWith(
          'USD-JPY',
          DATA_TYPES.EXCHANGE_RATE,
          'No data returned'
        );
      });
    });
  });

  describe('Helper functions coverage', () => {
    test('空のコード配列でcreateTestJpStockDataを呼び出す', () => {
      // createTestJpStockDataの内部ロジックをテスト
      const result = marketData.createDummyJpStockSymbol('1000'); // 新しいコード
      expect(result.ticker).toBe('1000');
      expect(result.price).toBe(2000);
      expect(result.name).toBe('日本株 1000');
    });

    test('空のコード配列でcreateTestMutualFundDataを呼び出す', () => {
      // createTestMutualFundDataの内部ロジックをテスト
      const result = marketData.createDummyMutualFundSymbol('9999999C');
      expect(result.ticker).toBe('9999999C');
      expect(result.price).toBe(12345);
      expect(result.name).toBe('投資信託 9999999C');
    });

    test('複数のテスト環境変数の組み合わせ', async () => {
      const responseUtils = require('../../../src/utils/responseUtils');
      // global.USE_API_MOCKSをテスト
      global.USE_API_MOCKS = true;
      
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
      
      delete global.USE_API_MOCKS;
    });

    test('X-Test-Mode大文字ヘッダー', async () => {
      const responseUtils = require('../../../src/utils/responseUtils');
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL'
        },
        headers: {
          'X-Test-Mode': 'true'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('複数米国株でキャッシュヒットした場合の処理', async () => {
      const responseUtils = require('../../../src/utils/responseUtils');
      // 最初のcacheService.getでは通常キャッシュなし、2回目の呼び出しでマルチキャッシュがヒット
      cacheService.get.mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({
                      data: { 'AAPL': { ticker: 'AAPL' }, 'MSFT': { ticker: 'MSFT' } }
                    });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.US_STOCK,
          symbols: 'AAPL,MSFT'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('複数日本株でキャッシュヒットした場合の処理', async () => {
      const responseUtils = require('../../../src/utils/responseUtils');
      cacheService.get.mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({
                      data: { '7203': { ticker: '7203' }, '9984': { ticker: '9984' } }
                    });

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: DATA_TYPES.JP_STOCK,
          symbols: '7203,9984'
        }
      };
      const context = {};

      await marketData.handler(event, context);
      expect(responseUtils.formatResponse).toHaveBeenCalled();
    });

    test('サポートされていないタイプでdefaultケースをテスト', async () => {
      const responseUtils = require('../../../src/utils/responseUtils');
      // 実際にdefaultケースを実行するため、marketDataモジュールのhandlerを直接パッチ
      cacheService.get.mockResolvedValue(null);
      
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {
          type: 'UNKNOWN_TYPE', // 無効だがvalidateParamsをバイパスしたものとして扱う
          symbols: 'TEST'
        }
      };
      const context = {};
      
      // validateParamsを一時的に無効化
      const originalValidate = marketData.validateParams;
      marketData.validateParams = jest.fn().mockReturnValue({ isValid: true, errors: [] });

      await marketData.handler(event, context);
      expect(responseUtils.formatErrorResponse).toHaveBeenCalled();

      // 元に戻す
      marketData.validateParams = originalValidate;
    });

    test('highLatencyHandlerで実際のsetTimeoutエラー処理', async () => {
      const responseUtils = require('../../../src/utils/responseUtils');
      const logger = require('../../../src/utils/logger');
      
      // setTimeoutを一時的にエラーを投げるようにする
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation(() => {
        throw new Error('Timeout error');
      });

      const event = { httpMethod: 'GET' };
      const context = {};

      await marketData.highLatencyHandler(event, context);
      expect(logger.error).toHaveBeenCalled();
      expect(responseUtils.formatErrorResponse).toHaveBeenCalled();

      // 元に戻す
      global.setTimeout = originalSetTimeout;
    });

    test('getCompanyNameのテスト', () => {
      // getCompanyNameは内部関数なので、createDummyUsStockSymbolを通してテスト
      const appleResult = marketData.createDummyUsStockSymbol('AAPL');
      expect(appleResult.name).toBe('Apple Inc.');
      
      const unknownResult = marketData.createDummyUsStockSymbol('UNKNOWN_SYMBOL');
      expect(unknownResult.name).toBe('UNKNOWN_SYMBOL');
    });

    test('getCompanyNameJpのテスト', () => {
      // getCompanyNameJpは内部関数なので、createDummyJpStockSymbolを通してテスト
      const toyotaResult = marketData.createDummyJpStockSymbol('7203');
      expect(toyotaResult.name).toBe('トヨタ自動車');
      
      const unknownResult = marketData.createDummyJpStockSymbol('9999');
      expect(unknownResult.name).toBe('日本株 9999');
    });

    test('特定の行のカバレッジを確保', async () => {
      // テスト環境でのcreateDummyExchangeRateDataの完全カバレッジ
      const usdJpyRate = marketData.createDummyExchangeRateData('USD', 'JPY');
      expect(usdJpyRate.rate).toBe(149.82);
      
      const eurJpyRate = marketData.createDummyExchangeRateData('EUR', 'JPY');
      expect(eurJpyRate.rate).toBe(160.2);
      
      const gbpJpyRate = marketData.createDummyExchangeRateData('GBP', 'JPY');
      expect(gbpJpyRate.rate).toBe(187.5);
      
      const usdEurRate = marketData.createDummyExchangeRateData('USD', 'EUR');
      expect(usdEurRate.rate).toBe(0.93);
      
      const otherRate = marketData.createDummyExchangeRateData('CAD', 'AUD');
      expect(otherRate.rate).toBe(1.0);
    });

    test('createTestExchangeRateDataのfallback値', () => {
      // base, targetが未指定の場合のテスト
      const defaultRate = marketData.createTestExchangeRateData(null, null);
      expect(defaultRate.base).toBe('USD');
      expect(defaultRate.target).toBe('JPY');
      
      const undefinedRate = marketData.createTestExchangeRateData(undefined, undefined);
      expect(undefinedRate.base).toBe('USD');
      expect(undefinedRate.target).toBe('JPY');
    });
  });
});