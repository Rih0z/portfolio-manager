/**
 * adminService.js のユニットテスト
 * 管理者API機能のテスト
 */

import {
  getStatus,
  resetUsage,
  createAdminClient
} from '../../../services/adminService';

// axiosのモック
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios;

// envUtilsのモック
jest.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: jest.fn()
}));
import { getApiEndpoint } from '../../../utils/envUtils';

describe('adminService', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // axios.createのモック
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // getApiEndpointのデフォルトモック
    getApiEndpoint.mockResolvedValue('https://mock-api.com/admin');
    
    // コンソールエラーをモック
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('createAdminClient', () => {
    it('正しい設定でaxiosクライアントを作成する', () => {
      const client = createAdminClient();
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: 5000,
        headers: {}
      });
      expect(client).toBe(mockAxiosInstance);
    });

    it('複数回呼び出しても正しく動作する', () => {
      const client1 = createAdminClient();
      const client2 = createAdminClient();
      
      expect(client1).toBe(mockAxiosInstance);
      expect(client2).toBe(mockAxiosInstance);
      expect(mockedAxios.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatus', () => {
    it('正常にステータス情報を取得する', async () => {
      const mockResponse = {
        data: {
          status: 'active',
          requestCount: 100,
          lastRequest: '2024-01-01T00:00:00Z'
        }
      };

      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await getStatus();

      expect(getApiEndpoint).toHaveBeenCalledWith('admin/status');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('https://mock-api.com/admin/status');
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        message: 'ステータス情報を取得しました'
      });
    });

    it('APIエンドポイント取得失敗時はエラーを返す', async () => {
      const error = new Error('Endpoint configuration failed');
      getApiEndpoint.mockRejectedValue(error);

      const result = await getStatus();

      expect(result).toEqual({
        success: false,
        error: 'Endpoint configuration failed',
        status: undefined,
        message: 'ステータス取得に失敗しました: Endpoint configuration failed'
      });
      expect(console.error).toHaveBeenCalledWith('ステータス取得エラー:', error);
    });

    it('HTTP 404エラーを正しく処理する', async () => {
      const error = new Error('Request failed with status code 404');
      error.response = { status: 404 };
      
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await getStatus();

      expect(result).toEqual({
        success: false,
        error: 'Request failed with status code 404',
        status: 404,
        message: 'ステータス取得に失敗しました: Request failed with status code 404'
      });
    });

    it('HTTP 500エラーを正しく処理する', async () => {
      const error = new Error('Internal Server Error');
      error.response = { status: 500 };
      
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await getStatus();

      expect(result).toEqual({
        success: false,
        error: 'Internal Server Error',
        status: 500,
        message: 'ステータス取得に失敗しました: Internal Server Error'
      });
    });

    it('ネットワークエラーを正しく処理する', async () => {
      const error = new Error('Network Error');
      
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await getStatus();

      expect(result).toEqual({
        success: false,
        error: 'Network Error',
        status: undefined,
        message: 'ステータス取得に失敗しました: Network Error'
      });
    });

    it('タイムアウトエラーを正しく処理する', async () => {
      const error = new Error('timeout');
      error.code = 'ECONNABORTED';
      
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await getStatus();

      expect(result).toEqual({
        success: false,
        error: 'timeout',
        status: undefined,
        message: 'ステータス取得に失敗しました: timeout'
      });
    });
  });

  describe('resetUsage', () => {
    it('正常に使用量をリセットする', async () => {
      const mockResponse = {
        data: {
          message: 'Usage reset successfully',
          resetCount: 1,
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/reset');
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await resetUsage();

      expect(getApiEndpoint).toHaveBeenCalledWith('admin/reset');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('https://mock-api.com/admin/reset');
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        message: 'API使用量をリセットしました'
      });
    });

    it('APIエンドポイント取得失敗時はエラーを返す', async () => {
      const error = new Error('Endpoint configuration failed');
      getApiEndpoint.mockRejectedValue(error);

      const result = await resetUsage();

      expect(result).toEqual({
        success: false,
        error: 'Endpoint configuration failed',
        status: undefined,
        message: '使用量のリセットに失敗しました: Endpoint configuration failed'
      });
      expect(console.error).toHaveBeenCalledWith('使用量リセットエラー:', error);
    });

    it('HTTP 401認証エラーを正しく処理する', async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/reset');
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await resetUsage();

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized',
        status: 401,
        message: '使用量のリセットに失敗しました: Unauthorized'
      });
    });

    it('HTTP 403権限エラーを正しく処理する', async () => {
      const error = new Error('Forbidden');
      error.response = { status: 403 };
      
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/reset');
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await resetUsage();

      expect(result).toEqual({
        success: false,
        error: 'Forbidden',
        status: 403,
        message: '使用量のリセットに失敗しました: Forbidden'
      });
    });

    it('HTTP 500サーバーエラーを正しく処理する', async () => {
      const error = new Error('Internal Server Error');
      error.response = { status: 500 };
      
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/reset');
      mockAxiosInstance.post.mockRejectedValue(error);

      const result = await resetUsage();

      expect(result).toEqual({
        success: false,
        error: 'Internal Server Error',
        status: 500,
        message: '使用量のリセットに失敗しました: Internal Server Error'
      });
    });

    it('空のレスポンスも正しく処理する', async () => {
      const mockResponse = { data: null };

      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/reset');
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await resetUsage();

      expect(result).toEqual({
        success: true,
        data: null,
        message: 'API使用量をリセットしました'
      });
    });
  });

  describe('デフォルトエクスポート', () => {
    it('全ての必要な関数をエクスポートする', () => {
      const adminService = require('../../../services/adminService').default;
      
      expect(adminService).toHaveProperty('getStatus');
      expect(adminService).toHaveProperty('resetUsage');
      expect(adminService).toHaveProperty('createAdminClient');
      expect(typeof adminService.getStatus).toBe('function');
      expect(typeof adminService.resetUsage).toBe('function');
      expect(typeof adminService.createAdminClient).toBe('function');
    });
  });

  describe('統合テスト', () => {
    it('連続してAPI呼び出しを行っても正しく動作する', async () => {
      // ステータス取得のモック
      getApiEndpoint
        .mockResolvedValueOnce('https://mock-api.com/admin/status')
        .mockResolvedValueOnce('https://mock-api.com/admin/reset');

      mockAxiosInstance.get.mockResolvedValue({ 
        data: { status: 'active' } 
      });
      mockAxiosInstance.post.mockResolvedValue({ 
        data: { message: 'reset successful' } 
      });

      const statusResult = await getStatus();
      const resetResult = await resetUsage();

      expect(statusResult.success).toBe(true);
      expect(resetResult.success).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('複数の並行リクエストを正しく処理する', async () => {
      getApiEndpoint
        .mockResolvedValue('https://mock-api.com/admin/status');

      mockAxiosInstance.get.mockResolvedValue({ 
        data: { status: 'active' } 
      });

      const promises = [
        getStatus(),
        getStatus(),
        getStatus()
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('エラーケース詳細テスト', () => {
    it('undefined レスポンスを正しく処理する', async () => {
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockResolvedValue(undefined);

      const result = await getStatus();

      expect(result).toEqual({
        success: false,
        error: "Cannot read properties of undefined (reading 'data')",
        status: undefined,
        message: "ステータス取得に失敗しました: Cannot read properties of undefined (reading 'data')"
      });
    });

    it('null エラーレスポンスを正しく処理する', async () => {
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockRejectedValue(null);

      const result = await getStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('文字列エラーを正しく処理する', async () => {
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockRejectedValue('String error');

      const result = await getStatus();

      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のリクエストを効率的に処理する', async () => {
      getApiEndpoint.mockResolvedValue('https://mock-api.com/admin/status');
      mockAxiosInstance.get.mockResolvedValue({ data: { status: 'ok' } });

      const startTime = Date.now();
      
      const promises = Array.from({ length: 50 }, () => getStatus());
      const results = await Promise.all(promises);
      
      const endTime = Date.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});