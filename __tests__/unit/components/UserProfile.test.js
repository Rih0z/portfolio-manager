import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from '@/components/auth/UserProfile';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
const { useAuth } = require('@/hooks/useAuth');

describe('UserProfile', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no user', () => {
    useAuth.mockReturnValue({ user: null, handleLogout: jest.fn() });
    const { container } = render(<UserProfile />);
    expect(container.firstChild).toBeNull();
  });

  it('shows user info and handles logout', async () => {
    const handleLogout = jest.fn();
    useAuth.mockReturnValue({ user: { name: 'Alice', picture: 'pic.png' }, handleLogout });

    render(<UserProfile />);
    expect(screen.getByText('Alice')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));
    expect(handleLogout).toHaveBeenCalled();
  });
});
