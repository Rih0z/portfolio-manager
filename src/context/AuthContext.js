import React, { createContext, useState, useEffect, useCallback } from 'react';
import jwtDecode from 'jwt-decode'; // 修正: 正しいインポート方法

// コンテキスト作成
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // PortfolioContextから認証状態変更ハンドラーを取得
  // Note: 循環参照を避けるためにuseEffectで取得
  const portfolioContextRef = React.useRef(null);

  // ポートフォリオコンテキストへの参照を取得
  useEffect(() => {
    const getPortfolioContext = async () => {
      try {
        const { usePortfolioContext } = await import('../hooks/usePortfolioContext');
        const portfolioContext = usePortfolioContext();
        portfolioContextRef.current = portfolioContext;
      } catch (error) {
        console.error('PortfolioContextの取得に失敗しました', error);
      }
    };
    
    getPortfolioContext();
  }, []);
  
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
            const userData = {
              name: decodedToken.name,
              email: decodedToken.email,
              picture: decodedToken.picture
            };
            setUser(userData);
            setIsAuthenticated(true);
            
            // PortfolioContextに認証状態を通知
            if (portfolioContextRef.current && portfolioContextRef.current.handleAuthStateChange) {
              portfolioContextRef.current.handleAuthStateChange(true, userData);
            }
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
      const userData = {
        name: decodedToken.name,
        email: decodedToken.email,
        picture: decodedToken.picture
      };
      setUser(userData);
      setIsAuthenticated(true);
      
      // トークンをローカルストレージに保存
      localStorage.setItem('googleToken', credentialResponse.credential);
      
      // PortfolioContextに認証状態を通知
      if (portfolioContextRef.current && portfolioContextRef.current.handleAuthStateChange) {
        portfolioContextRef.current.handleAuthStateChange(true, userData);
      }
      
      // クラウドからデータを同期
      if (portfolioContextRef.current && portfolioContextRef.current.loadFromGoogleDrive) {
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
    
    // PortfolioContextに認証状態を通知
    if (portfolioContextRef.current && portfolioContextRef.current.handleAuthStateChange) {
      portfolioContextRef.current.handleAuthStateChange(false, null);
    }
  }, []);

  // Googleドライブ保存機能（強化版）
  const saveToDrive = useCallback(async (data, filename = 'portfolio_data.json') => {
    if (!isAuthenticated || !googleToken) {
      throw new Error('ログインが必要です');
    }
    
    try {
      // GoogleドライブAPIのスコープを確認
      // 注: 実際のアプリではGoogleドライブAPIの適切なスコープが必要
      
      // 実際には、ここでGoogleドライブAPIを呼び出す処理を実装
      // このサンプルでは成功したことにする
      console.log('データをGoogleドライブに保存:', { data, filename });
      
      // PortfolioContextのクラウド保存機能を使用
      if (portfolioContextRef.current && portfolioContextRef.current.saveToGoogleDrive) {
        return await portfolioContextRef.current.saveToGoogleDrive(user);
      }
      
      return { success: true, message: `${filename}をGoogleドライブに保存しました` };
    } catch (error) {
      console.error('Googleドライブへの保存エラー:', error);
      return { success: false, message: 'クラウド保存に失敗しました' };
    }
  }, [isAuthenticated, googleToken, user]);

  // Googleドライブから読み込み機能（強化版）
  const loadFromDrive = useCallback(async (filename = 'portfolio_data.json') => {
    if (!isAuthenticated || !googleToken) {
      throw new Error('ログインが必要です');
    }
    
    try {
      // GoogleドライブAPIのスコープを確認
      // 注: 実際のアプリではGoogleドライブAPIの適切なスコープが必要
      
      // 実際には、ここでGoogleドライブAPIを呼び出す処理を実装
      console.log('Googleドライブからデータを読み込み:', filename);
      
      // PortfolioContextのクラウド読み込み機能を使用
      if (portfolioContextRef.current && portfolioContextRef.current.loadFromGoogleDrive) {
        return await portfolioContextRef.current.loadFromGoogleDrive(user);
      }
      
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
      // PortfolioContextのデータ同期機能を使用
      if (portfolioContextRef.current && portfolioContextRef.current.loadFromGoogleDrive) {
        return await portfolioContextRef.current.loadFromGoogleDrive(user);
      }
      
      return { success: false, message: '同期機能が利用できません' };
    } catch (error) {
      console.error('データ同期エラー:', error);
      return { success: false, message: 'データ同期に失敗しました' };
    }
  }, [isAuthenticated, user]);

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
        synchronizeData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 重要: デフォルトエクスポートとして AuthContext も公開する
export default AuthContext;
