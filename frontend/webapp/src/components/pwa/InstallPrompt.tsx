/**
 * InstallPrompt — PWA インストール促進バナー
 *
 * beforeinstallprompt 対応ブラウザ（Chrome/Edge/Android）で
 * アプリインストールを促すバナーを表示。
 * 30秒後に表示（初回訪問を邪魔しない）。
 * 7日間 dismiss 記憶。
 *
 * @file src/components/pwa/InstallPrompt.tsx
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const DISPLAY_DELAY = 30_000; // 30秒

const InstallPrompt: React.FC = () => {
  const { t } = useTranslation();
  const { canInstall, isInstalled, promptInstall, dismissInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canInstall || isInstalled) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, DISPLAY_DELAY);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  const handleDismiss = useCallback(() => {
    dismissInstall();
    setVisible(false);
  }, [dismissInstall]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 animate-in slide-in-from-bottom-4"
    >
      <div className="bg-card border border-border rounded-xl shadow-large p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-success-50 dark:bg-success-500/10 rounded-full flex items-center justify-center">
            <svg aria-hidden="true" className="w-4 h-4 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t('pwa.installTitle')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('pwa.installDescription')}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={promptInstall}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
              >
                {t('pwa.install')}
              </button>
              <button
                onClick={handleDismiss}
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

export default InstallPrompt;
