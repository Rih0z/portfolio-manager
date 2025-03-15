import React, { createContext, useState, useEffect, useCallback } from 'react';
import jwtDecode from 'jwt-decode'; // 修正: 正しいインポート方法

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初期化時に保存されたトークンがあれば読み込む
  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const storedToken = localStorage.getItem('googleToken');
        
        if (storedToken) {
          const decodedToken = jwtDecode(storedToken); // 修正: 正しい関数呼び出し
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp > currentTime) {
            setGoogleToken(storedToken);
            setUser({
              name: decodedToken.name,
              email: decodedToken.email,
              picture: decodedToken.picture
            });
            setIsAuthenticated(true);
          } else {
            // トークンの有効期限切れ
            localStorage.removeItem('googleToken');
          }
        }
      } catch (error) {
        console.error('認証情報の読み込みエラー:', error);
        localStorage.removeItem('googleToken');
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // Googleログイン成功時の処理
  const handleLogin = useCallback((credentialResponse) => {
    try {
      const decodedToken = jwtDecode(credentialResponse.credential); // 修正: 正しい関数呼び出し
      setGoogleToken(credentialResponse.credential);
      setUser({
        name: decodedToken.name,
        email: decodedToken.email,
        picture: decodedToken.picture
      });
      setIsAuthenticated(true);
      
      // トークンをローカルストレージに保存
      localStorage.setItem('googleToken', credentialResponse.credential);
    } catch (error) {
      console.error('ログインエラー:', error);
    }
  }, []);

  // ログアウト処理
  const handleLogout = useCallback(() => {
    setGoogleToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('googleToken');
  }, []);

  // Googleドライブ保存機能（基本実装）
  const saveToDrive = useCallback(async (data, filename = 'portfolio_data.json') => {
    if (!isAuthenticated || !googleToken) {
      throw new Error('ログインが必要です');
    }
    
    // 実際には、ここでGoogleドライブAPIを呼び出す処理を実装
    // このサンプルでは成功したことにする
    console.log('データをGoogleドライブに保存:', { data, filename });
    return { success: true, message: `${filename}をGoogleドライブに保存しました` };
  }, [isAuthenticated, googleToken]);

  // Googleドライブから読み込み機能（基本実装）
  const loadFromDrive = useCallback(async (filename = 'portfolio_data.json') => {
    if (!isAuthenticated || !googleToken) {
      throw new Error('ログインが必要です');
    }
    
    // 実際には、ここでGoogleドライブAPIを呼び出す処理を実装
    // このサンプルではダミーデータを返す
    console.log('Googleドライブからデータを読み込み:', filename);
    return { success: true, data: { message: 'サンプルデータが読み込まれました' } };
  }, [isAuthenticated, googleToken]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        googleToken,
        loading,
        handleLogin,
        handleLogout,
        saveToDrive,
        loadFromDrive
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;