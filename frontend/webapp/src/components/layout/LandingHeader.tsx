/**
 * ランディングページ専用ヘッダー
 *
 * ロゴ + ThemeToggle + LanguageSwitcher + 料金プランリンク + OAuthLoginButton
 * TabNavigation・通貨切替・リフレッシュボタンなし。
 *
 * @file src/components/layout/LandingHeader.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
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

const LandingHeader: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  return (
    <header className="bg-card/90 backdrop-blur-xl border-b border-border sticky top-0 z-50" data-testid="landing-header">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
              {t('app.name')}
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* 料金プランリンク — デスクトップのみ */}
            <Link
              to="/pricing"
              className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('landing.pricing', '料金プラン')}
            </Link>

            <ThemeToggle />
            <LanguageSwitcher />

            {/* Auth */}
            {authLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <UserProfile />
            ) : (
              <OAuthLoginButton compact />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
