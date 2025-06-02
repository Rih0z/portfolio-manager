/**
 * marketDataService.js のユニットテスト
 * 市場データ取得サービスのテスト
 */

import {
  fetchStockPrice,
  fetchMultipleStocks,
  fetchExchangeRate,
  retryFetch,
  createRequestKey
} from '../../../services/marketDataService';

// axiosのモック
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios;

// configServiceのモック
jest.mock('../../../services/configService', () => ({
  getApiConfig: jest.fn().mockResolvedValue({
    REACT_APP_API_BASE_URL: 'https://mock-api.com',
    endpoints: {
      stockPrice: '/api/stock/{ticker}',
      batchStocks: '/api/stocks/batch',
      exchangeRate: '/api/exchange-rate'
    }
  })
}));

describe('marketDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createRequestKey', () => {
    it('ティッカーから一意のキーを生成する', () => {
      expect(createRequestKey('AAPL')).toBe('AAPL');
      expect(createRequestKey('GOOGL')).toBe('GOOGL');
    });

    it('空のティッカーでも動作する', () => {
      expect(createRequestKey('')).toBe('');
      expect(createRequestKey(null)).toBe('null');
      expect(createRequestKey(undefined)).toBe('undefined');
    });
  });

  describe('retryFetch', () => {
    it('成功した関数をそのまま実行する', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await retryFetch(mockFn, 3, 100);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('失敗した関数をリトライする', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const promise = retryFetch(mockFn, 2, 100);
      
      // 最初の実行は即座に失敗
      await jest.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // 100ms後にリトライ
      await jest.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('最大リトライ回数を超えた場合はエラーを投げる', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('persistent error'));
      
      const promise = retryFetch(mockFn, 2, 50);
      
      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(50);
      await jest.advanceTimersByTimeAsync(50);
      
      await expect(promise).rejects.toThrow('persistent error');
      expect(mockFn).toHaveBeenCalledTimes(3); // 初回 + 2回リトライ
    });
  });

  describe('fetchStockPrice', () => {
    it('正常にストック価格を取得する', async () => {
      const mockResponse = {
        data: {
          ticker: 'AAPL',
          price: 150.25,
          currency: 'USD',
          lastUpdated: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      const result = await fetchStockPrice('AAPL');
      
      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://mock-api.com/api/stock/AAPL',
        expect.objectContaining({
          withCredentials: true,
          timeout: 10000
        })
      );
    });

    it('API設定取得失敗時はエラーを投げる', async () => {
      const { getApiConfig } = require('../../../services/configService');
      getApiConfig.mockRejectedValue(new Error('Config error'));
      
      await expect(fetchStockPrice('AAPL')).rejects.toThrow('Config error');
    });

    it('ネットワークエラー時は適切なエラーメッセージを返す', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));
      
      await expect(fetchStockPrice('AAPL')).rejects.toThrow('Network Error');
    });

    it('空のティッカーでもエラーを投げない', async () => {
      const mockResponse = {
        data: {
          ticker: '',
          price: 0,
          currency: 'USD',
          lastUpdated: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      const result = await fetchStockPrice('');
      expect(result).toEqual(mockResponse.data);
    });

    it('日本株のティッカーを正しく処理する', async () => {
      const mockResponse = {
        data: {
          ticker: '7203.T',
          price: 2500,
          currency: 'JPY',
          lastUpdated: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      const result = await fetchStockPrice('7203.T');
      
      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://mock-api.com/api/stock/7203.T',
        expect.any(Object)
      );
    });
  });

  describe('fetchMultipleStocks', () => {
    it('複数のストック価格を一括取得する', async () => {
      const mockResponse = {
        data: {
          stocks: [
            {
              ticker: 'AAPL',
              price: 150.25,
              currency: 'USD',
              lastUpdated: '2024-01-01T00:00:00Z',
              source: 'test'
            },
            {
              ticker: 'GOOGL',
              price: 2800.50,
              currency: 'USD',
              lastUpdated: '2024-01-01T00:00:00Z',
              source: 'test'
            }
          ]
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockResponse);
      
      const result = await fetchMultipleStocks(['AAPL', 'GOOGL']);
      
      expect(result).toEqual(mockResponse.data.stocks);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://mock-api.com/api/stocks/batch',
        { tickers: ['AAPL', 'GOOGL'] },
        expect.objectContaining({
          withCredentials: true,
          timeout: 15000
        })
      );
    });

    it('空の配列を渡した場合は空の配列を返す', async () => {
      const result = await fetchMultipleStocks([]);
      expect(result).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('nullまたはundefinedを渡した場合は空の配列を返す', async () => {
      const result1 = await fetchMultipleStocks(null);
      const result2 = await fetchMultipleStocks(undefined);
      
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('重複するティッカーを除去する', async () => {
      const mockResponse = {
        data: {
          stocks: [
            {
              ticker: 'AAPL',
              price: 150.25,
              currency: 'USD',
              lastUpdated: '2024-01-01T00:00:00Z',
              source: 'test'
            }
          ]
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockResponse);
      
      const result = await fetchMultipleStocks(['AAPL', 'AAPL', 'AAPL']);
      
      expect(result).toEqual(mockResponse.data.stocks);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://mock-api.com/api/stocks/batch',
        { tickers: ['AAPL'] },
        expect.any(Object)
      );
    });

    it('APIエラー時は適切なエラーメッセージを返す', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));
      
      await expect(fetchMultipleStocks(['AAPL', 'GOOGL'])).rejects.toThrow('API Error');
    });
  });

  describe('fetchExchangeRate', () => {
    it('正常に為替レートを取得する', async () => {
      const mockResponse = {
        data: {
          from: 'USD',
          to: 'JPY',
          rate: 150.25,
          lastUpdated: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      const result = await fetchExchangeRate('USD', 'JPY');
      
      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://mock-api.com/api/exchange-rate',
        expect.objectContaining({
          params: { from: 'USD', to: 'JPY' },
          withCredentials: true,
          timeout: 10000
        })
      );
    });

    it('同じ通貨ペアではレート1を返す', async () => {
      const result = await fetchExchangeRate('USD', 'USD');
      
      expect(result).toEqual({
        from: 'USD',
        to: 'USD',
        rate: 1,
        lastUpdated: expect.any(String),
        source: 'same_currency'
      });
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('無効な通貨コードでもエラーを投げない', async () => {
      const mockResponse = {
        data: {
          from: 'INVALID',
          to: 'JPY',
          rate: 1,
          lastUpdated: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      const result = await fetchExchangeRate('INVALID', 'JPY');
      expect(result).toEqual(mockResponse.data);
    });

    it('APIエラー時はエラーを投げる', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Exchange rate API error'));
      
      await expect(fetchExchangeRate('USD', 'JPY')).rejects.toThrow('Exchange rate API error');
    });

    it('デフォルト通貨ペア (USD to JPY) を正しく処理する', async () => {
      const mockResponse = {
        data: {
          from: 'USD',
          to: 'JPY',
          rate: 150.25,
          lastUpdated: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      const result = await fetchExchangeRate();
      
      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://mock-api.com/api/exchange-rate',
        expect.objectContaining({
          params: { from: 'USD', to: 'JPY' }
        })
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('タイムアウトエラーを正しく処理する', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);
      
      await expect(fetchStockPrice('AAPL')).rejects.toThrow('timeout');
    });

    it('ネットワークエラーを正しく処理する', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';
      mockedAxios.get.mockRejectedValue(networkError);
      
      await expect(fetchStockPrice('AAPL')).rejects.toThrow('Network Error');
    });

    it('HTTPステータスエラーを正しく処理する', async () => {
      const httpError = new Error('Request failed with status code 404');
      httpError.response = { status: 404, statusText: 'Not Found' };
      mockedAxios.get.mockRejectedValue(httpError);
      
      await expect(fetchStockPrice('INVALID')).rejects.toThrow('Request failed with status code 404');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のリクエストを効率的に処理する', async () => {
      const tickers = Array.from({ length: 100 }, (_, i) => `STOCK${i}`);
      const mockResponse = {
        data: {
          stocks: tickers.map((ticker, i) => ({
            ticker,
            price: i + 100,
            currency: 'USD',
            lastUpdated: '2024-01-01T00:00:00Z',
            source: 'test'
          }))
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockResponse);
      
      const startTime = Date.now();
      const result = await fetchMultipleStocks(tickers);
      const endTime = Date.now();
      
      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('並行リクエストが競合状態を起こさない', async () => {
      const mockResponse = {
        data: {
          ticker: 'AAPL',
          price: 150.25,
          currency: 'USD',
          lastUpdated: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      const promises = Array.from({ length: 10 }, () => 
        fetchStockPrice('AAPL')
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual(mockResponse.data);
      });
    });
  });

  describe('キャッシュとリクエスト重複排除', () => {
    it('同じティッカーの複数リクエストを重複排除する', async () => {
      const mockResponse = {
        data: {
          ticker: 'AAPL',
          price: 150.25,
          currency: 'USD',
          lastUpdated: '2024-01-01T00:00:00Z',
          source: 'test'
        }
      };
      
      mockedAxios.get.mockResolvedValue(mockResponse);
      
      // 同時に複数のリクエストを送信
      const promises = [
        fetchStockPrice('AAPL'),
        fetchStockPrice('AAPL'),
        fetchStockPrice('AAPL')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockResponse.data);
      });
      
      // APIは一度だけ呼ばれることを確認（重複排除が動作）
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });
});