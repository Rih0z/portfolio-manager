/**
 * PWAUpdatePrompt — Service Worker 更新通知バナー
 *
 * 新しいバージョンが利用可能な場合、画面下部にバナーを表示。
 * 「今すぐ更新」で SW を更新、「あとで」で dismiss。
 * モバイルでは TabNavigation の上に配置。
 *
 * @file src/components/pwa/PWAUpdatePrompt.tsx
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePWA } from '../../hooks/usePWA';

const PWAUpdatePrompt: React.FC = () => {
  const { t } = useTranslation();
  const { needRefresh, updateServiceWorker, dismissUpdate } = usePWA();

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in slide-in-from-bottom-4"
    >
      <div className="bg-card border border-border rounded-xl shadow-large p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-50 dark:bg-primary-500/10 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t('pwa.updateAvailable')}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => updateServiceWorker()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
              >
                {t('pwa.updateNow')}
              </button>
              <button
                onClick={dismissUpdate}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('pwa.later')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
