/**
 * Google OAuth設定デバッグエンドポイントのテスト
 */
'use strict';

const { handler } = require('../../../../src/function/debug/googleConfig');
const { getApiKeys } = require('../../../../src/utils/secretsManager');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');

// モックの設定
jest.mock('../../../../src/utils/secretsManager');
jest.mock('../../../../src/utils/responseUtils');

describe('googleConfig.handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // console.logをモック
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // 環境変数のモック
    process.env.NODE_ENV = 'test';
    process.env.AWS_REGION = 'us-west-2';
    process.env.GOOGLE_CLIENT_ID = '';
    process.env.GOOGLE_CLIENT_SECRET = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // 環境変数をクリア
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  describe('正常ケース', () => {
    test('Secrets Managerから正常にGoogle OAuth設定を取得できる', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const mockApiKeys = {
        googleClientId: '123456789012.apps.googleusercontent.com',
        googleClientSecret: 'secret123'
      };

      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          config: expect.any(Object),
          timestamp: expect.any(String)
        })
      };

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue(mockResponse);

      const result = await handler(mockEvent);

      expect(getApiKeys).toHaveBeenCalledTimes(1);
      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 200,
        body: expect.objectContaining({
          success: true,
          config: expect.objectContaining({
            hasClientId: true,
            hasClientSecret: true,
            clientIdSource: 'secrets-manager',
            clientSecretSource: 'secrets-manager',
            environment: 'test',
            awsRegion: 'us-west-2'
          }),
          timestamp: expect.any(String)
        })
      }));
      expect(result).toEqual(mockResponse);
    });

    test('環境変数からGoogle OAuth設定を取得する', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const mockApiKeys = {
        googleClientId: null,
        googleClientSecret: null
      };

      process.env.GOOGLE_CLIENT_ID = '987654321.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_SECRET = 'env-secret';

      const mockResponse = { statusCode: 200 };

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue(mockResponse);

      const result = await handler(mockEvent);

      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          config: expect.objectContaining({
            clientIdSource: 'environment',
            clientSecretSource: 'environment'
          })
        })
      }));
      expect(result).toEqual(mockResponse);
    });

    test('Client IDがない場合の設定情報', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const mockApiKeys = {
        googleClientId: null,
        googleClientSecret: 'secret123'
      };

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue({ statusCode: 200 });

      await handler(mockEvent);

      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          config: expect.objectContaining({
            hasClientId: false,
            hasClientSecret: true,
            clientIdPrefix: 'missing'
          })
        })
      }));
    });

    test('Client IDの形式チェック - 正しい形式', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const mockApiKeys = {
        googleClientId: '123456789-abcdefghijklmnop.apps.googleusercontent.com',
        googleClientSecret: 'secret'
      };

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue({ statusCode: 200 });

      await handler(mockEvent);

      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          config: expect.objectContaining({
            clientIdFormat: expect.objectContaining({
              hasCorrectSuffix: true,
              pattern: true
            })
          })
        })
      }));
    });

    test('Client IDの形式チェック - 間違った形式', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const mockApiKeys = {
        googleClientId: 'invalid-client-id',
        googleClientSecret: 'secret'
      };

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue({ statusCode: 200 });

      await handler(mockEvent);

      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          config: expect.objectContaining({
            clientIdFormat: expect.objectContaining({
              hasCorrectSuffix: false,
              pattern: false
            })
          })
        })
      }));
    });
  });

  describe('エラーケース', () => {
    test('getApiKeysでエラーが発生した場合', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const mockError = new Error('Secrets Manager access failed');
      const mockErrorResponse = {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: 'Debug endpoint error'
        })
      };

      getApiKeys.mockRejectedValue(mockError);
      formatErrorResponse.mockReturnValue(mockErrorResponse);

      const result = await handler(mockEvent);

      expect(console.error).toHaveBeenCalledWith('Google config debug error:', mockError);
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Debug endpoint error',
        details: 'Secrets Manager access failed'
      });
      expect(result).toEqual(mockErrorResponse);
    });
  });

  describe('コンソールログの確認', () => {
    test('リクエスト情報が正しくログ出力される', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const mockApiKeys = {
        googleClientId: 'test-id',
        googleClientSecret: 'test-secret'
      };

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue({ statusCode: 200 });

      await handler(mockEvent);

      expect(console.log).toHaveBeenCalledWith('Debug endpoint accessed:', {
        path: '/debug/google-config',
        method: 'GET',
        environment: 'test'
      });
      expect(console.log).toHaveBeenCalledWith('Debug: Checking Google OAuth configuration...');
      expect(console.log).toHaveBeenCalledWith('Google OAuth Debug Info:', expect.any(Object));
    });
  });

  describe('Client IDのprefix処理', () => {
    test('長いClient IDのprefix処理', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const longClientId = '1234567890123456789012345678901234567890.apps.googleusercontent.com';
      const mockApiKeys = {
        googleClientId: longClientId,
        googleClientSecret: 'secret'
      };

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue({ statusCode: 200 });

      await handler(mockEvent);

      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          config: expect.objectContaining({
            clientIdPrefix: '12345678901234567890...'
          })
        })
      }));
    });

    test('短いClient IDのprefix処理', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const shortClientId = '123.apps.googleusercontent.com';
      const mockApiKeys = {
        googleClientId: shortClientId,
        googleClientSecret: 'secret'
      };

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue({ statusCode: 200 });

      await handler(mockEvent);

      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          config: expect.objectContaining({
            clientIdPrefix: '123.apps.googleuserc...'
          })
        })
      }));
    });
  });

  describe('混在ケース', () => {
    test('Client IDはSecrets Manager、SecretはEnvironmentから取得', async () => {
      const mockEvent = {
        path: '/debug/google-config',
        httpMethod: 'GET'
      };

      const mockApiKeys = {
        googleClientId: 'secrets-client-id.apps.googleusercontent.com',
        googleClientSecret: null
      };

      process.env.GOOGLE_CLIENT_SECRET = 'env-secret';

      getApiKeys.mockResolvedValue(mockApiKeys);
      formatResponse.mockReturnValue({ statusCode: 200 });

      await handler(mockEvent);

      expect(formatResponse).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({
          config: expect.objectContaining({
            clientIdSource: 'secrets-manager',
            clientSecretSource: 'environment',
            hasClientId: true,
            hasClientSecret: true
          })
        })
      }));
    });
  });
});