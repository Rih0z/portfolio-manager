/** 
 * プロジェクト: https://portfolio-wise.com/ 
 * ファイルパス: src/components/layout/TabNavigation.jsx 
 * 
 * 作成者: Koki Riho （https://github.com/Rih0z） 
 * 作成日: 2025-05-08 14:30:00 
 * 
 * 更新履歴: 
 * - 2025-05-08 14:30:00 Koki Riho 初回作成
 * 
 * 説明: 
 * アプリケーションの主要ページへのナビゲーションタブを提供するコンポーネント。
 * ホーム、設定、シミュレーション、データの各タブを表示し、現在のページを強調表示する。
 * モバイル対応のタブナビゲーションで、画面下部に固定表示される。
 */
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../../context/PortfolioContext';

const TabNavigation = () => {
  const { t } = useTranslation();
  
  const { 
    currentAssets,
    targetPortfolio,
    additionalBudget
  } = useContext(PortfolioContext);

  // 設定がない場合は判定
  const hasNoSettings = 
    currentAssets.length === 0 && 
    targetPortfolio.length === 0 &&
    (!additionalBudget || additionalBudget.amount === 0);

  const initialSetupCompleted = localStorage.getItem('initialSetupCompleted');

  // 設定がない場合はAI投資戦略タブを中心に表示
  if (hasNoSettings && !initialSetupCompleted) {
    const initialTabs = [
      { 
        path: '/ai-advisor', 
        labelKey: 'navigation.aiPlan', 
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )
      }
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-200/95 backdrop-blur-xl border-t border-dark-400 z-50">
        <div className="flex justify-center h-16 sm:h-18 max-w-sm sm:max-w-lg mx-auto">
          {initialTabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center transition-all duration-200 group relative min-h-[60px] sm:min-h-[72px] px-6
                ${isActive 
                  ? 'text-primary-400' 
                  : 'text-gray-400 hover:text-gray-300 active:text-gray-200'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 sm:w-10 h-1 bg-primary-400 rounded-full shadow-glow"></div>
                  )}
                  
                  {/* Icon with background for active state */}
                  <div className={`mb-1 transition-all duration-200 relative ${
                    isActive 
                      ? 'scale-110' 
                      : 'group-hover:scale-105 group-active:scale-95'
                  }`}>
                    {isActive && (
                      <div className="absolute inset-0 bg-primary-500/10 rounded-lg blur-sm transform scale-150"></div>
                    )}
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 relative ${
                      isActive ? 'bg-primary-500/10 rounded-lg p-1' : ''
                    }`}>
                      {tab.icon}
                    </div>
                  </div>
                  
                  {/* Label */}
                  <span className={`text-xs sm:text-sm font-medium transition-all duration-200 text-center leading-tight ${
                    isActive ? 'text-primary-400 font-semibold' : 'text-gray-400'
                  }`}>
                    {t(tab.labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        
        {/* iPhone home indicator space */}
        <div className="h-safe-bottom bg-dark-200/95"></div>
      </nav>
    );
  }
  
  const tabs = [
    { 
      path: '/', 
      labelKey: 'navigation.dashboard', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      path: '/ai-advisor', 
      labelKey: 'navigation.aiPlan', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    { 
      path: '/settings', 
      labelKey: 'navigation.settings', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      path: '/data-import', 
      labelKey: 'navigation.dataImport', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-200/95 backdrop-blur-xl border-t border-dark-400 z-50">
      <div className="grid grid-cols-4 h-16 sm:h-18 max-w-sm sm:max-w-lg mx-auto">
        {tabs.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center transition-all duration-200 group relative min-h-[60px] sm:min-h-[72px]
              ${isActive 
                ? 'text-primary-400' 
                : 'text-gray-400 hover:text-gray-300 active:text-gray-200'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 sm:w-10 h-1 bg-primary-400 rounded-full shadow-glow"></div>
                )}
                
                {/* Icon with background for active state */}
                <div className={`mb-1 transition-all duration-200 relative ${
                  isActive 
                    ? 'scale-110' 
                    : 'group-hover:scale-105 group-active:scale-95'
                }`}>
                  {isActive && (
                    <div className="absolute inset-0 bg-primary-500/10 rounded-lg blur-sm transform scale-150"></div>
                  )}
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 relative ${
                    isActive ? 'bg-primary-500/10 rounded-lg p-1' : ''
                  }`}>
                    {tab.icon}
                  </div>
                </div>
                
                {/* Label */}
                <span className={`text-xs sm:text-sm font-medium transition-all duration-200 text-center leading-tight ${
                  isActive ? 'text-primary-400 font-semibold' : 'text-gray-400'
                }`}>
                  {t(tab.labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* iPhone home indicator space */}
      <div className="h-safe-bottom bg-dark-200/95"></div>
    </nav>
  );
};

export default TabNavigation;
