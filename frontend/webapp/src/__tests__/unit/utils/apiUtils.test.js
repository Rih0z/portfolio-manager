/**
 * apiUtils.js のテストファイル
 * API呼び出しユーティリティの包括的テスト
 */

import axios from 'axios';
import {
  RETRY,
  TIMEOUT,
  createApiClient,
  fetchWithRetry,
  generateFallbackData,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  setUserData,
  getUserData,
  wait
} from '../../../utils/apiUtils';
import csrfManager from '../../../utils/csrfManager';
import { handleApiError } from '../../../utils/errorHandler';

// モック
jest.mock('axios');
const mockedAxios = axios;

jest.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: jest.fn(() => 'https://api.example.com'),
  isLocalDevelopment: jest.fn(() => false)
}));
jest.mock('../../../utils/csrfManager', () => ({
  default: {
    addTokenToRequest: jest.fn(),
    refreshToken: jest.fn()
  }
}));
jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn()
}));

// モックLocalStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('apiUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  describe('定数', () => {
    test('RETRY定数が正しく定義されている', () => {
      expect(RETRY.MAX_ATTEMPTS).toBe(2);
      expect(RETRY.INITIAL_DELAY).toBe(500);
      expect(RETRY.BACKOFF_FACTOR).toBe(2);
      expect(RETRY.MAX_DELAY).toBe(60000);
      expect(RETRY.CIRCUIT_BREAKER_THRESHOLD).toBe(5);
      expect(RETRY.CIRCUIT_BREAKER_TIMEOUT).toBe(300000);
    });

    test('TIMEOUT定数が正しく定義されている', () => {
      expect(TIMEOUT.DEFAULT).toBe(10000);
      expect(TIMEOUT.AUTH).toBe(15000);
      expect(TIMEOUT.EXCHANGE_RATE).toBe(12000);
      expect(TIMEOUT.US_STOCK).toBe(10000);
      expect(TIMEOUT.JP_STOCK).toBe(20000);
      expect(TIMEOUT.MUTUAL_FUND).toBe(20000);
    });
  });

  describe('createApiClient', () => {
    test('基本的なAPIクライアントを作成する', () => {
      const mockClient = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      axios.create.mockReturnValue(mockClient);

      const client = createApiClient();

      expect(axios.create).toHaveBeenCalledWith({
        timeout: TIMEOUT.DEFAULT,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      expect(client).toBe(mockClient);
    });

    test('認証付きAPIクライアントを作成する', () => {
      const mockClient = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      axios.create.mockReturnValue(mockClient);

      const client = createApiClient(true);

      expect(axios.create).toHaveBeenCalledWith({
        timeout: TIMEOUT.AUTH,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    });

    test('リクエストインターセプターを設定する', () => {
      const mockClient = {
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };
      axios.create.mockReturnValue(mockClient);

      createApiClient();

      expect(mockClient.interceptors.request.use).toHaveBeenCalled();
      expect(mockClient.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('認証トークン管理', () => {
    test('setAuthToken - トークンを保存する', () => {
      setAuthToken('test-token');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'portfolio_auth_token',
        'test-token'
      );
    });

    test('getAuthToken - 保存されたトークンを取得する', () => {
      localStorageMock.getItem.mockReturnValue('test-token');
      
      const token = getAuthToken();
      
      expect(token).toBe('test-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('portfolio_auth_token');
    });

    test('clearAuthToken - トークンをクリアする', () => {
      clearAuthToken();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('portfolio_auth_token');
    });
  });

  describe('ユーザーデータ管理', () => {
    test('setUserData - ユーザーデータを保存する', () => {
      const userData = { id: 1, name: 'Test User' };
      
      setUserData(userData);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'portfolio_user_data',
        JSON.stringify(userData)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'portfolio_last_login',
        expect.any(String)
      );
    });

    test('getUserData - 保存されたユーザーデータを取得する', () => {
      const userData = { id: 1, name: 'Test User' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(userData));
      
      const result = getUserData();
      
      expect(result).toEqual(userData);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('portfolio_user_data');
    });

    test('getUserData - 無効なJSONの場合はnullを返す', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      const result = getUserData();
      
      expect(result).toBeNull();
    });

  });

  describe('fetchWithRetry', () => {
    test('成功時は結果を返す', async () => {
      const mockResponse = { data: 'success' };
      mockedAxios.get = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await fetchWithRetry('/test-endpoint');
      
      expect(result).toBe('success');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    test('失敗時はリトライする', async () => {
      const mockError = new Error('Network error');
      const mockResponse = { data: 'success' };
      mockedAxios.get = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);
      
      const result = await fetchWithRetry('/test-endpoint', {}, TIMEOUT.DEFAULT, 2);
      
      expect(result).toBe('success');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    test('最大リトライ回数を超えたらエラーを投げる', async () => {
      const mockError = new Error('Network error');
      mockedAxios.get = jest.fn().mockRejectedValue(mockError);
      
      await expect(fetchWithRetry('/test-endpoint', {}, TIMEOUT.DEFAULT, 1)).rejects.toThrow('Network error');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    test('wait関数のテスト', async () => {
      const start = Date.now();
      await wait(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90); // 多少の誤差を許容
    });
  });

  describe('generateFallbackData', () => {
    test('日本株のフォールバックデータを生成する', () => {
      const data = generateFallbackData('7203');
      
      expect(data).toHaveProperty('ticker');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('dayChange');
      expect(data.ticker).toBe('7203');
      expect(data.source).toBe('fallback');
    });

    test('US株のフォールバックデータを生成する', () => {
      const data = generateFallbackData('AAPL');
      
      expect(data).toHaveProperty('ticker');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('price');
      expect(data.ticker).toBe('AAPL');
      expect(data.source).toBe('fallback');
    });

    test('投資信託のフォールバックデータを生成する', () => {
      const data = generateFallbackData('01312345');
      
      expect(data).toHaveProperty('ticker');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('price');
      expect(data.ticker).toBe('01312345');
      expect(data.source).toBe('fallback');
    });

    test('ETFのフォールバックデータを生成する', () => {
      const data = generateFallbackData('VTI');
      
      expect(data).toHaveProperty('ticker');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('price');
      expect(data.ticker).toBe('VTI');
      expect(data.source).toBe('fallback');
    });
  });

});