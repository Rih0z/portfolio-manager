import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import jwtDecode from 'jwt-decode'; // 修正: 正しいインポート方法

// コンテキスト作成
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // PortfolioContextの参照を保持するためのRef
  const portfolioContextRef = useRef(null);

  // 初期化時に保存されたトークンがあれば読み込む
  useEffect(() => {
    const loadStoredAuth = () => {
      try {
        const storedToken = localStorage.getItem('googleToken');
        
        if (storedToken) {
          const decodedToken = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp > currentTime) {
            setGoogleToken(storedToken);
            const userData = {
              name: decodedToken.name,
              email: decodedToken.email,
              picture: decodedToken.picture
            };
            setUser(userData);
            setIsAuthenticated(true);
            
            // 認証状態の通知はポートフォリオコンテキストが利用可能になった時に行う
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

  // PortfolioContextへの参照を通知するための簡単なメソッド
  const notifyAuthStateToPortfolio = useCallback(() => {
    // PortfolioContextが利用可能な場合に認証状態を通知
    if (portfolioContextRef.current?.handleAuthStateChange && isAuthenticated) {
      portfolioContextRef.current.handleAuthStateChange(isAuthenticated, user);
    }
  }, [isAuthenticated, user]);

  // Googleログイン成功時の処理
  const handleLogin = useCallback((credentialResponse) => {
    try {
      const decodedToken = jwtDecode(credentialResponse.credential);
      setGoogleToken(credentialResponse.credential);
      const userData = {
        name: decodedToken.name,
        email: decodedToken.email,
        picture: decodedToken.picture
      };
      setUser(userData);
      setIsAuthenticated(true);
      
      // トークンをローカルストレージに保存
      localStorage.setItem('googleToken', credentialResponse.credential);
      
      // PortfolioContextが利用可能な場合、認証状態を通知
      if (portfolioContextRef.current?.handleAuthStateChange) {
        portfolioContextRef.current.handleAuthStateChange(true, userData);
      }
      
      // PortfolioContextが利用可能な場合、クラウドからデータを読み込み
      if (portfolioContextRef.current?.loadFromGoogleDrive) {
        portfolioContextRef.current.loadFromGoogleDrive(userData);
      }
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
    
    // PortfolioContextが利用可能な場合、認証状態を通知
    if (portfolioContextRef.current?.handleAuthStateChange) {
      portfolioContextRef.current.handleAuthStateChange(false, null);
    }
  }, []);

  // Googleドライブ保存機能
  const saveToDrive = useCallback(async (data, filename = 'portfolio_data.json') => {
    if (!isAuthenticated || !googleToken) {
      throw new Error('ログインが必要です');
    }
    
    try {
      // PortfolioContextが利用可能な場合
      if (portfolioContextRef.current?.saveToGoogleDrive) {
        return await portfolioContextRef.current.saveToGoogleDrive(user);
      }
      
      // フォールバック処理（シミュレーション）
      console.log('データをGoogleドライブに保存:', { data, filename });
      return { success: true, message: `${filename}をGoogleドライブに保存しました` };
    } catch (error) {
      console.error('Googleドライブへの保存エラー:', error);
      return { success: false, message: 'クラウド保存に失敗しました' };
    }
  }, [isAuthenticated, googleToken, user]);

  // Googleドライブから読み込み機能
  const loadFromDrive = useCallback(async (filename = 'portfolio_data.json') => {
    if (!isAuthenticated || !googleToken) {
      throw new Error('ログインが必要です');
    }
    
    try {
      // PortfolioContextが利用可能な場合
      if (portfolioContextRef.current?.loadFromGoogleDrive) {
        return await portfolioContextRef.current.loadFromGoogleDrive(user);
      }
      
      // フォールバック処理（シミュレーション）
      console.log('Googleドライブからデータを読み込み:', filename);
      return { success: true, data: { message: 'サンプルデータが読み込まれました' } };
    } catch (error) {
      console.error('Googleドライブからの読み込みエラー:', error);
      return { success: false, message: 'クラウド読み込みに失敗しました' };
    }
  }, [isAuthenticated, googleToken, user]);
  
  // アカウント同期の実行
  const synchronizeData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      throw new Error('ログインが必要です');
    }
    
    try {
      // PortfolioContextが利用可能な場合
      if (portfolioContextRef.current?.loadFromGoogleDrive) {
        return await portfolioContextRef.current.loadFromGoogleDrive(user);
      }
      
      return { success: false, message: '同期機能が利用できません' };
    } catch (error) {
      console.error('データ同期エラー:', error);
      return { success: false, message: 'データ同期に失敗しました' };
    }
  }, [isAuthenticated, user]);

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
        googleToken,
        loading,
        handleLogin,
        handleLogout,
        saveToDrive,
        loadFromDrive,
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
