/**
 * アプリ用レイアウト（認証済みユーザー向け）
 *
 * Header + SettingsChecker + main + Footer + TabNavigation で構成。
 * 既存の App.tsx 内インラインレイアウトを抽出したもの。
 *
 * @file src/components/layout/AppLayout.tsx
 */
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import TabNavigation from './TabNavigation';
import SettingsChecker from '../common/SettingsChecker';
import LoadingFallback from '../common/LoadingFallback';
import OfflineIndicator from '../pwa/OfflineIndicator';

const AppLayout: React.FC = () => {
  return (
    <SettingsChecker>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <OfflineIndicator />
        <main id="main-content" className="max-w-7xl mx-auto pt-2 sm:pt-4 lg:pt-6 pb-20 sm:pb-6">
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
        <TabNavigation />
      </div>
    </SettingsChecker>
  );
};

export default AppLayout;
