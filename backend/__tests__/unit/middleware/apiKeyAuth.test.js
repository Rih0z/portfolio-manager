/**
 * APIキー認証ミドルウェアのテスト
 */

jest.mock('../../../src/utils/budgetCheck', () => ({
  addBudgetWarningToResponse: jest.fn(response => response),
  isBudgetWarning: jest.fn(() => false)
}));

const { authenticate, isPublicPath, isAdminPath, getClientIP } = require('../../../src/middleware/apiKeyAuth');
const { getApiKeys } = require('../../../src/utils/secretsManager');

jest.mock('../../../src/utils/secretsManager');
jest.mock('../../../src/services/rateLimitService');

describe('APIキー認証ミドルウェア', () => {
  const mockGetApiKeys = getApiKeys;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApiKeys.mockResolvedValue({
      adminApiKey: 'admin-test-key',
      userApiKey: 'user-test-key'
    });
  });

  describe('パス判定', () => {
    test('パブリックAPIパスを正しく判定する', () => {
      expect(isPublicPath('/api/market-data')).toBe(true);
      expect(isPublicPath('/auth/google/login')).toBe(true);
      expect(isPublicPath('/auth/session')).toBe(true);
      expect(isPublicPath('/admin/status')).toBe(false);
      expect(isPublicPath('/drive/save')).toBe(false);
    });

    test('管理者APIパスを正しく判定する', () => {
      expect(isAdminPath('/admin/status')).toBe(true);
      expect(isAdminPath('/admin/reset')).toBe(true);
      expect(isAdminPath('/admin/getBudgetStatus')).toBe(true);
      expect(isAdminPath('/api/market-data')).toBe(false);
      expect(isAdminPath('/drive/save')).toBe(false);
    });
  });

  describe('クライアントIP取得', () => {
    test('X-Forwarded-ForヘッダーからIPを取得する', () => {
      const event = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      };
      expect(getClientIP(event)).toBe('192.168.1.1');
    });

    test('requestContextからIPを取得する', () => {
      const event = {
        requestContext: {
          identity: {
            sourceIp: '203.0.113.1'
          }
        },
        headers: {}
      };
      expect(getClientIP(event)).toBe('203.0.113.1');
    });

    test('IP情報がない場合はunknownを返す', () => {
      const event = {
        headers: {}
      };
      expect(getClientIP(event)).toBe('unknown');
    });
  });

  describe('認証処理', () => {
    test('パブリックAPIは認証なしでアクセス可能', async () => {
      const event = {
        path: '/api/market-data',
        httpMethod: 'GET',
        headers: {},
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await authenticate(event);
      expect(result).toBeNull(); // 認証成功
    });

    test('管理者APIは管理者APIキーが必要', async () => {
      const event = {
        path: '/admin/status',
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'admin-test-key'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await authenticate(event);
      expect(result).toBeNull(); // 認証成功
    });

    test('管理者APIに無効なAPIキーでアクセスした場合エラーを返す', async () => {
      const event = {
        path: '/admin/status',
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'invalid-key'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await authenticate(event);
      expect(result).not.toBeNull();
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error.code).toBe('INVALID_API_KEY');
    });

    test('管理者APIにAPIキーなしでアクセスした場合エラーを返す', async () => {
      const event = {
        path: '/admin/status',
        httpMethod: 'GET',
        headers: {},
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await authenticate(event);
      expect(result).not.toBeNull();
      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body).error.code).toBe('MISSING_API_KEY');
    });

    test('Google DriveAPIにユーザーAPIキーでアクセス可能', async () => {
      const event = {
        path: '/drive/save',
        httpMethod: 'POST',
        headers: {
          'x-api-key': 'user-test-key'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await authenticate(event);
      expect(result).toBeNull(); // 認証成功
    });

    test('Authorizationヘッダーでも認証可能', async () => {
      const event = {
        path: '/admin/status',
        httpMethod: 'GET',
        headers: {
          'Authorization': 'Bearer admin-test-key'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await authenticate(event);
      expect(result).toBeNull(); // 認証成功
    });

    test('Secrets Manager エラー時は認証エラーを返す', async () => {
      mockGetApiKeys.mockRejectedValue(new Error('Secrets Manager error'));

      const event = {
        path: '/admin/status',
        httpMethod: 'GET',
        headers: {
          'x-api-key': 'some-key'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await authenticate(event);
      expect(result).not.toBeNull();
      expect(result.statusCode).toBe(500);
    });
  });
});