/**
 * JWT ユーティリティ テスト
 *
 * @file __tests__/unit/utils/jwtUtils.test.js
 * @created 2026-03-04
 */
'use strict';

const jwt = require('jsonwebtoken');

// モック設定
const TEST_JWT_SECRET = 'test-jwt-secret-256bit-long-string-for-testing-purposes-only';

jest.mock('../../../src/utils/secretsManager', () => ({
  getSecret: jest.fn().mockResolvedValue(TEST_JWT_SECRET)
}));

jest.mock('../../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  critical: jest.fn()
}));

const {
  getJwtSecret,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  _resetSecretCache,
  JWT_ALGORITHM,
  JWT_ISSUER
} = require('../../../src/utils/jwtUtils');

const { getSecret } = require('../../../src/utils/secretsManager');

describe('jwtUtils', () => {
  beforeEach(() => {
    _resetSecretCache();
    jest.clearAllMocks();
    getSecret.mockResolvedValue(TEST_JWT_SECRET);
  });

  describe('getJwtSecret', () => {
    it('Secrets Managerから秘密鍵を取得する', async () => {
      const secret = await getJwtSecret();
      expect(secret).toBe(TEST_JWT_SECRET);
      expect(getSecret).toHaveBeenCalledWith('pfwise-api/credentials', 'JWT_SECRET');
    });

    it('キャッシュされた秘密鍵を再利用する', async () => {
      await getJwtSecret();
      await getJwtSecret();
      // 2回目はキャッシュから取得するため、getSecretは1回のみ
      expect(getSecret).toHaveBeenCalledTimes(1);
    });

    it('Secrets Manager失敗時に環境変数にフォールバックする', async () => {
      getSecret.mockRejectedValue(new Error('Secrets Manager unavailable'));
      process.env.JWT_SECRET = 'env-fallback-secret';

      const secret = await getJwtSecret();
      expect(secret).toBe('env-fallback-secret');

      delete process.env.JWT_SECRET;
    });

    it('秘密鍵が取得できない場合エラーをスローする', async () => {
      getSecret.mockRejectedValue(new Error('Secrets Manager unavailable'));
      delete process.env.JWT_SECRET;

      await expect(getJwtSecret()).rejects.toThrow('JWT_SECRET is not available');
    });

    it('Secrets Managerがnullを返した場合エラーをスローする', async () => {
      getSecret.mockResolvedValue(null);
      delete process.env.JWT_SECRET;

      await expect(getJwtSecret()).rejects.toThrow('JWT_SECRET is not available');
    });
  });

  describe('generateAccessToken', () => {
    const testPayload = {
      sub: 'google-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
      sessionId: 'session-uuid-456',
      hasDriveAccess: true
    };

    it('有効なAccess Tokenを生成する', async () => {
      const token = await generateAccessToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWTは3パート

      const decoded = jwt.verify(token, TEST_JWT_SECRET);
      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.name).toBe(testPayload.name);
      expect(decoded.picture).toBe(testPayload.picture);
      expect(decoded.sessionId).toBe(testPayload.sessionId);
      expect(decoded.hasDriveAccess).toBe(true);
      expect(decoded.type).toBe('access');
      expect(decoded.iss).toBe(JWT_ISSUER);
    });

    it('hasDriveAccessがない場合falseがデフォルト', async () => {
      const token = await generateAccessToken({
        sub: 'user-1',
        email: 'test@example.com',
        sessionId: 'sess-1'
      });

      const decoded = jwt.verify(token, TEST_JWT_SECRET);
      expect(decoded.hasDriveAccess).toBe(false);
    });

    it('HS256アルゴリズムで署名される', async () => {
      const token = await generateAccessToken(testPayload);
      const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
      expect(header.alg).toBe(JWT_ALGORITHM);
    });
  });

  describe('generateRefreshToken', () => {
    const testPayload = {
      sub: 'google-user-123',
      sessionId: 'session-uuid-456'
    };

    it('有効なRefresh Tokenを生成する', async () => {
      const token = await generateRefreshToken(testPayload);
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, TEST_JWT_SECRET);
      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.sessionId).toBe(testPayload.sessionId);
      expect(decoded.type).toBe('refresh');
      expect(decoded.tokenId).toBeDefined();
      expect(decoded.iss).toBe(JWT_ISSUER);
    });

    it('毎回異なるtokenIdを生成する', async () => {
      const token1 = await generateRefreshToken(testPayload);
      const token2 = await generateRefreshToken(testPayload);

      const decoded1 = jwt.verify(token1, TEST_JWT_SECRET);
      const decoded2 = jwt.verify(token2, TEST_JWT_SECRET);
      expect(decoded1.tokenId).not.toBe(decoded2.tokenId);
    });
  });

  describe('verifyAccessToken', () => {
    const testPayload = {
      sub: 'google-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
      sessionId: 'session-uuid-456',
      hasDriveAccess: true
    };

    it('有効なAccess Tokenを検証・デコードする', async () => {
      const token = await generateAccessToken(testPayload);
      const decoded = await verifyAccessToken(token);

      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.type).toBe('access');
    });

    it('期限切れトークンでエラーをスローする', async () => {
      const token = jwt.sign(
        { sub: 'user-1', type: 'access', iss: JWT_ISSUER },
        TEST_JWT_SECRET,
        { expiresIn: '0s', algorithm: JWT_ALGORITHM }
      );

      // 少し待って期限切れを確実にする
      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(verifyAccessToken(token)).rejects.toThrow('Access token has expired');
    });

    it('不正な署名のトークンでエラーをスローする', async () => {
      const token = jwt.sign(
        { sub: 'user-1', type: 'access', iss: JWT_ISSUER },
        'wrong-secret',
        { algorithm: JWT_ALGORITHM }
      );

      await expect(verifyAccessToken(token)).rejects.toThrow('Invalid access token');
    });

    it('Refresh Tokenを渡した場合エラーをスローする', async () => {
      const refreshToken = await generateRefreshToken({
        sub: 'user-1',
        sessionId: 'sess-1'
      });

      await expect(verifyAccessToken(refreshToken)).rejects.toThrow('Invalid token type');
    });

    it('不正な文字列でエラーをスローする', async () => {
      await expect(verifyAccessToken('not.a.valid.jwt')).rejects.toThrow('Invalid access token');
    });
  });

  describe('verifyRefreshToken', () => {
    const testPayload = {
      sub: 'google-user-123',
      sessionId: 'session-uuid-456'
    };

    it('有効なRefresh Tokenを検証・デコードする', async () => {
      const token = await generateRefreshToken(testPayload);
      const decoded = await verifyRefreshToken(token);

      expect(decoded.sub).toBe(testPayload.sub);
      expect(decoded.sessionId).toBe(testPayload.sessionId);
      expect(decoded.type).toBe('refresh');
      expect(decoded.tokenId).toBeDefined();
    });

    it('期限切れトークンでエラーをスローする', async () => {
      const token = jwt.sign(
        { sub: 'user-1', type: 'refresh', sessionId: 'sess-1', tokenId: 'tid-1', iss: JWT_ISSUER },
        TEST_JWT_SECRET,
        { expiresIn: '0s', algorithm: JWT_ALGORITHM }
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(verifyRefreshToken(token)).rejects.toThrow('Refresh token has expired');
    });

    it('Access Tokenを渡した場合エラーをスローする', async () => {
      const accessToken = await generateAccessToken({
        sub: 'user-1',
        email: 'test@example.com',
        sessionId: 'sess-1'
      });

      await expect(verifyRefreshToken(accessToken)).rejects.toThrow('Invalid token type');
    });

    it('不正な署名のトークンでエラーをスローする', async () => {
      const token = jwt.sign(
        { sub: 'user-1', type: 'refresh', iss: JWT_ISSUER },
        'wrong-secret',
        { algorithm: JWT_ALGORITHM }
      );

      await expect(verifyRefreshToken(token)).rejects.toThrow('Invalid refresh token');
    });
  });
});
