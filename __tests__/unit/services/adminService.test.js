/**
 * ファイルパス: __tests__/unit/services/adminService.test.js
 *
 * 管理者サービスの単体テスト
 * getStatus, resetUsage, setAdminApiKey 関数の挙動を検証する
 */

import axios from 'axios';

// Axiosモックを使用
jest.mock('axios');

// テスト対象モジュールを動的にインポートするためのヘルパー
const loadModule = () => {
  return require('@/services/adminService');
};

describe('adminService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    axios._reset && axios._reset();
    process.env = { ...originalEnv, REACT_APP_MARKET_DATA_API_URL: 'https://api.example.com', REACT_APP_API_STAGE: 'v1', REACT_APP_ADMIN_API_KEY: 'secret' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('getStatus が正常にデータを返す', async () => {
    const mockClient = { get: jest.fn().mockResolvedValue({ data: { status: 'ok' } }), post: jest.fn(), defaults: { headers: {} } };
    axios.create.mockReturnValue(mockClient);
    const { getStatus } = loadModule();

    const result = await getStatus();

    expect(mockClient.get).toHaveBeenCalledWith('https://api.example.com/v1/admin/status');
    expect(result).toEqual({ success: true, data: { status: 'ok' }, message: 'ステータス情報を取得しました' });
  });

  it('getStatus がエラー時にエラーレスポンスを返す', async () => {
    const error = { message: 'fail', response: { status: 500 } };
    const mockClient = { get: jest.fn().mockRejectedValue(error), post: jest.fn(), defaults: { headers: {} } };
    axios.create.mockReturnValue(mockClient);
    const { getStatus } = loadModule();

    const result = await getStatus();

    expect(result).toEqual({ success: false, error: 'fail', status: 500, message: 'ステータス取得に失敗しました: fail' });
  });

  it('resetUsage が正常にデータを返す', async () => {
    const mockClient = { get: jest.fn(), post: jest.fn().mockResolvedValue({ data: { reset: true } }), defaults: { headers: {} } };
    axios.create.mockReturnValue(mockClient);
    const { resetUsage } = loadModule();

    const result = await resetUsage();

    expect(mockClient.post).toHaveBeenCalledWith('https://api.example.com/v1/admin/reset');
    expect(result).toEqual({ success: true, data: { reset: true }, message: 'API使用量をリセットしました' });
  });

  it('resetUsage がエラー時にエラーレスポンスを返す', async () => {
    const error = { message: 'oops', response: { status: 403 } };
    const mockClient = { get: jest.fn(), post: jest.fn().mockRejectedValue(error), defaults: { headers: {} } };
    axios.create.mockReturnValue(mockClient);
    const { resetUsage } = loadModule();

    const result = await resetUsage();

    expect(result).toEqual({ success: false, error: 'oops', status: 403, message: '使用量のリセットに失敗しました: oops' });
  });

  it('setAdminApiKey はヘッダーを設定して true を返す', () => {
    const mockClient = { get: jest.fn(), post: jest.fn(), defaults: { headers: {} } };
    axios.create.mockReturnValue(mockClient);
    const { setAdminApiKey } = loadModule();

    const result = setAdminApiKey('new-key');

    expect(mockClient.defaults.headers['x-api-key']).toBe('new-key');
    expect(result).toBe(true);
  });

  it('setAdminApiKey は falsy 値では何もしない', () => {
    const mockClient = { get: jest.fn(), post: jest.fn(), defaults: { headers: {} } };
    axios.create.mockReturnValue(mockClient);
    const { setAdminApiKey } = loadModule();

    const result = setAdminApiKey('');

    expect(mockClient.defaults.headers['x-api-key']).toBeUndefined();
    expect(result).toBe(false);
  });
});
