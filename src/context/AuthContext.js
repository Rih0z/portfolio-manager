import React, { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ローカルストレージからトークンを取得して検証
  useEffect(() => {
    const token = localStorage.getItem('google_token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        // トークンの有効期限チェック
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp > currentTime) {
          setUser(decodedToken);
          setIsAuthenticated(true);
        } else {
          // 期限切れの場合はクリア
          localStorage.removeItem('google_token');
        }
      } catch (error) {
        localStorage.removeItem('google_token');
        console.error('トークンの検証に失敗しました', error);
      }
    }
    setIsLoading(false);
  }, []);

  // ログイン処理
  const handleLogin = useCallback((response) => {
    try {
      const decodedUser = jwtDecode(response.credential);
      setUser(decodedUser);
      setIsAuthenticated(true);
      localStorage.setItem('google_token', response.credential);
    } catch (error) {
      console.error('ログイン処理に失敗しました', error);
    }
  }, []);

  // ログアウト処理
  const handleLogout = useCallback(() => {
    localStorage.removeItem('google_token');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Googleドライブに保存
  const saveToGoogleDrive = useCallback(async (data) => {
    if (!isAuthenticated || !user) {
      throw new Error('認証が必要です');
    }

    try {
      // Google Drive APIを使用してファイルを保存
      const token = localStorage.getItem('google_token');
      // ここでGoogle Drive APIを呼び出す実装
      // 実際の実装では、Google Drive APIクライアントライブラリを使用します
      
      // モックの実装（実際には非同期処理が必要）
      console.log('Googleドライブに保存:', data);
      
      return { success: true, message: 'Googleドライブに保存しました' };
    } catch (error) {
      console.error('Googleドライブへの保存に失敗しました', error);
      return { success: false, message: 'Googleドライブへの保存に失敗しました' };
    }
  }, [isAuthenticated, user]);

  // Googleドライブから読み込み
  const loadFromGoogleDrive = useCallback(async () => {
    if (!isAuthenticated || !user) {
      throw new Error('認証が必要です');
    }

    try {
      // Google Drive APIを使用してファイルを読み込む
      const token = localStorage.getItem('google_token');
      // ここでGoogle Drive APIを呼び出す実装
      // 実際の実装では、Google Drive APIクライアントライブラリを使用します
      
      // モックデータを返す（実際の実装では読み込んだデータを返す）
      return { 
        success: true, 
        data: {
          baseCurrency: 'JPY',
          currentAssets: [
            {
              id: 'AAPL',
              name: 'Apple Inc.',
              ticker: 'AAPL',
              price: 150.0,
              holdings: 10,
              currency: 'USD',
              annualFee: 0.3
            }
          ],
          targetPortfolio: [
            {
              id: 'AAPL',
              name: 'Apple Inc.',
              ticker: 'AAPL',
              targetPercentage: 50
            }
          ]
        }
      };
    } catch (error) {
      console.error('Googleドライブからの読み込みに失敗しました', error);
      return { success: false, message: 'Googleドライブからの読み込みに失敗しました' };
    }
  }, [isAuthenticated, user]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      isLoading,
      handleLogin,
      handleLogout,
      saveToGoogleDrive,
      loadFromGoogleDrive
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;