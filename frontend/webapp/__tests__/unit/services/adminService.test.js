/**
 * ファイルパス: __tests__/unit/services/adminService.test.js
 *
 * 管理者サービスの単体テスト
 * getStatus, resetUsage, createAdminClient 関数の挙動を検証する
 * 
 * @updated 2025-07-02
 */

import axios from 'axios';
import { getApiEndpoint } from '@/utils/envUtils';

// Axiosモックを使用
jest.mock('axios');

// 依存関係のモック
jest.mock('@/utils/envUtils', () => ({
  getApiEndpoint: jest.fn((path) => Promise.resolve(`https://api.example.com/v1/${path}`))
}));

// テスト対象モジュールを動的にインポートするためのヘルパー
const loadModule = () => {
  jest.resetModules();
  return require('@/services/adminService');
};

describe('adminService', () => {
  const originalEnv = process.env;
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    console.error = jest.fn();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.env = originalEnv;
  });

  describe('createAdminClient', () => {
    it('管理者APIクライアントを正しく作成する', () => {
      const mockClient = { 
        get: jest.fn(), 
        post: jest.fn(),
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
      };
      axios.create.mockReturnValue(mockClient);
      
      const { createAdminClient } = loadModule();
      const client = createAdminClient();
      
      expect(axios.create).toHaveBeenCalledWith({
        timeout: 5000,
        headers: {}
      });
      expect(client).toBe(mockClient);
    });
    
    it('複数回呼び出しても同じインスタンスを返す', () => {
      const mockClient = { get: jest.fn(), post: jest.fn() };
      axios.create.mockReturnValue(mockClient);
      
      const { createAdminClient, default: adminService } = loadModule();
      const client1 = createAdminClient();
      const client2 = adminService.createAdminClient();
      
      expect(axios.create).toHaveBeenCalledTimes(1);
      expect(client1).toBe(client2);
    });
  });

  describe('getStatus', () => {
    it('正常にステータス情報を取得できる', async () => {
      const mockData = { 
        status: 'healthy', 
        apiCalls: 100,
        limit: 1000,
        lastReset: '2025-01-01T00:00:00Z'
      };
      const mockClient = { 
        get: jest.fn().mockResolvedValue({ data: mockData }) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { getStatus } = loadModule();
      const result = await getStatus();
      
      expect(getApiEndpoint).toHaveBeenCalledWith('admin/status');
      expect(mockClient.get).toHaveBeenCalledWith('https://api.example.com/v1/admin/status');
      expect(result).toEqual({
        success: true,
        data: mockData,
        message: 'ステータス情報を取得しました'
      });
    });
    
    it('APIエラーを適切に処理する', async () => {
      const error = {
        message: 'Network Error',
        response: { status: 500, data: { error: 'Internal Server Error' } }
      };
      const mockClient = { 
        get: jest.fn().mockRejectedValue(error) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { getStatus } = loadModule();
      const result = await getStatus();
      
      expect(console.error).toHaveBeenCalledWith('ステータス取得エラー:', error);
      expect(result).toEqual({
        success: false,
        error: 'Network Error',
        status: 500,
        message: 'ステータス取得に失敗しました: Network Error'
      });
    });
    
    it('エラーメッセージがない場合の処理', async () => {
      const error = {};
      const mockClient = { 
        get: jest.fn().mockRejectedValue(error) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { getStatus } = loadModule();
      const result = await getStatus();
      
      expect(result).toEqual({
        success: false,
        error: 'Unknown error',
        status: undefined,
        message: 'ステータス取得に失敗しました: Unknown error'
      });
    });
    
    it('エラーが文字列の場合の処理', async () => {
      const mockClient = { 
        get: jest.fn().mockRejectedValue('String error') 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { getStatus } = loadModule();
      const result = await getStatus();
      
      expect(result.error).toBe('String error');
      expect(result.message).toBe('ステータス取得に失敗しました: String error');
    });
  });

  describe('resetUsage', () => {
    it('正常に使用量をリセットできる', async () => {
      const mockData = { 
        success: true,
        message: 'Usage reset successfully',
        newCount: 0
      };
      const mockClient = { 
        post: jest.fn().mockResolvedValue({ data: mockData }) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { resetUsage } = loadModule();
      const result = await resetUsage();
      
      expect(getApiEndpoint).toHaveBeenCalledWith('admin/reset');
      expect(mockClient.post).toHaveBeenCalledWith('https://api.example.com/v1/admin/reset');
      expect(result).toEqual({
        success: true,
        data: mockData,
        message: 'API使用量をリセットしました'
      });
    });
    
    it('認証エラーを適切に処理する', async () => {
      const error = {
        message: 'Unauthorized',
        response: { status: 401, data: { error: 'Invalid credentials' } }
      };
      const mockClient = { 
        post: jest.fn().mockRejectedValue(error) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { resetUsage } = loadModule();
      const result = await resetUsage();
      
      expect(console.error).toHaveBeenCalledWith('使用量リセットエラー:', error);
      expect(result).toEqual({
        success: false,
        error: 'Unauthorized',
        status: 401,
        message: '使用量のリセットに失敗しました: Unauthorized'
      });
    });
    
    it('ネットワークエラーを処理する', async () => {
      const error = new Error('Network Error');
      const mockClient = { 
        post: jest.fn().mockRejectedValue(error) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { resetUsage } = loadModule();
      const result = await resetUsage();
      
      expect(result).toEqual({
        success: false,
        error: 'Network Error',
        status: undefined,
        message: '使用量のリセットに失敗しました: Network Error'
      });
    });
  });

  describe('デフォルトエクスポート', () => {
    it('デフォルトエクスポートに全ての関数が含まれる', () => {
      const adminService = loadModule();
      
      expect(adminService.default).toBeDefined();
      expect(adminService.default.getStatus).toBe(adminService.getStatus);
      expect(adminService.default.resetUsage).toBe(adminService.resetUsage);
      expect(adminService.default.createAdminClient).toBe(adminService.createAdminClient);
    });
  });

  describe('アドミンクライアントの遅延生成', () => {
    it('getStatusはクライアントを遅延生成する', async () => {
      const mockClient = { 
        get: jest.fn().mockResolvedValue({ data: {} }) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { getStatus } = loadModule();
      
      // 最初の呼び出しでクライアントが作成される
      expect(axios.create).not.toHaveBeenCalled();
      
      await getStatus();
      
      expect(axios.create).toHaveBeenCalledTimes(1);
      
      // 2回目の呼び出しでは新しいクライアントを作成しない
      await getStatus();
      
      expect(axios.create).toHaveBeenCalledTimes(1);
    });
    
    it('resetUsageはクライアントを遅延生成する', async () => {
      const mockClient = { 
        post: jest.fn().mockResolvedValue({ data: {} }) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { resetUsage } = loadModule();
      
      expect(axios.create).not.toHaveBeenCalled();
      
      await resetUsage();
      
      expect(axios.create).toHaveBeenCalledTimes(1);
    });
    
    it('getStatusとresetUsageは同じクライアントを共有する', async () => {
      const mockClient = { 
        get: jest.fn().mockResolvedValue({ data: {} }),
        post: jest.fn().mockResolvedValue({ data: {} })
      };
      axios.create.mockReturnValue(mockClient);
      
      const { getStatus, resetUsage } = loadModule();
      
      await getStatus();
      expect(axios.create).toHaveBeenCalledTimes(1);
      
      await resetUsage();
      expect(axios.create).toHaveBeenCalledTimes(1); // 同じクライアントを使用
    });
  });

  describe('getApiEndpoint統合', () => {
    it('環境変数に基づいた動的エンドポイントを使用', async () => {
      getApiEndpoint.mockImplementation((path) => 
        Promise.resolve(`https://custom-api.com/prod/${path}`)
      );
      
      const mockClient = { 
        get: jest.fn().mockResolvedValue({ data: {} }) 
      };
      axios.create.mockReturnValue(mockClient);
      
      const { getStatus } = loadModule();
      await getStatus();
      
      expect(mockClient.get).toHaveBeenCalledWith('https://custom-api.com/prod/admin/status');
    });
  });
});
