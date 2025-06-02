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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import UserProfile from '../auth/UserProfile';
import OAuthLoginButton from '../auth/OAuthLoginButton';
import LanguageSwitcher from '../common/LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { 
    baseCurrency, 
    toggleCurrency, 
    refreshMarketPrices, 
    lastUpdated, 
    isLoading: dataLoading 
  } = usePortfolioContext();

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-secondary-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                {t('app.name')}
              </h1>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Currency Toggle */}
            <button
              onClick={toggleCurrency}
              className="inline-flex items-center px-3 py-2 border border-secondary-300 rounded-xl text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
              title={t('settings.baseCurrency')}
            >
              <span className="text-lg mr-1">{baseCurrency === 'JPY' ? '¥' : '$'}</span>
              {baseCurrency}
            </button>
            
            {/* Refresh Button */}
            <button
              onClick={refreshMarketPrices}
              disabled={dataLoading}
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                dataLoading 
                  ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed' 
                  : 'bg-primary-500 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-sm hover:shadow-md'
              }`}
            >
              {dataLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t('common.update')}
                </>
              )}
            </button>
            
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Auth Section */}
            <div className="ml-3">
              {!authLoading && (
                isAuthenticated ? <UserProfile /> : <OAuthLoginButton />
              )}
            </div>
          </div>
        </div>
        
        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="pb-2">
            <span className="text-xs text-secondary-500">
              {t('settings.dataRefresh')}: {new Date(lastUpdated).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
