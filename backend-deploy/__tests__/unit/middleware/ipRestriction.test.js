/**
 * IP制限ミドルウェアのテスト
 */

jest.mock('../../../src/utils/budgetCheck', () => ({
  addBudgetWarningToResponse: jest.fn(response => response),
  isBudgetWarning: jest.fn(() => false)
}));

const { checkIPRestrictions, getClientIP, isBlacklisted, isAdminWhitelisted } = require('../../../src/middleware/ipRestriction');

describe('IP制限ミドルウェア', () => {
  beforeEach(() => {
    // 環境変数をクリア
    delete process.env.IP_BLACKLIST;
    delete process.env.ADMIN_IP_WHITELIST;
    delete process.env.BLOCKED_COUNTRIES;
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

    test('X-Real-IPヘッダーからIPを取得する', () => {
      const event = {
        headers: {
          'x-real-ip': '198.51.100.1'
        }
      };
      expect(getClientIP(event)).toBe('198.51.100.1');
    });

    test('IP情報がない場合はunknownを返す', () => {
      const event = {
        headers: {}
      };
      expect(getClientIP(event)).toBe('unknown');
    });
  });

  describe('ブラックリスト機能', () => {
    test('デフォルトではブラックリストは空', () => {
      expect(isBlacklisted('192.168.1.1')).toBe(false);
      expect(isBlacklisted('10.0.0.1')).toBe(false);
    });

    test('環境変数でブラックリストを設定できる', () => {
      process.env.IP_BLACKLIST = '192.168.1.100,10.0.0.50';
      
      // モジュールを再ロードしてブラックリストを更新
      jest.resetModules();
      const { isBlacklisted: newIsBlacklisted } = require('../../../src/middleware/ipRestriction');
      
      expect(newIsBlacklisted('192.168.1.100')).toBe(true);
      expect(newIsBlacklisted('10.0.0.50')).toBe(true);
      expect(newIsBlacklisted('192.168.1.1')).toBe(false);
    });
  });

  describe('管理者ホワイトリスト', () => {
    test('デフォルトではlocalhostのみ許可', () => {
      expect(isAdminWhitelisted('127.0.0.1')).toBe(true);
      expect(isAdminWhitelisted('::1')).toBe(true);
      expect(isAdminWhitelisted('192.168.1.1')).toBe(false);
    });
  });

  describe('IP制限チェック', () => {
    test('通常のIPは制限されない', async () => {
      const event = {
        path: '/api/market-data',
        httpMethod: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible browser)'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await checkIPRestrictions(event);
      expect(result).toBeNull(); // 制限なし
    });

    test('管理者エンドポイントはホワイトリストIPのみアクセス可能', async () => {
      const event = {
        path: '/admin/status',
        httpMethod: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible browser)'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await checkIPRestrictions(event);
      expect(result).not.toBeNull();
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error.code).toBe('ADMIN_IP_RESTRICTED');
    });

    test('ローカルホストは管理者エンドポイントにアクセス可能', async () => {
      const event = {
        path: '/admin/status',
        httpMethod: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible browser)'
        },
        requestContext: {
          identity: { sourceIp: '127.0.0.1' }
        }
      };

      const result = await checkIPRestrictions(event);
      expect(result).toBeNull(); // 制限なし
    });

    test('疑わしいUser-Agentは制限される', async () => {
      const event = {
        path: '/api/market-data',
        httpMethod: 'GET',
        headers: {
          'user-agent': 'python-requests/2.25.1'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await checkIPRestrictions(event);
      expect(result).not.toBeNull();
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error.code).toBe('SUSPICIOUS_ACTIVITY');
    });

    test('疑わしいアクティビティチェックを無効化できる', async () => {
      const event = {
        path: '/api/market-data',
        httpMethod: 'GET',
        headers: {
          'user-agent': 'python-requests/2.25.1'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await checkIPRestrictions(event, { checkSuspiciousActivity: false });
      expect(result).toBeNull(); // 制限なし
    });

    test('開発環境での追加制限', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const event = {
        path: '/admin/status',
        httpMethod: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible browser)'
        },
        requestContext: {
          identity: { sourceIp: '192.168.1.1' }
        }
      };

      const result = await checkIPRestrictions(event, { devModeRestrictions: true });
      expect(result).not.toBeNull();
      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body).error.code).toBe('DEV_MODE_RESTRICTION');

      process.env.NODE_ENV = originalEnv;
    });
  });
});