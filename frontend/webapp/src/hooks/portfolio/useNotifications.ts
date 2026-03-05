/**
 * 通知管理用カスタムフック — UIStore セレクタ
 */
import { useUIStore } from '../../stores/uiStore';

interface UseNotificationsReturn {
  notifications: any[];
  addNotification: (message: string, type?: string) => string;
  removeNotification: (id: string) => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const notifications = useUIStore(s => s.notifications);
  const addNotification = useUIStore(s => s.addNotification);
  const removeNotification = useUIStore(s => s.removeNotification);

  return { notifications, addNotification, removeNotification };
};
