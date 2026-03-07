/**
 * usePWA - Service Worker 登録 + 更新管理フック
 *
 * vite-plugin-pwa の useRegisterSW をラップし、
 * SW 更新通知・オフライン準備完了状態を提供する。
 * 60分ごと（±5分ジッター）に SW 更新をチェック。
 *
 * @file src/hooks/usePWA.ts
 */
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect, useRef } from 'react';
import { useUIStore } from '../stores/uiStore';

const SW_CHECK_BASE_INTERVAL = 60 * 60 * 1000; // 60分
const SW_CHECK_JITTER = 5 * 60 * 1000; // ±5分

const getJitteredInterval = (): number =>
  SW_CHECK_BASE_INTERVAL + Math.floor(Math.random() * SW_CHECK_JITTER * 2 - SW_CHECK_JITTER);

export interface UsePWAReturn {
  needRefresh: boolean;
  updateServiceWorker: () => Promise<void>;
  dismissUpdate: () => void;
}

export const usePWA = (): UsePWAReturn => {
  const addNotification = useUIStore(state => state.addNotification);
  const hasNotifiedOfflineReady = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        const scheduleCheck = () => {
          setTimeout(() => {
            registration.update();
            scheduleCheck();
          }, getJitteredInterval());
        };
        scheduleCheck();
      }
    },
    onRegisterError(error) {
      addNotification(
        `Service Workerの登録に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );
    },
  });

  useEffect(() => {
    if (offlineReady && !hasNotifiedOfflineReady.current) {
      hasNotifiedOfflineReady.current = true;
      addNotification('アプリがオフラインで利用可能になりました', 'success');
    }
  }, [offlineReady, addNotification]);

  const dismissUpdate = () => {
    setNeedRefresh(false);
  };

  return {
    needRefresh,
    updateServiceWorker: () => updateServiceWorker(true),
    dismissUpdate,
  };
};

export default usePWA;
