/**
 * getClientConfig.jsのテスト
 * クライアント設定取得APIのテスト
 */
'use strict';

const { handler } = require('../../../../src/function/config/getClientConfig');
const { getCorsHeaders, handleOptionsRequest } = require('../../../../src/utils/corsHeaders');
const logger = require('../../../../src/utils/logger');
const { getGoogleClientId } = require('../../../../src/utils/secretsManager');
const { validateApiSecret } = require('../../../../src/middleware/apiSecretValidation');

// モック設定
jest.mock('../../../../src/utils/corsHeaders');
jest.mock('../../../../src/utils/logger');
jest.mock('../../../../src/utils/secretsManager');
jest.mock('../../../../src/middleware/apiSecretValidation');

describe('getClientConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのモック設定
    getCorsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    handleOptionsRequest.mockReturnValue(null);
    validateApiSecret.mockResolvedValue(null);
    getGoogleClientId.mockResolvedValue('test-google-client-id');
    
    logger.info = jest.fn();
    logger.error = jest.fn();
  });

  describe('正常系', () => {
    test('クライアント設定を正常に返す', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(validateApiSecret).toHaveBeenCalledWith(event);
      expect(getGoogleClientId).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Getting client configuration');
      
      const body = JSON.parse(result.body);
      expect(body).toEqual({
        success: true,
        data: {
          apiVersion: '1.0.0',
          features: {
            googleAuth: true,
            marketData: true,
            portfolioManagement: true
          },
          limits: {
            maxFileSize: 10 * 1024 * 1024,
            maxPortfolioItems: 1000
          },
          supportedMarkets: ['us-stock', 'jp-stock', 'mutual-fund', 'exchange-rate'],
          cacheTime: {
            marketData: 3600,
            portfolioData: 300
          },
          googleClientId: 'test-google-client-id'
        }
      });
    });

    test('GoogleClientIdがnullの場合は空文字列を設定', async () => {
      getGoogleClientId.mockResolvedValue(null);
      
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.googleClientId).toBe('');
    });

    test('GoogleClientIdがundefinedの場合は空文字列を設定', async () => {
      getGoogleClientId.mockResolvedValue(undefined);
      
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.data.googleClientId).toBe('');
    });

    test('正しいCORSヘッダーがレスポンスに含まれる', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);

      expect(getCorsHeaders).toHaveBeenCalledWith(event);
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      });
    });
  });

  describe('OPTIONSリクエスト処理', () => {
    test('OPTIONSリクエストを処理する', async () => {
      const optionsResponse = {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' },
        body: ''
      };
      
      handleOptionsRequest.mockReturnValue(optionsResponse);
      
      const event = {
        httpMethod: 'OPTIONS'
      };

      const result = await handler(event);

      expect(handleOptionsRequest).toHaveBeenCalledWith(event);
      expect(result).toEqual(optionsResponse);
      expect(validateApiSecret).not.toHaveBeenCalled();
      expect(getGoogleClientId).not.toHaveBeenCalled();
    });
  });

  describe('認証・認可', () => {
    test('APIシークレット検証エラーの場合はエラーレスポンスを返す', async () => {
      const validationError = {
        statusCode: 401,
        headers: getCorsHeaders(),
        body: JSON.stringify({
          success: false,
          error: { message: 'Invalid API secret' }
        })
      };
      
      validateApiSecret.mockResolvedValue(validationError);
      
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);

      expect(result).toEqual(validationError);
      expect(getGoogleClientId).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    test('getGoogleClientIdでエラーが発生した場合', async () => {
      const error = new Error('Secrets Manager error');
      getGoogleClientId.mockRejectedValue(error);
      
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('Error getting client configuration', { error });
      expect(getCorsHeaders).toHaveBeenCalledWith(event);
      
      const body = JSON.parse(result.body);
      expect(body).toEqual({
        success: false,
        error: {
          type: 'CONFIG_ERROR',
          message: 'Failed to get client configuration'
        }
      });
    });

    test('validateApiSecretでエラーが発生した場合', async () => {
      const error = new Error('Validation error');
      validateApiSecret.mockRejectedValue(error);
      
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('Error getting client configuration', { error });
    });

    test('全般的なエラーハンドリング', async () => {
      const error = new Error('Unexpected error');
      logger.info.mockImplementation(() => {
        throw error;
      });
      
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      });
      
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.type).toBe('CONFIG_ERROR');
      expect(body.error.message).toBe('Failed to get client configuration');
    });
  });

  describe('レスポンス構造', () => {
    test('設定オブジェクトの構造が正しい', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);
      const config = body.data;

      // 必須フィールドの存在確認
      expect(config).toHaveProperty('apiVersion');
      expect(config).toHaveProperty('features');
      expect(config).toHaveProperty('limits');
      expect(config).toHaveProperty('supportedMarkets');
      expect(config).toHaveProperty('cacheTime');
      expect(config).toHaveProperty('googleClientId');

      // featuresオブジェクトの構造
      expect(config.features).toHaveProperty('googleAuth');
      expect(config.features).toHaveProperty('marketData');
      expect(config.features).toHaveProperty('portfolioManagement');

      // limitsオブジェクトの構造
      expect(config.limits).toHaveProperty('maxFileSize');
      expect(config.limits).toHaveProperty('maxPortfolioItems');

      // cacheTimeオブジェクトの構造
      expect(config.cacheTime).toHaveProperty('marketData');
      expect(config.cacheTime).toHaveProperty('portfolioData');

      // 値の型チェック
      expect(typeof config.apiVersion).toBe('string');
      expect(typeof config.features.googleAuth).toBe('boolean');
      expect(typeof config.limits.maxFileSize).toBe('number');
      expect(Array.isArray(config.supportedMarkets)).toBe(true);
      expect(typeof config.cacheTime.marketData).toBe('number');
    });

    test('supportedMarketsの内容が正しい', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);
      const supportedMarkets = body.data.supportedMarkets;

      expect(supportedMarkets).toEqual(['us-stock', 'jp-stock', 'mutual-fund', 'exchange-rate']);
      expect(supportedMarkets).toHaveLength(4);
    });

    test('数値設定が正しい', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const result = await handler(event);
      const body = JSON.parse(result.body);
      const config = body.data;

      expect(config.limits.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
      expect(config.limits.maxPortfolioItems).toBe(1000);
      expect(config.cacheTime.marketData).toBe(3600); // 1時間
      expect(config.cacheTime.portfolioData).toBe(300); // 5分
    });
  });
});