/**
 * 通知管理用カスタムフック
 * 
 * NotificationServiceをReactで使いやすくラップ
 */

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../../services/portfolio/NotificationService';

/**
 * 通知を管理するフック
 * @returns {Object} 通知とアクション
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState(notificationService.getAll());

  useEffect(() => {
    // NotificationServiceの変更を購読
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
    });

    return unsubscribe;
  }, []);

  const addNotification = useCallback((message, type = 'info') => {
    return notificationService.add(message, type);
  }, []);

  const removeNotification = useCallback((id) => {
    notificationService.remove(id);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification
  };
};