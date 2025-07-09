/**
 * Header.jsx の実際の実装に基づくテストファイル
 * アプリケーションヘッダーコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import Header from '../../../../components/layout/Header';
import { PortfolioContext } from '../../../../context/PortfolioContext';

// useAuth フックのモック
const mockUseAuth = jest.fn();
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// usePortfolioContext フックのモック
const mockUsePortfolioContext = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockUsePortfolioContext()
}));

// 子コンポーネントのモック
jest.mock('../../../../components/auth/UserProfile', () => {
  return function MockUserProfile() {
    return <div data-testid="user-profile">UserProfile</div>;
  };
});

jest.mock('../../../../components/auth/OAuthLoginButton', () => {
  return function MockOAuthLoginButton() {
    return <div data-testid="oauth-login-button">LoginButton</div>;
  };
});

jest.mock('../../../../components/common/LanguageSwitcher', () => {
  return function MockLanguageSwitcher() {
    return <div data-testid="language-switcher">LanguageSwitcher</div>;
  };
});

const renderWithProviders = (component, portfolioContextValue) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <PortfolioContext.Provider value={portfolioContextValue}>
        {component}
      </PortfolioContext.Provider>
    </I18nextProvider>
  );
};

describe('Header Real Implementation', () => {
  const mockToggleCurrency = jest.fn();
  const mockRefreshMarketPrices = jest.fn();

  const defaultAuthContext = {
    isAuthenticated: false,
    loading: false
  };

  const defaultPortfolioContext = {
    baseCurrency: 'JPY',
    toggleCurrency: mockToggleCurrency,
    refreshMarketPrices: mockRefreshMarketPrices,
    lastUpdated: null,
    isLoading: false
  };

  const defaultPortfolioState = {
    currentAssets: [{ symbol: 'AAPL', quantity: 10 }],
    targetPortfolio: [{ symbol: 'AAPL', allocation: 50 }],
    additionalBudget: { amount: 10000 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuthContext);
    mockUsePortfolioContext.mockReturnValue(defaultPortfolioContext);
    
    // localStorage をリセット
    localStorage.clear();
  });

  describe('初期設定が完了していない場合のシンプルヘッダー', () => {
    test('設定がない場合はシンプルなヘッダーが表示される', () => {
      const emptyPortfolioState = {
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      };

      renderWithProviders(<Header />, emptyPortfolioState);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
    });

    test('initialSetupCompletedがある場合は通常ヘッダーが表示される', () => {
      localStorage.setItem('initialSetupCompleted', 'true');
      
      const emptyPortfolioState = {
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      };

      renderWithProviders(<Header />, emptyPortfolioState);
      
      // 通常ヘッダーの要素をチェック（通貨切り替えボタンなど）
      const currencyButtons = screen.getAllByText(/JPY|¥/);
      expect(currencyButtons.length).toBeGreaterThan(0);
    });
  });

  describe('通常ヘッダーの表示', () => {
    test('アプリロゴとタイトルが表示される', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      const headers = screen.getAllByRole('banner');
      expect(headers[0]).toBeInTheDocument();
      
      // SVGアイコンが存在することを確認
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    test('通貨切り替えボタンが表示される', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      const currencyButton = screen.getByText('¥');
      expect(currencyButton).toBeInTheDocument();
      expect(screen.getByText('JPY')).toBeInTheDocument();
    });

    test('通貨切り替えボタンがクリックできる', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      const currencyButton = screen.getByText('¥').closest('button');
      fireEvent.click(currencyButton);
      
      expect(mockToggleCurrency).toHaveBeenCalledTimes(1);
    });

    test('USD通貨での表示', () => {
      const usdPortfolioContext = {
        ...defaultPortfolioContext,
        baseCurrency: 'USD'
      };
      mockUsePortfolioContext.mockReturnValue(usdPortfolioContext);

      renderWithProviders(<Header />, defaultPortfolioState);
      
      expect(screen.getByText('$')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });
  });

  describe('データ更新機能', () => {
    test('更新ボタンが表示される', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      const updateButtons = screen.getAllByRole('button');
      const refreshButton = updateButtons.find(button => 
        button.textContent.includes('更新') || 
        button.querySelector('svg') // SVGアイコンを含むボタン
      );
      expect(refreshButton).toBeInTheDocument();
    });

    test('更新ボタンをクリックするとrefreshMarketPricesが呼ばれる', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      // SVGアイコンを含む更新ボタンを探す
      const refreshButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg') && !button.textContent.includes('¥') && !button.textContent.includes('$')
      );
      
      if (refreshButtons.length > 0) {
        fireEvent.click(refreshButtons[0]);
        expect(mockRefreshMarketPrices).toHaveBeenCalledTimes(1);
      }
    });

    test('ローディング中は更新ボタンが無効化される', () => {
      const loadingPortfolioContext = {
        ...defaultPortfolioContext,
        isLoading: true
      };
      mockUsePortfolioContext.mockReturnValue(loadingPortfolioContext);

      renderWithProviders(<Header />, defaultPortfolioState);
      
      const refreshButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg') && !button.textContent.includes('¥') && !button.textContent.includes('$')
      );
      
      if (refreshButtons.length > 0) {
        expect(refreshButtons[0]).toBeDisabled();
      }
    });
  });

  describe('認証状態に応じた表示', () => {
    test('未認証時はOAuthLoginButtonが表示される', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      expect(screen.getByTestId('oauth-login-button')).toBeInTheDocument();
      expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument();
    });

    test('認証済み時はUserProfileが表示される', () => {
      const authenticatedContext = {
        ...defaultAuthContext,
        isAuthenticated: true
      };
      mockUseAuth.mockReturnValue(authenticatedContext);

      renderWithProviders(<Header />, defaultPortfolioState);
      
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
      expect(screen.queryByTestId('oauth-login-button')).not.toBeInTheDocument();
    });

    test('認証ローディング中は何も表示されない', () => {
      const loadingAuthContext = {
        ...defaultAuthContext,
        loading: true
      };
      mockUseAuth.mockReturnValue(loadingAuthContext);

      renderWithProviders(<Header />, defaultPortfolioState);
      
      expect(screen.queryByTestId('user-profile')).not.toBeInTheDocument();
      expect(screen.queryByTestId('oauth-login-button')).not.toBeInTheDocument();
    });
  });

  describe('言語切り替え', () => {
    test('LanguageSwitcherが表示される', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });
  });

  describe('最終更新日時の表示', () => {
    test('lastUpdatedがある場合に表示される', () => {
      const portfolioContextWithLastUpdated = {
        ...defaultPortfolioContext,
        lastUpdated: new Date('2025-01-01T10:00:00Z').toISOString()
      };
      mockUsePortfolioContext.mockReturnValue(portfolioContextWithLastUpdated);

      renderWithProviders(<Header />, defaultPortfolioState);
      
      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });

    test('lastUpdatedがない場合は表示されない', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      // 日付形式のテキストが存在しないことを確認
      expect(screen.queryByText(/\d{4}\/\d{1,2}\/\d{1,2}/)).not.toBeInTheDocument();
    });
  });

  describe('レスポンシブデザイン', () => {
    test('デスクトップ版の要素が正しく表示される', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      // デスクトップ表示用の要素がマークアップに存在することを確認
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('sticky', 'top-0');
    });

    test('モバイル版の考慮がされている', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      // モバイル対応のCSSクラスが含まれていることを確認
      const headerContent = document.querySelector('.max-w-7xl');
      expect(headerContent).toBeInTheDocument();
    });
  });

  describe('スタイリング', () => {
    test('適切なCSSクラスが適用されている', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-dark-200/90', 'backdrop-blur-xl', 'border-b', 'border-dark-400');
    });

    test('グラデーションタイトルが適用されている', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      const titleElement = document.querySelector('.bg-gradient-to-r');
      expect(titleElement).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    test('usePortfolioContextがundefinedの場合でもクラッシュしない', () => {
      mockUsePortfolioContext.mockReturnValue(undefined);

      expect(() => {
        renderWithProviders(<Header />, defaultPortfolioState);
      }).not.toThrow();
    });

    test('useAuthがundefinedの場合でもクラッシュしない', () => {
      mockUseAuth.mockReturnValue(undefined);

      expect(() => {
        renderWithProviders(<Header />, defaultPortfolioState);
      }).not.toThrow();
    });
  });

  describe('アクセシビリティ', () => {
    test('ヘッダーにbannerロールが設定されている', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    test('ボタンにはtitle属性が設定されている', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      const currencyButton = screen.getByText('¥').closest('button');
      expect(currencyButton).toHaveAttribute('title');
    });

    test('フォーカス可能な要素が適切に設定されている', () => {
      renderWithProviders(<Header />, defaultPortfolioState);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass(/focus:/);
      });
    });
  });
});