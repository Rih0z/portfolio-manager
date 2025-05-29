import { expect } from '@playwright/test';

/**
 * AWS統合テストヘルパー
 */
export class AWSIntegrationHelper {
  constructor(page) {
    this.page = page;
    this.apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
  }

  /**
   * APIヘルスチェック
   */
  async checkAPIHealth() {
    const response = await this.page.request.get(`${this.apiBaseUrl}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    
    return data;
  }

  /**
   * 認証状態の確認
   */
  async checkAuthStatus() {
    const response = await this.page.request.get(`${this.apiBaseUrl}/auth/status`, {
      headers: {
        'Cookie': await this.page.context().cookies()
          .then(cookies => cookies.map(c => `${c.name}=${c.value}`).join('; '))
      }
    });
    
    return {
      status: response.status(),
      data: await response.json()
    };
  }

  /**
   * マーケットデータAPIのテスト
   */
  async testMarketDataAPI(symbol) {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
      params: {
        symbols: symbol,
        type: 'us-stock'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty(symbol);
    
    const stockData = data.data[symbol];
    expect(stockData).toHaveProperty('symbol', symbol);
    expect(stockData).toHaveProperty('price');
    expect(stockData).toHaveProperty('currency');
    
    return stockData;
  }

  /**
   * レート制限の確認
   */
  async testRateLimit() {
    const requests = [];
    
    // 10回連続でリクエスト
    for (let i = 0; i < 10; i++) {
      requests.push(
        this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
          params: { symbols: 'AAPL', type: 'us-stock' }
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status());
    
    // 429 (Too Many Requests) が含まれているか確認
    const rateLimited = statusCodes.filter(code => code === 429);
    
    return {
      totalRequests: requests.length,
      successfulRequests: statusCodes.filter(code => code === 200).length,
      rateLimitedRequests: rateLimited.length,
      hasRateLimit: rateLimited.length > 0
    };
  }

  /**
   * セッション管理のテスト
   */
  async testSessionManagement() {
    // 現在のクッキーを取得
    const cookies = await this.page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'sessionId' || c.name === 'connect.sid');
    
    if (sessionCookie) {
      // セッション情報を取得
      const response = await this.page.request.get(`${this.apiBaseUrl}/auth/session`, {
        headers: {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        }
      });
      
      return {
        hasSession: true,
        sessionValid: response.status() === 200,
        sessionData: response.status() === 200 ? await response.json() : null
      };
    }
    
    return {
      hasSession: false,
      sessionValid: false,
      sessionData: null
    };
  }

  /**
   * Google Drive統合のテスト
   */
  async testGoogleDriveIntegration(authToken) {
    const response = await this.page.request.get(`${this.apiBaseUrl}/drive/list`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.status() === 401) {
      return { authorized: false, message: 'Google Drive authorization required' };
    }
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    return {
      authorized: true,
      files: data.files || [],
      hasAccess: data.success || false
    };
  }

  /**
   * エラーハンドリングのテスト
   */
  async testErrorHandling() {
    // 無効なシンボルでテスト
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
      params: {
        symbols: 'INVALID_SYMBOL_12345',
        type: 'us-stock'
      }
    });
    
    expect(response.status()).toBe(200); // エラーでも200を返す（フォールバックデータ）
    const data = await response.json();
    
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    
    // エラー情報の確認
    if (data.data.INVALID_SYMBOL_12345) {
      const errorData = data.data.INVALID_SYMBOL_12345;
      expect(errorData).toHaveProperty('error');
    }
    
    return data;
  }

  /**
   * CORS設定のテスト
   */
  async testCORSConfiguration() {
    const response = await this.page.request.fetch(`${this.apiBaseUrl}/api/market-data`, {
      method: 'OPTIONS'
    });
    
    const headers = response.headers();
    
    return {
      allowOrigin: headers['access-control-allow-origin'],
      allowMethods: headers['access-control-allow-methods'],
      allowHeaders: headers['access-control-allow-headers'],
      allowCredentials: headers['access-control-allow-credentials']
    };
  }
}