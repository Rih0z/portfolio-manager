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

  /**
   * 日本株データのテスト
   */
  async testJapaneseStockData(symbol) {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
      params: {
        symbols: symbol,
        type: 'jp-stock'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty(symbol);
    
    const stockData = data.data[symbol];
    expect(stockData).toHaveProperty('symbol', symbol);
    expect(stockData).toHaveProperty('currency', 'JPY');
    
    return stockData;
  }

  /**
   * 日本投資信託データのテスト
   */
  async testJapaneseFundData(fundCode) {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
      params: {
        symbols: fundCode,
        type: 'jp-fund'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    
    if (data.data[fundCode]) {
      const fundData = data.data[fundCode];
      expect(fundData).toHaveProperty('symbol', fundCode);
      expect(fundData).toHaveProperty('currency', 'JPY');
      return fundData;
    }
    
    return null;
  }

  /**
   * 複数日本株の一括取得テスト
   */
  async testMultipleJapaneseStocks(symbols) {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
      params: {
        symbols: symbols.join(','),
        type: 'jp-stock'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    
    // 各シンボルのデータを検証
    const results = {};
    symbols.forEach(symbol => {
      if (data.data[symbol]) {
        results[symbol] = data.data[symbol];
      }
    });
    
    return results;
  }

  /**
   * 市場指数データのテスト
   */
  async testJapaneseIndices(indices = ['^N225', '^TPX']) {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
      params: {
        symbols: indices.join(','),
        type: 'jp-index'
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    
    const results = {};
    indices.forEach(index => {
      if (data.data[index]) {
        results[index] = data.data[index];
        // 日本の指数は適切な範囲にあるか確認
        if (index === '^N225') {
          expect(data.data[index].price).toBeGreaterThan(15000);
          expect(data.data[index].price).toBeLessThan(50000);
        }
        if (index === '^TPX') {
          expect(data.data[index].price).toBeGreaterThan(1000);
          expect(data.data[index].price).toBeLessThan(3000);
        }
      }
    });
    
    return results;
  }

  /**
   * 為替レートテスト（円関連）
   */
  async testJPYExchangeRates(baseCurrencies = ['USD', 'EUR', 'GBP']) {
    const pairs = baseCurrencies.map(base => `${base}-JPY`);
    
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
      params: {
        type: 'exchange-rate',
        pairs: pairs.join(',')
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    
    const results = {};
    pairs.forEach(pair => {
      if (data.data[pair]) {
        results[pair] = data.data[pair];
        expect(data.data[pair].rate).toBeGreaterThan(0);
        expect(data.data[pair]).toHaveProperty('lastUpdated');
      }
    });
    
    return results;
  }

  /**
   * 日本市場の営業時間テスト
   */
  async testJapaneseMarketHours() {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-status`, {
      params: {
        market: 'jp'
      }
    });
    
    if (response.status() === 200) {
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(data.data).toHaveProperty('market', 'jp');
      expect(data.data).toHaveProperty('isOpen');
      expect(data.data).toHaveProperty('timezone', 'Asia/Tokyo');
      
      return data.data;
    }
    
    return null;
  }

  /**
   * 日本の祝日データテスト
   */
  async testJapaneseHolidays(year = new Date().getFullYear()) {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-holidays`, {
      params: {
        market: 'jp',
        year: year
      }
    });
    
    if (response.status() === 200) {
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.holidays)).toBe(true);
      
      // 日本の主要祝日が含まれているか確認
      const holidayNames = data.holidays.map(h => h.name.toLowerCase());
      const hasNewYear = holidayNames.some(name => name.includes('new year'));
      const hasGoldenWeek = holidayNames.some(name => 
        name.includes('golden week') || 
        name.includes('constitution day') ||
        name.includes('greenery day') ||
        name.includes('children\'s day')
      );
      
      return {
        holidays: data.holidays,
        hasNewYear,
        hasGoldenWeek,
        total: data.holidays.length
      };
    }
    
    return null;
  }

  /**
   * 投資信託検索APIのテスト
   */
  async testFundSearch(query, limit = 10) {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/search-funds`, {
      params: {
        query: query,
        type: 'jp-fund',
        limit: limit
      }
    });
    
    if (response.status() === 200) {
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.results)).toBe(true);
      
      // 検索結果の検証
      data.results.forEach(fund => {
        expect(fund).toHaveProperty('code');
        expect(fund).toHaveProperty('name');
        expect(fund.name.toLowerCase()).toContain(query.toLowerCase());
      });
      
      return data.results;
    }
    
    return [];
  }

  /**
   * 日本株の価格履歴テスト
   */
  async testJapaneseStockHistory(symbol, period = '1M') {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data/history`, {
      params: {
        symbol: symbol,
        type: 'jp-stock',
        period: period
      }
    });
    
    if (response.status() === 200) {
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.history)).toBe(true);
      
      // 履歴データの検証
      if (data.history.length > 0) {
        const firstRecord = data.history[0];
        expect(firstRecord).toHaveProperty('date');
        expect(firstRecord).toHaveProperty('price');
        expect(firstRecord.price).toBeGreaterThan(0);
      }
      
      return data.history;
    }
    
    return [];
  }

  /**
   * データ品質チェック
   */
  async validateJapaneseMarketDataQuality(symbol, type = 'jp-stock') {
    const response = await this.page.request.get(`${this.apiBaseUrl}/api/market-data`, {
      params: {
        symbols: symbol,
        type: type
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    if (!data.data[symbol] || data.data[symbol].error) {
      return {
        valid: false,
        reason: 'No data or error present'
      };
    }
    
    const stockData = data.data[symbol];
    const issues = [];
    
    // 価格の妥当性チェック
    if (!stockData.price || stockData.price <= 0) {
      issues.push('Invalid price');
    }
    
    // 日本株の価格範囲チェック
    if (type === 'jp-stock' && stockData.price) {
      if (stockData.price < 1 || stockData.price > 1000000) {
        issues.push('Price outside typical Japanese stock range');
      }
    }
    
    // 通貨チェック
    if (stockData.currency !== 'JPY') {
      issues.push('Currency should be JPY for Japanese assets');
    }
    
    // 最終更新時刻チェック
    if (stockData.lastUpdated) {
      const lastUpdated = new Date(stockData.lastUpdated);
      const now = new Date();
      const timeDiff = now - lastUpdated;
      
      // 24時間以上古い場合は警告
      if (timeDiff > 24 * 60 * 60 * 1000) {
        issues.push('Data may be stale (older than 24 hours)');
      }
    }
    
    return {
      valid: issues.length === 0,
      issues: issues,
      data: stockData
    };
  }
}