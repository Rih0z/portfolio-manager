import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { handlers } from '../../mocks/handlers';
import { AuthProvider } from '@/context/AuthContext';
import useAuth from '@/hooks/useAuth';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

test('Google login updates authentication state', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });

  await act(async () => {
    const success = await result.current.loginWithGoogle({ code: 'abc' });
    expect(success).toBe(true);
  });

  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.user).toEqual(expect.objectContaining({ email: expect.any(String) }));
});
