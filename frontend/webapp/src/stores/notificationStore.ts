/**
 * NotificationStore — 通知・アラートルール状態管理
 *
 * Zustand store で通知CRUD、アラートルール管理、
 * プラン制限チェック、localStorage 永続化を管理する。
 *
 * @file src/stores/notificationStore.ts
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getIsPremiumFromCache, notificationKeys } from '../hooks/queries';
import { queryClient } from '../providers/QueryProvider';
import { useUIStore } from './uiStore';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';
import type {
  AppNotification,
  AlertRule,
  AlertRuleInput,
  NotificationType,
} from '../types/notification.types';
import { NOTIFICATION_LIMITS } from '../types/notification.types';
import * as notificationService from '../services/notificationService';
import { getErrorMessage } from '../utils/errorUtils';

// ─── Types ───────────────────────────────────────────

interface AddAlertRuleResult {
  success: boolean;
  errors?: string[];
  limitReached?: boolean;
}

interface NotificationState {
  // Data
  notifications: AppNotification[];
  alertRules: AlertRule[];
  unreadCount: number;
  loading: boolean;
  lastKey: string | null;

  // Actions — Notifications
  fetchNotifications: (reset?: boolean) => Promise<void>;
  addLocalNotification: (params: {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }) => void;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>;

  // Actions — Alert Rules
  fetchAlertRules: () => Promise<void>;
  addAlertRule: (input: AlertRuleInput) => Promise<AddAlertRuleResult>;
  updateAlertRule: (ruleId: string, updates: Partial<AlertRuleInput>) => Promise<void>;
  removeAlertRule: (ruleId: string) => Promise<void>;

  // Actions — Alert Evaluation
  evaluateAlerts: (params: {
    currentAssets: any[];
    targetPortfolio: any[];
    goals: any[];
    totalValue: number;
    exchangeRate: number;
    baseCurrency: string;
  }) => void;

  // Computed
  getMaxAlertRules: () => number;
  getMaxHistory: () => number;
  getRebalanceThreshold: () => number;
}

// ─── Helpers ─────────────────────────────────────────

const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const notify = (message: string, type: string = 'info') =>
  useUIStore.getState().addNotification(message, type);

// ─── Store ───────────────────────────────────────────

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [] as AppNotification[],
      alertRules: [] as AlertRule[],
      unreadCount: 0,
      loading: false,
      lastKey: null as string | null,

      // ─── Notifications ──────────────────────────────

      fetchNotifications: async (reset = false) => {
        const state = get();
        if (state.loading) return;

        set({ loading: true });
        try {
          const maxHistory = get().getMaxHistory();
          const lastKey = reset ? null : state.lastKey;
          const result = await notificationService.fetchNotifications(maxHistory, lastKey);

          const notifications = reset
            ? result.notifications
            : [...state.notifications, ...result.notifications];

          const unreadCount = notifications.filter((n) => !n.read).length;
          set({
            notifications,
            unreadCount,
            lastKey: result.lastKey || null,
          });
        } catch {
          // サイレントフェイル — ローカルキャッシュを維持
        } finally {
          set({ loading: false });
        }
      },

      addLocalNotification: ({ type, title, message, metadata = {} }) => {
        const maxHistory = get().getMaxHistory();
        const newNotification: AppNotification = {
          notificationId: generateId('notif'),
          userId: '',
          type,
          title,
          message,
          read: false,
          metadata,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const updated = [newNotification, ...state.notifications].slice(0, maxHistory);
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        });

        // TQ キャッシュにも反映（ドロップダウン表示用）
        queryClient.setQueryData(
          notificationKeys.list(20),
          (old: { notifications: AppNotification[]; lastKey?: string | null } | undefined) => {
            if (!old) return { notifications: [newNotification], lastKey: null };
            const updated = [newNotification, ...old.notifications].slice(0, maxHistory);
            return { ...old, notifications: updated };
          }
        );

        trackEvent(AnalyticsEvents.NOTIFICATION_READ, { type, action: 'created' });
      },

      markRead: async (notificationId) => {
        // Optimistic update
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.notificationId === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));

        try {
          await notificationService.markNotificationRead(notificationId);
          trackEvent(AnalyticsEvents.NOTIFICATION_READ, { notificationId });
        } catch {
          // ロールバック
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.notificationId === notificationId ? { ...n, read: false } : n
            ),
            unreadCount: state.unreadCount + 1,
          }));
        }
      },

      markAllRead: async () => {
        const prevNotifications = get().notifications;

        // Optimistic update
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));

        try {
          await notificationService.markAllNotificationsRead();
        } catch {
          // ロールバック
          set({ notifications: prevNotifications, unreadCount: prevNotifications.filter((n) => !n.read).length });
        }
      },

      removeNotification: async (notificationId) => {
        const prev = get().notifications;

        // Optimistic update
        set((state) => {
          const updated = state.notifications.filter((n) => n.notificationId !== notificationId);
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        });

        try {
          await notificationService.deleteNotification(notificationId);
        } catch {
          set({ notifications: prev, unreadCount: prev.filter((n) => !n.read).length });
        }
      },

      // ─── Alert Rules ────────────────────────────────

      fetchAlertRules: async () => {
        set({ loading: true });
        try {
          const rules = await notificationService.fetchAlertRules();
          set({ alertRules: rules });
        } catch {
          // サイレントフェイル
        } finally {
          set({ loading: false });
        }
      },

      addAlertRule: async (input: AlertRuleInput): Promise<AddAlertRuleResult> => {
        // Validation
        if (!input.type || !input.ticker || input.targetValue === undefined) {
          return { success: false, errors: ['type, ticker, targetValue は必須です'] };
        }

        // Plan limit check
        const maxRules = get().getMaxAlertRules();
        if (get().alertRules.length >= maxRules) {
          notify(
            maxRules === NOTIFICATION_LIMITS.FREE.maxAlertRules
              ? 'Standardプランにアップグレードすると最大20件のアラートを設定できます'
              : 'アラートルール数の上限に達しています',
            'warning'
          );
          return { success: false, limitReached: true };
        }

        try {
          const rule = await notificationService.createAlertRule(input);
          set((state) => ({ alertRules: [...state.alertRules, rule] }));
          trackEvent(AnalyticsEvents.ALERT_RULE_CREATE, { type: input.type, ticker: input.ticker });
          return { success: true };
        } catch (error: unknown) {
          return { success: false, errors: [getErrorMessage(error)] };
        }
      },

      updateAlertRule: async (ruleId, updates) => {
        try {
          const rule = await notificationService.updateAlertRule(ruleId, updates);
          set((state) => ({
            alertRules: state.alertRules.map((r) => (r.ruleId === ruleId ? rule : r)),
          }));
        } catch {
          notify('アラートルールの更新に失敗しました', 'error');
        }
      },

      removeAlertRule: async (ruleId) => {
        const prev = get().alertRules;
        // Optimistic update
        set((state) => ({ alertRules: state.alertRules.filter((r) => r.ruleId !== ruleId) }));

        try {
          await notificationService.deleteAlertRule(ruleId);
          trackEvent(AnalyticsEvents.ALERT_RULE_DELETE, { ruleId });
        } catch {
          set({ alertRules: prev });
          notify('アラートルールの削除に失敗しました', 'error');
        }
      },

      // ─── Alert Evaluation ───────────────────────────

      evaluateAlerts: ({ currentAssets, targetPortfolio, goals, totalValue, exchangeRate, baseCurrency }) => {
        const { alertRules, addLocalNotification } = get();
        const enabledRules = alertRules.filter((r) => r.enabled);

        for (const rule of enabledRules) {
          // Cooldown check: don't fire same alert within 1 hour
          if (rule.lastTriggered) {
            const lastTriggeredMs = new Date(rule.lastTriggered).getTime();
            if (Date.now() - lastTriggeredMs < 3600000) continue;
          }

          if (rule.type === 'price_above' || rule.type === 'price_below') {
            const asset = currentAssets.find(
              (a: any) => a.ticker === rule.ticker || a.id === rule.ticker
            );
            if (!asset) continue;

            const price = asset.price || 0;
            const triggered =
              rule.type === 'price_above'
                ? price >= rule.targetValue
                : price <= rule.targetValue;

            if (triggered) {
              const direction = rule.type === 'price_above' ? '以上' : '以下';
              addLocalNotification({
                type: 'price_alert',
                title: `${rule.ticker} 価格アラート`,
                message: `${rule.ticker} が ${rule.targetValue.toLocaleString()}${baseCurrency === 'JPY' ? '円' : 'ドル'}${direction}になりました（現在: ${price.toLocaleString()}）`,
                metadata: { ticker: rule.ticker, price, targetValue: rule.targetValue, ruleId: rule.ruleId },
              });
              trackEvent(AnalyticsEvents.ALERT_TRIGGERED, { type: rule.type, ticker: rule.ticker });

              // Update lastTriggered locally
              set((state) => ({
                alertRules: state.alertRules.map((r) =>
                  r.ruleId === rule.ruleId ? { ...r, lastTriggered: new Date().toISOString() } : r
                ),
              }));
            }
          }

          if (rule.type === 'rebalance_drift') {
            const threshold = get().getRebalanceThreshold();
            for (const target of targetPortfolio) {
              const asset = currentAssets.find(
                (a: any) => a.ticker === target.ticker || a.id === target.id
              );
              if (!asset || totalValue === 0) continue;

              const assetValue = (asset.price || 0) * (asset.holdings || 0);
              const currentPct = (assetValue / totalValue) * 100;
              const targetPct = target.targetPercentage || 0;
              const drift = Math.abs(currentPct - targetPct);

              if (drift >= threshold) {
                addLocalNotification({
                  type: 'rebalance_suggestion',
                  title: 'リバランス提案',
                  message: `${target.ticker} の配分が目標から${drift.toFixed(1)}%乖離しています（現在: ${currentPct.toFixed(1)}% → 目標: ${targetPct.toFixed(1)}%）`,
                  metadata: { ticker: target.ticker, currentPct, targetPct, drift },
                });

                // Only fire one rebalance notification per evaluation
                set((state) => ({
                  alertRules: state.alertRules.map((r) =>
                    r.ruleId === rule.ruleId ? { ...r, lastTriggered: new Date().toISOString() } : r
                  ),
                }));
                break;
              }
            }
          }
        }

        // Goal achievement check
        for (const goal of goals) {
          if (goal.targetAmount && totalValue >= goal.targetAmount) {
            // Check if already notified for this goal
            const alreadyNotified = get().notifications.some(
              (n) => n.type === 'goal_achieved' && n.metadata?.goalId === goal.id
            );
            if (!alreadyNotified) {
              addLocalNotification({
                type: 'goal_achieved',
                title: '目標達成！',
                message: `「${goal.name}」の目標金額（${goal.targetAmount.toLocaleString()}）を達成しました！`,
                metadata: { goalId: goal.id, goalName: goal.name, totalValue },
              });
            }
          }
        }
      },

      // ─── Computed ───────────────────────────────────

      getMaxAlertRules: () => {
        return getIsPremiumFromCache()
          ? NOTIFICATION_LIMITS.STANDARD.maxAlertRules
          : NOTIFICATION_LIMITS.FREE.maxAlertRules;
      },

      getMaxHistory: () => {
        return getIsPremiumFromCache()
          ? NOTIFICATION_LIMITS.STANDARD.maxHistory
          : NOTIFICATION_LIMITS.FREE.maxHistory;
      },

      getRebalanceThreshold: () => {
        return getIsPremiumFromCache()
          ? NOTIFICATION_LIMITS.STANDARD.rebalanceThresholdMin
          : NOTIFICATION_LIMITS.FREE.rebalanceThreshold;
      },
    }),
    {
      name: 'pfwise-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
        alertRules: state.alertRules,
        unreadCount: state.unreadCount,
      }),
    }
  )
);
