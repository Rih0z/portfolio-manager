/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/layout/Header.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * - 2025-05-12 15:30:00 Koki Riho バックエンド連携型認証に対応
 * 
 * 説明: 
 * アプリケーションのヘッダーコンポーネント。
 * アプリ名の表示、通貨切り替えボタン、データ更新ボタン、最終更新日時の表示、
 * および認証状態に応じたユーザープロフィールまたはログインボタンを表示する。
 */
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import UserProfile from '../auth/UserProfile';
import OAuthLoginButton from '../auth/OAuthLoginButton';

const Header = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { 
    baseCurrency, 
    toggleCurrency, 
    refreshMarketPrices, 
    lastUpdated, 
    isLoading: dataLoading 
  } = usePortfolioContext();

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">ポートフォリオマネージャー</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleCurrency}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-400 rounded-md transition"
            >
              {baseCurrency === 'JPY' ? '¥' : '$'}
            </button>
            
            <button
              onClick={refreshMarketPrices}
              disabled={dataLoading}
              className={`px-3 py-1 rounded-md transition ${
                dataLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-400'
              }`}
            >
              {dataLoading ? '更新中...' : '更新'}
            </button>
            
            {lastUpdated && (
              <span className="text-xs text-blue-100">
                最終更新: {new Date(lastUpdated).toLocaleString('ja-JP')}
              </span>
            )}
          </div>
          
          <div>
            {!authLoading && (
              isAuthenticated ? <UserProfile /> : <OAuthLoginButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
