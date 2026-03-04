/**
 * Refresh Token エンドポイント テスト
 *
 * @file __tests__/unit/function/auth/refreshToken.test.js
 * @created 2026-03-04
 */
'use strict';

const jwt = require('jsonwebtoken');

const TEST_JWT_SECRET = 'test-jwt-secret-for-refresh-token-tests';

// モック設定
jest.mock('../../../../src/utils/secretsManager', () => ({
  getSecret: jest.fn().mockResolvedValue(TEST_JWT_SECRET)
}));

jest.mock('../../../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  critical: jest.fn()
}));

jest.mock('../../../../src/services/googleAuthService', () => ({
  getSession: jest.fn(),
  updateSession: jest.fn().mockResolvedValue({}),
  invalidateSession: jest.fn().mockResolvedValue({})
}));

jest.mock('../../../../src/utils/budgetCheck', () => ({
  isBudgetCritical: jest.fn().mockResolvedValue(false),
  getBudgetWarningMessage: jest.fn().mockResolvedValue(''),
  addBudgetWarningToResponse: jest.fn().mockImplementation(response => response)
}));

jest.mock('../../../../src/utils/corsHeaders', () => ({
  getCorsHeaders: jest.fn().mockReturnValue({
    'Access-Control-Allow-Origin': 'https://portfolio-wise.com',
    'Access-Control-Allow-Credentials': 'true'
  })
}));

jest.mock('../../../../src/utils/securityHeaders', () => ({
  mergeWithSecurityHeaders: jest.fn().mockImplementation(headers => headers),
  getSecurityHeaders: jest.fn().mockReturnValue({})
}));

const { handler } = require('../../../../src/function/auth/refreshToken');
const { getSession, invalidateSession } = require('../../../../src/services/googleAuthService');
const { generateRefreshToken } = require('../../../../src/utils/jwtUtils');

describe('refreshToken handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // jwtUtils のキャッシュをリセット
    const { _resetSecretCache } = require('../../../../src/utils/jwtUtils');
    _resetSecretCache();

    // 環境変数設定
    process.env.CORS_ALLOWED_ORIGINS = 'https://portfolio-wise.com,http://localhost:3000';
  });

  const createEvent = (options = {}) => ({
    httpMethod: options.method || 'POST',
    headers: {
      Cookie: options.cookie || '',
      Origin: options.origin || 'https://portfolio-wise.com',
      ...options.headers
    },
    ...options.extra
  });

  const createValidRefreshToken = async (sub = 'google-123', sessionId = 'session-456') => {
    return generateRefreshToken({ sub, sessionId });
  };

  describe('正常系', () => {
    it('有効なRefresh Tokenから新しいAccess Tokenを発行する', async () => {
      const refreshToken = await createValidRefreshToken();
      const event = createEvent({
        cookie: `refreshToken=${refreshToken}`
      });

      getSession.mockResolvedValue({
        sessionId: 'session-456',
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        driveAccessToken: 'drive-token',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.hasDriveAccess).toBe(true);

      // 新しいRefresh Token Cookieが設定されること（ローテーション）
      const setCookie = result.headers['Set-Cookie'];
      expect(setCookie).toContain('refreshToken=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Secure');
    });
  });

  describe('エラー系', () => {
    it('Refresh Token Cookieがない場合401を返す', async () => {
      const event = createEvent({ cookie: '' });
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.error.code).toBe('NO_REFRESH_TOKEN');
    });

    it('無効なRefresh Tokenの場合401を返す', async () => {
      const event = createEvent({
        cookie: 'refreshToken=invalid.jwt.token'
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('セッションが存在しない場合401を返す', async () => {
      const refreshToken = await createValidRefreshToken();
      const event = createEvent({
        cookie: `refreshToken=${refreshToken}`
      });

      getSession.mockResolvedValue(null);

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('セッションが期限切れの場合401を返す', async () => {
      const refreshToken = await createValidRefreshToken();
      const event = createEvent({
        cookie: `refreshToken=${refreshToken}`
      });

      getSession.mockResolvedValue({
        sessionId: 'session-456',
        googleId: 'google-123',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() - 86400000).toISOString() // 1日前
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.error.code).toBe('SESSION_EXPIRED');
    });

    it('OPTIONSリクエストに200を返す', async () => {
      const event = createEvent({ method: 'OPTIONS' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
    });

    it('POST以外のメソッドに405を返す', async () => {
      const event = createEvent({ method: 'GET' });
      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(405);
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('不正なOriginからのリクエストに403を返す', async () => {
      const refreshToken = await createValidRefreshToken();
      const event = createEvent({
        cookie: `refreshToken=${refreshToken}`,
        origin: 'https://evil-site.com'
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(403);
      expect(body.error.code).toBe('FORBIDDEN_ORIGIN');
    });

    it('Originヘッダーが無い場合403を返す', async () => {
      const refreshToken = await createValidRefreshToken();
      const event = createEvent({
        cookie: `refreshToken=${refreshToken}`,
      });
      // Originヘッダーを削除
      delete event.headers.Origin;

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(403);
      expect(body.error.code).toBe('MISSING_ORIGIN');
    });
  });

  describe('Token Reuse Detection', () => {
    it('旧tokenIdが再利用された場合セッションを無効化する', async () => {
      const refreshToken = await createValidRefreshToken();

      // セッションに別のtokenIdが保存されている（ローテーション済み）
      getSession.mockResolvedValue({
        sessionId: 'session-456',
        googleId: 'google-123',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        currentRefreshTokenId: 'different-token-id-after-rotation'
      });

      const event = createEvent({
        cookie: `refreshToken=${refreshToken}`
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(401);
      expect(body.error.code).toBe('TOKEN_REUSE_DETECTED');
      expect(invalidateSession).toHaveBeenCalledWith('session-456');
    });

    it('currentRefreshTokenIdが未設定の場合スキップして正常処理する', async () => {
      const refreshToken = await createValidRefreshToken();

      // currentRefreshTokenId未設定（初回ログイン直後など）
      getSession.mockResolvedValue({
        sessionId: 'session-456',
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: '',
        driveAccessToken: null,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        currentRefreshTokenId: null
      });

      const event = createEvent({
        cookie: `refreshToken=${refreshToken}`
      });

      const result = await handler(event);
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
    });
  });
});
