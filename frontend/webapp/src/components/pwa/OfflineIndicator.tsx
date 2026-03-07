/**
 * OfflineIndicator — オフラインモード表示バナー
 *
 * ネットワーク切断時に Header 直下に薄いバナーを表示。
 * role="status" aria-live="polite" でアクセシビリティ対応。
 *
 * @file src/components/pwa/OfflineIndicator.tsx
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning-100 dark:bg-warning-500/20 border-b border-warning-200 dark:border-warning-500/30"
    >
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-center gap-2">
        <svg className="w-4 h-4 text-warning-600 dark:text-warning-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
        </svg>
        <span className="text-xs font-medium text-warning-700 dark:text-warning-300">
          {t('pwa.offline')}
        </span>
      </div>
    </div>
  );
};

export default OfflineIndicator;
