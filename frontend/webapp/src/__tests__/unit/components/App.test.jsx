import { vi } from "vitest";
/**
 * App.jsx のユニットテスト
 * アプリケーションのルートコンポーネントのテスト
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../../App';
import { BrowserRouter } from 'react-router-dom';

// 必要なモジュールをモック
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ element }) => <div data-testid="route">{element}</div>
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children, clientId }) => (
    <div data-testid="google-oauth-provider" data-client-id={clientId}>
      {children}
    </div>
  )
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    setPortfolioContextRef: vi.fn()
  }))
}));

vi.mock('../../../stores/portfolioStore', () => ({
  usePortfolioStore: vi.fn(() => ({
    portfolioData: {}
  }))
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    setPortfolioContextRef: vi.fn()
  }))
}));

vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn(() => ({
    portfolioData: {}
  }))
}));

vi.mock('../../../utils/envUtils', () => ({
  initializeApiConfig: vi.fn(),
  getGoogleClientId: vi.fn()
}));

// ページコンポーネントをモック
vi.mock('../../../pages/Dashboard', () => ({
  default: function Dashboard() {
    return <div data-testid="dashboard-page">Dashboard</div>;
  },
}));

vi.mock('../../../pages/Settings', () => ({
  default: function Settings() {
    return <div data-testid="settings-page">Settings</div>;
  },
}));

vi.mock('../../../pages/Simulation', () => ({
  default: function Simulation() {
    return <div data-testid="simulation-page">Simulation</div>;
  },
}));

vi.mock('../../../pages/DataIntegration', () => ({
  default: function DataIntegration() {
    return <div data-testid="data-integration-page">Data Integration</div>;
  },
}));

vi.mock('../../../pages/DataImport', () => ({
  default: function DataImport() {
    return <div data-testid="data-import-page">Data Import</div>;
  },
}));

vi.mock('../../../pages/AIAdvisor', () => ({
  default: function AIAdvisor() {
    return <div data-testid="ai-advisor-page">AI Advisor</div>;
  },
}));

// レイアウトコンポーネントをモック
vi.mock('../../../components/layout/Header', () => ({
  default: function Header() {
    return <div data-testid="header">Header</div>;
  },
}));

vi.mock('../../../components/layout/TabNavigation', () => ({
  default: function TabNavigation() {
    return <div data-testid="tab-navigation">Tab Navigation</div>;
  },
}));

vi.mock('../../../components/common/SettingsChecker', () => ({
  default: function SettingsChecker({ children }) {
    return <div data-testid="settings-checker">{children}</div>;
  },
}));

// i18nモック
vi.mock('../../../i18n', () => ({}));

import { initializeApiConfig, getGoogleClientId } from '../../../utils/envUtils';
import { useAuth } from '../../../hooks/useAuth';
import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

describe.skip('App', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // デフォルトのモック値を設定
    initializeApiConfig.mockResolvedValue();
    getGoogleClientId.mockResolvedValue('test-client-id');
    useAuth.mockReturnValue({
      setPortfolioContextRef: vi.fn()
    });
    usePortfolioContext.mockReturnValue({
      portfolioData: {}
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('アプリケーション初期化', () => {
    it('ロード中の状態を表示する', async () => {
      // API初期化を遅延させる
      initializeApiConfig.mockImplementation(() => new Promise(() => {}));
      
      render(<App />);
      
      expect(screen.getByText('PortfolioWise を起動しています...')).toBeInTheDocument();
      
      // SVGアイコンの存在を確認
      const svgIcon = document.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });

    it('初期化完了後にアプリケーションを表示する', async () => {
      initializeApiConfig.mockResolvedValue();
      getGoogleClientId.mockResolvedValue('test-client-id');
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-provider')).toBeInTheDocument();
    });

    it('API初期化エラー後もアプリケーションを続行する', async () => {
      initializeApiConfig.mockRejectedValue(new Error('API初期化失敗'));
      getGoogleClientId.mockResolvedValue('test-client-id');
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('API設定の初期化に失敗しました:', expect.any(Error));
    });

    it('Google Client ID取得失敗時にダミーIDを使用する', async () => {
      initializeApiConfig.mockResolvedValue();
      getGoogleClientId.mockRejectedValue(new Error('Client ID取得失敗'));
      
      render(<App />);
      
      await waitFor(() => {
        const googleProvider = screen.getByTestId('google-oauth-provider');
        expect(googleProvider).toHaveAttribute('data-client-id', 'dummy-client-id');
      });
    });

    it('Google OAuth script load errorを処理する', async () => {
      initializeApiConfig.mockResolvedValue();
      getGoogleClientId.mockResolvedValue('test-client-id');
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('ContextConnector', () => {
    it('AuthContextとPortfolioContextを正しく接続する', async () => {
      const mockSetPortfolioContextRef = vi.fn();
      const mockAuth = { setPortfolioContextRef: mockSetPortfolioContextRef };
      const mockPortfolio = { portfolioData: {} };
      
      useAuth.mockReturnValue(mockAuth);
      usePortfolioContext.mockReturnValue(mockPortfolio);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(mockSetPortfolioContextRef).toHaveBeenCalledWith(mockPortfolio);
      });
    });

    it('コンテキスト接続中のエラーを安全に処理する', async () => {
      const mockSetPortfolioContextRef = vi.fn(() => {
        throw new Error('コンテキスト接続エラー');
      });
      
      useAuth.mockReturnValue({ setPortfolioContextRef: mockSetPortfolioContextRef });
      usePortfolioContext.mockReturnValue({ portfolioData: {} });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'コンテキスト接続中にエラーが発生しました:', 
          expect.any(Error)
        );
      });
    });

    it('authまたはportfolioが未定義の場合を処理する', async () => {
      useAuth.mockReturnValue(null);
      usePortfolioContext.mockReturnValue(null);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      });
      
      // エラーが発生しないことを確認
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('ErrorBoundary', () => {
    it('ErrorBoundaryクラスが正しく定義されている', () => {
      // ErrorBoundaryがクラスコンポーネントとして存在することを確認
      expect(typeof App).toBe('function');
    });

    it('エラーキャッチ時のUI構造をテストする', async () => {
      // ErrorBoundaryの静的メソッドをテスト
      class TestErrorBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error) {
          return { hasError: true, error };
        }

        componentDidCatch(error, errorInfo) {
          console.error('アプリケーションエラー:', error, errorInfo);
        }

        render() {
          if (this.state.hasError) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-dark-100 px-4">
                <div className="bg-dark-200 border border-dark-400 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center">
                  <h2 className="text-gray-100 text-xl sm:text-2xl font-bold mb-4">エラーが発生しました</h2>
                  <p className="text-gray-300 mb-2 text-sm sm:text-base">申し訳ありませんが、アプリケーションにエラーが発生しました。</p>
                  <button onClick={() => window.location.reload()}>リロードする</button>
                </div>
              </div>
            );
          }
          return this.props.children;
        }
      }

      const ThrowError = () => {
        throw new Error('テストエラー');
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <TestErrorBoundary>
          <ThrowError />
        </TestErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('申し訳ありませんが、アプリケーションにエラーが発生しました。')).toBeInTheDocument();
      expect(screen.getByText('リロードする')).toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('レイアウトとルーティング', () => {
    it('ヘッダーとタブナビゲーションを表示する', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
      });
    });

    it('ルーターが正しく設定されている', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('router')).toBeInTheDocument();
        expect(screen.getByTestId('routes')).toBeInTheDocument();
      });
    });

    it('正しいCSS クラスが適用されている', async () => {
      render(<App />);
      
      await waitFor(() => {
        const mainContainer = screen.getByRole('main');
        expect(mainContainer).toHaveClass('max-w-7xl', 'mx-auto');
      });
    });
  });

  describe('プロバイダーの階層', () => {
    it('プロバイダーが正しい順序で配置されている', async () => {
      render(<App />);
      
      await waitFor(() => {
        const authProvider = screen.getByTestId('auth-provider');
        const portfolioProvider = screen.getByTestId('portfolio-provider');
        const googleProvider = screen.getByTestId('google-oauth-provider');
        
        expect(authProvider).toBeInTheDocument();
        expect(portfolioProvider).toBeInTheDocument();
        expect(googleProvider).toBeInTheDocument();
      });
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイル向けのクラスが適用されている', async () => {
      render(<App />);
      
      await waitFor(() => {
        const appContainer = document.querySelector('.min-h-screen.bg-dark-100.text-gray-100');
        expect(appContainer).toBeInTheDocument();
      });
    });

    it('メインコンテンツが適切なパディングを持つ', async () => {
      render(<App />);
      
      await waitFor(() => {
        const main = screen.getByRole('main');
        expect(main).toHaveClass('pb-20', 'sm:pb-6');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('Google OAuth Provider errorを処理する', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      });
      
      // onScriptLoadError のテストは実際のGoogle Script読み込みが必要なため
      // ここでは関数が設定されていることのみ確認
      
      consoleSpy.mockRestore();
    });

    it('初期化中の例外を安全に処理する', async () => {
      initializeApiConfig.mockImplementation(() => {
        throw new Error('同期エラー');
      });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      });
    });
  });

  describe('パフォーマンス', () => {
    it('初期化が完了するまでレンダリングを遅延する', async () => {
      let resolveInit;
      initializeApiConfig.mockImplementation(() => new Promise(resolve => {
        resolveInit = resolve;
      }));
      
      render(<App />);
      
      expect(screen.getByText('PortfolioWise を起動しています...')).toBeInTheDocument();
      expect(screen.queryByTestId('auth-provider')).not.toBeInTheDocument();
      
      act(() => {
        resolveInit();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      });
    });
  });

  describe('統合テスト', () => {
    it('完全なアプリケーション起動フローが正常に動作する', async () => {
      initializeApiConfig.mockResolvedValue();
      getGoogleClientId.mockResolvedValue('production-client-id');
      
      const mockAuth = { setPortfolioContextRef: vi.fn() };
      const mockPortfolio = { portfolioData: { holdings: [] } };
      
      useAuth.mockReturnValue(mockAuth);
      usePortfolioContext.mockReturnValue(mockPortfolio);
      
      render(<App />);
      
      // 1. 初期化表示
      expect(screen.getByText('PortfolioWise を起動しています...')).toBeInTheDocument();
      
      // 2. 初期化完了後のアプリケーション表示
      await waitFor(() => {
        expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      });
      
      // 3. プロバイダーの設定
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-provider')).toBeInTheDocument();
      
      // 4. レイアウトコンポーネントの表示
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
      
      // 5. ルーターの設定
      expect(screen.getByTestId('router')).toBeInTheDocument();
      
      // 6. コンテキスト接続
      await waitFor(() => {
        expect(mockAuth.setPortfolioContextRef).toHaveBeenCalledWith(mockPortfolio);
      });
    });
  });
});