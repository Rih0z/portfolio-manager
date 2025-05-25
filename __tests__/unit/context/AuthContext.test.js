import React, { useContext } from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, AuthContext } from '@/context/AuthContext';

jest.mock('@/utils/envUtils', () => ({
  getApiEndpoint: jest.fn(() => '/api'),
  getRedirectUri: jest.fn(() => 'http://localhost/cb'),
  getGoogleClientId: jest.fn(() => 'id')
}));

jest.mock('@/utils/apiUtils', () => ({
  authFetch: jest.fn(),
  setAuthToken: jest.fn(),
  getAuthToken: jest.fn(() => null),
  clearAuthToken: jest.fn()
}));

const { authFetch, setAuthToken, clearAuthToken } = require('@/utils/apiUtils');

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

const useAuthContext = () => useContext(AuthContext);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loginWithGoogle updates state and saves token', async () => {
    authFetch.mockResolvedValue({
      success: true,
      user: { name: 'Tester' },
      token: 'jwt123'
    });

    const { result } = renderHook(useAuthContext, { wrapper });

    await act(async () => {
      const success = await result.current.loginWithGoogle({ code: 'abc' });
      expect(success).toBe(true);
    });

    expect(setAuthToken).toHaveBeenCalledWith('jwt123');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ name: 'Tester' });
  });

  it('logout clears state and token', async () => {
    // first login
    authFetch.mockResolvedValueOnce({
      success: true,
      user: { name: 'Tester' },
      token: 'jwt123'
    });
    const { result } = renderHook(useAuthContext, { wrapper });
    await act(async () => {
      await result.current.loginWithGoogle({ code: 'abc' });
    });

    // mock logout API
    authFetch.mockResolvedValueOnce({ success: true });
    await act(async () => {
      const success = await result.current.logout();
      expect(success).toBe(true);
    });

    expect(clearAuthToken).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
  });
});
