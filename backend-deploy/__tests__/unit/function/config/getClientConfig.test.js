const { handler } = require('../../../../src/function/config/getClientConfig');

describe('getClientConfig', () => {
  let mockEvent;

  beforeEach(() => {
    mockEvent = {
      headers: {
        origin: 'http://localhost:3000'
      },
      httpMethod: 'GET'
    };
  });

  describe('GET /config/client', () => {
    it('should return client configuration successfully', async () => {
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe('true');
      
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        apiVersion: '1.0.0',
        features: {
          googleAuth: true,
          marketData: true,
          portfolioManagement: true
        },
        limits: {
          maxFileSize: 10 * 1024 * 1024,
          maxPortfolioItems: 1000
        },
        supportedMarkets: ['us-stock', 'jp-stock', 'mutual-fund', 'exchange-rate'],
        cacheTime: {
          marketData: 3600,
          portfolioData: 300
        }
      });
    });

    it('should handle OPTIONS request for CORS', async () => {
      mockEvent.httpMethod = 'OPTIONS';
      
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Methods']).toBe('GET,POST,PUT,DELETE,OPTIONS');
      expect(result.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
      expect(result.body).toBe('');
    });

    it('should handle different origins correctly', async () => {
      mockEvent.headers.origin = 'https://portfolio-wise.com';
      
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBe('https://portfolio-wise.com');
    });

    it('should handle unknown origins', async () => {
      mockEvent.headers.origin = 'https://unknown-domain.com';
      
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      // Should default to first allowed origin
      expect(result.headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001');
    });

    it('should handle missing origin header', async () => {
      delete mockEvent.headers.origin;
      
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBeDefined();
    });
  });
});