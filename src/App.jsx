import React, { useEffect } from 'react';
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
import { useAuth } from './hooks/useAuth';
import { usePortfolioContext } from './hooks/usePortfolioContext';
import { setGoogleAccessToken } from './services/api';

// Google認証クライアントID
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com';

// コンテキスト接続コンポーネント（安全版）
const ContextConnector = () => {
  const auth = useAuth();
  const portfolio = usePortfolioContext();
  
  // マウント時にAuthContextにPortfolioContextへの参照を渡す
  useEffect(() => {
    try {
      if (auth && auth.setPortfolioContextRef && portfolio) {
        auth.setPortfolioContextRef(portfolio);
        
        // 既存の認証情報があればAPI層にも通知
        if (auth.googleToken) {
          setGoogleAccessToken(auth.googleToken);
        }
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
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
            <h2 className="text-red-600 text-xl mb-4">エラーが発生しました</h2>
            <p className="mb-2">申し訳ありませんが、アプリケーションにエラーが発生しました。</p>
            <p className="text-gray-700 mb-4">詳細: {this.state.error?.message || '不明なエラー'}</p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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

function App() {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider 
        clientId={GOOGLE_CLIENT_ID}
        onScriptLoadError={(err) => console.error('Google OAuth script load error:', err)}
      >
        <AuthProvider>
          <PortfolioProvider>
            {/* コンテキスト間の接続を処理するコンポーネント */}
            <ContextConnector />
            
            <Router>
              <div className="min-h-screen bg-gray-100">
                <Header />
                {/* iOS用のパディング調整したメインコンテンツ */}
                <main className="container mx-auto px-4 py-6 ios-content-margin">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/simulation" element={<Simulation />} />
                    <Route path="/data" element={<DataIntegration />} />
                  </Routes>
                </main>
                {/* iOS風のタブバー */}
                <TabNavigation />
              </div>
            </Router>
          </PortfolioProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
