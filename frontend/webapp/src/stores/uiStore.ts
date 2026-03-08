/**
 * UIStore - UI状態 + 通知管理 + テーマ管理
 *
 * Zustand store for UI state management including toast notifications,
 * loading states, and theme preferences.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface UIState {
  notifications: Notification[];
  isLoading: boolean;
  theme: Theme;
  resolvedTheme: 'light' | 'dark';

  addNotification: (message: string, type?: string) => string;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: Theme) => void;
  initializeTheme: () => void;
}

/**
 * OS のダークモード設定を取得
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * テーマを DOM に適用
 */
const applyTheme = (resolved: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      notifications: [],
      isLoading: false,
      theme: 'light',
      resolvedTheme: 'light',

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

      setTheme: (theme: Theme): void => {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },

      initializeTheme: (): void => {
        // persist middleware が自動復元した theme を使用
        const theme = get().theme;
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolved);
        set({ resolvedTheme: resolved });

        // OS テーマ変更を監視
        if (typeof window !== 'undefined') {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const current = get().theme;
            if (current === 'system') {
              const newResolved = getSystemTheme();
              applyTheme(newResolved);
              set({ resolvedTheme: newResolved });
            }
          });
        }
      },
    }),
    {
      name: 'pfwise-ui',
      version: 1,
      partialize: (state) => ({ theme: state.theme }),
      migrate: (persisted: any, version: number) => {
        // v0 → v1: 旧 localStorage('pfwise-theme') からの自動マイグレーション
        if (version === 0 || !persisted?.theme) {
          try {
            const legacy = localStorage.getItem('pfwise-theme');
            if (legacy && ['light', 'dark', 'system'].includes(legacy)) {
              localStorage.removeItem('pfwise-theme');
              return { theme: legacy as Theme };
            }
          } catch { /* noop */ }
        }
        return persisted as { theme: Theme };
      },
    }
  )
);
