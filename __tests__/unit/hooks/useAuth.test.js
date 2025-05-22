import React from 'react';
import { renderHook } from '@testing-library/react';
import { AuthProvider } from '@/context/AuthContext';
import useAuth from '@/hooks/useAuth';

// AuthProvider 内で使用されていない場合にエラーを投げることを確認
it('throws error when used outside AuthProvider', () => {
  expect(() => renderHook(() => useAuth())).toThrow(
    'useAuth must be used within an AuthProvider'
  );
});

// AuthProvider でラップした場合にコンテキスト値を取得できることを確認
it('provides context values when wrapped with AuthProvider', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
  const { result } = renderHook(() => useAuth(), { wrapper });

  expect(result.current).toHaveProperty('loginWithGoogle');
  expect(result.current).toHaveProperty('logout');
  expect(result.current).toHaveProperty('isAuthenticated');
});
