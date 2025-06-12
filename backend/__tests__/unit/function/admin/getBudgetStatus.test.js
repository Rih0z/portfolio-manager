/**
 * ファイルパス: __tests__/unit/function/admin/getBudgetStatus.test.js
 *
 * 管理者向け予算取得エンドポイントのユニットテスト
 * APIキー認証とレスポンス生成を検証する
 */
'use strict';

// モック設定
jest.mock('../../../../src/utils/budgetCheck', () => ({
  getBudgetStatus: jest.fn()
}));

jest.mock('../../../../src/utils/responseUtils', () => ({
  formatResponse: jest.fn(),
  formatErrorResponse: jest.fn()
}));

jest.mock('../../../../src/config/constants', () => ({
  ADMIN: {
    API_KEY: 'test-admin-api-key',
    EMAIL: 'admin@example.com'
  }
}));

const { getBudgetStatus } = require('../../../../src/utils/budgetCheck');
const { formatResponse, formatErrorResponse } = require('../../../../src/utils/responseUtils');
const { ADMIN } = require('../../../../src/config/constants');
const { handler } = require('../../../../src/function/admin/getBudgetStatus');

describe('admin getBudgetStatus handler', () => {
  const originalConsole = console;
  let mockConsole;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // コンソールのモック設定
    mockConsole = {
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn()
    };
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    console.log = mockConsole.log;
    
    // デフォルトのモック実装
    
    getBudgetStatus.mockResolvedValue({
      usage: 85.50,
      limit: 100.00,
      percentage: 85.5,
      status: 'warning'
    });
    
    formatResponse.mockReturnValue({
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        budget: { usage: 85.50 },
        timestamp: '2023-01-01T00:00:00.000Z'
      })
    });
    
    formatErrorResponse.mockReturnValue({
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Unauthorized',
        message: '無効なAPIキーです'
      })
    });
  });

  afterEach(() => {
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.log = originalConsole.log;
  });

  describe('CORS プリフライトリクエスト', () => {
    test('OPTIONSリクエストに対して正しいCORSヘッダーで204を返す', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        headers: {}
      };
      
      const result = await handler(event, {});
      
      expect(result.statusCode).toBe(204);
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
      });
      expect(result.body).toBe('');
      
      // getBudgetStatusが呼び出されていないことを確認
      expect(getBudgetStatus).not.toHaveBeenCalled();
    });
    
    test('OPTIONSリクエストでヘッダーに追加データがあっても正常に処理される', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'x-api-key'
        }
      };
      
      const result = await handler(event, {});
      
      expect(result.statusCode).toBe(204);
      expect(result.body).toBe('');
    });
  });

  describe('API キー認証', () => {
    test('有効なAPIキーで認証が成功する', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      const result = await handler(event, {});
      
      expect(getBudgetStatus).toHaveBeenCalledWith(false);
      expect(formatResponse).toHaveBeenCalledWith({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        data: {
          budget: {
            usage: 85.50,
            limit: 100.00,
            percentage: 85.5,
            status: 'warning'
          },
          timestamp: expect.any(String)
        }
      });
      expect(result.statusCode).toBe(200);
    });
    
    test('APIキーが存在しない場合は401エラーを返す', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null
      };
      
      const result = await handler(event, {});
      
      expect(console.warn).toHaveBeenCalledWith('Invalid API key provided');
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        message: '無効なAPIキーです'
      });
      expect(getBudgetStatus).not.toHaveBeenCalled();
    });
    
    test('間違ったAPIキーの場合は401エラーを返す', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'wrong-api-key'
        },
        queryStringParameters: null
      };
      
      const result = await handler(event, {});
      
      expect(console.warn).toHaveBeenCalledWith('Invalid API key provided');
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        message: '無効なAPIキーです'
      });
      expect(getBudgetStatus).not.toHaveBeenCalled();
    });
    
    test('空文字のAPIキーの場合は401エラーを返す', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': ''
        },
        queryStringParameters: null
      };
      
      const result = await handler(event, {});
      
      expect(console.warn).toHaveBeenCalledWith('Invalid API key provided');
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        message: '無効なAPIキーです'
      });
      expect(getBudgetStatus).not.toHaveBeenCalled();
    });
  });

  describe('クエリパラメータの処理', () => {
    test('refreshパラメータがtrueの場合はforceRefreshがtrueになる', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: {
          refresh: 'true'
        }
      };
      
      await handler(event, {});
      
      expect(getBudgetStatus).toHaveBeenCalledWith(true);
    });
    
    test('refreshパラメータがfalseの場合はforceRefreshがfalseになる', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: {
          refresh: 'false'
        }
      };
      
      await handler(event, {});
      
      expect(getBudgetStatus).toHaveBeenCalledWith(false);
    });
    
    test('refreshパラメータが存在しない場合はforceRefreshがfalseになる', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: {
          other: 'value'
        }
      };
      
      await handler(event, {});
      
      expect(getBudgetStatus).toHaveBeenCalledWith(false);
    });
    
    test('queryStringParametersがnullの場合もforceRefreshがfalseになる', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      expect(getBudgetStatus).toHaveBeenCalledWith(false);
    });
    
    test('refresh以外のパラメータは無視される', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: {
          refresh: 'true',
          ignored: 'value',
          extra: 'parameter'
        }
      };
      
      await handler(event, {});
      
      expect(getBudgetStatus).toHaveBeenCalledWith(true);
    });
  });

  describe('予算情報の取得と応答', () => {
    test('予算情報が正常に取得できる場合', async () => {
      const mockBudgetInfo = {
        usage: 45.25,
        limit: 100.00,
        percentage: 45.25,
        status: 'ok',
        details: {
          current: 45.25,
          forecast: 65.00
        }
      };
      
      getBudgetStatus.mockResolvedValue(mockBudgetInfo);
      
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      expect(formatResponse).toHaveBeenCalledWith({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        data: {
          budget: mockBudgetInfo,
          timestamp: expect.any(String)
        }
      });
    });
    
    test('timestampがISO形式で生成される', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      const callArgs = formatResponse.mock.calls[0][0];
      const timestamp = callArgs.data.timestamp;
      
      // ISO形式の正規表現でテスト
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // 有効な日付であることを確認
      expect(new Date(timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('エラーハンドリング', () => {
    test('getBudgetStatusでエラーが発生した場合は500エラーを返す', async () => {
      const mockError = new Error('Budget service unavailable');
      getBudgetStatus.mockRejectedValue(mockError);
      
      formatErrorResponse.mockReturnValue({
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Internal server error',
          message: '予算情報の取得に失敗しました',
          details: 'Budget service unavailable'
        })
      });
      
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      const result = await handler(event, {});
      
      expect(console.error).toHaveBeenCalledWith('Error getting budget status:', mockError);
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        message: '予算情報の取得に失敗しました',
        details: 'Budget service unavailable'
      });
      expect(result.statusCode).toBe(500);
    });
    
    test('getBudgetStatusで未知のエラーが発生した場合', async () => {
      const mockError = new Error('Unknown error');
      mockError.code = 'UNKNOWN_ERROR';
      getBudgetStatus.mockRejectedValue(mockError);
      
      formatErrorResponse.mockReturnValue({
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Internal server error',
          message: '予算情報の取得に失敗しました',
          details: 'Unknown error'
        })
      });
      
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      expect(console.error).toHaveBeenCalledWith('Error getting budget status:', mockError);
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        message: '予算情報の取得に失敗しました',
        details: 'Unknown error'
      });
    });
    
    test('getBudgetStatusでタイムアウトエラーが発生した場合', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'TIMEOUT';
      getBudgetStatus.mockRejectedValue(timeoutError);
      
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      expect(console.error).toHaveBeenCalledWith('Error getting budget status:', timeoutError);
      expect(formatErrorResponse).toHaveBeenCalledWith({
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        message: '予算情報の取得に失敗しました',
        details: 'Timeout'
      });
    });
  });

  describe('異なるHTTPメソッド', () => {
    test('POSTリクエストでも認証が機能する', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      expect(getBudgetStatus).toHaveBeenCalledWith(false);
      expect(formatResponse).toHaveBeenCalled();
    });
    
    test('PUTリクエストでも認証が機能する', async () => {
      const event = {
        httpMethod: 'PUT',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: {
          refresh: 'true'
        }
      };
      
      await handler(event, {});
      
      expect(getBudgetStatus).toHaveBeenCalledWith(true);
      expect(formatResponse).toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    test('予算情報がnullの場合も正常に処理される', async () => {
      getBudgetStatus.mockResolvedValue(null);
      
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      expect(formatResponse).toHaveBeenCalledWith({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        data: {
          budget: null,
          timestamp: expect.any(String)
        }
      });
    });
    
    test('予算情報が空オブジェクトの場合も正常に処理される', async () => {
      getBudgetStatus.mockResolvedValue({});
      
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      expect(formatResponse).toHaveBeenCalledWith({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        data: {
          budget: {},
          timestamp: expect.any(String)
        }
      });
    });
    
    test('大きな予算データも正常に処理される', async () => {
      const largeBudgetData = {
        usage: 9999.99,
        limit: 10000.00,
        percentage: 99.99,
        status: 'critical',
        details: {
          services: {
            lambda: 4500.00,
            dynamodb: 3000.00,
            apigateway: 2499.99
          },
          forecast: 11000.00,
          recommendations: [
            'Consider optimizing Lambda functions',
            'Review DynamoDB read/write patterns',
            'Implement caching to reduce API calls'
          ]
        }
      };
      
      getBudgetStatus.mockResolvedValue(largeBudgetData);
      
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'test-admin-api-key'
        },
        queryStringParameters: null
      };
      
      await handler(event, {});
      
      expect(formatResponse).toHaveBeenCalledWith({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        data: {
          budget: largeBudgetData,
          timestamp: expect.any(String)
        }
      });
    });
  });
});
