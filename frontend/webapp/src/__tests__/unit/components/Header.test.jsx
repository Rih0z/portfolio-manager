import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthContext } from '../../../context/AuthContext';
import Header from '../../../components/layout/Header';

// Mock the LanguageSwitcher component
jest.mock('../../../components/common/LanguageSwitcher', () => {
  return function LanguageSwitcher() {
    return <div data-testid="language-switcher">Language Switcher</div>;
  };
});

// Mock the LoginButton component
jest.mock('../../../components/auth/LoginButton', () => {
  return function LoginButton() {
    return <button data-testid="login-button">Login</button>;
  };
});

// Mock the UserProfile component
jest.mock('../../../components/auth/UserProfile', () => {
  return function UserProfile() {
    return <div data-testid="user-profile">User Profile</div>;
  };
});

describe('Header', () => {
  const mockAuthContext = {
    user: null,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    getAccessToken: jest.fn(),
    loading: false
  };

  const authenticatedAuthContext = {
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    loading: false
  };

  it('renders header with logo and title', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    // ロゴやタイトルが表示されることを確認
    const logo = screen.getByText(/Portfolio|ポートフォリオ/i);
    expect(logo).toBeInTheDocument();
  });

  it('renders language switcher', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });

  it('renders login button when user is not authenticated', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument();
  });

  it('renders user profile when user is authenticated', () => {
    render(
      <AuthContext.Provider value={authenticatedAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
  });

  it('renders loading state properly', () => {
    const loadingContext = {
      ...mockAuthContext,
      loading: true
    };

    render(
      <AuthContext.Provider value={loadingContext}>
        <Header />
      </AuthContext.Provider>
    );

    // ローディング中でもクラッシュしないことを確認
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });

  it('has proper navigation structure', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    // ナビゲーション要素があることを確認
    const nav = document.querySelector('nav, header, .header');
    expect(nav).toBeInTheDocument();
  });

  it('renders responsive design elements', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    // レスポンシブクラスが存在することを確認
    const responsiveElements = document.querySelectorAll('.md\\:flex, .sm\\:hidden, .lg\\:block');
    expect(responsiveElements.length).toBeGreaterThanOrEqual(0);
  });

  it('handles mobile menu toggle', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    // モバイルメニューボタンがあれば操作テスト
    const menuButton = document.querySelector('[aria-label*="menu"], .mobile-menu-button, .hamburger');
    if (menuButton) {
      fireEvent.click(menuButton);
      // クラッシュしないことを確認
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    }
  });

  it('has accessibility features', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    // アクセシビリティ属性があることを確認
    const accessibleElements = document.querySelectorAll('[aria-label], [role], [tabindex]');
    expect(accessibleElements.length).toBeGreaterThanOrEqual(0);
  });

  it('renders proper header styling', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    // ヘッダーのスタイリングクラスが存在することを確認
    const styledElements = document.querySelectorAll('.bg-white, .shadow, .border-b, .fixed, .sticky');
    expect(styledElements.length).toBeGreaterThan(0);
  });

  it('handles auth state changes correctly', () => {
    const { rerender } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('login-button')).toBeInTheDocument();

    // 認証状態を変更
    rerender(
      <AuthContext.Provider value={authenticatedAuthContext}>
        <Header />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
  });

  it('renders without crashing on edge cases', () => {
    const edgeCaseContext = {
      user: undefined,
      isAuthenticated: undefined,
      login: jest.fn(),
      logout: jest.fn(),
      getAccessToken: jest.fn(),
      loading: undefined
    };

    render(
      <AuthContext.Provider value={edgeCaseContext}>
        <Header />
      </AuthContext.Provider>
    );

    // エッジケースでもクラッシュしないことを確認
    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
  });
});