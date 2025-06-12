/**
 * corsHelper.jsのテスト
 * CORS設定ヘルパーのテスト
 */
'use strict';

const { getCorsHeaders, getOptionsResponse } = require('../../../src/utils/corsHelper');

describe('corsHelper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // console.logをモック
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // 環境変数をリセット
    process.env = { ...originalEnv };
    // JEST_WORKER_IDを削除してテスト環境フラグをクリア
    delete process.env.JEST_WORKER_ID;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getCorsHeaders', () => {
    test('テスト環境では*オリジンを返す', () => {
      process.env.NODE_ENV = 'test';

      const headers = getCorsHeaders();

      expect(headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Cookie',
        'Access-Control-Max-Age': '86400'
      });
    });

    test('JEST_WORKER_IDが設定されている場合も*オリジンを返す', () => {
      delete process.env.NODE_ENV;
      process.env.JEST_WORKER_ID = '1';

      const headers = getCorsHeaders();

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('追加ヘッダーを含める', () => {
      process.env.NODE_ENV = 'test';
      const additionalHeaders = {
        'Custom-Header': 'custom-value',
        'Another-Header': 'another-value'
      };

      const headers = getCorsHeaders(additionalHeaders);

      expect(headers).toEqual(expect.objectContaining({
        'Access-Control-Allow-Origin': '*',
        'Custom-Header': 'custom-value',
        'Another-Header': 'another-value'
      }));
    });

    test('許可されたオリジンからのリクエストを受け入れる', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com,https://test.com';

      const event = {
        headers: {
          origin: 'https://example.com'
        }
      };

      const headers = getCorsHeaders({}, event);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(console.log).toHaveBeenCalledWith('CORS Debug:', expect.objectContaining({
        requestOrigin: 'https://example.com'
      }));
    });

    test('Originヘッダーの大文字小文字を区別しない', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';

      const event = {
        headers: {
          Origin: 'https://example.com' // 大文字のOrigin
        }
      };

      const headers = getCorsHeaders({}, event);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    test('許可されていないオリジンはフォールバックを使用', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS = 'https://allowed.com';

      const event = {
        headers: {
          origin: 'https://notallowed.com'
        }
      };

      const headers = getCorsHeaders({}, event);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(console.log).toHaveBeenCalledWith(
        'CORS: Request origin not in allowed list, using fallback:',
        'http://localhost:3000'
      );
    });

    test('ワイルドカードパターンをサポート', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS = 'https://*.example.com';

      const event = {
        headers: {
          origin: 'https://subdomain.example.com'
        }
      };

      const headers = getCorsHeaders({}, event);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://subdomain.example.com');
    });

    test('複数のワイルドカードパターンをテスト', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS = 'https://*.test.com,https://*.example.com';

      const event = {
        headers: {
          origin: 'https://api.test.com'
        }
      };

      const headers = getCorsHeaders({}, event);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://api.test.com');
    });

    test('イベントオブジェクトがない場合はフォールバックを使用', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';

      const headers = getCorsHeaders({}, null);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(console.log).toHaveBeenCalledWith(
        'CORS: No event provided, using fallback origin:',
        'http://localhost:3000'
      );
    });

    test('ヘッダーがないイベントの場合はフォールバックを使用', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';

      const event = {}; // headers プロパティなし

      const headers = getCorsHeaders({}, event);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });

    test('CORS_ALLOWED_ORIGINSが設定されていない場合のデフォルト', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.CORS_ALLOWED_ORIGINS;

      const event = {
        headers: {
          origin: 'http://localhost:3001'
        }
      };

      const headers = getCorsHeaders({}, event);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
    });

    test('空文字列のOriginヘッダー', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';

      const event = {
        headers: {
          origin: ''
        }
      };

      const headers = getCorsHeaders({}, event);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });
  });

  describe('getOptionsResponse', () => {
    test('正しいOPTIONSレスポンスを生成する', () => {
      process.env.NODE_ENV = 'test';

      const response = getOptionsResponse();

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Cookie',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      });
    });

    test('開発環境でのOPTIONSレスポンス', () => {
      process.env.NODE_ENV = 'development';

      const response = getOptionsResponse();

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
    });
  });
});