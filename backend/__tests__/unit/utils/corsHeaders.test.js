const {
  getCorsHeaders,
  getCorsOptionsHeaders,
  handleOptionsRequest
} = require('../../../src/utils/corsHeaders');

describe('corsHeaders', () => {
  let originalEnv;
  let originalConsole;

  beforeEach(() => {
    originalEnv = process.env;
    originalConsole = console.log;
    console.log = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsole;
  });

  describe('getCorsHeaders', () => {
    it('should return default production origins when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CORS_ALLOWED_ORIGINS;

      const event = {
        headers: {
          origin: 'https://portfolio-wise.com'
        }
      };

      const result = getCorsHeaders(event);

      expect(result).toEqual({
        'Access-Control-Allow-Origin': 'https://portfolio-wise.com',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
      });
    });

    it('should return default development origins when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.CORS_ALLOWED_ORIGINS;

      const event = {
        headers: {
          origin: 'http://localhost:3000'
        }
      };

      const result = getCorsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    });

    it('should detect production environment from STAGE variable', () => {
      delete process.env.NODE_ENV;
      process.env.STAGE = 'prod';
      delete process.env.CORS_ALLOWED_ORIGINS;

      const event = {
        headers: {
          origin: 'https://portfolio-wise.com'
        }
      };

      const result = getCorsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBe('https://portfolio-wise.com');
    });

    it('should use custom origins from environment variable', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://custom.com,https://another.com';

      const event = {
        headers: {
          origin: 'https://custom.com'
        }
      };

      const result = getCorsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBe('https://custom.com');
    });

    it('should fall back to first allowed origin if request origin is not allowed', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://allowed.com,https://another.com';

      const event = {
        headers: {
          origin: 'https://notallowed.com'
        }
      };

      const result = getCorsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBe('https://allowed.com');
    });

    it('should handle case-insensitive headers (Origin vs origin)', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          Origin: 'https://portfolio-wise.com'  // Capital O
        }
      };

      const result = getCorsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBe('https://portfolio-wise.com');
    });

    it('should handle missing origin header', () => {
      const event = {
        headers: {}
      };

      const result = getCorsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBeTruthy();
      expect(result['Access-Control-Allow-Credentials']).toBe('true');
      expect(result['Content-Type']).toBe('application/json');
    });

    it('should handle missing headers object', () => {
      const event = {};

      const result = getCorsHeaders(event);

      expect(result).toEqual({
        'Access-Control-Allow-Origin': expect.any(String),
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json'
      });
    });

    it('should trim whitespace from allowed origins', () => {
      process.env.CORS_ALLOWED_ORIGINS = ' https://test.com , https://another.com ';

      const event = {
        headers: {
          origin: 'https://test.com'
        }
      };

      const result = getCorsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBe('https://test.com');
    });

    it('should log CORS origin check information', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          origin: 'https://portfolio-wise.com'
        }
      };

      getCorsHeaders(event);

      expect(console.log).toHaveBeenCalledWith('CORS origin check:', {
        requestOrigin: 'https://portfolio-wise.com',
        allowedOrigins: expect.any(Array),
        selectedOrigin: 'https://portfolio-wise.com'
      });
    });
  });

  describe('getCorsOptionsHeaders', () => {
    it('should return extended headers for OPTIONS requests', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const event = {
        headers: {
          origin: 'https://portfolio-wise.com'
        }
      };

      const result = getCorsOptionsHeaders(event);

      expect(result).toEqual({
        'Access-Control-Allow-Origin': 'https://portfolio-wise.com',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,Cookie',
        'Access-Control-Max-Age': '86400'
      });
    });

    it('should inherit base CORS headers', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://custom.com';

      const event = {
        headers: {
          origin: 'https://custom.com'
        }
      };

      const result = getCorsOptionsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBe('https://custom.com');
      expect(result['Access-Control-Allow-Credentials']).toBe('true');
      expect(result['Content-Type']).toBe('application/json');
    });

    it('should include all necessary preflight headers', () => {
      const event = { headers: {} };
      const result = getCorsOptionsHeaders(event);

      expect(result['Access-Control-Allow-Methods']).toBe('GET,POST,PUT,DELETE,OPTIONS');
      expect(result['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(result['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(result['Access-Control-Allow-Headers']).toContain('Cookie');
      expect(result['Access-Control-Max-Age']).toBe('86400');
    });
  });

  describe('handleOptionsRequest', () => {
    it('should return proper response for OPTIONS requests', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const event = {
        httpMethod: 'OPTIONS',
        headers: {
          origin: 'https://portfolio-wise.com'
        }
      };

      const result = handleOptionsRequest(event);

      expect(result).toEqual({
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://portfolio-wise.com',
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,Cookie',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      });
    });

    it('should return null for non-OPTIONS requests', () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          origin: 'https://portfolio-wise.com'
        }
      };

      const result = handleOptionsRequest(event);

      expect(result).toBeNull();
    });

    it('should return null for POST requests', () => {
      const event = {
        httpMethod: 'POST',
        headers: {}
      };

      const result = handleOptionsRequest(event);

      expect(result).toBeNull();
    });

    it('should handle missing httpMethod', () => {
      const event = {
        headers: {}
      };

      const result = handleOptionsRequest(event);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty CORS_ALLOWED_ORIGINS environment variable', () => {
      process.env.CORS_ALLOWED_ORIGINS = '';

      const event = {
        headers: {
          origin: 'https://test.com'
        }
      };

      const result = getCorsHeaders(event);

      // Should fall back to default origins
      expect(result['Access-Control-Allow-Origin']).toBeTruthy();
    });

    it('should handle CORS_ALLOWED_ORIGINS with only whitespace', () => {
      process.env.CORS_ALLOWED_ORIGINS = '   ';
      delete process.env.NODE_ENV;
      delete process.env.STAGE;

      const event = {
        headers: {
          origin: 'https://test.com'
        }
      };

      const result = getCorsHeaders(event);

      // Should fall back to first allowed origin from default (development defaults since isProd is false)
      expect(result['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
    });

    it('should work with single allowed origin in environment', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://single.com';

      const event = {
        headers: {
          origin: 'https://single.com'
        }
      };

      const result = getCorsHeaders(event);

      expect(result['Access-Control-Allow-Origin']).toBe('https://single.com');
    });
  });
});