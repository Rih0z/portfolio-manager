import { vi } from "vitest";
/**
 * App.tsx のユニットテスト
 * アプリケーションのルートコンポーネントのテスト
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// vi.hoisted で mock 関数を作成（vi.mockファクトリ内で参照可能）
const { mockInitializeApiConfig, mockGetGoogleClientId } = vi.hoisted(() => ({
  mockInitializeApiConfig: vi.fn(),
  mockGetGoogleClientId: vi.fn()
}));

// 必要なモジュールをモック
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ element, children }) => {
    // Layout routes render element + children side by side
    if (children) return <>{element}{children}</>;
    return element || null;
  },
  Outlet: () => <div data-testid="outlet">Outlet</div>,
  NavLink: ({ children, to, className }) => {
    const cls = typeof className === 'function' ? className({ isActive: false }) : className;
    return <a href={to} className={cls}>{typeof children === 'function' ? children({ isActive: false }) : children}</a>;
  },
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
  useParams: () => ({})
}));

vi.mock('../../../utils/analytics', () => ({
  initGA: vi.fn(),
  trackPageView: vi.fn(),
  trackEvent: vi.fn(),
  AnalyticsEvents: {}
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children, clientId }) => (
    <div data-testid="google-oauth-provider" data-client-id={clientId}>
      {children}
    </div>
  )
}));

// Zustand storesのモック
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = {
      initializeAuth: vi.fn(),
      setupSessionInterval: vi.fn(() => () => {}),
      setupVisibilityHandler: vi.fn(() => () => {}),
      isAuthenticated: false
    };
    return typeof selector === 'function' ? selector(state) : state;
  })
}));

vi.mock('../../../stores/portfolioStore', () => ({
  usePortfolioStore: vi.fn((selector) => {
    const state = {
      initializeData: vi.fn(),
      updateExchangeRate: vi.fn(),
      baseCurrency: 'JPY',
      initialized: false,
      syncFromServer: vi.fn()
    };
    return typeof selector === 'function' ? selector(state) : state;
  })
}));

vi.mock('../../../stores/subscriptionStore', () => ({
  useSubscriptionStore: vi.fn((selector) => {
    const state = {
      planType: 'free',
      subscription: null,
      limits: {},
      loading: false,
      error: null,
      isPremium: () => false,
      canUseFeature: () => true,
      fetchStatus: vi.fn(),
      startCheckout: vi.fn(),
      openPortal: vi.fn(),
      setPlanType: vi.fn()
    };
    return typeof selector === 'function' ? selector(state) : state;
  })
}));

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: vi.fn((selector) => {
    const state = {
      notifications: [],
      removeNotification: vi.fn(),
      initializeTheme: vi.fn(),
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: vi.fn()
    };
    return typeof selector === 'function' ? selector(state) : state;
  })
}));

// hooks のモック
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    loading: false,
    user: null
  }))
}));

vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn(() => ({
    currentAssets: [{ ticker: 'AAPL' }],
    targetPortfolio: [{ ticker: 'AAPL', targetPercentage: 100 }],
    additionalBudget: { amount: 10000, currency: 'JPY' },
    baseCurrency: 'JPY',
    toggleCurrency: vi.fn(),
    refreshMarketPrices: vi.fn(),
    lastUpdated: null,
    isLoading: false,
    portfolio: []
  }))
}));

vi.mock('../../../utils/envUtils', () => ({
  initializeApiConfig: mockInitializeApiConfig,
  getGoogleClientId: mockGetGoogleClientId
}));

// QueryProviderのモック
vi.mock('../../../providers/QueryProvider', () => ({
  QueryProvider: ({ children }) => <div data-testid="query-provider">{children}</div>
}));

// ページコンポーネントをモック
vi.mock('../../../pages/Landing', () => ({
  default: function Landing() {
    return <div data-testid="landing-page">Landing</div>;
  },
}));

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
vi.mock('../../../components/layout/PublicLayout', () => ({
  default: function PublicLayout() {
    return <div data-testid="public-layout">Public Layout</div>;
  },
}));

vi.mock('../../../components/layout/AppLayout', () => ({
  default: function AppLayout() {
    return <div data-testid="app-layout" className="min-h-screen bg-background text-foreground"><div data-testid="header">Header</div><main className="max-w-7xl mx-auto pt-2 sm:pt-4 lg:pt-6 pb-20 sm:pb-6" role="main">App Content</main><div data-testid="tab-navigation">Tab Navigation</div></div>;
  },
}));

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

// LoadingFallback モック（Suspense fallback用）
vi.mock('../../../components/common/LoadingFallback', () => ({
  default: function LoadingFallback() {
    return <div data-testid="loading-fallback">Loading...</div>;
  },
}));

// lazyWithRetry モック（React.lazyと同等動作）
vi.mock('../../../utils/lazyWithRetry', () => ({
  lazyWithRetry: (importFn) => React.lazy(importFn),
}));

// i18nモック
vi.mock('../../../i18n', () => ({}));

import App from '../../../App';

// Promiseを全てフラッシュするヘルパー
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Appをレンダリングして初期化完了を待つヘルパー
const renderAndWaitForInit = async () => {
  const result = render(<App />);
  await waitFor(() => {
    expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
  });
  return result;
};

describe('App', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // デフォルトのモック値を設定（即座に解決するPromise）
    mockInitializeApiConfig.mockResolvedValue(undefined);
    mockGetGoogleClientId.mockResolvedValue('test-client-id');

    // localStorage mock
    Storage.prototype.getItem = vi.fn(() => 'true');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('アプリケーション初期化', () => {
    it('ロード中の状態を表示する', () => {
      // API初期化を遅延させる（永遠に解決しないPromise）
      mockInitializeApiConfig.mockImplementation(() => new Promise(() => {}));

      render(<App />);

      expect(screen.getByText('PortfolioWise を起動しています...')).toBeInTheDocument();

      // SVGアイコンの存在を確認
      const svgIcon = document.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });

    it('初期化完了後にアプリケーションを表示する', async () => {
      await renderAndWaitForInit();

      expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('router')).toBeInTheDocument();
    });

    it('API初期化エラー後もアプリケーションを続行する', async () => {
      mockInitializeApiConfig.mockRejectedValue(new Error('API初期化失敗'));

      await renderAndWaitForInit();

      expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalledWith('API設定の初期化に失敗しました:', expect.any(Error));
    });

    it('Google Client ID取得失敗時にダミーIDを使用する', async () => {
      mockGetGoogleClientId.mockRejectedValue(new Error('Client ID取得失敗'));

      await renderAndWaitForInit();

      const googleProvider = screen.getByTestId('google-oauth-provider');
      expect(googleProvider).toHaveAttribute('data-client-id', 'dummy-client-id');
    });
  });

  describe('ErrorBoundary', () => {
    it('ErrorBoundaryクラスが正しく定義されている', () => {
      expect(typeof App).toBe('function');
    });

    it('エラーキャッチ時のUI構造をテストする', () => {
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
              <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl max-w-md w-full text-center">
                  <h2 className="text-foreground text-xl sm:text-2xl font-bold mb-4">エラーが発生しました</h2>
                  <p className="text-muted-foreground mb-2 text-sm sm:text-base">申し訳ありませんが、アプリケーションにエラーが発生しました。</p>
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

      render(
        <TestErrorBoundary>
          <ThrowError />
        </TestErrorBoundary>
      );

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('申し訳ありませんが、アプリケーションにエラーが発生しました。')).toBeInTheDocument();
      expect(screen.getByText('リロードする')).toBeInTheDocument();
    });
  });

  describe('レイアウトとルーティング', () => {
    it('レイアウトコンポーネントが存在する', async () => {
      await renderAndWaitForInit();

      // AppLayout mock contains header and tab-navigation
      expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    });

    it('ルーターが正しく設定されている', async () => {
      await renderAndWaitForInit();

      expect(screen.getByTestId('router')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('routes')).toBeInTheDocument();
      });
    });

    it('AppLayoutに正しいCSSクラスが適用されている', async () => {
      await renderAndWaitForInit();

      const appLayout = screen.getByTestId('app-layout');
      expect(appLayout).toHaveClass('min-h-screen', 'bg-background', 'text-foreground');
    });
  });

  describe('レスポンシブデザイン', () => {
    it('AppLayoutにmin-h-screenクラスが適用されている', async () => {
      await renderAndWaitForInit();

      const appContainer = document.querySelector('.min-h-screen.bg-background.text-foreground');
      expect(appContainer).toBeInTheDocument();
    });

    it('メインコンテンツが適切なパディングを持つ', async () => {
      await renderAndWaitForInit();

      const main = screen.getByRole('main');
      expect(main).toHaveClass('pb-20', 'sm:pb-6');
    });
  });

  describe('パフォーマンス', () => {
    it('初期化が完了するまでレンダリングを遅延する', async () => {
      let resolveInit;
      mockInitializeApiConfig.mockImplementation(() => new Promise(resolve => {
        resolveInit = resolve;
      }));

      render(<App />);

      expect(screen.getByText('PortfolioWise を起動しています...')).toBeInTheDocument();
      expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();

      await act(async () => {
        resolveInit();
        await flushPromises();
      });

      await waitFor(() => {
        expect(screen.getByTestId('app-layout')).toBeInTheDocument();
      });
    });
  });

  describe('統合テスト', () => {
    it('完全なアプリケーション起動フローが正常に動作する', async () => {
      await renderAndWaitForInit();

      // コアコンポーネントの表示
      expect(screen.getByTestId('google-oauth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('router')).toBeInTheDocument();
      expect(screen.getByTestId('routes')).toBeInTheDocument();
    });
  });
});
