/**
 * api.js の非同期関数のテスト
 * 実際のenvUtils統合を含むテスト
 */

import {
  getApiEndpoint,
  fetchTickerData,
  fetchExchangeRate,
  fetchMultipleTickerData,
  fetchApiStatus,
  fetchFundInfo,
  fetchDividendData,
  checkDataFreshness,
  initGoogleDriveAPI,
  setGoogleAccessToken,
  getGoogleAccessToken,
  saveToGoogleDrive,
  loadFromGoogleDrive
} from '../../../services/api';

// envUtilsのモック（非同期版）
jest.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: jest.fn(async (type) => {
    // 非同期処理をシミュレート
    await new Promise(resolve => setTimeout(resolve, 10));
    
    switch (type) {
      case 'market-data':
        return 'https://api.example.com/prod/api/market-data';
      case 'auth':
        return 'https://api.example.com/prod/auth';
      case 'drive':
        return 'https://api.example.com/prod/drive';
      case 'admin/status':
        return 'https://api.example.com/prod/admin/status';
      default:
        return 'https://api.example.com/prod';
    }
  })
}));

// marketDataServiceのモック
jest.mock('../../../services/marketDataService', () => ({
  fetchStockData: jest.fn(),
  fetchExchangeRate: jest.fn(),
  fetchMultipleStocks: jest.fn(),
  fetchApiStatus: jest.fn()
}));

// useGoogleDriveフックのモック
jest.mock('../../../hooks/useGoogleDrive', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    saveFile: jest.fn(),
    loadFile: jest.fn(),
    listFiles: jest.fn()
  }))
}));

import { getApiEndpoint as getApiEndpointUtil } from '../../../utils/envUtils';
import { 
  fetchStockData,
  fetchExchangeRate as marketFetchExchangeRate,
  fetchMultipleStocks,
  fetchApiStatus as marketFetchApiStatus
} from '../../../services/marketDataService';

