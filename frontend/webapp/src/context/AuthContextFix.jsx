/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/context/AuthContextFix.js
 * 
 * 作成者: Claude Code
 * 作成日: 2025-09-05
 * 
 * 説明:
 * Google認証のセッション管理を修正し、タブ切り替え時のログアウト問題を解決する。
 * セッション永続化とGoogle Drive同期機能を復元。
 */

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { getApiEndpoint, getRedirectUri, getGoogleClientId } from '../utils/envUtils';
import { authFetch, setAuthToken, getAuthToken, clearAuthToken } from '../utils/apiUtils';

// コンテキスト作成
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 状態管理
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasDriveAccess, setHasDriveAccess] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const portfolioContextRef = useRef(null);
  const sessionIntervalRef = useRef(null);
  const sessionCheckFailureCount = useRef(0);
  const MAX_SESSION_CHECK_FAILURES = 3;
  
  // セッション情報をローカルストレージに保存
  const STORAGE_KEY = 'pfwise_session';
  
  // セッション情報を保存
  const saveSessionToStorage = useCallback((sessionData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: sessionData.user,
        token: sessionData.token,
        hasDriveAccess: sessionData.hasDriveAccess,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('セッション保存エラー:', e);
    }
  }, []);
  
  // セッション情報を読み込み
  const loadSessionFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        // 24時間以内のセッションのみ有効
        if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
          return session;
        }
      }
    } catch (e) {
      console.error('セッション読み込みエラー:', e);
    }
    return null;
  }, []);
  
  // セッション情報をクリア
  const clearSessionFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('セッションクリアエラー:', e);
    }
  }, []);
  
  // Google認証クライアントIDを非同期で取得
  useEffect(() => {
    getGoogleClientId().then(id => setGoogleClientId(id));
  }, []);
  
  // セッション確認（改善版）
  const checkSession = useCallback(async (skipApi = false) => {
    try {
      // ローカルストレージから復元を試みる
      const storedSession = loadSessionFromStorage();
      if (storedSession && skipApi) {
        setUser(storedSession.user);
        setIsAuthenticated(true);
        setHasDriveAccess(storedSession.hasDriveAccess);
        if (storedSession.token) {
          setAuthToken(storedSession.token);
        }
        setLoading(false);
        return true;
      }
      
      setLoading(true);
      
      // トークンの確認
      const token = getAuthToken() || storedSession?.token;
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        clearSessionFromStorage();
        return false;
      }
      
      // APIセッション確認
      const sessionEndpoint = await getApiEndpoint('auth/session');
      const response = await authFetch(sessionEndpoint, 'get');
      
      if (response && response.success && response.isAuthenticated) {
        const sessionData = {
          user: response.user,
          token: response.token || token,
          hasDriveAccess: response.hasDriveAccess || false
        };
        
        setUser(sessionData.user);
        setIsAuthenticated(true);
        setHasDriveAccess(sessionData.hasDriveAccess);
        
        if (sessionData.token) {
          setAuthToken(sessionData.token);
        }
        
        // セッションを保存
        saveSessionToStorage(sessionData);
        
        // ポートフォリオコンテキストに通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, sessionData.user);
        }
        
        sessionCheckFailureCount.current = 0;
        setLoading(false);
        return true;
      } else {
        // セッション無効時のクリーンアップ
        setUser(null);
        setIsAuthenticated(false);
        setHasDriveAccess(false);
        clearAuthToken();
        clearSessionFromStorage();
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      sessionCheckFailureCount.current++;
      
      // 失敗が続く場合はローカルセッションを使用
      if (sessionCheckFailureCount.current >= MAX_SESSION_CHECK_FAILURES) {
        const storedSession = loadSessionFromStorage();
        if (storedSession) {
          setUser(storedSession.user);
          setIsAuthenticated(true);
          setHasDriveAccess(storedSession.hasDriveAccess);
        }
      }
      
      setLoading(false);
      return false;
    }
  }, [loadSessionFromStorage, saveSessionToStorage, clearSessionFromStorage]);
  
  // ログイン処理（改善版）
  const login = useCallback(async (credential) => {
    try {
      setError(null);
      setLoading(true);
      
      const loginEndpoint = await getApiEndpoint('auth/google/login');
      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ credential })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const sessionData = {
          user: data.user,
          token: data.token,
          hasDriveAccess: data.hasDriveAccess || false
        };
        
        setUser(sessionData.user);
        setIsAuthenticated(true);
        setHasDriveAccess(sessionData.hasDriveAccess);
        
        if (sessionData.token) {
          setAuthToken(sessionData.token);
        }
        
        // セッションを保存
        saveSessionToStorage(sessionData);
        
        // ポートフォリオコンテキストに通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, sessionData.user);
        }
        
        setError(null);
        return { success: true };
      } else {
        setError(data.error || 'ログインに失敗しました');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      setError('ログイン処理中にエラーが発生しました');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [saveSessionToStorage]);
  
  // ログアウト処理（改善版）
  const logout = useCallback(async () => {
    try {
      const logoutEndpoint = await getApiEndpoint('auth/logout');
      await authFetch(logoutEndpoint, 'post');
    } catch (error) {
      console.error('ログアウトAPI呼び出しエラー:', error);
    } finally {
      // ローカル状態のクリア
      setUser(null);
      setIsAuthenticated(false);
      setHasDriveAccess(false);
      setError(null);
      clearAuthToken();
      clearSessionFromStorage();
      
      // ポートフォリオコンテキストに通知
      if (portfolioContextRef.current?.handleAuthStateChange) {
        portfolioContextRef.current.handleAuthStateChange(false, null);
      }
    }
  }, [clearSessionFromStorage]);
  
  // Google Drive認証（改善版）
  const authorizeDrive = useCallback(async () => {
    try {
      const driveAuthEndpoint = await getApiEndpoint('auth/google/drive/initiate');
      const redirectUri = await getRedirectUri();
      
      const authUrl = `${driveAuthEndpoint}?redirect_uri=${encodeURIComponent(redirectUri)}`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Drive認証エラー:', error);
      setError('Google Drive認証の開始に失敗しました');
    }
  }, []);
  
  // 初期化時のセッション確認
  useEffect(() => {
    checkSession(true); // 初回はローカルストレージから読み込み
  }, []);
  
  // 定期的なセッション確認（5分ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        checkSession();
      }
    }, 5 * 60 * 1000);
    
    sessionIntervalRef.current = interval;
    
    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    };
  }, [isAuthenticated, checkSession]);
  
  // タブ切り替え時のセッション確認
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // タブがアクティブになった時、軽量なチェックを実行
        checkSession(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, checkSession]);
  
  // ポートフォリオコンテキストの参照設定
  const setPortfolioContextRef = useCallback((ref) => {
    portfolioContextRef.current = ref;
  }, []);
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      error,
      hasDriveAccess,
      googleClientId,
      login,
      logout,
      checkSession,
      authorizeDrive,
      setPortfolioContextRef
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;