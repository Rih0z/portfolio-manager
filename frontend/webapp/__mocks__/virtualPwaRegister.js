/**
 * virtual:pwa-register/react のテストモック
 *
 * vite-plugin-pwa の仮想モジュールはテスト時に解決できないため、
 * vitest alias でこのモックファイルにマッピングする。
 */
import { useState } from 'react';

export const useRegisterSW = (options) => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  return {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker: () => Promise.resolve(),
  };
};
