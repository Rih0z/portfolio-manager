/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/App.tsx
 *
 * 作成者: Koki Riho （https://github.com/Rih0z）
 * 作成日: 2025-03-01 10:00:00
 * 更新日: 2026-03-05
 *
 * 更新履歴:
 * - 2025-03-01 Koki Riho 初回作成
 * - 2026-03-05 Claude Code Zustand + TanStack Query 移行（Context廃止）
 *
 * 説明:
 * アプリケーションのルートコンポーネント。
 * Zustand stores + TanStack Query でグローバル状態管理。
 * AuthProvider/PortfolioProvider/ContextConnector は廃止。
 */

import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryProvider } from './providers/QueryProvider';
import Header from './components/layout/Header';
import TabNavigation from './components/layout/TabNavigation';
import LoadingFallback from './components/common/LoadingFallback';
import SettingsChecker from './components/common/SettingsChecker';
import { useAuthStore } from './stores/authStore';
import { usePortfolioStore } from './stores/portfolioStore';
import { useUIStore } from './stores/uiStore';
import { useSubscriptionStore } from './stores/subscriptionStore';
import Footer from './components/layout/Footer';
import { initializeApiConfig, getGoogleClientId } from './utils/envUtils';
import { initGA, trackPageView } from './utils/analytics';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Route-based code splitting: ページコンポーネントを遅延ロード（リトライ付き）
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Simulation = lazyWithRetry(() => import('./pages/Simulation'));
const DataIntegration = lazyWithRetry(() => import('./pages/DataIntegration'));
const DataImport = lazyWithRetry(() => import('./pages/DataImport'));
const AIAdvisor = lazyWithRetry(() => import('./pages/AIAdvisor'));
const Pricing = lazyWithRetry(() => import('./pages/Pricing'));
const Terms = lazyWithRetry(() => import('./pages/legal/Terms'));
const Privacy = lazyWithRetry(() => import('./pages/legal/Privacy'));
const KKKR = lazyWithRetry(() => import('./pages/legal/KKKR'));
const Disclaimer = lazyWithRetry(() => import('./pages/legal/Disclaimer'));

// i18n初期化
import './i18n';

// API設定の初期化
const AppInitializer = ({ children }: any) => {
  const [initialized, setInitialized] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        await initializeApiConfig();
        const clientId = await getGoogleClientId();
        setGoogleClientId(clientId);
        initGA();
        setInitialized(true);
      } catch (error) {
        console.error('API設定の初期化に失敗しました:', error);
        setInitialized(true);
      }
    };
    init();
  }, []);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-16 h-16 bg-card rounded-full flex items-center justify-center border border-border">
              <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base font-medium">PortfolioWise を起動しています...</p>
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider
      clientId={googleClientId || 'dummy-client-id'}
      onScriptLoadError={(() => console.error('Google OAuth script load error')) as any}
    >
      {children}
    </GoogleOAuthProvider>
  );
};

// Store初期化コンポーネント（AuthStore + PortfolioStore + UIStore のサイドエフェクトを管理）
const StoreInitializer = () => {
  const initializeAuth = useAuthStore(s => s.initializeAuth);
  const setupSessionInterval = useAuthStore(s => s.setupSessionInterval);
  const setupVisibilityHandler = useAuthStore(s => s.setupVisibilityHandler);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const initializeData = usePortfolioStore(s => s.initializeData);
  const updateExchangeRate = usePortfolioStore(s => s.updateExchangeRate);
  const baseCurrency = usePortfolioStore(s => s.baseCurrency);
  const initialized = usePortfolioStore(s => s.initialized);
  const initializeTheme = useUIStore(s => s.initializeTheme);

  // Theme initialization (once)
  useEffect(() => {
    initializeTheme();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auth initialization (once)
  useEffect(() => {
    initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Session interval (when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      return setupSessionInterval();
    }
  }, [isAuthenticated, setupSessionInterval]);

  // Visibility handler (when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      return setupVisibilityHandler();
    }
  }, [isAuthenticated, setupVisibilityHandler]);

  // Portfolio initialization (once)
  useEffect(() => {
    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Currency change → exchange rate update
  useEffect(() => {
    if (initialized && baseCurrency) {
      updateExchangeRate();
    }
  }, [baseCurrency, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscription status fetch (when authenticated)
  const fetchSubscriptionStatus = useSubscriptionStore(s => s.fetchStatus);
  useEffect(() => {
    if (isAuthenticated) {
      fetchSubscriptionStatus();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// 通知表示コンポーネント
const NotificationDisplay = () => {
  const notifications = useUIStore(s => s.notifications);
  const removeNotification = useUIStore(s => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
      {notifications.map((notification: any) => (
        <div
          key={notification.id}
          className={`p-3 rounded-md shadow-md text-sm ${
            notification.type === 'error' ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300' :
            notification.type === 'warning' ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400' :
            notification.type === 'success' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
            'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span>{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ページビュー自動追跡
const PageViewTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
};

// ログイン時にサーバー同期をトリガー
const ServerSyncInitializer = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const syncFromServer = usePortfolioStore(s => s.syncFromServer);

  useEffect(() => {
    if (isAuthenticated) {
      syncFromServer();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// エラー境界コンポーネント
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('アプリケーションエラー:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-large">
            <div className="w-16 h-16 mx-auto mb-4 bg-danger-50 dark:bg-danger-500/10 rounded-full flex items-center justify-center border border-danger-200 dark:border-danger-500/20">
              <svg className="w-8 h-8 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-foreground text-xl sm:text-2xl font-bold mb-4">エラーが発生しました</h2>
            <p className="text-muted-foreground mb-2 text-sm sm:text-base">申し訳ありませんが、アプリケーションにエラーが発生しました。</p>
            <p className="text-muted-foreground mb-6 text-xs sm:text-sm bg-muted border border-border p-3 rounded-lg font-mono">
              {this.state.error?.message || '不明なエラー'}
            </p>
            <button
              className="w-full sm:w-auto bg-primary-500 text-white px-6 py-3 rounded-xl hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-lg hover:shadow-glow"
              onClick={() => window.location.reload()}
            >
              リロードする
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppInitializer>
          {/* Store初期化（認証・ポートフォリオのサイドエフェクト管理） */}
          <StoreInitializer />

          <Router>
            <PageViewTracker />
            <ServerSyncInitializer />
            <SettingsChecker>
              <div className="min-h-screen bg-background text-foreground">
                <Header />
                <main className="max-w-7xl mx-auto pt-2 sm:pt-4 lg:pt-6 pb-20 sm:pb-6">
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/ai-advisor" element={<AIAdvisor />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/simulation" element={<Simulation />} />
                      <Route path="/investment-calculator" element={<Simulation />} />
                      <Route path="/data" element={<DataIntegration />} />
                      <Route path="/data-import" element={<DataImport />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/legal/terms" element={<Terms />} />
                      <Route path="/legal/privacy" element={<Privacy />} />
                      <Route path="/legal/kkkr" element={<KKKR />} />
                      <Route path="/legal/disclaimer" element={<Disclaimer />} />
                      <Route path="/auth/google/callback" element={<Dashboard />} />
                    </Routes>
                  </Suspense>
                </main>
                <Footer />
                <TabNavigation />
              </div>
            </SettingsChecker>
          </Router>

          {/* 通知表示（uiStore経由で管理） */}
          <NotificationDisplay />
        </AppInitializer>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
