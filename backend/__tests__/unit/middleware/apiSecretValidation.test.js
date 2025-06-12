/**
 * apiSecretValidation.jsのテスト
 * APIシークレット検証ミドルウェアのテスト
 */
'use strict';

const { validateApiSecret } = require('../../../src/middleware/apiSecretValidation');
const logger = require('../../../src/utils/logger');
const { getCorsHeaders } = require('../../../src/utils/corsHeaders');
const { getApiSecret } = require('../../../src/utils/secretsManager');

// モック設定
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/corsHeaders');
jest.mock('../../../src/utils/secretsManager');

describe('apiSecretValidation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 環境変数をリセット
    process.env = { ...originalEnv };
    delete process.env.API_SECRET;
    
    // デフォルトのモック設定
    getCorsHeaders.mockReturnValue({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    logger.warn = jest.fn();
    logger.error = jest.fn();
    
    getApiSecret.mockResolvedValue('test-api-secret');
    
    // モジュールキャッシュをクリア
    delete require.cache[require.resolve('../../../src/middleware/apiSecretValidation')];
    
    // モジュールレベルのAPI_SECRETをリセット
    const apiSecretModule = require('../../../src/middleware/apiSecretValidation');
    if (apiSecretModule.API_SECRET) {
      apiSecretModule.API_SECRET = null;
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('正常系', () => {
    test('正しいAPIシークレットの場合は通過する', async () => {
      const event = {
        path: '/api/test',
        headers: {
          'X-API-Secret': 'test-api-secret'
        }
      };

      const result = await validateApiSecret(event);

      expect(result).toBeNull();
      expect(getApiSecret).toHaveBeenCalled();
    });

    test('小文字のヘッダー名でも動作する', async () => {
      const event = {
        path: '/api/test',
        headers: {
          'x-api-secret': 'test-api-secret'
        }
      };

      const result = await validateApiSecret(event);

      expect(result).toBeNull();
    });

    test('スキップ対象パスは検証をスキップする - Google認証ログイン', async () => {
      const event = {
        path: '/auth/google/login',
        headers: {}
      };

      const result = await validateApiSecret(event);

      expect(result).toBeNull();
      expect(getApiSecret).not.toHaveBeenCalled();
    });

    test('スキップ対象パスは検証をスキップする - Googleコールバック', async () => {
      const event = {
        path: '/auth/google/callback',
        headers: {}
      };

      const result = await validateApiSecret(event);

      expect(result).toBeNull();
      expect(getApiSecret).not.toHaveBeenCalled();
    });

    test('スキップ対象パスは検証をスキップする - Google Driveコールバック', async () => {
      const event = {
        path: '/auth/google/drive/callback',
        headers: {}
      };

      const result = await validateApiSecret(event);

      expect(result).toBeNull();
      expect(getApiSecret).not.toHaveBeenCalled();
    });

    test('パスの部分一致でスキップされる', async () => {
      const event = {
        path: '/api/auth/google/login/extra',
        headers: {}
      };

      const result = await validateApiSecret(event);

      expect(result).toBeNull();
      expect(getApiSecret).not.toHaveBeenCalled();
    });
  });

  describe('エラー系', () => {
    test('APIシークレットが間違っている場合は403エラー', async () => {
      const event = {
        path: '/api/test',
        headers: {
          'X-API-Secret': 'wrong-secret',
          'X-Forwarded-For': '192.168.1.1',
          'User-Agent': 'Test-Agent'
        }
      };

      const result = await validateApiSecret(event);

      expect(result.statusCode).toBe(403);
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      });
      expect(JSON.parse(result.body)).toEqual({
        error: 'Forbidden',
        message: 'Direct API access is not allowed'
      });
      expect(logger.warn).toHaveBeenCalledWith('Invalid API secret attempt', {
        path: '/api/test',
        ip: '192.168.1.1',
        userAgent: 'Test-Agent'
      });
    });

    test('APIシークレットがない場合は403エラー', async () => {
      const event = {
        path: '/api/test',
        headers: {}
      };

      const result = await validateApiSecret(event);

      expect(result.statusCode).toBe(403);
      expect(logger.warn).toHaveBeenCalledWith('Invalid API secret attempt', {
        path: '/api/test',
        ip: undefined,
        userAgent: undefined
      });
    });


    test('一般的なエラーハンドリング', async () => {
      // pathがundefinedの場合のエラー
      const event = {
        headers: {
          'X-API-Secret': 'test-api-secret'
        }
      };

      const result = await validateApiSecret(event);

      expect(result.statusCode).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('API secret validation error:', expect.any(Error));
    });
  });

  describe('IPアドレス取得', () => {
    test('X-Forwarded-ForヘッダーからIPを取得', async () => {
      const event = {
        path: '/api/test',
        headers: {
          'X-API-Secret': 'wrong-secret',
          'X-Forwarded-For': '203.0.113.1'
        }
      };

      const result = await validateApiSecret(event);

      expect(result.statusCode).toBe(403);
      expect(logger.warn).toHaveBeenCalledWith('Invalid API secret attempt', expect.objectContaining({
        ip: '203.0.113.1'
      }));
    });

    test('requestContextからIPを取得', async () => {
      const event = {
        path: '/api/test',
        headers: {
          'X-API-Secret': 'wrong-secret'
        },
        requestContext: {
          identity: {
            sourceIp: '198.51.100.1'
          }
        }
      };

      const result = await validateApiSecret(event);

      expect(result.statusCode).toBe(403);
      expect(logger.warn).toHaveBeenCalledWith('Invalid API secret attempt', expect.objectContaining({
        ip: '198.51.100.1'
      }));
    });

    test('X-Forwarded-Forが優先される', async () => {
      const event = {
        path: '/api/test',
        headers: {
          'X-API-Secret': 'wrong-secret',
          'X-Forwarded-For': '203.0.113.1'
        },
        requestContext: {
          identity: {
            sourceIp: '198.51.100.1'
          }
        }
      };

      const result = await validateApiSecret(event);

      expect(result.statusCode).toBe(403);
      expect(logger.warn).toHaveBeenCalledWith('Invalid API secret attempt', expect.objectContaining({
        ip: '203.0.113.1'
      }));
    });
  });


  describe('異なるパスパターン', () => {
    test('通常のAPIパスは検証される', async () => {
      const paths = [
        '/api/market-data',
        '/admin/status',
        '/config/client',
        '/debug/info'
      ];

      for (const path of paths) {
        const event = {
          path,
          headers: {
            'X-API-Secret': 'test-api-secret'
          }
        };

        const result = await validateApiSecret(event);
        expect(result).toBeNull();
      }
    });

    test('Google認証関連のパスはすべてスキップされる', async () => {
      const skipPaths = [
        '/auth/google/login',
        '/auth/google/callback',
        '/auth/google/drive/callback',
        '/api/auth/google/login/additional',
        '/v1/auth/google/callback/test'
      ];

      for (const path of skipPaths) {
        const event = {
          path,
          headers: {}
        };

        const result = await validateApiSecret(event);
        expect(result).toBeNull();
      }
    });
  });

  describe('getCorsHeaders呼び出し', () => {
    test('エラーレスポンス時にgetCorsHeadersが呼ばれる', async () => {
      const event = {
        path: '/api/test',
        headers: {
          'X-API-Secret': 'wrong-secret'
        }
      };

      await validateApiSecret(event);

      expect(getCorsHeaders).toHaveBeenCalledWith(event);
      expect(getCorsHeaders).toHaveBeenCalledTimes(1);
    });

    test('内部エラー時にもgetCorsHeadersが呼ばれる', async () => {
      getApiSecret.mockRejectedValue(new Error('Secrets Manager error'));

      const event = {
        path: '/api/test',
        headers: {
          'X-API-Secret': 'any-secret'
        }
      };

      await validateApiSecret(event);

      expect(getCorsHeaders).toHaveBeenCalledWith(event);
    });
  });
});