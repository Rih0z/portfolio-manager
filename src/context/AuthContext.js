/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/context/AuthContext.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 10:00:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 10:00:00 Koki Riho 初回作成
 * - 2025-05-12 15:30:00 Koki Riho バックエンド連携型認証に修正
 * 
 * 説明: 
 * 認証関連のReact Contextを提供するコンポーネント。
 * Google認証を管理し、ログイン状態の維持、セッションの処理、
 * Googleドライブとの連携機能を提供します。
 */

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getApiEndpoint } from '../services/api';

// コンテキスト作成
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // PortfolioContextの参照を保持するためのRef
  const portfolioContextRef = useRef(null);

  // API設定
  const API_URL = getApiEndpoint('auth');

  // 初期化時にセッション情報を取得
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('[Auth] Checking session');
        const response = await axios.get(`${API_URL}/session`, {
          withCredentials: true // Cookieを含める
        });
        
        if (response.data.success && response.data.isAuthenticated) {
          console.log('[Auth] Valid session found');
          setUser(response.data.user);
          setIsAuthenticated(true);
          if (response.data.lastSyncTime) {
            setLastSyncTime(response.data.lastSyncTime);
          }
        } else {
          console.log('[Auth] No valid session');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('[Auth] Session check error:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [API_URL]);

  // PortfolioContextへの参照を通知するための簡単なメソッド
  const notifyAuthStateToPortfolio = useCallback(() => {
    // PortfolioContextが利用可能な場合に認証状態を通知
    if (portfolioContextRef.current?.handleAuthStateChange && isAuthenticated) {
      portfolioContextRef.current.handleAuthStateChange(isAuthenticated, user);
    }
  }, [isAuthenticated, user]);

  // 認可コードを使用したGoogleログイン処理
  const handleLogin = useCallback(async (credentialResponse) => {
    try {
      console.log('[Auth] Processing login with auth code');
      
      // 認可コードを取得
      const authCode = credentialResponse.code;
      
      if (!authCode) {
        console.error('[Auth] No auth code received');
        return;
      }
      
      // バックエンドAPIにコードを送信
      const response = await axios.post(`${API_URL}/google/login`, {
        code: authCode
      }, {
        withCredentials: true // Cookieを含める
      });
      
      if (response.data.success && response.data.user) {
        // ユーザー情報を設定
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        if (response.data.lastSyncTime) {
          setLastSyncTime(response.data.lastSyncTime);
        }
        
        // ContextRef経由でも設定
        if (portfolioContextRef.current) {
          if (portfolioContextRef.current.handleAuthStateChange) {
            portfolioContextRef.current.handleAuthStateChange(true, response.data.user);
          }
          
          // 少し遅延させてからデータ読み込みを試行
          setTimeout(() => {
            if (portfolioContextRef.current.loadFromGoogleDrive) {
              portfolioContextRef.current.loadFromGoogleDrive(response.data.user);
            }
          }, 1000);
        }
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
    }
  }, [API_URL]);

  // ログアウト処理
  const handleLogout = useCallback(async () => {
    try {
      console.log('[Auth] Processing logout');
      
      // バックエンドAPIにログアウトリクエストを送信
      await axios.post(`${API_URL}/logout`, {}, {
        withCredentials: true // Cookieを含める
      });
      
      setUser(null);
      setIsAuthenticated(false);
      setLastSyncTime(null);
      
      // PortfolioContextが利用可能な場合、認証状態を通知
      if (portfolioContextRef.current?.handleAuthStateChange) {
        portfolioContextRef.current.handleAuthStateChange(false, null);
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      // エラーがあっても、フロントエンド上ではログアウト状態にする
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [API_URL]);

  // Googleドライブ保存機能
  const saveToDrive = useCallback(async (data) => {
    if (!isAuthenticated || !user) {
      throw new Error('ログインが必要です');
    }
    
    try {
      console.log('[Auth] Saving data to Google Drive');
      
      // バックエンドAPIにデータを送信
      const response = await axios.post(`${getApiEndpoint('drive')}/save`, {
        data
      }, {
        withCredentials: true // Cookieを含める
      });
      
      if (response.data.success) {
        if (response.data.lastSyncTime) {
          setLastSyncTime(response.data.lastSyncTime);
        }
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to save to Google Drive');
      }
    } catch (error) {
      console.error('[Auth] Google Drive save error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'クラウド保存に失敗しました' 
      };
    }
  }, [isAuthenticated, user]);

  // Googleドライブから読み込み機能
  const loadFromDrive = useCallback(async () => {
    if (!isAuthenticated || !user) {
      throw new Error('ログインが必要です');
    }
    
    try {
      console.log('[Auth] Loading data from Google Drive');
      
      // バックエンドAPIからデータを取得
      const response = await axios.get(`${getApiEndpoint('drive')}/load`, {
        withCredentials: true // Cookieを含める
      });
      
      if (response.data.success) {
        if (response.data.lastSyncTime) {
          setLastSyncTime(response.data.lastSyncTime);
        }
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to load from Google Drive');
      }
    } catch (error) {
      console.error('[Auth] Google Drive load error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'クラウド読み込みに失敗しました' 
      };
    }
  }, [isAuthenticated, user]);
  
  // Google Driveのファイル一覧を取得
  const listDriveFiles = useCallback(async () => {
    if (!isAuthenticated || !user) {
      throw new Error('ログインが必要です');
    }
    
    try {
      console.log('[Auth] Listing Google Drive files');
      
      // バックエンドAPIからファイル一覧を取得
      const response = await axios.get(`${getApiEndpoint('drive')}/files`, {
        withCredentials: true // Cookieを含める
      });
      
      return response.data;
    } catch (error) {
      console.error('[Auth] Google Drive list files error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'ファイル一覧の取得に失敗しました',
        files: [] 
      };
    }
  }, [isAuthenticated, user]);
  
  // アカウント同期の実行
  const synchronizeData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      throw new Error('ログインが必要です');
    }
    
    try {
      // PortfolioContextが利用可能な場合
      if (portfolioContextRef.current?.loadFromGoogleDrive) {
        const result = await loadFromDrive();
        if (result.success && result.data && portfolioContextRef.current) {
          // 既存データとの同期処理
          const syncResult = await portfolioContextRef.current.mergeWithGoogleDriveData(result.data);
          return syncResult;
        }
        return result;
      }
      
      return { success: false, message: '同期機能が利用できません' };
    } catch (error) {
      console.error('[Auth] Data synchronization error:', error);
      return { success: false, message: 'データ同期に失敗しました' };
    }
  }, [isAuthenticated, user, loadFromDrive]);

  // PortfolioContextへの参照を設定するためのメソッド
  // 循環参照を解決するため、外部からこのメソッドを呼び出す
  const setPortfolioContextRef = useCallback((context) => {
    portfolioContextRef.current = context;
    notifyAuthStateToPortfolio();
  }, [notifyAuthStateToPortfolio]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        lastSyncTime,
        handleLogin,
        handleLogout,
        saveToDrive,
        loadFromDrive,
        listDriveFiles,
        synchronizeData,
        setPortfolioContextRef
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// デフォルトエクスポートとして AuthContext も公開
export default AuthContext;
