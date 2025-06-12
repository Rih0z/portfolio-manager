const crypto = require('crypto');
const { generateCSRFToken, validateCSRFToken, csrfMiddleware } = require('../../../src/utils/csrfProtection');

describe('csrfProtection', () => {
  const testSecret = 'test-secret-key';
  const testSessionId = 'test-session-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCSRFToken', () => {
    it('should generate a valid CSRF token', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different session IDs', () => {
      const token1 = generateCSRFToken('session1', testSecret);
      const token2 = generateCSRFToken('session2', testSecret);
      
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for different secrets', () => {
      const token1 = generateCSRFToken(testSessionId, 'secret1');
      const token2 = generateCSRFToken(testSessionId, 'secret2');
      
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens at different times', async () => {
      const token1 = generateCSRFToken(testSessionId, testSecret);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const token2 = generateCSRFToken(testSessionId, testSecret);
      
      expect(token1).not.toBe(token2);
    });

    it('should generate URL-safe base64 tokens', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      
      // URL-safe base64 should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate a recently generated token', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      const isValid = validateCSRFToken(token, testSessionId, testSecret);
      
      expect(isValid).toBe(true);
    });

    it('should reject token with wrong session ID', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      const isValid = validateCSRFToken(token, 'wrong-session', testSecret);
      
      expect(isValid).toBe(false);
    });

    it('should reject token with wrong secret', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      const isValid = validateCSRFToken(token, testSessionId, 'wrong-secret');
      
      expect(isValid).toBe(false);
    });

    it('should reject expired token', () => {
      // Mock Date.now to create an old token
      const originalNow = Date.now;
      const oldTime = 1000000000000; // Very old timestamp
      Date.now = jest.fn(() => oldTime);
      
      const token = generateCSRFToken(testSessionId, testSecret);
      
      // Restore Date.now to current time
      Date.now = originalNow;
      
      const isValid = validateCSRFToken(token, testSessionId, testSecret, 1000); // 1 second max age
      
      expect(isValid).toBe(false);
    });

    it('should accept token within max age', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      const isValid = validateCSRFToken(token, testSessionId, testSecret, 3600000); // 1 hour
      
      expect(isValid).toBe(true);
    });

    it('should handle malformed token', () => {
      // Use a token that will definitely cause a base64url decode error
      const isValid = validateCSRFToken('invalid!!!token', testSessionId, testSecret);
      
      expect(isValid).toBe(false);
      // Note: console.error call depends on internal base64url implementation
    });

    it('should handle token with wrong number of parts', () => {
      // Create a token with wrong structure
      const malformedToken = Buffer.from('session:timestamp').toString('base64url');
      const isValid = validateCSRFToken(malformedToken, testSessionId, testSecret);
      
      expect(isValid).toBe(false);
    });

    it('should handle token with invalid timestamp', () => {
      // Create a token with non-numeric timestamp
      const data = `${testSessionId}:invalid-timestamp:signature`;
      const malformedToken = Buffer.from(data).toString('base64url');
      const isValid = validateCSRFToken(malformedToken, testSessionId, testSecret);
      
      expect(isValid).toBe(false);
    });

    it('should use default max age when not specified', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      const isValid = validateCSRFToken(token, testSessionId, testSecret);
      
      expect(isValid).toBe(true);
    });

    it('should handle empty token', () => {
      const isValid = validateCSRFToken('', testSessionId, testSecret);
      
      expect(isValid).toBe(false);
    });

    it('should handle null token', () => {
      const isValid = validateCSRFToken(null, testSessionId, testSecret);
      
      expect(isValid).toBe(false);
    });
  });

  describe('csrfMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        method: 'POST',
        sessionId: testSessionId,
        headers: {},
        body: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should skip CSRF check for GET requests', () => {
      req.method = 'GET';
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip CSRF check for OPTIONS requests', () => {
      req.method = 'OPTIONS';
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no session is found', () => {
      delete req.sessionId;
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No session found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use session ID from headers when not in req object', () => {
      delete req.sessionId;
      req.headers['x-session-id'] = testSessionId;
      req.headers['x-csrf-token'] = generateCSRFToken(testSessionId, testSecret);
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when CSRF token is missing', () => {
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'CSRF token missing' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid CSRF token from headers', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      req.headers['x-csrf-token'] = token;
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept valid CSRF token from body', () => {
      const token = generateCSRFToken(testSessionId, testSecret);
      req.body.csrfToken = token;
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should prefer header token over body token', () => {
      const validToken = generateCSRFToken(testSessionId, testSecret);
      const invalidToken = 'invalid-token';
      
      req.headers['x-csrf-token'] = validToken;
      req.body.csrfToken = invalidToken;
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for invalid CSRF token', () => {
      req.headers['x-csrf-token'] = 'invalid-token';
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid CSRF token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for token with wrong session ID', () => {
      const token = generateCSRFToken('wrong-session', testSecret);
      req.headers['x-csrf-token'] = token;
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid CSRF token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle PUT requests', () => {
      req.method = 'PUT';
      const token = generateCSRFToken(testSessionId, testSecret);
      req.headers['x-csrf-token'] = token;
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should handle DELETE requests', () => {
      req.method = 'DELETE';
      const token = generateCSRFToken(testSessionId, testSecret);
      req.headers['x-csrf-token'] = token;
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should handle requests with empty body', () => {
      req.body = null;
      const token = generateCSRFToken(testSessionId, testSecret);
      req.headers['x-csrf-token'] = token;
      const middleware = csrfMiddleware(testSecret);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });
});