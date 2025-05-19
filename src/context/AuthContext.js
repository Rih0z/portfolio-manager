/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/context/AuthContext.js 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 更新者: System Admin
 * 作成日: 2025-05-08 10:00:00 
 * 更新日: 2025-05-12 11:30:00
 * 
 * 更新履歴: 
 * - 2025-05-08 10:00:00 Koki Riho 初回作成
 * - 2025-05-12 11:30:00 System Admin バックエンド認証連携に修正
 * 
 * 説明: 
 * 認証関連のReact Contextを提供するコンポーネント。
 * バックエンドのセッション認証を利用したGoogle認証を管理し、
 * ログイン状態の維持、Google Driveとの連携機能を提供します。
 */

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// 環境変数からAPI設定を取得
const API_URL = process.env.REACT_APP_MARKET_DATA_API_URL || 'http://localhost:3000';
const API_STAGE = process.env.REACT_APP_API_STAGE || 'dev';

// コンテキスト作成
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // PortfolioContextの参照を保持するためのRef
  const portfolioContextRef = useRef(null);

  // セッション確認処理
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${API_URL}/${API_STAGE}/auth/session`,
        { withCredentials: true }
      );
      
      if (response.data.success && response.data.isAuthenticated) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        // PortfolioContextが利用可能であればその参照に認証状態を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, response.data.user);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(false, null);
        }
      }
    } catch (error) {
      console.error('セッション確認エラー:', error);
      setError('セッション確認中にエラーが発生しました');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初期化時にセッション確認
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Googleログイン処理
  const handleLogin = useCallback(async (credentialResponse) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!credentialResponse.code) {
        setError('認証コードがありません');
        return;
      }
      
      // バックエンドに認証コードを送信
      const response = await axios.post(
        `${API_URL}/${API_STAGE}/auth/google/login`,
        {
          code: credentialResponse.code,
          redirectUri: window.location.origin + '/auth/callback'
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        // PortfolioContextが利用可能であれば認証状態を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, response.data.user);
        }
        
        // 少し遅延させてからデータ読み込みを試行
        setTimeout(() => {
          if (portfolioContextRef.current?.loadFromGoogleDrive) {
            portfolioContextRef.current.loadFromGoogleDrive();
          }
        }, 1000);
      } else {
        setError(response.data.message || 'ログインに失敗しました');
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      setError('ログイン処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // ログアウト処理
  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      
      // バックエンドにログアウトリクエストを送信
      const response = await axios.post(
        `${API_URL}/${API_STAGE}/auth/logout`,
        {},
        { withCredentials: true }
      );
      
      // 成功に関わらずローカルの認証状態をクリア
      setUser(null);
      setIsAuthenticated(false);
      
      // PortfolioContextにも通知
      if (portfolioContextRef.current?.handleAuthStateChange) {
        portfolioContextRef.current.handleAuthStateChange(false, null);
      }
      
      if (response.data.success) {
        console.log('ログアウト成功');
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Googleドライブ保存機能
  const saveToDrive = useCallback(async (data) => {
    if (!isAuthenticated) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    try {
      setLoading(true);
      
      // バックエンドのDrive保存APIを呼び出し
      const response = await axios.post(
        `${API_URL}/${API_STAGE}/drive/save`,
        { portfolioData: data },
        { withCredentials: true }
      );
      
      return response.data;
    } catch (error) {
      console.error('Googleドライブへの保存エラー:', error);
      
      if (error.response && error.response.status === 401) {
        // 認証エラーの場合はセッションを確認
        await checkSession();
        return { success: false, message: 'セッションが切れました。再ログインしてください' };
      }
      
      return { 
        success: false, 
        message: 'クラウド保存に失敗しました: ' + (error.response?.data?.message || error.message)
      };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, checkSession]);

  // Googleドライブから読み込み機能
  const loadFromDrive = useCallback(async (fileId) => {
    if (!isAuthenticated) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    try {
      setLoading(true);
      
      // バックエンドのDrive読み込みAPIを呼び出し
      const response = await axios.get(
        `${API_URL}/${API_STAGE}/drive/load`,
        { 
          params: fileId ? { fileId } : {},
          withCredentials: true 
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Googleドライブからの読み込みエラー:', error);
      
      if (error.response && error.response.status === 401) {
        // 認証エラーの場合はセッションを確認
        await checkSession();
        return { success: false, message: 'セッションが切れました。再ログインしてください' };
      }
      
      return { 
        success: false, 
        message: 'クラウド読み込みに失敗しました: ' + (error.response?.data?.message || error.message)
      };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, checkSession]);
  
  // クラウド同期の実行
  const synchronizeData = useCallback(async () => {
    if (!isAuthenticated) {
      return { success: false, message: 'ログインが必要です' };
    }
    
    // まずファイル一覧を取得してから最新ファイルを読み込む方式に変更
    try {
      setLoading(true);
      
      // ファイル一覧を取得
      const filesResponse = await axios.get(
        `${API_URL}/${API_STAGE}/drive/files`,
        { withCredentials: true }
      );
      
      if (!filesResponse.data.success || !filesResponse.data.files || filesResponse.data.files.length === 0) {
        return { success: false, message: 'クラウド上にファイルが見つかりません' };
      }
      
      // 最新のファイルを取得（ファイル一覧はすでに日付順にソートされていると仮定）
      const latestFile = filesResponse.data.files[0];
      
      // ファイルの内容を取得
      const dataResponse = await axios.get(
        `${API_URL}/${API_STAGE}/drive/load`,
        { 
          params: { fileId: latestFile.id },
          withCredentials: true 
        }
      );
      
      return dataResponse.data;
    } catch (error) {
      console.error('データ同期エラー:', error);
      
      if (error.response && error.response.status === 401) {
        // 認証エラーの場合はセッションを確認
        await checkSession();
        return { success: false, message: 'セッションが切れました。再ログインしてください' };
      }
      
      return { 
        success: false, 
        message: 'データ同期に失敗しました: ' + (error.response?.data?.message || error.message)
      };
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, checkSession]);

  // PortfolioContextへの参照を設定するためのメソッド
  // 循環参照を解決するため、外部からこのメソッドを呼び出す
  const setPortfolioContextRef = useCallback((context) => {
    portfolioContextRef.current = context;
    
    // 既に認証済みであれば、PortfolioContextに通知
    if (isAuthenticated && user) {
      if (context.handleAuthStateChange) {
        context.handleAuthStateChange(isAuthenticated, user);
      }
    }
  }, [isAuthenticated, user]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        error,
        handleLogin,
        handleLogout,
        saveToDrive,
        loadFromDrive,
        synchronizeData,
        setPortfolioContextRef,
        checkSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// デフォルトエクスポートとして AuthContext も公開
export default AuthContext;
