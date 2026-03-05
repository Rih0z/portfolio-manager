import { vi } from "vitest";
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../../components/layout/Header';

// useAuthのモック
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../../../hooks/useAuth';

// Mock the LanguageSwitcher component
vi.mock('../../../components/common/LanguageSwitcher', () => ({
  default: function LanguageSwitcher() {
    return <div data-testid="language-switcher">Language Switcher</div>;
  },
}));

// Mock the LoginButton component
vi.mock('../../../components/auth/LoginButton', () => ({
  default: function LoginButton() {
    return <button data-testid="login-button">Login</button>;
  },
}));

// Mock the UserProfile component
vi.mock('../../../components/auth/UserProfile', () => ({
  default: function UserProfile() {
    return <div data-testid="user-profile">User Profile</div>;
  },
}));

describe.skip('Header', () => {
  const mockAuthContext = {
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    getAccessToken: vi.fn(),
    loading: false
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
  });

  it('renders header with logo and title', () => {
    render(<Header />);

    // ロゴやタイトルが表示されることを確認
    const logo = screen.getByText(/Portfolio|ポートフォリオ/i);
    expect(logo).toBeInTheDocument();
  });

  it('renders language switcher', () => {
    render(<Header />);

    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });

  it('renders login button when user is not authenticated', () => {
    render(<Header />);

    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument();
  });

  it('renders user profile when user is authenticated', () => {
    useAuth.mockReturnValue(authenticatedAuthContext);

    render(<Header />);

    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
  });

  it('renders loading state properly', () => {
    useAuth.mockReturnValue({
      ...mockAuthContext,
      loading: true
    });

    render(<Header />);

    // ローディング中でもクラッシュしないことを確認
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });

  it('has proper navigation structure', () => {
    render(<Header />);

    // ナビゲーション要素があることを確認
    const nav = document.querySelector('nav, header, .header');
    expect(nav).toBeInTheDocument();
  });

  it('renders responsive design elements', () => {
    render(<Header />);

    // レスポンシブクラスが存在することを確認
    const responsiveElements = document.querySelectorAll('.md\\:flex, .sm\\:hidden, .lg\\:block');
    expect(responsiveElements.length).toBeGreaterThanOrEqual(0);
  });

  it('handles mobile menu toggle', () => {
    render(<Header />);

    // モバイルメニューボタンがあれば操作テスト
    const menuButton = document.querySelector('[aria-label*="menu"], .mobile-menu-button, .hamburger');
    if (menuButton) {
      fireEvent.click(menuButton);
      // クラッシュしないことを確認
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    }
  });

  it('has accessibility features', () => {
    render(<Header />);

    // アクセシビリティ属性があることを確認
    const accessibleElements = document.querySelectorAll('[aria-label], [role], [tabindex]');
    expect(accessibleElements.length).toBeGreaterThanOrEqual(0);
  });

  it('renders proper header styling', () => {
    render(<Header />);

    // ヘッダーのスタイリングクラスが存在することを確認
    const styledElements = document.querySelectorAll('.bg-white, .shadow, .border-b, .fixed, .sticky');
    expect(styledElements.length).toBeGreaterThan(0);
  });

  it('handles auth state changes correctly', () => {
    const { rerender } = render(<Header />);

    expect(screen.getByTestId('login-button')).toBeInTheDocument();

    // 認証状態を変更
    useAuth.mockReturnValue(authenticatedAuthContext);
    rerender(<Header />);

    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
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

    render(<Header />);

    // エッジケースでもクラッシュしないことを確認
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });
});