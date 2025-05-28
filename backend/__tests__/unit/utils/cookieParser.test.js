/**
 * ファイルパス: __tests__/unit/utils/cookieParser.test.js
 * 
 * クッキーパーサーのユニットテスト
 * セッションクッキーの生成と解析機能をテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-15
 */

const { 
  parseCookies, 
  createSessionCookie, 
  createClearSessionCookie 
} = require('../../../src/utils/cookieParser');

describe('Cookie Parser Utils', () => {
  describe('parseCookies', () => {
    test('空のヘッダーからは空のオブジェクトを返す', () => {
      const cookies = parseCookies({});
      expect(cookies).toEqual({});
    });
    
    test('Cookieヘッダーがない場合は空のオブジェクトを返す', () => {
      const cookies = parseCookies({
        'Content-Type': 'application/json'
      });
      expect(cookies).toEqual({});
    });
    
    test('単一のCookieを正しく解析する', () => {
      const cookies = parseCookies({
        Cookie: 'session=abc123'
      });
      expect(cookies).toEqual({
        session: 'abc123'
      });
    });
    
    test('複数のCookieを正しく解析する', () => {
      const cookies = parseCookies({
        Cookie: 'session=abc123; theme=dark; language=ja'
      });
      expect(cookies).toEqual({
        session: 'abc123',
        theme: 'dark',
        language: 'ja'
      });
    });
    
    test('値にセミコロンを含むCookieを正しく解析する', () => {
      const cookies = parseCookies({
        Cookie: 'complex=value;with;semicolons; simple=value'
      });
      expect(cookies).toEqual({
        complex: 'value;with;semicolons',
        simple: 'value'
      });
    });
    
    test('空白を含むCookieを正しくトリミングする', () => {
      const cookies = parseCookies({
        Cookie: ' session=abc123; theme = dark '
      });
      expect(cookies).toEqual({
        session: 'abc123',
        theme: 'dark'
      });
    });
    
    test('値が空のCookieを正しく解析する', () => {
      const cookies = parseCookies({
        Cookie: 'session=; empty='
      });
      expect(cookies).toEqual({
        session: '',
        empty: ''
      });
    });
    
    test('不正な形式のCookieを安全に処理する', () => {
      const cookies = parseCookies({
        Cookie: 'invalidCookie; session=abc123; =missingKey'
      });
      expect(cookies).toEqual({
        session: 'abc123'
      });
    });
  });

  describe('createSessionCookie', () => {
    test('基本的なセッションCookieを生成する', () => {
      const sessionId = 'test-session-123';
      const maxAge = 3600; // 1時間
      
      const cookie = createSessionCookie(sessionId, maxAge);
      
      expect(cookie).toContain(`session=${sessionId}`);
      expect(cookie).toContain(`Max-Age=${maxAge}`);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/');
    });
    
    test('セキュア属性付きのCookieを生成する（本番環境）', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const sessionId = 'test-session-123';
      const maxAge = 3600;
      
      const cookie = createSessionCookie(sessionId, maxAge);
      
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      
      // 環境変数を元に戻す
      process.env.NODE_ENV = originalNodeEnv;
    });
    
    test('maxAgeを指定しない場合、デフォルト値を使用する', () => {
      const sessionId = 'test-session-123';
      const defaultMaxAge = 7 * 24 * 60 * 60; // 7日間（デフォルト値と同期要）
      
      const cookie = createSessionCookie(sessionId);
      
      expect(cookie).toContain(`Max-Age=${defaultMaxAge}`);
    });
    
    test('URLエンコードが必要なセッションIDを正しく処理する', () => {
      const sessionId = 'test=session;with special&chars';
      const maxAge = 3600;
      
      const cookie = createSessionCookie(sessionId, maxAge);
      
      // セッションIDが正しくエンコードされていることを確認
      expect(cookie).not.toContain(`session=${sessionId}`);
      expect(cookie).toContain('session=');
      expect(cookie).not.toContain(';with');
      expect(cookie).not.toContain('&chars');
    });
  });

  describe('createClearSessionCookie', () => {
    test('セッションCookieを削除するためのCookieを生成する', () => {
      const cookie = createClearSessionCookie();
      
      expect(cookie).toContain('session=');
      expect(cookie).toContain('Max-Age=0');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/');
    });
    
    test('本番環境ではセキュア属性を含める', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const cookie = createClearSessionCookie();
      
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
      
      // 環境変数を元に戻す
      process.env.NODE_ENV = originalNodeEnv;
    });
    
    test('開発環境ではセキュア属性を省略することがある', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // 開発環境でのSSL無効化フラグを模擬
      const originalDisableSSL = process.env.DISABLE_SSL;
      process.env.DISABLE_SSL = 'true';
      
      const cookie = createClearSessionCookie();
      
      expect(cookie).not.toContain('Secure');
      
      // 環境変数を元に戻す
      process.env.NODE_ENV = originalNodeEnv;
      process.env.DISABLE_SSL = originalDisableSSL;
    });
  });
});
