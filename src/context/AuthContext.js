/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/context/AuthContext.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 更新者: System Admin
 * 作成日: 2025-05-08 10:00:00 
 * 更新日: 2025-05-19 12:30:00
 * 
 * 更新履歴: 
 * - 2025-05-08 10:00:00 Koki Riho 初回作成
 * - 2025-05-12 11:30:00 System Admin バックエンド認証連携に修正
 * - 2025-05-19 12:30:00 System Admin AWS環境対応に修正
 * 
 * 説明: 
 * 認証関連のReact Contextを提供するコンポーネント。
 * バックエンドのセッション認証を利用したGoogle認証を管理し、
 * ログイン状態の維持、Google Driveとの連携機能を提供します。
 */

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { getApiEndpoint } from '../utils/envUtils';
import { authApiClient } from '../utils/apiUtils';

// コンテキスト作成
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 状態管理
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const portfolioContextRef = useRef(null);
  
  // セッション確認
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authApiClient.get(
        getApiEndpoint('auth/session')
      );
      
      if (response.data.success && response.data.isAuthenticated) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        setError(null);
        
        // ポートフォリオコンテキストに認証状態変更を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, response.data.user);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      setUser(null);
      setIsAuthenticated(false);
      setError('セッション確認中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // ポートフォリオコンテキスト参照の設定
  const setPortfolioContextRef = useCallback((context) => {
    portfolioContextRef.current = context;
  }, []);
  
  // Googleログイン
  const loginWithGoogle = async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApiClient.post(
        getApiEndpoint('auth/google/login'),
        {
          code: credentialResponse.code,
          redirectUri: window.location.origin + '/auth/callback'
        }
      );
      
      if (response.data.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        // ポートフォリオコンテキストに認証状態変更を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, response.data.user);
        }
        
        return true;
      } else {
        setError(response.data.message || 'ログインに失敗しました');
        return false;
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      setError(error.response?.data?.message || 'ログイン処理中にエラーが発生しました');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // ログアウト
  const logout = async () => {
    try {
      setLoading(true);
      await authApiClient.post(getApiEndpoint('auth/logout'));
      
      setUser(null);
      setIsAuthenticated(false);
      
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
  
  // 初期ロード時のセッション確認
  useEffect(() => {
    checkSession();
  }, [checkSession]);
  
  // コンテキスト値の提供
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    loginWithGoogle,
    logout,
    checkSession,
    setPortfolioContextRef
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
export const AuthConsumer = AuthContext.Consumer;
