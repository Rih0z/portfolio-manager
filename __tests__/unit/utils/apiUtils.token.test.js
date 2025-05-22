/**
 * ファイルパス: __tests__/unit/utils/apiUtils.token.test.js
 *
 * 認証トークンユーティリティの単体テスト
 * setAuthToken, getAuthToken, clearAuthToken の動作を検証
 */

import axios from 'axios';

jest.mock('axios');

const loadModule = () => require('@/utils/apiUtils');

describe('auth token utils', () => {
  beforeEach(() => {
    jest.resetModules();
    axios.create.mockReturnValue({ interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } });
  });

  it('stores and retrieves token', () => {
    const { setAuthToken, getAuthToken } = loadModule();
    setAuthToken('token123');
    expect(getAuthToken()).toBe('token123');
  });

  it('clears token', () => {
    const { setAuthToken, getAuthToken, clearAuthToken } = loadModule();
    setAuthToken('token123');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it('request interceptor attaches Authorization header', () => {
    const requestUse = jest.fn();
    const { createApiClient, setAuthToken } = loadModule();
    axios.create.mockReturnValueOnce({ interceptors: { request: { use: requestUse }, response: { use: jest.fn() } } });
    setAuthToken('abcd');
    createApiClient(true);
    expect(requestUse).toHaveBeenCalled();
    const interceptor = requestUse.mock.calls[0][0];
    const config = interceptor({ headers: {}, url: '/api', method: 'get' });
    expect(config.headers.Authorization).toBe('Bearer abcd');
  });
});
