/**
 * securityHeaders.jsのテスト
 * セキュリティヘッダー設定のテスト
 */
'use strict';

const { getSecurityHeaders, mergeWithSecurityHeaders } = require('../../../src/utils/securityHeaders');

describe('securityHeaders', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // console.logをモック
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // 環境変数をリセット
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getSecurityHeaders', () => {
    test('デフォルトのセキュリティヘッダーを返す', () => {
      process.env.NODE_ENV = 'development';

      const headers = getSecurityHeaders();

      expect(headers).toEqual({
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Server': 'portfolio-api',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      });
    });

    test('本番環境ではHSTSヘッダーを追加', () => {
      process.env.NODE_ENV = 'production';

      const headers = getSecurityHeaders();

      expect(headers).toHaveProperty('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    });

    test('STAGE=prodでもHSTSヘッダーを追加', () => {
      process.env.NODE_ENV = 'development';
      process.env.STAGE = 'prod';

      const headers = getSecurityHeaders();

      expect(headers).toHaveProperty('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    });

    test('開発環境ではHSTSヘッダーを追加しない', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.STAGE;

      const headers = getSecurityHeaders();

      expect(headers).not.toHaveProperty('Strict-Transport-Security');
    });

    test('テスト環境ではHSTSヘッダーを追加しない', () => {
      process.env.NODE_ENV = 'test';

      const headers = getSecurityHeaders();

      expect(headers).not.toHaveProperty('Strict-Transport-Security');
    });

    test('カスタムCache-Controlオプションを適用', () => {
      process.env.NODE_ENV = 'development';

      const options = {
        cacheControl: 'public, max-age=3600'
      };

      const headers = getSecurityHeaders(options);

      expect(headers['Cache-Control']).toBe('public, max-age=3600');
    });

    test('includeCSP=falseでCSPヘッダーを除外', () => {
      process.env.NODE_ENV = 'development';

      const options = {
        includeCSP: false
      };

      const headers = getSecurityHeaders(options);

      expect(headers).not.toHaveProperty('Content-Security-Policy');
    });

    test('CSPディレクティブが正しく結合される', () => {
      process.env.NODE_ENV = 'development';

      const headers = getSecurityHeaders();

      const expectedCsp = [
        "default-src 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');

      expect(headers['Content-Security-Policy']).toBe(expectedCsp);
    });

    test('空のオプションオブジェクトでも動作する', () => {
      process.env.NODE_ENV = 'development';

      const headers = getSecurityHeaders({});

      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('Content-Security-Policy');
    });

    test('undefinedオプションでも動作する', () => {
      process.env.NODE_ENV = 'development';

      const headers = getSecurityHeaders(undefined);

      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('Content-Security-Policy');
    });

    test('nullオプションでも動作する', () => {
      process.env.NODE_ENV = 'development';

      // nullオプションは{}と同じ扱いになる
      const headers = getSecurityHeaders(null);

      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers['Cache-Control']).toBe('no-store, no-cache, must-revalidate');
    });
  });

  describe('mergeWithSecurityHeaders', () => {
    test('セキュリティヘッダーと既存ヘッダーをマージ', () => {
      process.env.NODE_ENV = 'development';

      const existingHeaders = {
        'Content-Type': 'application/json',
        'Custom-Header': 'custom-value'
      };

      const merged = mergeWithSecurityHeaders(existingHeaders);

      expect(merged).toHaveProperty('X-Frame-Options', 'DENY');
      expect(merged).toHaveProperty('Content-Type', 'application/json');
      expect(merged).toHaveProperty('Custom-Header', 'custom-value');
    });

    test('CORSヘッダーは既存の値を保持', () => {
      process.env.NODE_ENV = 'development';

      const existingHeaders = {
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Credentials': 'false',
        'Access-Control-Allow-Methods': 'GET,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      };

      const merged = mergeWithSecurityHeaders(existingHeaders);

      expect(merged['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(merged['Access-Control-Allow-Credentials']).toBe('false');
      expect(merged['Access-Control-Allow-Methods']).toBe('GET,POST');
      expect(merged['Access-Control-Allow-Headers']).toBe('Content-Type');
    });

    test('セキュリティヘッダーは既存の値を上書きしない', () => {
      process.env.NODE_ENV = 'development';

      const existingHeaders = {
        'X-Frame-Options': 'SAMEORIGIN'
      };

      const merged = mergeWithSecurityHeaders(existingHeaders);

      // セキュリティヘッダーが優先されるべき
      expect(merged['X-Frame-Options']).toBe('DENY');
    });

    test('オプションを渡してセキュリティヘッダーをカスタマイズ', () => {
      process.env.NODE_ENV = 'development';

      const existingHeaders = {
        'Content-Type': 'application/json'
      };

      const options = {
        cacheControl: 'public, max-age=300'
      };

      const merged = mergeWithSecurityHeaders(existingHeaders, options);

      expect(merged['Cache-Control']).toBe('public, max-age=300');
      expect(merged['Content-Type']).toBe('application/json');
    });

    test('空の既存ヘッダーでも動作する', () => {
      process.env.NODE_ENV = 'development';

      const merged = mergeWithSecurityHeaders({});

      expect(merged).toHaveProperty('X-Frame-Options', 'DENY');
      expect(merged).toHaveProperty('X-Content-Type-Options', 'nosniff');
    });

    test('undefinedの既存ヘッダーでも動作する', () => {
      process.env.NODE_ENV = 'development';

      const merged = mergeWithSecurityHeaders(undefined);

      expect(merged).toHaveProperty('X-Frame-Options', 'DENY');
      expect(merged).toHaveProperty('X-Content-Type-Options', 'nosniff');
    });

    test('nullの既存ヘッダーでも動作する', () => {
      process.env.NODE_ENV = 'development';

      // nullの場合は空オブジェクトと同じ扱いになる
      const merged = mergeWithSecurityHeaders(null);

      expect(merged).toHaveProperty('X-Frame-Options', 'DENY');
      expect(merged).toHaveProperty('X-Content-Type-Options', 'nosniff');
    });

    test('複数のCORSヘッダーが同時に保持される', () => {
      process.env.NODE_ENV = 'development';

      const existingHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom'
      };

      const merged = mergeWithSecurityHeaders(existingHeaders);

      // CORSヘッダーは既存の値を保持
      expect(merged['Access-Control-Allow-Origin']).toBe('*');
      expect(merged['Access-Control-Allow-Credentials']).toBe('true');
      expect(merged['Access-Control-Allow-Methods']).toBe('GET,POST,PUT,DELETE');
      expect(merged['Access-Control-Allow-Headers']).toBe('Content-Type,Authorization');
      
      // その他のヘッダーも保持
      expect(merged['Content-Type']).toBe('application/json');
      expect(merged['X-Custom-Header']).toBe('custom');
      
      // セキュリティヘッダーも追加される
      expect(merged['X-Frame-Options']).toBe('DENY');
      expect(merged['X-Content-Type-Options']).toBe('nosniff');
    });

    test('本番環境でのヘッダーマージ', () => {
      process.env.NODE_ENV = 'production';

      const existingHeaders = {
        'Content-Type': 'application/json'
      };

      const merged = mergeWithSecurityHeaders(existingHeaders);

      expect(merged).toHaveProperty('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      expect(merged).toHaveProperty('Content-Type', 'application/json');
    });
  });
});