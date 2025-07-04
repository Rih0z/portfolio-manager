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
import { authFetch, setAuthToken, getAuthToken, clearAuthToken, setUserData, getUserData, getLastLoginTime, TIMEOUT, authApiClient } from '../utils/apiUtils';

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
  const MAX_SESSION_CHECK_FAILURES = 5; // 3回から5回に増加
  
  // Google認証クライアントIDを非同期で取得
  useEffect(() => {
    getGoogleClientId().then(id => setGoogleClientId(id));
  }, []);
  
  // 初期化時に永続化されたユーザーデータを復元
  useEffect(() => {
    const savedUserData = getUserData();
    const lastLoginTime = getLastLoginTime();
    const token = getAuthToken();
    
    if (savedUserData && token && lastLoginTime) {
      const daysSinceLogin = (Date.now() - lastLoginTime) / (1000 * 60 * 60 * 24);
      
      // 30日以内のログインであれば復元
      if (daysSinceLogin <= 30) {
        console.log('永続化されたユーザーデータを復元しています');
        setUser(savedUserData);
        setIsAuthenticated(true);
        setHasDriveAccess(savedUserData.hasDriveAccess || false);
        
        // セッション確認を実行（バックグラウンドで）
        checkSession();
        return;
      } else {
        console.log('ログインから30日経過しているため、再認証が必要です');
        clearAuthToken();
      }
    }
    
    // セッション確認を実行
    checkSession();
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
      
      // セッション確認エンドポイント（プロキシ経由）
      const sessionEndpoint = '/api-proxy/auth/session';
      console.log('セッション確認URL（プロキシ経由）:', sessionEndpoint);
      
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
        
        // ユーザーデータを永続化
        const userDataWithDriveAccess = {
          ...response.user,
          hasDriveAccess: response.hasDriveAccess !== undefined ? response.hasDriveAccess : false
        };
        setUserData(userDataWithDriveAccess);
        
        // ポートフォリオコンテキストに認証状態変更を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, response.user);
        }
        
        // セッションチェック成功時は失敗カウントをリセット
        sessionCheckFailureCount.current = 0;
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
      
      // ネットワークエラーかどうかを判定
      const isNetworkError = error.code === 'NETWORK_ERROR' || 
                           error.message?.includes('network') ||
                           error.message?.includes('fetch') ||
                           error.name === 'AbortError' ||
                           !navigator.onLine;
      
      if (isNetworkError) {
        console.log('ネットワークエラーのため、セッション状態を維持します');
        // ネットワークエラーの場合は失敗カウントを軽微に増加
        sessionCheckFailureCount.current += 0.5;
      } else {
        // その他のエラーの場合は通常通り増加
        sessionCheckFailureCount.current++;
      }
      
      console.log('セッションチェック失敗回数:', sessionCheckFailureCount.current);
      
      // 最大失敗回数に達した場合のみログアウト
      if (sessionCheckFailureCount.current >= MAX_SESSION_CHECK_FAILURES) {
        console.log('セッションチェックが' + MAX_SESSION_CHECK_FAILURES + '回失敗したため、ログアウトします');
        setUser(null);
        setIsAuthenticated(false);
        setHasDriveAccess(false);
        clearAuthToken();
        
        if (sessionIntervalRef.current) {
          clearInterval(sessionIntervalRef.current);
          sessionIntervalRef.current = null;
        }
      } else {
        console.log('セッションチェック失敗 - 再試行可能な範囲内です');
        // 失敗回数が限界未満の場合はログアウトしない
        return;
      }
      
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
    // スコープの外で変数を定義
    let loginEndpoint = '';
    let requestBody = {};
    let AWS_API_BASE = '';
    let isProduction = false;
    let isDevelopment = false;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Google認証レスポンスを取得しました:', credentialResponse);
      
      // リダイレクトURIを動的に生成（/auth/google/callbackを追加）
      const redirectUri = window.location.origin + '/auth/google/callback';
      console.log('リダイレクトURI:', redirectUri);
      
      // 認証エンドポイント（本番環境では直接API、開発環境ではプロキシを使用）
      AWS_API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod';
      isProduction = window.location.hostname === 'portfolio-wise.com' || 
                          window.location.hostname.includes('portfolio-manager') ||
                          window.location.hostname.includes('pages.dev');
      isDevelopment = !isProduction && window.location.hostname === 'localhost';
      
      // 全環境でプロキシを使用（CORS問題を回避）
      loginEndpoint = '/api-proxy/auth/google/login';
        
      console.log('ログインエンドポイント:', loginEndpoint);
      console.log('環境:', { isProduction, isDevelopment, hostname: window.location.hostname });
      
      // 認証リクエスト（適切なフィールドで送信）
      requestBody = {};
      
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
      
      // 認証APIは直接fetchを使用（確実なタイムアウト制御のため）
      console.log('認証API呼び出し:', loginEndpoint);
      console.log('タイムアウト設定:', TIMEOUT.AUTH);
      
      // AbortControllerでタイムアウト制御
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.AUTH);
      
      try {
        const response = await fetch(loginEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
      
      console.log('認証レスポンス:', responseData);
      console.log('認証レスポンス詳細:', JSON.stringify(responseData, null, 2));
      console.log('レスポンスのタイプ:', typeof responseData);
      console.log('successプロパティ:', responseData.success);
      console.log('successのタイプ:', typeof responseData.success);
      
      // エラーレスポンスの詳細を確認
      if (!responseData) {
        console.error('レスポンスがnullまたはundefinedです');
        setError('サーバーからの応答がありません');
        return false;
      }
      
      if (responseData.error) {
        console.error('認証エラー:', responseData.error);
        setError(responseData.error.message || '認証に失敗しました');
        return false;
      }
      
      // success === false の場合でも詳細ログ
      if (responseData.success === false) {
        console.log('認証失敗レスポンス受信:', responseData);
        console.log('エラーメッセージ:', responseData.message || responseData.error);
        const errorMessage = responseData.message || responseData.error || 'ログインに失敗しました';
        setError(errorMessage);
        return { success: false, hasDriveAccess: false };
      }
      
      if (responseData && responseData.success === true) {
        console.log('Google認証成功:', responseData);
        console.log('レスポンス全体:', JSON.stringify(responseData, null, 2));
        
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
        const token = responseData.token || 
                     responseData.accessToken || 
                     responseData.access_token ||
                     responseData.authToken ||
                     responseData.auth_token ||
                     responseData.jwt ||
                     responseData.jwtToken ||
                     responseData.data?.token || 
                     responseData.data?.accessToken ||
                     responseData.data?.access_token ||
                     responseData.data?.authToken ||
                     responseData.data?.auth_token ||
                     responseData.data?.jwt ||
                     responseData.data?.jwtToken;
                     
        if (token) {
          setAuthToken(token);
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('トークンがレスポンスに含まれていません');
        }
        
        setUser(responseData.user || responseData.data?.user);
        setIsAuthenticated(true);
        setError(null);
        
        // hasDriveAccessフラグをチェック
        const driveAccess = responseData.hasDriveAccess || responseData.data?.hasDriveAccess || false;
        setHasDriveAccess(driveAccess);
        console.log('Drive access status from login:', driveAccess);
        
        // ポートフォリオコンテキストに認証状態変更を通知
        if (portfolioContextRef.current?.handleAuthStateChange) {
          portfolioContextRef.current.handleAuthStateChange(true, responseData.user || responseData.data?.user);
        }
        
        // ログイン成功時は失敗カウントをリセット
        sessionCheckFailureCount.current = 0;
        
        // Google Driveのアクセス権がある場合、自動的にデータを読み込む
        if (driveAccess && portfolioContextRef.current?.loadFromGoogleDrive) {
          console.log('ログイン成功後、Google Driveからデータを自動読み込み中...');
          setTimeout(() => {
            portfolioContextRef.current.loadFromGoogleDrive();
          }, 1000); // 1秒待ってから読み込む
        }
        
        return { success: true, hasDriveAccess: driveAccess };
      } else {
        console.error('認証レスポンスエラー:', responseData);
        const errorMessage = responseData?.message || responseData?.error?.message || 'ログインに失敗しました';
        setError(errorMessage);
        return { success: false, hasDriveAccess: false };
      }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      console.error('認証エラー詳細:', {
        endpoint: loginEndpoint,
        origin: window.location.origin,
        hostname: window.location.hostname,
        isProduction,
        isDevelopment,
        awsApiBase: AWS_API_BASE,
        requestBody: { 
          ...requestBody, 
          credential: requestBody.credential ? '[HIDDEN - ' + requestBody.credential.length + ' chars]' : undefined,
          code: requestBody.code ? '[HIDDEN - ' + requestBody.code.length + ' chars]' : undefined
        }
      });
      console.error('エラー詳細:', {
        message: error.message,
        code: error.code,
        name: error.name,
        isAbortError: error.name === 'AbortError',
        isTimeoutError: error.name === 'AbortError' || error.code === 'ECONNABORTED' || error.message.includes('timeout'),
        isCorsError: error.message.includes('CORS') || error.message.includes('Network Error'),
        isNetworkError: error.message === 'Failed to fetch',
        stack: error.stack
      });
      
      // Failed to fetchの場合は詳細な診断
      if (error.message === 'Failed to fetch') {
        console.error('🚨 Failed to fetch 詳細診断:');
        console.error('- API URL:', loginEndpoint);
        console.error('- Origin:', window.location.origin);
        console.error('- CORS設定確認が必要');
        console.error('- バックエンドが500エラーを返している可能性');
      }
      
      // エラーレスポンスデータも詳細に確認
      if (error.response?.data) {
        console.log('エラーレスポンスデータ:', JSON.stringify(error.response.data, null, 2));
        // success: false のレスポンスの場合、catchではなく正常レスポンスとして処理すべき
        if (error.response.data.success === false) {
          console.log('success: false レスポンスを正常レスポンスとして処理');
          const responseData = error.response.data;
          const errorMessage = responseData.message || responseData.error || 'ログインに失敗しました';
          setError(errorMessage);
          return { success: false, hasDriveAccess: false };
        }
      }
      
      // エラーメッセージを設定
      let errorMessage = 'ログイン処理中にエラーが発生しました';
      
      if (error.response && error.response.data) {
        console.error('サーバーエラー詳細:', JSON.stringify(error.response.data, null, 2));
        console.error('エラーコード:', error.response.data.error?.code);
        console.error('エラーメッセージ:', error.response.data.error?.message);
        
        // サーバーからの具体的なエラーメッセージを使用
        const serverErrorMessage = error.response.data.error?.message || error.response.data.message;
        
        // Google認証関連のエラーは具体的なメッセージを表示
        if (serverErrorMessage && (
          error.response.data.error?.code === 'INVALID_AUTH_CODE' ||
          error.response.data.error?.code === 'ONE_TAP_NOT_SUPPORTED' ||
          error.response.data.error?.code === 'MISSING_DRIVE_SCOPE' ||
          serverErrorMessage.includes('認証コード') ||
          serverErrorMessage.includes('Google') ||
          serverErrorMessage.includes('Drive')
        )) {
          errorMessage = serverErrorMessage;
        } else if (serverErrorMessage) {
          errorMessage = serverErrorMessage;
        }
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
      
      // ログアウトエンドポイント（プロキシ経由）
      const logoutEndpoint = '/api-proxy/auth/logout';
      
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
    // 既存のインターバルをクリア
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
    
    if (isAuthenticated) {
      // 失敗カウントをリセット
      sessionCheckFailureCount.current = 0;
      
      sessionIntervalRef.current = setInterval(() => {
        console.log('定期セッションチェック実行');
        checkSession();
      }, 2 * 60 * 60 * 1000); // 2時間 (セッション安定性向上)
      
      return () => {
        if (sessionIntervalRef.current) {
          clearInterval(sessionIntervalRef.current);
          sessionIntervalRef.current = null;
        }
      };
    }
  }, [isAuthenticated, checkSession]);
  
  // ページ表示時のセッション再確認（デバウンス付き）
  useEffect(() => {
    let visibilityCheckTimeout = null;
    let lastCheckTime = Date.now();
    const MIN_CHECK_INTERVAL = 5 * 60 * 1000; // 5分間は再チェックしない (頻繁チェック防止)
    
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // セッションチェックが停止していない場合のみ実行
        if (sessionCheckFailureCount.current < MAX_SESSION_CHECK_FAILURES) {
          // 前回のチェックから十分時間が経過しているか確認
          const timeSinceLastCheck = Date.now() - lastCheckTime;
          
          if (timeSinceLastCheck >= MIN_CHECK_INTERVAL) {
            // 既存のタイムアウトをキャンセル
            if (visibilityCheckTimeout) {
              clearTimeout(visibilityCheckTimeout);
            }
            
            // 1秒後にセッションチェック（デバウンス）
            visibilityCheckTimeout = setTimeout(() => {
              console.log('ページが表示されました - セッション再確認');
              checkSession();
              lastCheckTime = Date.now();
            }, 1000);
          } else {
            console.log(`セッションチェックをスキップ: 前回から${Math.round(timeSinceLastCheck / 1000)}秒しか経過していません`);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityCheckTimeout) {
        clearTimeout(visibilityCheckTimeout);
      }
    };
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Drive API認証前のCookie数:', cookies.length);
      }
      
      const driveInitEndpoint = '/api-proxy/auth/google/drive/initiate';
      
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
