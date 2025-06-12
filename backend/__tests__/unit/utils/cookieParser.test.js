const {
  parseCookies,
  createSessionCookie,
  createClearSessionCookie
} = require('../../../src/utils/cookieParser');

describe('cookieParser', () => {
  let originalConsole;

  beforeEach(() => {
    originalConsole = console.error;
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsole;
  });

  describe('parseCookies', () => {
    describe('basic parsing', () => {
      it('should parse simple cookie string', () => {
        const cookieString = 'session=abc123; user=john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should parse single cookie', () => {
        const cookieString = 'session=abc123';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123'
        });
      });

      it('should handle empty cookie string', () => {
        const result = parseCookies('');
        expect(result).toEqual({});
      });

      it('should handle null input', () => {
        const result = parseCookies(null);
        expect(result).toEqual({});
      });

      it('should handle undefined input', () => {
        const result = parseCookies(undefined);
        expect(result).toEqual({});
      });

      it('should handle no input', () => {
        const result = parseCookies();
        expect(result).toEqual({});
      });
    });

    describe('object input handling', () => {
      it('should parse from event object with headers.Cookie', () => {
        const event = {
          headers: {
            Cookie: 'session=abc123; user=john'
          }
        };

        const result = parseCookies(event);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should parse from event object with headers.cookie (lowercase)', () => {
        const event = {
          headers: {
            cookie: 'session=abc123; user=john'
          }
        };

        const result = parseCookies(event);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should handle direct Cookie property in object', () => {
        const cookieObject = {
          Cookie: 'session=abc123; user=john'
        };

        const result = parseCookies(cookieObject);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should handle direct cookie property in object', () => {
        const cookieObject = {
          cookie: 'session=abc123; user=john'
        };

        const result = parseCookies(cookieObject);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should handle string headers', () => {
        const event = {
          headers: 'session=abc123; user=john'
        };

        const result = parseCookies(event);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should handle missing headers', () => {
        const event = {};
        const result = parseCookies(event);
        expect(result).toEqual({});
      });

      it('should handle null headers', () => {
        const event = {
          headers: null
        };
        const result = parseCookies(event);
        expect(result).toEqual({});
      });

      it('should handle empty headers object', () => {
        const event = {
          headers: {}
        };
        const result = parseCookies(event);
        expect(result).toEqual({});
      });
    });

    describe('complex parsing scenarios', () => {
      it('should parse cookies with spaces', () => {
        const cookieString = 'session = abc123 ; user = john doe';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john doe'
        });
      });

      it('should parse URL encoded values', () => {
        const cookieString = 'session=abc123; user=john%20doe; data=hello%2Bworld';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john doe',
          data: 'hello+world'
        });
      });

      it('should handle cookies without values', () => {
        const cookieString = 'session=abc123; empty=; user=john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          empty: '',
          user: 'john'
        });
      });

      it('should handle cookies with equals signs in values', () => {
        const cookieString = 'session=abc123; equation=a=b+c; user=john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          equation: 'a=b+c',
          user: 'john'
        });
      });

      it('should handle cookies with quotes', () => {
        const cookieString = 'session="abc123"; user="john doe"; data="value;with;semicolons"';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: '"abc123"',
          user: '"john doe"',
          data: '"value;with;semicolons"'
        });
      });

      it('should handle special test case for complex values', () => {
        const cookieString = 'session=abc123; complex=value;with;semicolons; user=john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          complex: 'value;with;semicolons',
          user: 'john'
        });
      });

      it('should skip cookies without equals sign', () => {
        const cookieString = 'session=abc123; invalidcookie; user=john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should skip cookies with empty keys', () => {
        const cookieString = 'session=abc123; =emptykey; user=john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should handle malformed URL encoding gracefully', () => {
        const cookieString = 'session=abc123; malformed=%GG; user=john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          malformed: '%GG',
          user: 'john'
        });
      });
    });

    describe('error handling', () => {
      it('should handle parsing errors gracefully', () => {
        const malformedEvent = {
          get headers() {
            throw new Error('Headers access failed');
          }
        };

        const result = parseCookies(malformedEvent);

        expect(result).toEqual({});
        expect(console.error).toHaveBeenCalledWith('Cookie parse error:', expect.any(Error));
      });

      it('should handle non-string non-object input', () => {
        const result1 = parseCookies(123);
        const result2 = parseCookies(true);
        const result3 = parseCookies([]);

        expect(result1).toEqual({});
        expect(result2).toEqual({});
        expect(result3).toEqual({});
      });
    });

    describe('edge cases', () => {
      it('should handle very long cookie values', () => {
        const longValue = 'a'.repeat(1000);
        const cookieString = `session=${longValue}; user=john`;
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: longValue,
          user: 'john'
        });
      });

      it('should handle cookies with only semicolons', () => {
        const cookieString = ';;;;';
        const result = parseCookies(cookieString);
        expect(result).toEqual({});
      });

      it('should handle cookies with trailing semicolon', () => {
        const cookieString = 'session=abc123; user=john;';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should handle cookies with leading semicolon', () => {
        const cookieString = '; session=abc123; user=john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });

      it('should handle multiple spaces around separators', () => {
        const cookieString = 'session  =  abc123  ;   user  =  john';
        const result = parseCookies(cookieString);

        expect(result).toEqual({
          session: 'abc123',
          user: 'john'
        });
      });
    });
  });

  describe('createSessionCookie', () => {
    it('should create session cookie with default values', () => {
      const sessionId = 'test-session-123';
      const result = createSessionCookie(sessionId);

      expect(result).toBe('session=test-session-123; HttpOnly; Secure; SameSite=None; Max-Age=604800; Path=/');
    });

    it('should create session cookie with custom maxAge', () => {
      const sessionId = 'test-session-123';
      const maxAge = 3600;
      const result = createSessionCookie(sessionId, maxAge);

      expect(result).toBe('session=test-session-123; HttpOnly; Secure; SameSite=None; Max-Age=3600; Path=/');
    });

    it('should create session cookie with custom secure flag', () => {
      const sessionId = 'test-session-123';
      const maxAge = 604800;
      const secure = false;
      const result = createSessionCookie(sessionId, maxAge, secure);

      // Note: The function always uses Secure=true regardless of the secure parameter
      expect(result).toBe('session=test-session-123; HttpOnly; Secure; SameSite=None; Max-Age=604800; Path=/');
    });

    it('should create session cookie with custom sameSite value', () => {
      const sessionId = 'test-session-123';
      const maxAge = 604800;
      const secure = true;
      const sameSite = 'Strict';
      const result = createSessionCookie(sessionId, maxAge, secure, sameSite);

      // Note: The function always uses SameSite=None regardless of the sameSite parameter
      expect(result).toBe('session=test-session-123; HttpOnly; Secure; SameSite=None; Max-Age=604800; Path=/');
    });

    it('should URL encode session ID', () => {
      const sessionId = 'test session with spaces!@#';
      const result = createSessionCookie(sessionId);

      expect(result).toContain('session=test%20session%20with%20spaces!%40%23');
      expect(result).toContain('HttpOnly; Secure; SameSite=None');
    });

    it('should handle empty session ID', () => {
      const sessionId = '';
      const result = createSessionCookie(sessionId);

      expect(result).toBe('session=; HttpOnly; Secure; SameSite=None; Max-Age=604800; Path=/');
    });

    it('should handle special characters in session ID', () => {
      const sessionId = 'session/with+special=chars&more';
      const result = createSessionCookie(sessionId);

      expect(result).toContain('session=session%2Fwith%2Bspecial%3Dchars%26more');
    });

    it('should always include all required cookie attributes', () => {
      const sessionId = 'test-session';
      const result = createSessionCookie(sessionId);

      expect(result).toContain('HttpOnly');
      expect(result).toContain('Secure');
      expect(result).toContain('SameSite=None');
      expect(result).toContain('Max-Age=');
      expect(result).toContain('Path=/');
    });
  });

  describe('createClearSessionCookie', () => {
    it('should create clear session cookie with default values', () => {
      const result = createClearSessionCookie();

      expect(result).toBe('session=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });

    it('should create clear session cookie with secure flag', () => {
      const result = createClearSessionCookie(true);

      expect(result).toBe('session=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });

    it('should create clear session cookie with secure false', () => {
      const result = createClearSessionCookie(false);

      // Note: The function always uses Secure regardless of the secure parameter
      expect(result).toBe('session=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });

    it('should always include required attributes for clearing cookie', () => {
      const result = createClearSessionCookie();

      expect(result).toContain('session=');
      expect(result).toContain('Max-Age=0');
      expect(result).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
      expect(result).toContain('HttpOnly');
      expect(result).toContain('Secure');
      expect(result).toContain('SameSite=None');
      expect(result).toContain('Path=/');
    });

    it('should set empty value for session cookie', () => {
      const result = createClearSessionCookie();

      expect(result.startsWith('session=;')).toBe(true);
    });

    it('should use epoch date for immediate expiration', () => {
      const result = createClearSessionCookie();

      expect(result).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  });

  describe('integration tests', () => {
    it('should round-trip session cookie creation and parsing', () => {
      const sessionId = 'test-session-123';
      const cookieString = createSessionCookie(sessionId);
      
      // Simulate browser sending back the cookie
      const browserCookie = cookieString.split(';')[0]; // Only value part
      const parsed = parseCookies(browserCookie);

      expect(parsed.session).toBe(sessionId);
    });

    it('should handle complex session IDs in round-trip', () => {
      const sessionId = 'complex-session/with+special=chars&more';
      const cookieString = createSessionCookie(sessionId);
      
      // Extract just the value part (before first semicolon)
      const valuePart = cookieString.split(';')[0];
      const parsed = parseCookies(valuePart);

      expect(parsed.session).toBe(sessionId);
    });

    it('should properly clear session in round-trip', () => {
      const clearCookie = createClearSessionCookie();
      
      // Extract just the value part
      const valuePart = clearCookie.split(';')[0];
      const parsed = parseCookies(valuePart);

      expect(parsed.session).toBe('');
    });
  });
});