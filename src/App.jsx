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

// Google認証クライアントID
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com';

// コンテキスト接続コンポーネント
const ContextConnector = () => {
  const auth = useAuth();
  const portfolio = usePortfolioContext();
  
  // マウント時にAuthContextにPortfolioContextへの参照を渡す
  useEffect(() => {
    if (auth && auth.setPortfolioContextRef && portfolio) {
      auth.setPortfolioContextRef(portfolio);
    }
  }, [auth, portfolio]);
  
  return null;
};

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
  );
}

export default App;
