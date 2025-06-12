/**
 * responseUtils.jsのテスト
 * API Gateway互換のレスポンスを標準化するユーティリティのテスト
 */
'use strict';

const {
  formatResponse,
  formatErrorResponse,
  formatRedirectResponse,
  formatOptionsResponse,
  methodHandler,
  handleOptions
} = require('../../../src/utils/responseUtils');

// モックの設定
jest.mock('../../../src/config/constants', () => ({
  ERROR_CODES: {
    SERVER_ERROR: 'SERVER_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR'
  },
  RESPONSE_FORMATS: {
    JSON: 'application/json'
  }
}));

jest.mock('../../../src/utils/budgetCheck', () => ({
  isBudgetCritical: jest.fn(),
  getBudgetWarningMessage: jest.fn(),
  addBudgetWarningToResponse: jest.fn((response) => Promise.resolve(response))
}));

jest.mock('../../../src/utils/corsHeaders', () => ({
  getCorsHeaders: jest.fn(() => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true'
  }))
}));

jest.mock('../../../src/utils/securityHeaders', () => ({
  mergeWithSecurityHeaders: jest.fn((headers) => ({
    ...headers,
    'X-Content-Type-Options': 'nosniff'
  }))
}));

const { isBudgetCritical, getBudgetWarningMessage, addBudgetWarningToResponse } = require('../../../src/utils/budgetCheck');
const { getCorsHeaders } = require('../../../src/utils/corsHeaders');
const { mergeWithSecurityHeaders } = require('../../../src/utils/securityHeaders');

