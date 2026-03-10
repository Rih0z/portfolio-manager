/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/App.tsx
 *
 * 作成者: Koki Riho （https://github.com/Rih0z）
 * 作成日: 2025-03-01 10:00:00
 * 更新日: 2026-03-06
 *
 * 更新履歴:
 * - 2025-03-01 Koki Riho 初回作成
 * - 2026-03-05 Claude Code Zustand + TanStack Query 移行（Context廃止）
 * - 2026-03-06 Claude Code Phase 5-A: PublicLayout / AppLayout 分離 + HelmetProvider + Landing ページ追加
 *
 * 説明:
 * アプリケーションのルートコンポーネント。
 * Zustand stores + TanStack Query でグローバル状態管理。
 * PublicLayout（LP / Pricing / Legal）と AppLayout（Dashboard 等）でルート分離。
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import { QueryProvider } from './providers/QueryProvider';
import PublicLayout from './components/layout/PublicLayout';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './stores/authStore';
import { usePortfolioStore } from './stores/portfolioStore';
import { useUIStore } from './stores/uiStore';
import { useSubscriptionStatus } from './hooks/queries';
import { initializeApiConfig, getGoogleClientId } from './utils/envUtils';
import { initGA, trackPageView } from './utils/analytics';
import { lazyWithRetry } from './utils/lazyWithRetry';
import PWAUpdatePrompt from './components/pwa/PWAUpdatePrompt';
import InstallPrompt from './components/pwa/InstallPrompt';
import { useAlertEvaluation } from './hooks/useAlertEvaluation';
import { setSentryUser, captureException } from './utils/sentry';
import logger from './utils/logger';

// Route-based code splitting: ページコンポーネントを遅延ロード（リトライ付き）
const Landing = lazyWithRetry(() => import('./pages/Landing'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Simulation = lazyWithRetry(() => import('./pages/Simulation'));
const DataImport = lazyWithRetry(() => import('./pages/DataImport'));
const AIAdvisor = lazyWithRetry(() => import('./pages/AIAdvisor'));
const Pricing = lazyWithRetry(() => import('./pages/Pricing'));
const Terms = lazyWithRetry(() => import('./pages/legal/Terms'));
const Privacy = lazyWithRetry(() => import('./pages/legal/Privacy'));
const KKKR = lazyWithRetry(() => import('./pages/legal/KKKR'));
const Disclaimer = lazyWithRetry(() => import('./pages/legal/Disclaimer'));
const SharedPortfolio = lazyWithRetry(() => import('./pages/SharedPortfolio'));

// i18n初期化
import './i18n';

// 開発環境でのアクセシビリティチェック（@axe-core/react）
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    import('react-dom').then((ReactDOM) => {
      axe.default(React, ReactDOM, 1000);
    });
  }).catch(() => {
    // axe-core が利用できない場合は無視
  });
}

// API設定の初期化
const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const [initialized, setInitialized] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [oauthScriptError, setOauthScriptError] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeApiConfig();
        const clientId = await getGoogleClientId();
        setGoogleClientId(clientId);
        initGA();
        setInitialized(true);
      } catch (error) {
        logger.error('API設定の初期化に失敗しました:', error);
        setInitialized(true);
      }
    };
    init();
  }, []);

  const handleOAuthScriptError = useCallback(() => {
    logger.error('Google OAuth スクリプトの読み込みに失敗しました');
    setOauthScriptError(true);
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
      onScriptLoadError={handleOAuthScriptError}
    >
      {oauthScriptError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="bg-card border border-danger-200 dark:border-danger-800 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-danger-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">認証サービスに接続できません</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ネットワーク接続を確認し、再読み込みしてください。企業ネットワークをご利用の場合、プロキシ設定が原因の可能性があります。
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors"
                >
                  ページを再読み込み
                </button>
              </div>
              <button
                onClick={() => setOauthScriptError(false)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="閉じる"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </GoogleOAuthProvider>
  );
};

// Store初期化コンポーネント（AuthStore + PortfolioStore + UIStore のサイドエフェクトを管理）
const StoreInitializer = (): null => {
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
    return undefined;
  }, [isAuthenticated, setupSessionInterval]);

  // Visibility handler (when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      return setupVisibilityHandler();
    }
    return undefined;
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
  // TanStack Query が enabled 条件に基づき自動的に fetch/refetch する
  useSubscriptionStatus({ enabled: isAuthenticated });

  // Sentry ユーザー情報の設定
  const user = useAuthStore(s => s.user);
  useEffect(() => {
    if (isAuthenticated && user) {
      setSentryUser({ id: user.id, email: user.email });
    } else {
      setSentryUser(null);
    }
  }, [isAuthenticated, user]);

  return null;
};

// 通知表示コンポーネント
const NotificationDisplay = () => {
  const notifications = useUIStore(s => s.notifications);
  const removeNotification = useUIStore(s => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50" aria-live="assertive" aria-atomic="false">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          role="alert"
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
              aria-label="閉じる"
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
const PageViewTracker = (): null => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
};

// ログイン時にサーバー同期をトリガー
const ServerSyncInitializer = (): null => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const syncFromServer = usePortfolioStore(s => s.syncFromServer);

  useEffect(() => {
    if (isAuthenticated) {
      syncFromServer();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// アラート評価（認証後に市場データ更新を監視）
const AlertEvaluationInitializer = (): null => {
  useAlertEvaluation();
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
    logger.error('アプリケーションエラー:', error);
    captureException(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4" role="alert">
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
              aria-label="アプリケーションをリロード"
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
      <HelmetProvider>
        <QueryProvider>
          <AppInitializer>
            {/* Store初期化（認証・ポートフォリオのサイドエフェクト管理） */}
            <StoreInitializer />

            <Router>
              {/* スキップリンク: キーボードユーザーがナビゲーションをスキップできる */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
              >
                メインコンテンツへスキップ
              </a>
              <PageViewTracker />
              <ServerSyncInitializer />
              <AlertEvaluationInitializer />

              <Routes>
                {/* 公開ルート — PublicLayout（SettingsChecker なし） */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/share/:shareId" element={<SharedPortfolio />} />
                  <Route path="/legal/terms" element={<Terms />} />
                  <Route path="/legal/privacy" element={<Privacy />} />
                  <Route path="/legal/kkkr" element={<KKKR />} />
                  <Route path="/legal/disclaimer" element={<Disclaimer />} />
                </Route>

                {/* アプリルート — AppLayout（SettingsChecker + TabNavigation あり） */}
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/ai-advisor" element={<AIAdvisor />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/simulation" element={<Simulation />} />
                  <Route path="/investment-calculator" element={<Simulation />} />
                  <Route path="/data-import" element={<DataImport />} />
                  <Route path="/auth/google/callback" element={<Dashboard />} />
                </Route>
              </Routes>
            </Router>

            {/* 通知表示（uiStore経由で管理） */}
            <NotificationDisplay />

            {/* PWA: 更新通知 + インストールプロンプト */}
            <PWAUpdatePrompt />
            <InstallPrompt />
          </AppInitializer>
        </QueryProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
