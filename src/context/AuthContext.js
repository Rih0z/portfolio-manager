/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/context/AuthContext.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 更新者: System Admin
 * 作成日: 2025-05-08 10:00:00 
 * 更新日: 2025-05-23 10:00:00
 * 
 * 更新履歴: 
 * - 2025-05-08 10:00:00 Koki Riho 初回作成
 * - 2025-05-12 11:30:00 System Admin バックエンド認証連携に修正
 * - 2025-05-19 12:30:00 System Admin AWS環境対応に修正
 * - 2025-05-21 17:00:00 System Admin 認証エラー修正
 * - 2025-05-23 10:00:00 System Admin ヘッダーサイズ最適化対応
 * 
 * 説明: 
 * 認証関連のReact Contextを提供するコンポーネント。
 * APIトークンを利用したGoogle認証を管理し、
 * ログイン状態の維持、Google Driveとの連携機能を提供します。
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
  const portfolioContextRef = useRef(null);
  
  // Google認証クライアントID
  const googleClientId = getGoogleClientId();
  
  // セッション確認
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      console.log('セッション確認を開始します');
      
      // トークンの確認
      const token = getAuthToken();
      if (!token) {
        console.log('認証トークンがありません');
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      
      // セッション確認エンドポイント
      const sessionEndpoint = getApiEndpoint('auth/session');
      console.log('セッション確認URL:', sessionEndpoint);
      
      const response = await authFetch(sessionEndpoint, 'get');
      console.log('セッション確認レスポンス:', response);
      
      if (response && response.success && response.isAuthenticated) {
        console.log('セッション認証成功:', response.user);
        setUser(response.user);
        setIsAuthenticated(true);
        setError(null);
        
        // 新しいトークンがレスポンスに含まれている場合は更新
        if (response.token) {
          setAuthToken(response.token);
        }
        
        // ポートフォリオコンテキストに認証状態変更を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, response.user);
        }
      } else {
        console.log('セッション未認証または無効');
        setUser(null);
        setIsAuthenticated(false);
        clearAuthToken();
        
        // メッセージがある場合はエラー設定
        if (response && response.message) {
          setError(response.message);
        }
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      setUser(null);
      setIsAuthenticated(false);
      clearAuthToken();
      
      // エラーメッセージを設定
      let errorMessage = 'セッション確認中にエラーが発生しました';
      
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = '予期しないエラーが発生しました';
      }
      
      setError(errorMessage);
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
      
      console.log('Google認証コードを取得しました');
      
      // リダイレクトURIを動的に生成
      const redirectUri = getRedirectUri();
      console.log('リダイレクトURI:', redirectUri);
      
      // 認証エンドポイント
      const loginEndpoint = getApiEndpoint('auth/google/login');
      console.log('ログインエンドポイント:', loginEndpoint);
      
      // 認証リクエスト
      const response = await authFetch(loginEndpoint, 'post', {
        code: credentialResponse.code,
        redirectUri: redirectUri
      });
      
      console.log('認証レスポンス:', response);
      
      if (response && response.success) {
        console.log('Google認証成功:', response.user);
        
        // JWTトークンの保存
        if (response.token) {
          console.log('認証トークンを保存します');
          setAuthToken(response.token);
        } else {
          console.warn('トークンがレスポンスに含まれていません');
        }
        
        setUser(response.user);
        setIsAuthenticated(true);
        setError(null);
        
        // ポートフォリオコンテキストに認証状態変更を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, response.user);
        }
        
        return true;
      } else {
        console.error('認証レスポンスエラー:', response);
        setError(response?.message || 'ログインに失敗しました');
        return false;
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      
      // エラーメッセージを設定
      let errorMessage = 'ログイン処理中にエラーが発生しました';
      
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // ログアウト
  const logout = async () => {
    try {
      setLoading(true);
      console.log('ログアウト処理を開始します');
      
      // ログアウトエンドポイント
      const logoutEndpoint = getApiEndpoint('auth/logout');
      
      await authFetch(logoutEndpoint, 'post');
      
      // トークンをクリア
      clearAuthToken();
      
      // 状態をリセット
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
      // ポートフォリオコンテキストに認証状態変更を通知
      if (portfolioContextRef.current?.handleAuthStateChange) {
        portfolioContextRef.current.handleAuthStateChange(false, null);
      }
      
      console.log('ログアウト処理完了');
      return true;
    } catch (error) {
      console.error('ログアウトエラー:', error);
      
      // エラーメッセージを設定
      let errorMessage = 'ログアウト処理中にエラーが発生しました';
      
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // 初期ロード時のセッション確認
  useEffect(() => {
    console.log('AuthContextがマウントされました - セッション確認を実行します');
    checkSession();
  }, [checkSession]);
  
  // コンテキスト値の提供
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    loginWithGoogle,
    logout: logout,
    handleLogout: logout, // 互換性のため両方のメソッド名を提供
    checkSession,
    setPortfolioContextRef,
    googleClientId
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
export const AuthConsumer = AuthContext.Consumer;