describe('responseUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // console.logをモック
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // デフォルトのモック設定
    isBudgetCritical.mockResolvedValue(false);
    getBudgetWarningMessage.mockResolvedValue('Budget warning message');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('formatResponse', () => {
    test('基本的な成功レスポンスを生成する', async () => {
      const options = {
        data: { test: 'data' },
        message: 'Success'
      };

      const result = await formatResponse(options);

      expect(result).toEqual({
        statusCode: 200,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Content-Type-Options': 'nosniff'
        }),
        body: JSON.stringify({
          success: true,
          data: { test: 'data' },
          message: 'Success'
        })
      });
    });

    test('カスタムステータスコードでレスポンスを生成する', async () => {
      const options = {
        statusCode: 201,
        data: { created: true }
      };

      const result = await formatResponse(options);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toMatchObject({
        success: true,
        data: { created: true }
      });
    });

    test('追加のメタデータを含むレスポンスを生成する', async () => {
      const options = {
        data: { test: 'data' },
        source: 'test-api',
        lastUpdated: '2025-01-01T00:00:00Z',
        processingTime: '100ms'
      };

      const result = await formatResponse(options);
      const body = JSON.parse(result.body);

      expect(body).toMatchObject({
        success: true,
        data: { test: 'data' },
        source: 'test-api',
        lastUpdated: '2025-01-01T00:00:00Z',
        processingTime: '100ms'
      });
    });

    test('警告情報を含むレスポンスを生成する', async () => {
      const options = {
        data: { test: 'data' },
        warnings: ['Warning 1', 'Warning 2']
      };

      const result = await formatResponse(options);
      const body = JSON.parse(result.body);

      expect(body.warnings).toEqual(['Warning 1', 'Warning 2']);
    });

    test('使用量情報を含むレスポンスを生成する', async () => {
      const options = {
        data: { test: 'data' },
        usage: {
          daily: { count: 10, limit: 100 },
          monthly: { count: 100, limit: 1000 }
        }
      };

      const result = await formatResponse(options);
      const body = JSON.parse(result.body);

      expect(body.usage).toMatchObject({
        daily: { count: 10, limit: 100 },
        monthly: { count: 100, limit: 1000 }
      });
    });

    test('予算警告がある場合のレスポンスを生成する', async () => {
      isBudgetCritical.mockResolvedValue(true);
      getBudgetWarningMessage.mockResolvedValue('Budget limit exceeded');

      const options = {
        data: { test: 'data' }
      };

      const result = await formatResponse(options);

      expect(result.headers['X-Budget-Warning']).toBe('Budget limit exceeded');
      expect(JSON.parse(result.body).budgetWarning).toBe('Budget limit exceeded');
    });

    test('予算警告をスキップする場合', async () => {
      isBudgetCritical.mockResolvedValue(true);

      const options = {
        data: { test: 'data' },
        skipBudgetWarning: true
      };

      const result = await formatResponse(options);

      expect(result.headers['X-Budget-Warning']).toBeUndefined();
      expect(addBudgetWarningToResponse).not.toHaveBeenCalled();
    });

    test('eventオブジェクトなしでwarningログを出力する', async () => {
      const options = { data: { test: 'data' } };

      await formatResponse(options);

      expect(console.log).toHaveBeenCalledWith(
        'WARNING: formatResponse/formatErrorResponse called without event object - CORS headers may be incorrect'
      );
    });

    test('テスト用フックを実行する', async () => {
      const mockHook = jest.fn();
      const options = {
        data: { test: 'data' },
        _formatResponse: mockHook
      };

      const result = await formatResponse(options);

      expect(mockHook).toHaveBeenCalledWith(result, options);
    });
  });

  describe('formatErrorResponse', () => {
    test('基本的なエラーレスポンスを生成する', async () => {
      const options = {
        message: 'Test error'
      };

      const result = await formatErrorResponse(options);

      expect(result).toEqual({
        statusCode: 500,
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Test error'
          }
        })
      });
    });

    test('カスタムエラーコードとステータスコードでレスポンスを生成する', async () => {
      const options = {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      };

      const result = await formatErrorResponse(options);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).error.code).toBe('VALIDATION_ERROR');
    });

    test('詳細情報を含むエラーレスポンスを生成する（開発環境）', async () => {
      process.env.NODE_ENV = 'development';

      const options = {
        message: 'Test error',
        details: 'Detailed error information'
      };

      const result = await formatErrorResponse(options);
      const body = JSON.parse(result.body);

      expect(body.error.details).toBe('Detailed error information');
    });

    test('詳細情報を含まないエラーレスポンスを生成する（本番環境）', async () => {
      process.env.NODE_ENV = 'production';

      const options = {
        message: 'Test error',
        details: 'Detailed error information'
      };

      const result = await formatErrorResponse(options);
      const body = JSON.parse(result.body);

      expect(body.error.details).toBeUndefined();
    });

    test('リトライ情報を含むエラーレスポンスを生成する', async () => {
      const options = {
        message: 'Rate limit exceeded',
        retryAfter: 60
      };

      const result = await formatErrorResponse(options);
      const body = JSON.parse(result.body);

      expect(body.error.retryAfter).toBe(60);
      expect(result.headers['Retry-After']).toBe('60');
    });

    test('リクエストIDを含むエラーレスポンスを生成する', async () => {
      const options = {
        message: 'Test error',
        requestId: 'req-123'
      };

      const result = await formatErrorResponse(options);
      const body = JSON.parse(result.body);

      expect(body.error.requestId).toBe('req-123');
    });

    test('使用量情報を含むエラーレスポンスを生成する', async () => {
      const options = {
        message: 'Test error',
        usage: {
          daily: { count: 100, limit: 100 }
        }
      };

      const result = await formatErrorResponse(options);
      const body = JSON.parse(result.body);

      expect(body.usage).toMatchObject({
        daily: { count: 100, limit: 100 }
      });
    });
  });

  describe('formatRedirectResponse', () => {
    test('基本的なリダイレクトレスポンスを生成する', () => {
      const url = 'https://example.com';

      const result = formatRedirectResponse(url);

      expect(result).toEqual({
        statusCode: 302,
        headers: {
          'Location': 'https://example.com',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true'
        },
        body: ''
      });
    });

    test('カスタムステータスコードでリダイレクトレスポンスを生成する', () => {
      const url = 'https://example.com';
      const statusCode = 301;

      const result = formatRedirectResponse(url, statusCode);

      expect(result.statusCode).toBe(301);
    });

    test('追加ヘッダーを含むリダイレクトレスポンスを生成する', () => {
      const url = 'https://example.com';
      const statusCode = 302;
      const headers = { 'Custom-Header': 'value' };

      const result = formatRedirectResponse(url, statusCode, headers);

      expect(result.headers['Custom-Header']).toBe('value');
    });
  });

  describe('formatOptionsResponse', () => {
    test('基本的なOPTIONSレスポンスを生成する', () => {
      const result = formatOptionsResponse();

      expect(result).toEqual({
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      });
    });

    test('追加ヘッダーを含むOPTIONSレスポンスを生成する', () => {
      const headers = { 'Custom-Header': 'value' };

      const result = formatOptionsResponse(headers);

      expect(result.headers['Custom-Header']).toBe('value');
    });
  });

  describe('methodHandler', () => {
    test('OPTIONSリクエストの場合はOPTIONSレスポンスを返す', async () => {
      const event = { httpMethod: 'OPTIONS' };
      const handler = jest.fn();

      const result = await methodHandler(event, handler);

      expect(result.statusCode).toBe(204);
      expect(handler).not.toHaveBeenCalled();
    });

    test('OPTIONS以外のリクエストの場合はnullを返す', async () => {
      const event = { httpMethod: 'GET' };
      const handler = jest.fn();

      const result = await methodHandler(event, handler);

      expect(result).toBeNull();
    });
  });

  describe('handleOptions', () => {
    test('OPTIONSリクエストの場合はOPTIONSレスポンスを返す', () => {
      const event = { httpMethod: 'OPTIONS' };

      const result = handleOptions(event);

      expect(result.statusCode).toBe(204);
    });

    test('OPTIONS以外のリクエストの場合はnullを返す', () => {
      const event = { httpMethod: 'GET' };

      const result = handleOptions(event);

      expect(result).toBeNull();
    });
  });

  describe('undefined値の処理', () => {
    test('データがundefinedの場合はdataプロパティを含まない', async () => {
      const options = {
        data: undefined,
        message: 'Success'
      };

      const result = await formatResponse(options);
      const body = JSON.parse(result.body);

      expect(body).not.toHaveProperty('data');
      expect(body.message).toBe('Success');
    });

    test('メッセージがない場合はmessageプロパティを含まない', async () => {
      const options = {
        data: { test: 'data' }
      };

      const result = await formatResponse(options);
      const body = JSON.parse(result.body);

      expect(body).not.toHaveProperty('message');
      expect(body.data).toEqual({ test: 'data' });
    });
  });
});