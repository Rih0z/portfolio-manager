import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginButton from '@/components/auth/LoginButton';

jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => <div>{children}</div>,
  GoogleLogin: ({ onSuccess, disabled }) => (
    <button onClick={() => onSuccess({ code: 'abc' })} disabled={disabled}>
      GoogleLogin
    </button>
  )
}));

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/utils/envUtils', () => ({ getRedirectUri: jest.fn() }));

const { useAuth } = require('@/hooks/useAuth');
const { getRedirectUri } = require('@/utils/envUtils');

describe('LoginButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows error when client id missing', () => {
    useAuth.mockReturnValue({ googleClientId: '', loginWithGoogle: jest.fn(), loading: false, error: null });
    const { container } = render(<LoginButton />);
    expect(container.textContent).toContain('Google Client IDが設定されていません');
  });

  it('calls loginWithGoogle on success', async () => {
    const loginWithGoogle = jest.fn().mockResolvedValue(true);
    useAuth.mockReturnValue({ googleClientId: 'id', loginWithGoogle, loading: false, error: null });
    getRedirectUri.mockReturnValue('http://redirect');

    render(<LoginButton />);

    const user = userEvent.setup();
    await user.click(screen.getByText('GoogleLogin'));
    expect(loginWithGoogle).toHaveBeenCalledWith({ code: 'abc' });
  });
});
