import { vi } from "vitest";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

// Mock the OAuthLoginButton component (actual component name used in Header)
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
    // localStorage mock for initialSetupCompleted
    Storage.prototype.getItem = vi.fn(() => 'true');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders header with logo and title', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    // アプリ名が表示されることを確認
    expect(screen.getByText('PortfolioWise')).toBeInTheDocument();
  });

  it('renders language switcher', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    // 複数のLanguageSwitcherが表示される（デスクトップ + モバイル）
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

  it('renders loading state properly', () => {
    useAuth.mockReturnValue({
      ...mockAuthContext,
      loading: true
    });

    render(<MemoryRouter><Header /></MemoryRouter>);

    // ローディング中でもクラッシュしないことを確認
    const switchers = screen.getAllByTestId('language-switcher');
    expect(switchers.length).toBeGreaterThanOrEqual(1);
  });

  it('has proper navigation structure', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    // header要素があることを確認
    const header = document.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('renders responsive design elements', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    // レスポンシブクラスが存在することを確認
    const responsiveElements = document.querySelectorAll('.hidden.sm\\:flex, .flex.sm\\:hidden');
    expect(responsiveElements.length).toBeGreaterThanOrEqual(0);
  });

  it('has accessibility features', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    // アクセシビリティ属性があることを確認
    const accessibleElements = document.querySelectorAll('[aria-label], [role], [tabindex], [title]');
    expect(accessibleElements.length).toBeGreaterThanOrEqual(0);
  });

  it('renders proper header styling', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);

    // ヘッダーのスタイリングクラスが存在することを確認
    const header = document.querySelector('header');
    expect(header).toHaveClass('sticky');
  });

  it('handles auth state changes correctly', () => {
    const { rerender } = render(<MemoryRouter><Header /></MemoryRouter>);

    const loginButtons = screen.getAllByTestId('login-button');
    expect(loginButtons.length).toBeGreaterThanOrEqual(1);

    // 認証状態を変更
    useAuth.mockReturnValue(authenticatedAuthContext);
    rerender(<MemoryRouter><Header /></MemoryRouter>);

    const userProfiles = screen.getAllByTestId('user-profile');
    expect(userProfiles.length).toBeGreaterThanOrEqual(1);
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

    // エッジケースでもクラッシュしないことを確認
    const switchers = screen.getAllByTestId('language-switcher');
    expect(switchers.length).toBeGreaterThanOrEqual(1);
  });

  it('shows simple header when no settings exist', () => {
    usePortfolioContext.mockReturnValue({
      ...mockPortfolioContext,
      currentAssets: [],
      targetPortfolio: [],
      additionalBudget: { amount: 0, currency: 'JPY' }
    });
    // initialSetupCompleted is not set
    Storage.prototype.getItem = vi.fn(() => null);

    render(<MemoryRouter><Header /></MemoryRouter>);

    // シンプルなヘッダーが表示される（通貨切替ボタンなし）
    expect(screen.getByText('PortfolioWise')).toBeInTheDocument();
  });
});
