/**
 * 通知管理用カスタムフック
 *
 * NotificationServiceをReactで使いやすくラップ
 */

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../../services/portfolio/NotificationService';
import type { Notification } from '../../types/portfolio.types';

interface UseNotificationsReturn {
  notifications: Notification[];
  addNotification: (message: string, type?: Notification['type']) => string;
  removeNotification: (id: string) => void;
}

/**
 * 通知を管理するフック
 * @returns 通知とアクション
 */
export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>(notificationService.getAll());

  useEffect(() => {
    // NotificationServiceの変更を購読
    const unsubscribe = notificationService.subscribe((newNotifications: Notification[]) => {
      setNotifications(newNotifications);
    });

    return unsubscribe;
  }, []);

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info'): string => {
    return notificationService.add(message, type);
  }, []);

  const removeNotification = useCallback((id: string): void => {
    notificationService.remove(id);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification
  };
};
