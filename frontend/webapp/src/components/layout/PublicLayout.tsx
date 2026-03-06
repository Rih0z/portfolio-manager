/**
 * 公開ページ用レイアウト
 *
 * LandingHeader + main + Footer で構成。
 * TabNavigation なし、SettingsChecker なし。
 * ランディングページ・料金プラン・法務ページで使用。
 *
 * @file src/components/layout/PublicLayout.tsx
 */
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import LandingHeader from './LandingHeader';
import Footer from './Footer';
import LoadingFallback from '../common/LoadingFallback';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main className="max-w-7xl mx-auto pt-2 sm:pt-4 lg:pt-6 pb-6">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
