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

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryProvider } from './providers/QueryProvider';
import Header from './components/layout/Header';
import TabNavigation from './components/layout/TabNavigation';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Simulation from './pages/Simulation';
import DataIntegration from './pages/DataIntegration';
import DataImport from './pages/DataImport';
import AIAdvisor from './pages/AIAdvisor';
import Pricing from './pages/Pricing';
import Terms from './pages/legal/Terms';
import Privacy from './pages/legal/Privacy';
import KKKR from './pages/legal/KKKR';
import Disclaimer from './pages/legal/Disclaimer';
import SettingsChecker from './components/common/SettingsChecker';
import { useAuthStore } from './stores/authStore';
import { usePortfolioStore } from './stores/portfolioStore';
import { useUIStore } from './stores/uiStore';
import { useSubscriptionStore } from './stores/subscriptionStore';
import Footer from './components/layout/Footer';
import { initializeApiConfig, getGoogleClientId } from './utils/envUtils';

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
      <div className="flex items-center justify-center min-h-screen bg-dark-100 px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-16 h-16 bg-dark-300 rounded-full flex items-center justify-center border border-dark-400">
              <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-300 text-sm sm:text-base font-medium">PortfolioWise を起動しています...</p>
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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

// Store初期化コンポーネント（AuthStore + PortfolioStore のサイドエフェクトを管理）
const StoreInitializer = () => {
  const initializeAuth = useAuthStore(s => s.initializeAuth);
  const setupSessionInterval = useAuthStore(s => s.setupSessionInterval);
  const setupVisibilityHandler = useAuthStore(s => s.setupVisibilityHandler);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const initializeData = usePortfolioStore(s => s.initializeData);
  const updateExchangeRate = usePortfolioStore(s => s.updateExchangeRate);
  const baseCurrency = usePortfolioStore(s => s.baseCurrency);
  const initialized = usePortfolioStore(s => s.initialized);

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
            notification.type === 'error' ? 'bg-red-100 text-red-700' :
            notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
            notification.type === 'success' ? 'bg-green-100 text-green-700' :
            'bg-blue-100 text-blue-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <span>{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
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
        <div className="min-h-screen flex items-center justify-center bg-dark-100 px-4">
          <div className="bg-dark-200 border border-dark-400 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-danger-500/10 rounded-full flex items-center justify-center border border-danger-500/20">
              <svg className="w-8 h-8 text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-gray-100 text-xl sm:text-2xl font-bold mb-4">エラーが発生しました</h2>
            <p className="text-gray-300 mb-2 text-sm sm:text-base">申し訳ありませんが、アプリケーションにエラーが発生しました。</p>
            <p className="text-gray-400 mb-6 text-xs sm:text-sm bg-dark-300 border border-dark-400 p-3 rounded-lg font-mono">
              {this.state.error?.message || '不明なエラー'}
            </p>
            <button
              className="w-full sm:w-auto bg-primary-500 text-white px-6 py-3 rounded-xl hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-dark-100 transition-all duration-200 font-medium shadow-lg hover:shadow-glow"
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
            <SettingsChecker>
              <div className="min-h-screen bg-dark-100 text-gray-100">
                <Header />
                <main className="max-w-7xl mx-auto pt-2 sm:pt-4 lg:pt-6 pb-20 sm:pb-6">
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
