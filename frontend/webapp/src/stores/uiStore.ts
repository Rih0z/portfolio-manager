/**
 * UIStore - UI状態 + 通知管理
 *
 * Zustand store for UI state management including toast notifications,
 * loading states, and theme preferences.
 */
import { create } from 'zustand';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface UIState {
  notifications: Notification[];
  isLoading: boolean;

  addNotification: (message: string, type?: string) => string;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  notifications: [],
  isLoading: false,

  addNotification: (message: string, type: string = 'info'): string => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set(state => ({
      notifications: [...state.notifications, { id, message, type: type as Notification['type'] }]
    }));

    // 情報・成功・警告通知は自動消去（5秒後）
    if (type !== 'error') {
      setTimeout(() => {
        get().removeNotification(id);
      }, 5000);
    }

    return id;
  },

  removeNotification: (id: string): void => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  setLoading: (loading: boolean): void => {
    set({ isLoading: loading });
  },
}));
