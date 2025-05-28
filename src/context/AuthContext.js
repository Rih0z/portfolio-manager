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
  const [hasDriveAccess, setHasDriveAccess] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const portfolioContextRef = useRef(null);
  
  // Google認証クライアントIDを非同期で取得
  useEffect(() => {
    getGoogleClientId().then(id => setGoogleClientId(id));
  }, []);
  
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
      const sessionEndpoint = await getApiEndpoint('auth/session');
      console.log('セッション確認URL:', sessionEndpoint);
      
      const response = await authFetch(sessionEndpoint, 'get');
      console.log('セッション確認レスポンス:', response);
      
      if (response && response.success && response.isAuthenticated) {
        console.log('セッション認証成功:', response.user);
        setUser(response.user);
        setIsAuthenticated(true);
        setError(null);
        
        // Drive API認証状態を設定
        if (response.hasDriveAccess !== undefined) {
          setHasDriveAccess(response.hasDriveAccess);
        }
        
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
        setHasDriveAccess(false);
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
      setHasDriveAccess(false);
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
      
      console.log('Google認証レスポンスを取得しました:', credentialResponse);
      
      // リダイレクトURIを動的に生成（/auth/callbackを追加）
      const redirectUri = window.location.origin + '/auth/callback';
      console.log('リダイレクトURI:', redirectUri);
      
      // 認証エンドポイント
      const loginEndpoint = await getApiEndpoint('auth/google/login');
      console.log('ログインエンドポイント:', loginEndpoint);
      
      // 認証リクエスト（適切なフィールドで送信）
      const requestBody = {};
      
      // Google One Tapの場合（credentialが存在）
      if (credentialResponse.credential) {
        requestBody.credential = credentialResponse.credential;
      }
      // OAuth flowの場合（codeが存在）
      else if (credentialResponse.code) {
        requestBody.code = credentialResponse.code;
        requestBody.redirectUri = redirectUri;
      } else {
        console.error('認証レスポンスにcredentialもcodeも含まれていません');
        setError('認証情報が取得できませんでした');
        return false;
      }
      
      console.log('サーバーに送信するリクエストボディ:', JSON.stringify(requestBody, null, 2));
      if (requestBody.credential) {
        console.log('credential値の内容（最初の50文字）:', requestBody.credential.substring(0, 50) + '...');
        console.log('credential値の長さ:', requestBody.credential.length);
      }
      if (requestBody.code) {
        console.log('code値の内容（最初の50文字）:', requestBody.code.substring(0, 50) + '...');
        console.log('code値の長さ:', requestBody.code.length);
      }
      
      // リクエストボディが空でないことを確認
      if (Object.keys(requestBody).length === 0) {
        console.error('リクエストボディが空です');
        setError('認証情報が正しく設定されていません');
        return false;
      }
      
      const response = await authFetch(loginEndpoint, 'post', requestBody);
      
      console.log('認証レスポンス:', response);
      
      // エラーレスポンスの詳細を確認
      if (!response) {
        console.error('レスポンスがnullまたはundefinedです');
        setError('サーバーからの応答がありません');
        return false;
      }
      
      if (response.error) {
        console.error('認証エラー:', response.error);
        setError(response.error.message || '認証に失敗しました');
        return false;
      }
      
      if (response && response.success) {
        console.log('Google認証成功:', response);
        console.log('レスポンス全体:', JSON.stringify(response, null, 2));
        
        // ログイン後のCookieを確認
        console.log('=== Cookie Debug After Login ===');
        console.log('Cookies after login:', document.cookie);
        console.log('Cookie details:', {
          cookieString: document.cookie,
          cookieLength: document.cookie.length,
          hasCookies: document.cookie.length > 0,
          cookieList: document.cookie.split(';').map(c => c.trim()).filter(c => c),
          // セッションCookieの存在確認
          hasSessionCookie: document.cookie.includes('session'),
          hasConnectSid: document.cookie.includes('connect.sid'),
          hasAuthCookie: document.cookie.includes('auth')
        });
        
        // レスポンスヘッダーの確認（開発環境用）
        if (process.env.NODE_ENV === 'development') {
          console.log('Response headers might contain Set-Cookie (check Network tab)');
        }
        
        // JWTトークンの保存（複数の可能な場所をチェック）
        const token = response.token || 
                     response.accessToken || 
                     response.access_token ||
                     response.authToken ||
                     response.auth_token ||
                     response.jwt ||
                     response.jwtToken ||
                     response.data?.token || 
                     response.data?.accessToken ||
                     response.data?.access_token ||
                     response.data?.authToken ||
                     response.data?.auth_token ||
                     response.data?.jwt ||
                     response.data?.jwtToken;
                     
        if (token) {
          console.log('認証トークンを保存します:', token.substring(0, 20) + '...');
          setAuthToken(token);
        } else {
          console.warn('トークンがレスポンスに含まれていません');
          console.warn('利用可能なレスポンスキー:', Object.keys(response));
          // dataオブジェクトがある場合はその中も確認
          if (response.data) {
            console.warn('response.dataのキー:', Object.keys(response.data));
          }
          // レスポンス全体を詳しく調査
          console.warn('レスポンス構造の詳細調査:');
          for (const key in response) {
            if (typeof response[key] === 'string' && response[key].length > 100) {
              console.warn(`- ${key}: 長い文字列 (${response[key].length}文字) - トークンの可能性`);
            }
          }
        }
        
        setUser(response.user || response.data?.user);
        setIsAuthenticated(true);
        setError(null);
        
        // hasDriveAccessフラグをチェック
        const driveAccess = response.hasDriveAccess || response.data?.hasDriveAccess || false;
        setHasDriveAccess(driveAccess);
        console.log('Drive access status from login:', driveAccess);
        
        // ポートフォリオコンテキストに認証状態変更を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, response.user || response.data?.user);
        }
        
        return { success: true, hasDriveAccess: driveAccess };
      } else {
        console.error('認証レスポンスエラー:', response);
        const errorMessage = response?.message || response?.error?.message || 'ログインに失敗しました';
        setError(errorMessage);
        return { success: false, hasDriveAccess: false };
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      console.error('エラー詳細:', {
        message: error.message,
        response: error.response,
        request: error.request,
        config: error.config
      });
      
      // エラーメッセージを設定
      let errorMessage = 'ログイン処理中にエラーが発生しました';
      
      if (error.response && error.response.data) {
        console.error('サーバーエラー詳細:', JSON.stringify(error.response.data, null, 2));
        console.error('エラーコード:', error.response.data.error?.code);
        console.error('エラーメッセージ:', error.response.data.error?.message);
        errorMessage = error.response.data.error?.message || error.response.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return { success: false, hasDriveAccess: false };
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
      const logoutEndpoint = await getApiEndpoint('auth/logout');
      
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
  
  // 定期的なセッションチェック（5分ごと）
  useEffect(() => {
    if (isAuthenticated) {
      const intervalId = setInterval(() => {
        console.log('定期セッションチェック実行');
        checkSession();
      }, 5 * 60 * 1000); // 5分
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, checkSession]);
  
  // ページ表示時のセッション再確認
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        console.log('ページが表示されました - セッション再確認');
        checkSession();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, checkSession]);
  
  // Drive API認証を開始
  const initiateDriveAuth = useCallback(async () => {
    try {
      console.log('=== Drive API Authentication Debug ===');
      console.log('Drive API認証を開始します');
      console.log('現在の認証状態:', {
        isAuthenticated,
        hasToken: !!getAuthToken(),
        user: user?.email,
        cookies: document.cookie,
        hasCookies: document.cookie.length > 0
      });
      
      // Cookieの詳細デバッグ
      const cookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
      console.log('Cookie詳細分析:');
      cookies.forEach(cookie => {
        const [name, value] = cookie.split('=');
        console.log(`- ${name}: ${value ? value.substring(0, 20) + '...' : 'empty'}`);
      });
      
      console.log('Drive API認証前のCookie詳細:', {
        cookieString: document.cookie,
        cookieList: cookies,
        cookieCount: cookies.length,
        hasSessionCookie: document.cookie.includes('session'),
        hasConnectSid: document.cookie.includes('connect.sid'),
        hasAuthCookie: document.cookie.includes('auth')
      });
      
      const driveInitEndpoint = await getApiEndpoint('auth/google/drive/initiate');
      
      console.log('Drive API initiate endpoint:', driveInitEndpoint);
      console.log('Making request with authFetch (withCredentials: true)...');
      
      // 明示的にwithCredentialsを設定
      const response = await authFetch(driveInitEndpoint, 'get', null, {
        withCredentials: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest' // AJAXリクエストであることを示す
        }
      });
      
      if (response && response.authUrl) {
        // 認証URLにリダイレクト
        window.location.href = response.authUrl;
        return true;
      } else {
        setError('Drive API認証URLの取得に失敗しました');
        return false;
      }
    } catch (error) {
      console.error('Drive API認証開始エラー:', error);
      if (error.response?.status === 401) {
        console.error('Drive API認証エラー: 権限が不足しています');
        // Google Drive APIの401は必ずしもログイン無効を意味しない
        // Drive権限が不足している可能性がある
        if (error.response?.data?.requiresReauth) {
          // サーバーが明示的に再認証を要求している場合のみログアウト
          console.error('再認証が必要です');
          setError('再度ログインが必要です。');
          setUser(null);
          setIsAuthenticated(false);
          clearAuthToken();
        } else {
          // Drive権限の問題の可能性
          console.error('Google Drive権限が不足している可能性があります');
          setError('Google Driveへのアクセス権限がありません。再度認証してください。');
          // ログイン状態は維持
        }
      } else {
        setError('Drive API認証の開始に失敗しました');
      }
      return false;
    }
  }, [isAuthenticated, user]);

  // コンテキスト値の提供
  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    hasDriveAccess,
    loginWithGoogle,
    logout: logout,
    handleLogout: logout, // 互換性のため両方のメソッド名を提供
    checkSession,
    initiateDriveAuth,
    setPortfolioContextRef,
    googleClientId
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
export const AuthConsumer = AuthContext.Consumer;
