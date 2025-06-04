/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/App.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-03-01 10:00:00 
 * 
 * 更新履歴: 
 * - 2025-03-01 10:00:00 Koki Riho 初回作成
 * - 2025-03-15 14:30:00 Koki Riho エラーバウンダリを追加
 * - 2025-04-20 09:45:00 Yuta Sato コンテキスト接続コンポーネントを改善
 * - 2025-05-08 11:20:00 Koki Riho ファイルヘッダーを追加
 * - 2025-05-12 14:30:00 Koki Riho 認可コードフロー対応
 * 
 * 説明: 
 * アプリケーションのルートコンポーネント。
 * ルーティング、認証プロバイダー、ポートフォリオプロバイダー、エラーバウンダリを設定し、
 * ヘッダーとタブナビゲーションを備えたアプリケーションのレイアウトを提供する。
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { PortfolioProvider } from './context/PortfolioContext';
import Header from './components/layout/Header';
import TabNavigation from './components/layout/TabNavigation';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Simulation from './pages/Simulation';
import DataIntegration from './pages/DataIntegration';
import DataImport from './pages/DataImport';
import AIAdvisor from './pages/AIAdvisor';
import SettingsChecker from './components/common/SettingsChecker';
import { useAuth } from './hooks/useAuth';
import { usePortfolioContext } from './hooks/usePortfolioContext';
import { initializeApiConfig, getGoogleClientId } from './utils/envUtils';

// i18n初期化
import './i18n';

// API設定の初期化
const AppInitializer = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  
  useEffect(() => {
    const init = async () => {
      try {
        // API設定をAWSから取得
        await initializeApiConfig();
        const clientId = await getGoogleClientId();
        setGoogleClientId(clientId);
        setInitialized(true);
      } catch (error) {
        console.error('API設定の初期化に失敗しました:', error);
        setInitialized(true); // エラーでもアプリを続行
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
      onScriptLoadError={(err) => console.error('Google OAuth script load error:', err)}
    >
      {children}
    </GoogleOAuthProvider>
  );
};

// コンテキスト接続コンポーネント（安全版）
const ContextConnector = () => {
  const auth = useAuth();
  const portfolio = usePortfolioContext();
  
  // マウント時にAuthContextにPortfolioContextへの参照を渡す
  useEffect(() => {
    try {
      if (auth && auth.setPortfolioContextRef && portfolio) {
        auth.setPortfolioContextRef(portfolio);
      }
    } catch (err) {
      console.error('コンテキスト接続中にエラーが発生しました:', err);
    }
  }, [auth, portfolio]);
  
  return null;
};

// エラー境界コンポーネント
class ErrorBoundary extends React.Component {
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
      <AppInitializer>
        <AuthProvider>
          <PortfolioProvider>
            {/* コンテキスト間の接続を処理するコンポーネント */}
            <ContextConnector />
            
            <SettingsChecker>
              <Router>
                <div className="min-h-screen bg-dark-100 text-gray-100">
                  <Header />
                  {/* Mobile-optimized main content with dark theme */}
                  <main className="max-w-7xl mx-auto pt-2 sm:pt-4 lg:pt-6 pb-20 sm:pb-6">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/ai-advisor" element={<AIAdvisor />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/data" element={<DataIntegration />} />
                      <Route path="/data-import" element={<DataImport />} />
                      <Route path="/auth/google/callback" element={<Dashboard />} />
                    </Routes>
                  </main>
                  {/* Mobile-friendly tab navigation */}
                  <TabNavigation />
                </div>
              </Router>
            </SettingsChecker>
          </PortfolioProvider>
        </AuthProvider>
      </AppInitializer>
    </ErrorBoundary>
  );
}

export default App;

