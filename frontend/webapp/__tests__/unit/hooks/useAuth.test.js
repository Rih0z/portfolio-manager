/**
 * useAuth フックのテスト
 *
 * Zustand移行後: AuthProvider不要。フックは直接Zustand storeから読み取る。
 */
import { renderHook } from '@testing-library/react';
import useAuth from '@/hooks/useAuth';

// Zustand storeをモック
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    hasDriveAccess: false,
    googleClientId: '',
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    checkSession: vi.fn(),
    initiateDriveAuth: vi.fn(),
    handleLogout: vi.fn(),
    login: vi.fn(),
    authorizeDrive: vi.fn(),
  })),
}));

// Providerなしでも動作する（Zustandはグローバルストア）
it('provides context values without any Provider wrapper', () => {
  const { result } = renderHook(() => useAuth());

  expect(result.current).toHaveProperty('loginWithGoogle');
  expect(result.current).toHaveProperty('logout');
  expect(result.current).toHaveProperty('isAuthenticated');
  // setPortfolioContextRef は後方互換のためnoop関数として存在
  expect(result.current).toHaveProperty('setPortfolioContextRef');
});

it('returns store state values', () => {
  const { result } = renderHook(() => useAuth());

  expect(result.current.isAuthenticated).toBe(false);
  expect(result.current.user).toBe(null);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBe(null);
  expect(result.current.hasDriveAccess).toBe(false);
});
