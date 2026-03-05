import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '@/components/layout/Header';

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/usePortfolioContext', () => ({ usePortfolioContext: vi.fn() }));

vi.mock('@/components/auth/LoginButton', () => () => <div>LoginButton</div>);
vi.mock('@/components/auth/UserProfile', () => () => <div>UserProfile</div>);

const { useAuth } = require('@/hooks/useAuth');
const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('Header', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows login button when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    usePortfolioContext.mockReturnValue({
      baseCurrency: 'JPY',
      toggleCurrency: vi.fn(),
      refreshMarketPrices: vi.fn(),
      lastUpdated: null,
      isLoading: false
    });

    render(<Header />);
    expect(screen.getByText('LoginButton')).toBeInTheDocument();
  });

  it('handles actions and shows user profile when authenticated', async () => {
    const toggleCurrency = vi.fn();
    const refreshMarketPrices = vi.fn();
    useAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    usePortfolioContext.mockReturnValue({
      baseCurrency: 'JPY',
      toggleCurrency,
      refreshMarketPrices,
      lastUpdated: null,
      isLoading: false
    });

    render(<Header />);

    const user = userEvent.setup();
    await user.click(screen.getByText('¥'));
    expect(toggleCurrency).toHaveBeenCalled();

    await user.click(screen.getByText('更新'));
    expect(refreshMarketPrices).toHaveBeenCalled();

    expect(screen.getByText('UserProfile')).toBeInTheDocument();
  });
});
