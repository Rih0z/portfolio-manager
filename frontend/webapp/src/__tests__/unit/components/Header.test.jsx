import { vi } from "vitest";
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../../../components/layout/Header';

// i18n モック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'app.name': 'PortfolioWise',
        'settings.baseCurrency': '基準通貨',
        'common.loading': '読み込み中',
        'common.update': '更新',
        'settings.dataRefresh': 'データ更新'
      };
      return translations[key] || key;
    },
    i18n: { language: 'ja' }
  })
}));

// useAuthのモック
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// usePortfolioContextのモック
vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

import { useAuth } from '../../../hooks/useAuth';
import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

// Mock the LanguageSwitcher component
vi.mock('../../../components/common/LanguageSwitcher', () => ({
  default: function LanguageSwitcher() {
    return <div data-testid="language-switcher">Language Switcher</div>;
  },
}));

// Mock the OAuthLoginButton component
vi.mock('../../../components/auth/OAuthLoginButton', () => ({
  default: function OAuthLoginButton() {
    return <button data-testid="login-button">Login</button>;
  },
}));

// Mock the UserProfile component
vi.mock('../../../components/auth/UserProfile', () => ({
  default: function UserProfile() {
    return <div data-testid="user-profile">User Profile</div>;
  },
}));

// Mock the NotificationBell component
vi.mock('../../../components/notifications/NotificationBell', () => ({
  default: function NotificationBell() {
    return <div data-testid="notification-bell">Bell</div>;
  },
}));

describe('Header', () => {
  const mockAuthContext = {
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    loading: false
  };

  const mockPortfolioContext = {
    baseCurrency: 'JPY',
    toggleCurrency: vi.fn(),
    refreshMarketPrices: vi.fn(),
    lastUpdated: null,
    isLoading: false,
    currentAssets: [{ ticker: 'AAPL' }],
    targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 100 }],
    additionalBudget: { amount: 0, currency: 'JPY' }
  };

  const authenticatedAuthContext = {
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('mock-token'),
    loading: false
  };

  beforeEach(() => {
    useAuth.mockReturnValue(mockAuthContext);
    usePortfolioContext.mockReturnValue(mockPortfolioContext);
    Storage.prototype.getItem = vi.fn(() => 'true');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders header with logo and title', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    expect(screen.getByText('PortfolioWise')).toBeInTheDocument();
  });

  it('renders language switcher', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    const switchers = screen.getAllByTestId('language-switcher');
    expect(switchers.length).toBeGreaterThanOrEqual(1);
  });

  it('renders login button when user is not authenticated', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    const loginButtons = screen.getAllByTestId('login-button');
    expect(loginButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument();
  });

  it('renders user profile when user is authenticated', () => {
    useAuth.mockReturnValue(authenticatedAuthContext);

    render(<MemoryRouter><Header /></MemoryRouter>);

    const userProfiles = screen.getAllByTestId('user-profile');
    expect(userProfiles.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
  });

  it('renders loading state without crashing', () => {
    useAuth.mockReturnValue({
      ...mockAuthContext,
      loading: true
    });

    render(<MemoryRouter><Header /></MemoryRouter>);

    expect(screen.getByText('PortfolioWise')).toBeInTheDocument();
  });

  it('has proper navigation structure with header element', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    const header = document.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('sticky');
  });

  it('handles auth state changes correctly', () => {
    const { rerender } = render(<MemoryRouter><Header /></MemoryRouter>);

    // 未認証: ログインボタン表示
    expect(screen.getAllByTestId('login-button').length).toBeGreaterThanOrEqual(1);

    // 認証状態に変更
    useAuth.mockReturnValue(authenticatedAuthContext);
    rerender(<MemoryRouter><Header /></MemoryRouter>);

    // 認証後: ユーザープロフィール表示、ログインボタンなし
    expect(screen.getAllByTestId('user-profile').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
  });

  it('renders without crashing on edge cases', () => {
    useAuth.mockReturnValue({
      user: undefined,
      isAuthenticated: undefined,
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
      loading: undefined
    });

    render(<MemoryRouter><Header /></MemoryRouter>);

    expect(screen.getByText('PortfolioWise')).toBeInTheDocument();
  });

  it('shows simple header when no settings exist', () => {
    usePortfolioContext.mockReturnValue({
      ...mockPortfolioContext,
      currentAssets: [],
      targetPortfolio: [],
      additionalBudget: { amount: 0, currency: 'JPY' }
    });
    Storage.prototype.getItem = vi.fn(() => null);

    render(<MemoryRouter><Header /></MemoryRouter>);

    expect(screen.getByText('PortfolioWise')).toBeInTheDocument();
  });
});
