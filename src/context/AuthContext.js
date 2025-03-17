import React, { createContext, useState, useEffect, useCallback } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import { usePortfolioContext } from '../hooks/usePortfolioContext';
import jwtDecode from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ポートフォリオコンテキストから認証状態更新関数を取得
  const { handleAuthStateChange } = usePortfolioContext() || {};

  // トークンが有効かどうかをチェック
  const isTokenValid = useCallback((token) => {
    if (!token) return false;
    
    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      // トークンの有効期限をチェック
      return decodedToken.exp > currentTime;
    } catch (error) {
      console.error('トークンの検証に失敗しました', error);
      return false;
    }
  }, []);

  // ローカルストレージから認証情報を復元
  const restoreAuthState = useCallback(() => {
    try {
      const storedToken = localStorage.getItem('googleToken');
      const storedUser = localStorage.getItem('googleUser');
      
      if (storedToken && storedUser && isTokenValid(storedToken)) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setTokenData(storedToken);
        
        // ユーザープロフィール情報も復元
        const storedProfile = localStorage.getItem('googleProfile');
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }
        
        // ポートフォリオコンテキストに認証状態を伝達
        if (handleAuthStateChange) {
          handleAuthStateChange(true, parsedUser);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('認証状態の復元に失敗しました', error);
      return false;
    }
  }, [isTokenValid, handleAuthStateChange]);

  // Googleログイン処理
  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setIsLoading(true);
      setAuthError(null);
      
      try {
        // アクセストークンを保存
        setTokenData(codeResponse.access_token);
        localStorage.setItem('googleToken', codeResponse.access_token);
        
        // ユーザー情報を取得
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${codeResponse.access_token}` }
        });
        
        if (!userInfoResponse.ok) {
          throw new Error('ユーザー情報の取得に失敗しました');
        }
        
        const userInfo = await userInfoResponse.json();
        setUser(userInfo);
        setIsAuthenticated(true);
        
        // ローカルストレージに保存
        localStorage.setItem('googleUser', JSON.stringify(userInfo));
        
        // Google Drive APIの権限もリクエスト
        const profileResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: { Authorization: `Bearer ${codeResponse.access_token}` }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);
          localStorage.setItem('googleProfile', JSON.stringify(profileData));
        }
        
        // ポートフォリオコンテキストに認証状態を伝達
        if (handleAuthStateChange) {
          handleAuthStateChange(true, userInfo);
        }
      } catch (error) {
        console.error('Google認証に失敗しました', error);
        setAuthError('Google認証に失敗しました');
        logout();
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google認証エラー', error);
      setAuthError('Google認証に失敗しました');
      setIsLoading(false);
    },
    scope: 'email profile https://www.googleapis.com/auth/drive.appdata',
    prompt: 'consent'
  });

  // ログアウト処理
  const logout = useCallback(() => {
    // Google OAuth APIでログアウト
    googleLogout();
    
    // 状態をクリア
    setUser(null);
    setProfile(null);
    setTokenData(null);
    setIsAuthenticated(false);
    
    // ローカルストレージから認証情報を削除
    localStorage.removeItem('googleToken');
    localStorage.removeItem('googleUser');
    localStorage.removeItem('googleProfile');
    
    // ポートフォリオコンテキストに認証状態を伝達
    if (handleAuthStateChange) {
      handleAuthStateChange(false, null);
    }
  }, [handleAuthStateChange]);

  // 初期化時にローカルストレージから認証状態を復元
  useEffect(() => {
    restoreAuthState();
  }, [restoreAuthState]);

  // コンテキスト値
  const contextValue = {
    user,
    isAuthenticated,
    profile,
    tokenData,
    authError,
    isLoading,
    login,
    logout,
    restoreAuthState
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
