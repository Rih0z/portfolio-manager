/**
 * AlphaVantageService のユニットテスト
 * カバレッジ率100%を目指した包括的なテスト
 */

const alphaVantageService = require('../../../../src/services/sources/alphaVantageService');
const axios = require('axios');
const { withRetry } = require('../../../../src/utils/retry');
const alertService = require('../../../../src/services/alerts');
const { getApiKeys } = require('../../../../src/utils/secretsManager');

// モック
jest.mock('axios');
jest.mock('../../../../src/utils/retry');
jest.mock('../../../../src/services/alerts');
jest.mock('../../../../src/utils/secretsManager');

describe('AlphaVantageService', () => {
  const mockAxios = axios;
  const mockWithRetry = withRetry;
  const mockAlertService = alertService;
  const mockGetApiKeys = getApiKeys;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('getStockData', () => {
    beforeEach(() => {
      mockGetApiKeys.mockResolvedValue({ alphaVantage: 'test-api-key' });
    });

    test('正常にデータを取得する', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.50',
            '06. volume': '1000000',
            '07. latest trading day': '2023-01-01',
            '08. previous close': '149.00',
            '09. change': '1.50',
            '10. change percent': '1.01%'
          }
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      const result = await alphaVantageService.getStockData('AAPL');

      expect(result).toEqual({
        ticker: 'AAPL',
        price: 150.50,
        change: 1.50,
        changePercent: 1.01,
        currency: 'USD',
        name: 'AAPL',
        lastUpdated: expect.any(String),
        source: 'Alpha Vantage',
        isStock: true,
        isMutualFund: false,
        volume: 1000000,
        previousClose: 149.00,
        latestTradingDay: '2023-01-01'
      });

      expect(mockWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxRetries: 3,
          baseDelay: 1000,
          shouldRetry: expect.any(Function)
        }
      );
    });

    test('シンボルが未指定の場合エラーをスローする', async () => {
      await expect(alphaVantageService.getStockData('')).rejects.toThrow('Symbol is required');
      await expect(alphaVantageService.getStockData(null)).rejects.toThrow('Symbol is required');
      await expect(alphaVantageService.getStockData(undefined)).rejects.toThrow('Symbol is required');
    });

    test('APIキーが未設定の場合エラーをスローする', async () => {
      mockGetApiKeys.mockResolvedValue({ alphaVantage: null });

      await expect(alphaVantageService.getStockData('AAPL')).rejects.toThrow('Alpha Vantage API key not configured');
    });

    test('APIキーがプレースホルダーの場合エラーをスローする', async () => {
      mockGetApiKeys.mockResolvedValue({ alphaVantage: 'PLACEHOLDER_KEY' });

      await expect(alphaVantageService.getStockData('AAPL')).rejects.toThrow('Alpha Vantage API key not configured');
    });

    test('APIからエラーメッセージが返された場合エラーをスローする', async () => {
      const mockResponse = {
        data: {
          'Error Message': 'Invalid API call'
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      await expect(alphaVantageService.getStockData('AAPL')).rejects.toThrow('Alpha Vantage API error: Invalid API call');
    });

    test('レート制限エラーの場合エラーをスローする', async () => {
      const mockResponse = {
        data: {
          'Note': 'API rate limit exceeded'
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      await expect(alphaVantageService.getStockData('AAPL')).rejects.toThrow('Alpha Vantage rate limit: API rate limit exceeded');
    });

    test('無効なレスポンス形式の場合エラーをスローする', async () => {
      const mockResponse = {
        data: {
          'Global Quote': null
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      await expect(alphaVantageService.getStockData('AAPL')).rejects.toThrow('Invalid Alpha Vantage response format');
    });

    test('価格データが欠落している場合エラーをスローする', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL'
          }
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      await expect(alphaVantageService.getStockData('AAPL')).rejects.toThrow('Invalid Alpha Vantage response format');
    });

    test('ネットワークエラーの場合アラートを送信してエラーを再スローする', async () => {
      const networkError = new Error('Network error');
      mockWithRetry.mockRejectedValue(networkError);

      await expect(alphaVantageService.getStockData('AAPL')).rejects.toThrow('Network error');

      expect(mockAlertService.notifyError).toHaveBeenCalledWith(
        'Alpha Vantage API Error',
        networkError,
        { symbol: 'AAPL', source: 'Alpha Vantage' }
      );
    });

    test('volumeが0の場合もデフォルト値で処理する', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.50',
            '06. volume': '0',
            '07. latest trading day': '2023-01-01',
            '08. previous close': '149.00',
            '09. change': '1.50',
            '10. change percent': '1.01%'
          }
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      const result = await alphaVantageService.getStockData('AAPL');

      expect(result.volume).toBe(0);
      expect(result.previousClose).toBe(149.00);
    });

    test('volumeとpreviousCloseが無効な場合デフォルト値を使用する', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.50',
            '06. volume': 'invalid',
            '07. latest trading day': '2023-01-01',
            '08. previous close': 'invalid',
            '09. change': '1.50',
            '10. change percent': '1.01%'
          }
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      const result = await alphaVantageService.getStockData('AAPL');

      expect(result.volume).toBe(0);
      expect(result.previousClose).toBe(0);
    });
  });

  describe('getStocksData', () => {
    beforeEach(() => {
      mockGetApiKeys.mockResolvedValue({ alphaVantage: 'test-api-key' });
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('複数銘柄のデータを順次取得する', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.50',
            '06. volume': '1000000',
            '07. latest trading day': '2023-01-01',
            '08. previous close': '149.00',
            '09. change': '1.50',
            '10. change percent': '1.01%'
          }
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      // 非同期実行
      const resultPromise = alphaVantageService.getStocksData(['AAPL', 'GOOGL']);

      // タイマーを進めながら処理を待つ
      jest.advanceTimersByTime(12000);
      await Promise.resolve();
      jest.advanceTimersByTime(12000);

      const result = await resultPromise;

      expect(result).toEqual({
        AAPL: expect.objectContaining({
          ticker: 'AAPL',
          price: 150.50,
          source: 'Alpha Vantage'
        }),
        GOOGL: expect.objectContaining({
          ticker: 'GOOGL', 
          price: 150.50,
          source: 'Alpha Vantage'
        })
      });

      expect(mockWithRetry).toHaveBeenCalledTimes(2);
    });

    test('一部の銘柄でエラーが発生した場合も他の銘柄は処理する', async () => {
      let callCount = 0;
      mockWithRetry.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: {
              'Global Quote': {
                '01. symbol': 'AAPL',
                '05. price': '150.50',
                '06. volume': '1000000',
                '07. latest trading day': '2023-01-01',
                '08. previous close': '149.00',
                '09. change': '1.50',
                '10. change percent': '1.01%'
              }
            }
          });
        } else {
          return Promise.reject(new Error('API error'));
        }
      });

      const resultPromise = alphaVantageService.getStocksData(['AAPL', 'INVALID']);

      // タイマーを進めながら処理を待つ
      jest.advanceTimersByTime(12000);
      await Promise.resolve();
      jest.advanceTimersByTime(12000);

      const result = await resultPromise;

      expect(result).toEqual({
        AAPL: expect.objectContaining({
          ticker: 'AAPL',
          price: 150.50
        })
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Alpha Vantage batch request had 1 errors'),
        expect.arrayContaining([
          expect.objectContaining({
            symbol: 'INVALID',
            error: 'API error'
          })
        ])
      );
    });

    test('単一銘柄でも12秒待機しない', async () => {
      const mockResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.50',
            '06. volume': '1000000',
            '07. latest trading day': '2023-01-01',
            '08. previous close': '149.00',
            '09. change': '1.50',
            '10. change percent': '1.01%'
          }
        }
      };

      mockWithRetry.mockResolvedValue(mockResponse);

      const result = await alphaVantageService.getStocksData(['AAPL']);

      expect(result).toEqual({
        AAPL: expect.objectContaining({
          ticker: 'AAPL',
          price: 150.50
        })
      });

      // タイマーが進まないことを確認
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('isAvailable', () => {
    test('APIキーが設定されている場合trueを返す', async () => {
      mockGetApiKeys.mockResolvedValue({ alphaVantage: 'test-api-key' });

      const result = await alphaVantageService.isAvailable();

      expect(result).toBe(true);
    });

    test('APIキーが未設定の場合falseを返す', async () => {
      mockGetApiKeys.mockResolvedValue({ alphaVantage: null });

      const result = await alphaVantageService.isAvailable();

      expect(result).toBe(false);
    });

    test('APIキーがプレースホルダーの場合falseを返す', async () => {
      mockGetApiKeys.mockResolvedValue({ alphaVantage: 'PLACEHOLDER_KEY' });

      const result = await alphaVantageService.isAvailable();

      expect(result).toBe(false);
    });

    test('getApiKeysでエラーが発生した場合falseを返す', async () => {
      mockGetApiKeys.mockRejectedValue(new Error('Secrets Manager error'));

      const result = await alphaVantageService.isAvailable();

      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to check Alpha Vantage availability:',
        'Secrets Manager error'
      );
    });

    test('APIキーが空文字の場合falseを返す', async () => {
      mockGetApiKeys.mockResolvedValue({ alphaVantage: '' });

      const result = await alphaVantageService.isAvailable();

      expect(result).toBe(false);
    });
  });
});