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
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';
import { useUIStore } from '../../stores/uiStore';
import UserProfile from '../auth/UserProfile';
import OAuthLoginButton from '../auth/OAuthLoginButton';
import LanguageSwitcher from '../common/LanguageSwitcher';

const ThemeToggle = () => {
  const theme = useUIStore(s => s.theme);
  const setTheme = useUIStore(s => s.setTheme);

  const nextTheme = () => {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  return (
    <button
      onClick={nextTheme}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
      title={`テーマ: ${theme}`}
      aria-label={`テーマ切替（現在: ${theme}）`}
    >
      {theme === 'light' && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
      {theme === 'dark' && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
      {theme === 'system' && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

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

  const {
    currentAssets,
    targetPortfolio,
    additionalBudget
  } = usePortfolioContext();

  // 設定がない場合の判定
  const hasNoSettings =
    currentAssets.length === 0 &&
    targetPortfolio.length === 0 &&
    (!additionalBudget || additionalBudget.amount === 0);

  const initialSetupCompleted = localStorage.getItem('initialSetupCompleted');

  // 設定がない場合はシンプルなヘッダーを表示
  if (hasNoSettings && !initialSetupCompleted) {
    return (
      <header className="bg-card/90 backdrop-blur-xl border-b border-border sticky top-0 z-50" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent">
                {t('app.name')}
              </h1>
            </Link>

            {/* Theme, Language Switcher and Auth */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <LanguageSwitcher />

              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
              ) : isAuthenticated ? (
                <UserProfile />
              ) : (
                <OAuthLoginButton />
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-card/90 backdrop-blur-xl border-b border-border sticky top-0 z-50" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main header row */}
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center min-w-0 flex-1">
            <Link to="/dashboard" className="flex-shrink-0 flex items-center space-x-3">
              {/* Icon/Logo */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent truncate">
                {t('app.name')}
              </h1>
            </Link>
          </div>

          {/* Desktop Actions - Hidden on mobile */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Pricing Link */}
            <Link
              to="/pricing"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('landing.pricing', '料金プラン')}
            </Link>

            {/* Currency Toggle */}
            <button
              onClick={toggleCurrency}
              className="inline-flex items-center px-3 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground bg-muted hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
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
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background shadow-lg hover:shadow-glow'
              }`}
            >
              {dataLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden md:inline">{t('common.loading')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden md:inline">{t('common.update')}</span>
                </>
              )}
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Auth Section */}
            <div className="ml-3">
              {!authLoading && (
                isAuthenticated ? <UserProfile /> : <OAuthLoginButton />
              )}
            </div>
          </div>

          {/* Mobile Actions - Primary actions only */}
          <div className="flex sm:hidden items-center space-x-2">
            {/* Mobile Currency Toggle */}
            <button
              onClick={toggleCurrency}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-2 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground bg-muted hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
              title={t('settings.baseCurrency')}
            >
              <span className="text-lg">{baseCurrency === 'JPY' ? '¥' : '$'}</span>
            </button>

            {/* Mobile Refresh Button */}
            <button
              onClick={refreshMarketPrices}
              disabled={dataLoading}
              className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-2 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                dataLoading
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background shadow-lg'
              }`}
            >
              {dataLoading ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>

            {/* Mobile Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile Secondary Row - Language and Auth */}
        <div className="flex sm:hidden justify-between items-center pb-2 -mt-1">
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
          </div>
          <div>
            {!authLoading && (
              isAuthenticated ? <UserProfile /> : <OAuthLoginButton />
            )}
          </div>
        </div>

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="pb-2">
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
              {t('settings.dataRefresh')}: {new Date(lastUpdated).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
