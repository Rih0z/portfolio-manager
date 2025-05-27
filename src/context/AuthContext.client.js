/**
 * クライアント側完結のGoogle認証を実装
 * サーバー側認証が動作するまでの一時的な解決策
 */

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const portfolioContextRef = useRef(null);
  
  // ローカルストレージから認証情報を復元
  useEffect(() => {
    const savedUser = localStorage.getItem('portfolio_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (e) {
        console.error('保存されたユーザー情報の復元に失敗:', e);
      }
    }
    setLoading(false);
  }, []);
  
  // ポートフォリオコンテキスト参照の設定
  const setPortfolioContextRef = useCallback((context) => {
    portfolioContextRef.current = context;
  }, []);
  
  // Googleログイン（クライアント側完結）
  const loginWithGoogle = async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Google認証レスポンス:', credentialResponse);
      
      // credential（JWT）をデコード
      if (credentialResponse.credential) {
        const decoded = jwtDecode(credentialResponse.credential);
        console.log('デコードされたユーザー情報:', decoded);
        
        const userData = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          googleId: decoded.sub
        };
        
        // ユーザー情報を保存
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('portfolio_user', JSON.stringify(userData));
        
        // ポートフォリオコンテキストに認証状態変更を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, userData);
        }
        
        return true;
      } else {
        setError('認証情報が取得できませんでした');
        return false;
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      setError('ログイン処理中にエラーが発生しました');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // ログアウト
  const logout = async () => {
    try {
      setLoading(true);
      
      // ローカルストレージから削除
      localStorage.removeItem('portfolio_user');
      
      // 状態をリセット
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
      // ポートフォリオコンテキストに認証状態変更を通知
      if (portfolioContextRef.current?.handleAuthStateChange) {
        portfolioContextRef.current.handleAuthStateChange(false, null);
      }
      
      return true;
    } catch (error) {
      console.error('ログアウトエラー:', error);
      setError('ログアウト処理中にエラーが発生しました');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // セッション確認（ダミー）
  const checkSession = useCallback(async () => {
    // クライアント側完結なので、ローカルストレージの確認のみ
    const savedUser = localStorage.getItem('portfolio_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (e) {
        console.error('セッション確認エラー:', e);
      }
    }
    setLoading(false);
  }, []);
  
  // Google Client IDを環境変数から取得
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    loginWithGoogle,
    logout,
    handleLogout: logout,
    checkSession,
    setPortfolioContextRef,
    googleClientId
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
export const AuthConsumer = AuthContext.Consumer;