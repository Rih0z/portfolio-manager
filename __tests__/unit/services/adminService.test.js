/**
 * ファイルパス: __tests__/unit/services/adminService.test.js
 *
 * 管理者サービスの単体テスト
 * APIステータス取得、使用量リセット、APIキー設定のテスト
 *
 * @author プロジェクトチーム
 * @created 2025-05-21
 */

import axios from 'axios';

let adminService;
let adminClientMock;
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  adminClientMock = {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: {} },
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
  };
  axios.create.mockReturnValue(adminClientMock);
  process.env = {
    ...originalEnv,
    REACT_APP_MARKET_DATA_API_URL: 'https://api.example.com',
    REACT_APP_API_STAGE: 'dev',
    REACT_APP_ADMIN_API_KEY: 'test-key'
  };
  adminService = require('@/services/adminService');
});

afterEach(() => {
  process.env = originalEnv;
  axios._reset();
});

describe('adminService', () => {
  describe('getStatus', () => {
    it('APIステータスを取得できる', async () => {
      adminClientMock.get.mockResolvedValue({ data: { status: 'running' } });

      const result = await adminService.getStatus();

      expect(adminClientMock.get).toHaveBeenCalledWith('https://api.example.com/dev/admin/status');
      expect(result).toEqual({
        success: true,
        data: { status: 'running' },
        message: 'ステータス情報を取得しました'
      });
    });

    it('エラー時はエラーメッセージを返す', async () => {
      const error = { message: 'fail', response: { status: 500 } };
      adminClientMock.get.mockRejectedValue(error);

      const result = await adminService.getStatus();

      expect(result).toEqual({
        success: false,
        error: 'fail',
        status: 500,
        message: 'ステータス取得に失敗しました: fail'
      });
    });
  });

  describe('resetUsage', () => {
    it('使用量をリセットできる', async () => {
      adminClientMock.post.mockResolvedValue({ data: { reset: true } });

      const result = await adminService.resetUsage();

      expect(adminClientMock.post).toHaveBeenCalledWith('https://api.example.com/dev/admin/reset');
      expect(result).toEqual({
        success: true,
        data: { reset: true },
        message: 'API使用量をリセットしました'
      });
    });

    it('リセット失敗時はエラーメッセージを返す', async () => {
      const error = { message: 'fail', response: { status: 403 } };
      adminClientMock.post.mockRejectedValue(error);

      const result = await adminService.resetUsage();

      expect(result).toEqual({
        success: false,
        error: 'fail',
        status: 403,
        message: '使用量のリセットに失敗しました: fail'
      });
    });
  });

  describe('setAdminApiKey', () => {
    it('APIキーを設定できる', () => {
      const success = adminService.setAdminApiKey('new-key');

      expect(success).toBe(true);
      expect(adminClientMock.defaults.headers['x-api-key']).toBe('new-key');
    });

    it('空のキーは設定しない', () => {
      adminClientMock.defaults.headers['x-api-key'] = 'old-key';
      const success = adminService.setAdminApiKey('');

      expect(success).toBe(false);
      expect(adminClientMock.defaults.headers['x-api-key']).toBe('old-key');
    });
  });
});