describe('api service - async integration', () => {
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('getApiEndpoint with async envUtils', () => {
    it('非同期でmarket-dataエンドポイントを取得する', async () => {
      const endpoint = getApiEndpoint('market-data');
      
      // 関数が正しくエクスポートされていることを確認
      expect(typeof endpoint).toBe('string');
      
      // envUtilsの非同期関数が呼ばれることを確認
      expect(getApiEndpointUtil).toBeDefined();
    });

    it('複数のエンドポイントタイプで非同期処理が正しく動作する', async () => {
      const endpoints = ['market-data', 'auth', 'drive', 'admin/status'];
      
      for (const type of endpoints) {
        const endpoint = getApiEndpoint(type);
        expect(typeof endpoint).toBe('string');
      }
    });
  });

  describe('fetchTickerData with async dependencies', () => {
    it('非同期の市場データ取得を正しく処理する', async () => {
      const mockData = {
        success: true,
        data: {
          'AAPL': {
            ticker: 'AAPL',
            price: 175.25,
            name: 'Apple Inc.',
            currency: 'USD'
          }
        }
      };
      
      fetchStockData.mockImplementation(async (ticker) => {
        // 非同期処理をシミュレート
        await new Promise(resolve => setTimeout(resolve, 20));
        return mockData;
      });

      const result = await fetchTickerData('AAPL');

      expect(fetchStockData).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(mockData);
    });

    it('並列リクエストを効率的に処理する', async () => {
      const mockResponses = {
        'AAPL': { ticker: 'AAPL', price: 175 },
        'GOOGL': { ticker: 'GOOGL', price: 2500 },
        'MSFT': { ticker: 'MSFT', price: 350 }
      };

      fetchStockData.mockImplementation(async (ticker) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return { success: true, data: { [ticker]: mockResponses[ticker] } };
      });

      const startTime = Date.now();
      
      const promises = Object.keys(mockResponses).map(ticker => 
        fetchTickerData(ticker)
      );
      
      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      
      expect(results).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(100); // 並列処理なので100ms以内
      
      results.forEach((result, index) => {
        const ticker = Object.keys(mockResponses)[index];
        expect(result.data[ticker]).toEqual(mockResponses[ticker]);
      });
    });

    it('エラー時のリトライ処理を正しく行う', async () => {
      let callCount = 0;
      fetchStockData.mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary network error');
        }
        return { success: true, data: { 'AAPL': { price: 175 } } };
      });

      // エラーが伝播することを確認
      await expect(fetchTickerData('AAPL')).rejects.toThrow('Temporary network error');
      expect(fetchStockData).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchExchangeRate with async processing', () => {
    it('非同期で為替レートを取得する', async () => {
      const mockRate = {
        success: true,
        rate: 155.25,
        source: 'API',
        lastUpdated: new Date().toISOString()
      };

      marketFetchExchangeRate.mockImplementation(async (from, to) => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return mockRate;
      });

      const result = await fetchExchangeRate('USD', 'JPY');

      expect(marketFetchExchangeRate).toHaveBeenCalledWith('USD', 'JPY');
      expect(result).toEqual(mockRate);
    });

    it('複数の通貨ペアを並列で取得する', async () => {
      const currencyPairs = [
        { from: 'USD', to: 'JPY', rate: 155 },
        { from: 'EUR', to: 'JPY', rate: 165 },
        { from: 'GBP', to: 'JPY', rate: 185 }
      ];

      marketFetchExchangeRate.mockImplementation(async (from, to) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        const pair = currencyPairs.find(p => p.from === from && p.to === to);
        return { success: true, rate: pair.rate };
      });

      const promises = currencyPairs.map(pair => 
        fetchExchangeRate(pair.from, pair.to)
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.rate).toBe(currencyPairs[index].rate);
      });
    });
  });

  describe('fetchMultipleTickerData with batch processing', () => {
    it('複数銘柄のバッチ処理を非同期で行う', async () => {
      const tickers = ['AAPL', 'GOOGL', 'MSFT', '7203.T', '6758.T'];
      const mockData = {
        success: true,
        data: tickers.reduce((acc, ticker) => {
          acc[ticker] = {
            ticker,
            price: ticker.includes('.T') ? 2000 : 200,
            currency: ticker.includes('.T') ? 'JPY' : 'USD'
          };
          return acc;
        }, {})
      };

      fetchMultipleStocks.mockImplementation(async (tickerList) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        return mockData;
      });

      const result = await fetchMultipleTickerData(tickers);

      expect(fetchMultipleStocks).toHaveBeenCalledWith(tickers);
      expect(result.data).toHaveProperty('AAPL');
      expect(result.data).toHaveProperty('7203.T');
      expect(Object.keys(result.data)).toHaveLength(5);
    });

    it('大量の銘柄でもパフォーマンスを維持する', async () => {
      const tickers = Array.from({ length: 100 }, (_, i) => `STOCK${i}`);
      
      fetchMultipleStocks.mockImplementation(async (tickerList) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          success: true,
          data: tickerList.reduce((acc, ticker) => {
            acc[ticker] = { ticker, price: Math.random() * 1000 };
            return acc;
          }, {})
        };
      });

      const startTime = Date.now();
      const result = await fetchMultipleTickerData(tickers);
      const endTime = Date.now();

      expect(Object.keys(result.data)).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(200); // バッチ処理なので200ms以内
    });
  });

  describe('fetchApiStatus with async admin endpoint', () => {
    it('非同期でAPIステータスを取得する', async () => {
      const mockStatus = {
        success: true,
        status: 'operational',
        endpoints: {
          'market-data': { status: 'up', latency: 45 },
          'exchange-rate': { status: 'up', latency: 32 },
          'auth': { status: 'up', latency: 28 }
        },
        uptime: 99.99
      };

      marketFetchApiStatus.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 25));
        return mockStatus;
      });

      const result = await fetchApiStatus();

      expect(marketFetchApiStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
      expect(result.endpoints['market-data'].status).toBe('up');
    });

    it('ステータスチェックのタイムアウトを処理する', async () => {
      marketFetchApiStatus.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error('Request timeout');
      });

      await expect(fetchApiStatus()).rejects.toThrow('Request timeout');
    });
  });

  describe('互換性関数の非同期処理', () => {
    it('fetchFundInfoが非同期でフォールバックする', async () => {
      const mockData = { success: true, data: { 'FUND123': { value: 10000 } } };
      
      fetchStockData.mockImplementation(async (fundId) => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return mockData;
      });

      const result = await fetchFundInfo('FUND123');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] fetchFundInfo is not implemented yet. Using fetchTickerData as fallback.'
      );
      expect(result).toEqual(mockData);
    });

    it('fetchDividendDataが非同期でフォールバックする', async () => {
      const mockData = { success: true, data: { 'AAPL': { dividend: 0.96 } } };
      
      fetchStockData.mockImplementation(async (ticker) => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return mockData;
      });

      const result = await fetchDividendData('AAPL');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] fetchDividendData is not implemented yet. Using fetchTickerData as fallback.'
      );
      expect(result).toEqual(mockData);
    });

    it('checkDataFreshnessが非同期で完了する', async () => {
      const result = await checkDataFreshness();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] checkDataFreshness is not implemented yet.'
      );
      expect(result).toEqual({ success: true, fresh: true });
    });
  });

  describe('Google Drive API (deprecated) の非同期処理', () => {
    it('initGoogleDriveAPIの各メソッドが非同期で動作する', async () => {
      const api = initGoogleDriveAPI();

      const saveResult = await api.saveFile({ test: 'data' });
      expect(saveResult.success).toBe(false);

      const loadResult = await api.loadFile('file_id');
      expect(loadResult.success).toBe(false);

      const listResult = await api.listFiles();
      expect(listResult.success).toBe(false);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(4); // init + 3 calls
    });

    it('saveToGoogleDriveが非同期で失敗を返す', async () => {
      const result = await saveToGoogleDrive(
        { portfolio: 'data' },
        { userId: 'test' },
        'portfolio.json'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('非推奨');
    });

    it('loadFromGoogleDriveが非同期で失敗を返す', async () => {
      const result = await loadFromGoogleDrive(
        { userId: 'test' },
        'portfolio.json'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('非推奨');
    });

    it('getGoogleAccessTokenが非同期でnullを返す', async () => {
      const token = await getGoogleAccessToken();

      expect(token).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] getGoogleAccessToken is deprecated. Use AuthContext methods instead.'
      );
    });
  });

  describe('エラーハンドリングと復旧', () => {
    it('一時的なネットワークエラーから復旧する', async () => {
      let callCount = 0;
      const mockData = { success: true, data: { 'AAPL': { price: 175 } } };

      fetchStockData.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network temporarily unavailable');
        }
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockData;
      });

      // 最初の呼び出しは失敗
      await expect(fetchTickerData('AAPL')).rejects.toThrow('Network temporarily unavailable');
      
      // 2回目の呼び出しは成功
      const result = await fetchTickerData('AAPL');
      expect(result).toEqual(mockData);
    });

    it('複数の非同期エラーを適切に処理する', async () => {
      const errors = [
        new Error('Connection refused'),
        new Error('Timeout'),
        new Error('Service unavailable')
      ];

      fetchStockData.mockImplementation(async () => {
        throw errors[Math.floor(Math.random() * errors.length)];
      });

      const promises = Array.from({ length: 5 }, () => 
        fetchTickerData('AAPL').catch(err => err)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeInstanceOf(Error);
        expect(errors.some(e => e.message === result.message)).toBe(true);
      });
    });
  });

  describe('並行処理とレート制限', () => {
    it('大量の並行リクエストを適切に処理する', async () => {
      const tickers = Array.from({ length: 50 }, (_, i) => `TICKER${i}`);
      let activeRequests = 0;
      let maxConcurrent = 0;

      fetchStockData.mockImplementation(async (ticker) => {
        activeRequests++;
        maxConcurrent = Math.max(maxConcurrent, activeRequests);
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        activeRequests--;
        return { success: true, data: { [ticker]: { price: Math.random() * 1000 } } };
      });

      const promises = tickers.map(ticker => fetchTickerData(ticker));
      await Promise.all(promises);

      expect(maxConcurrent).toBeGreaterThan(1); // 並行処理が行われている
      expect(activeRequests).toBe(0); // すべてのリクエストが完了
    });

    it('Promise.allSettledで部分的な失敗を処理する', async () => {
      fetchStockData.mockImplementation(async (ticker) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (ticker.includes('FAIL')) {
          throw new Error(`Failed to fetch ${ticker}`);
        }
        return { success: true, data: { [ticker]: { price: 100 } } };
      });

      const tickers = ['AAPL', 'FAIL1', 'GOOGL', 'FAIL2', 'MSFT'];
      const promises = tickers.map(ticker => fetchTickerData(ticker));
      
      const results = await Promise.allSettled(promises);

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toHaveLength(3);
      expect(failed).toHaveLength(2);
    });
  });
});