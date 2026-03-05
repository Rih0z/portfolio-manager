/**
 * クラウド同期用カスタムフック — PortfolioStore セレクタ
 */
import { usePortfolioStore } from '../../stores/portfolioStore';

export const useCloudSync = () => {
  const store = usePortfolioStore();

  return {
    saveToGoogleDrive: store.saveToGoogleDrive,
    loadFromGoogleDrive: store.loadFromGoogleDrive,
    dataSource: store.dataSource,
    lastSyncTime: store.lastSyncTime,
    currentUser: store.currentUser,
    handleAuthStateChange: store.handleAuthStateChange,
  };
};
