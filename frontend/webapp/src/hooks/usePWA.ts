/**
 * usePWA - Service Worker 登録 + 更新管理フック
 *
 * vite-plugin-pwa の useRegisterSW をラップし、
 * SW 更新通知・オフライン準備完了状態を提供する。
 * 60分ごとに SW 更新をチェック。
 *
 * @file src/hooks/usePWA.ts
 */
import { useRegisterSW } from 'virtual:pwa-register/react';

const SW_CHECK_INTERVAL = 60 * 60 * 1000; // 60分

export interface UsePWAReturn {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
  dismissUpdate: () => void;
}

export const usePWA = (): UsePWAReturn => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, SW_CHECK_INTERVAL);
      }
    },
    onRegisterError(error) {
      console.error('Service Worker registration failed:', error);
    },
  });

  const dismissUpdate = () => {
    setNeedRefresh(false);
  };

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: () => updateServiceWorker(true),
    dismissUpdate,
  };
};

export default usePWA;
