/**
 * アプリケーションの主要ページへのナビゲーションタブ
 *
 * モバイル対応のタブナビゲーションで、画面下部に固定表示。
 * Lucide Icons + 日本語ラベルで統一。
 *
 * @file src/components/layout/TabNavigation.tsx
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, BarChart3, Settings } from 'lucide-react';
import { usePortfolioContext } from '../../hooks/usePortfolioContext';

const TabNavigation = () => {
  const {
    currentAssets,
    targetPortfolio,
    additionalBudget,
  } = usePortfolioContext();

  // 設定がない場合は判定
  const hasNoSettings =
    currentAssets.length === 0 &&
    targetPortfolio.length === 0 &&
    (!additionalBudget || additionalBudget.amount === 0);

  const initialSetupCompleted = localStorage.getItem('initialSetupCompleted');

  // 設定がない場合はタブナビゲーションを非表示
  if (hasNoSettings && !initialSetupCompleted) {
    return null;
  }

  const tabs = [
    { path: '/dashboard', label: 'ホーム', Icon: LayoutDashboard },
    { path: '/ai-advisor', label: 'AI分析', Icon: Bot },
    { path: '/simulation', label: '配分', Icon: BarChart3 },
    { path: '/settings', label: '設定', Icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50"
      data-testid="tab-navigation"
      aria-label="メインナビゲーション"
    >
      <div className="grid grid-cols-4 h-16 sm:h-18 max-w-sm sm:max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }: { isActive: boolean }) => `
              flex flex-col items-center justify-center transition-all duration-200 group relative min-h-[60px] sm:min-h-[72px]
              ${isActive
                ? 'text-primary-500'
                : 'text-muted-foreground hover:text-foreground active:text-foreground'
              }
            `}
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 sm:w-10 h-1 bg-primary-500 rounded-full shadow-glow" />
                )}

                {/* Icon */}
                <div
                  className={`mb-1 transition-all duration-200 relative ${
                    isActive
                      ? 'scale-110'
                      : 'group-hover:scale-105 group-active:scale-95'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-primary-500/10 rounded-lg blur-sm transform scale-150" />
                  )}
                  <div
                    className={`relative ${
                      isActive ? 'bg-primary-500/10 rounded-lg p-1' : ''
                    }`}
                  >
                    <tab.Icon size={isActive ? 20 : 22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                </div>

                {/* Label */}
                <span
                  className={`text-xs sm:text-sm font-medium transition-all duration-200 text-center leading-tight ${
                    isActive ? 'text-primary-500 font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* iPhone home indicator space */}
      <div className="h-safe-bottom bg-card/95" />
    </nav>
  );
};

export default TabNavigation;
