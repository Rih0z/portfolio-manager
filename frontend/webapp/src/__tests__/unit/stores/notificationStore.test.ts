/**
 * notificationStore unit tests
 *
 * 通知CRUD、アラートルール管理、プラン制限、
 * evaluateAlerts（価格・リバランス・目標達成）を検証する。
 * @file src/__tests__/unit/stores/notificationStore.test.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// --- Mock external dependencies BEFORE imports ---
vi.mock('../../../hooks/queries', () => ({
  getIsPremiumFromCache: vi.fn(() => false),
  notificationKeys: {
    all: ['notifications'],
    list: (limit?: number) => ['notifications', 'list', limit],
    alertRules: () => ['notifications', 'alertRules'],
  },
}));

vi.mock('../../../providers/QueryProvider', () => ({
  queryClient: {
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    removeQueries: vi.fn(),
  },
}));

vi.mock('../../../stores/uiStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      addNotification: vi.fn(() => 'mock-notification-id'),
      removeNotification: vi.fn(),
    })),
  },
}));

vi.mock('../../../services/notificationService', () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn(),
  fetchAlertRules: vi.fn(),
  createAlertRule: vi.fn(),
  updateAlertRule: vi.fn(),
  deleteAlertRule: vi.fn(),
}));

vi.mock('../../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  AnalyticsEvents: {
    NOTIFICATION_READ: 'notification_read',
    ALERT_RULE_CREATE: 'alert_rule_create',
    ALERT_RULE_DELETE: 'alert_rule_delete',
    ALERT_TRIGGERED: 'alert_triggered',
  },
}));

// --- Import store after mocks ---
import { useNotificationStore } from '../../../stores/notificationStore';
import { getIsPremiumFromCache } from '../../../hooks/queries';
import * as notificationService from '../../../services/notificationService';
import type { AppNotification, AlertRule } from '../../../types/notification.types';

// --- Test helpers ---
const getInitialState = () => ({
  notifications: [] as AppNotification[],
  alertRules: [] as AlertRule[],
  unreadCount: 0,
  loading: false,
  lastKey: null as string | null,
});

const createMockAlertRule = (overrides: Record<string, any> = {}) => ({
  ruleId: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  userId: 'user-1',
  type: 'price_above' as const,
  ticker: 'AAPL',
  targetValue: 200,
  enabled: true,
  lastTriggered: null as string | null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  ...overrides,
});

const createMockNotification = (overrides: Record<string, any> = {}) => ({
  notificationId: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  userId: 'user-1',
  type: 'price_alert' as const,
  title: 'テスト通知',
  message: 'テストメッセージ',
  read: false,
  metadata: {},
  createdAt: '2026-03-01T00:00:00Z',
  ...overrides,
});

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState(getInitialState());
    vi.clearAllMocks();
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Initial State
  // =========================================================================
  describe('initial state', () => {
    it('should have empty notifications array', () => {
      const state = useNotificationStore.getState();
      expect(state.notifications).toEqual([]);
    });

    it('should have empty alertRules array', () => {
      const state = useNotificationStore.getState();
      expect(state.alertRules).toEqual([]);
    });

    it('should have unreadCount of 0', () => {
      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0);
    });

    it('should have loading as false', () => {
      const state = useNotificationStore.getState();
      expect(state.loading).toBe(false);
    });
  });

  // =========================================================================
  // addLocalNotification
  // =========================================================================
  describe('addLocalNotification', () => {
    it('should create notification with correct type, title, and message', () => {
      const { addLocalNotification } = useNotificationStore.getState();
      addLocalNotification({
        type: 'price_alert',
        title: 'AAPL 価格アラート',
        message: 'AAPLが200ドル以上になりました',
      });

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('price_alert');
      expect(notifications[0].title).toBe('AAPL 価格アラート');
      expect(notifications[0].message).toBe('AAPLが200ドル以上になりました');
      expect(notifications[0].read).toBe(false);
      expect(notifications[0].notificationId).toBeDefined();
      expect(notifications[0].createdAt).toBeDefined();
    });

    it('should increment unreadCount', () => {
      const { addLocalNotification } = useNotificationStore.getState();

      addLocalNotification({
        type: 'price_alert',
        title: 'テスト1',
        message: 'メッセージ1',
      });
      expect(useNotificationStore.getState().unreadCount).toBe(1);

      useNotificationStore.getState().addLocalNotification({
        type: 'goal_achieved',
        title: 'テスト2',
        message: 'メッセージ2',
      });
      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });

    it('should add notification with metadata', () => {
      const { addLocalNotification } = useNotificationStore.getState();
      addLocalNotification({
        type: 'price_alert',
        title: 'テスト',
        message: 'メッセージ',
        metadata: { ticker: 'AAPL', price: 200 },
      });

      const { notifications } = useNotificationStore.getState();
      expect(notifications[0].metadata).toEqual({ ticker: 'AAPL', price: 200 });
    });

    it('should prepend new notification (newest first)', () => {
      const { addLocalNotification } = useNotificationStore.getState();

      addLocalNotification({ type: 'price_alert', title: '最初', message: '最初のメッセージ' });
      useNotificationStore.getState().addLocalNotification({
        type: 'goal_achieved',
        title: '2番目',
        message: '2番目のメッセージ',
      });

      const { notifications } = useNotificationStore.getState();
      expect(notifications[0].title).toBe('2番目');
      expect(notifications[1].title).toBe('最初');
    });

    it('should respect maxHistory limit for free plan', () => {
      // Free plan maxHistory = 10
      const { addLocalNotification } = useNotificationStore.getState();
      for (let i = 0; i < 12; i++) {
        useNotificationStore.getState().addLocalNotification({
          type: 'price_alert',
          title: `通知${i}`,
          message: `メッセージ${i}`,
        });
      }

      const { notifications } = useNotificationStore.getState();
      expect(notifications.length).toBeLessThanOrEqual(10);
    });
  });

  // =========================================================================
  // markRead
  // =========================================================================
  describe('markRead', () => {
    it('should optimistically mark notification as read', async () => {
      (notificationService.markNotificationRead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Pre-populate with an unread notification
      const mockNotif = createMockNotification({ notificationId: 'notif-1', read: false });
      useNotificationStore.setState({
        notifications: [mockNotif],
        unreadCount: 1,
      });

      await useNotificationStore.getState().markRead('notif-1');

      const state = useNotificationStore.getState();
      expect(state.notifications[0].read).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('should decrement unreadCount', async () => {
      (notificationService.markNotificationRead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const notifs = [
        createMockNotification({ notificationId: 'n1', read: false }),
        createMockNotification({ notificationId: 'n2', read: false }),
      ];
      useNotificationStore.setState({ notifications: notifs, unreadCount: 2 });

      await useNotificationStore.getState().markRead('n1');

      expect(useNotificationStore.getState().unreadCount).toBe(1);
    });

    it('should rollback on API failure', async () => {
      (notificationService.markNotificationRead as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );

      const mockNotif = createMockNotification({ notificationId: 'notif-1', read: false });
      useNotificationStore.setState({ notifications: [mockNotif], unreadCount: 1 });

      await useNotificationStore.getState().markRead('notif-1');

      const state = useNotificationStore.getState();
      expect(state.notifications[0].read).toBe(false);
      expect(state.unreadCount).toBe(1); // rollback restores: 0 (optimistic) + 1 = original
    });
  });

  // =========================================================================
  // markAllRead
  // =========================================================================
  describe('markAllRead', () => {
    it('should set all notifications as read and unreadCount to 0', async () => {
      (notificationService.markAllNotificationsRead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const notifs = [
        createMockNotification({ notificationId: 'n1', read: false }),
        createMockNotification({ notificationId: 'n2', read: false }),
        createMockNotification({ notificationId: 'n3', read: true }),
      ];
      useNotificationStore.setState({ notifications: notifs, unreadCount: 2 });

      await useNotificationStore.getState().markAllRead();

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0);
      expect(state.notifications.every((n) => n.read)).toBe(true);
    });

    it('should rollback on API failure', async () => {
      (notificationService.markAllNotificationsRead as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );

      const notifs = [
        createMockNotification({ notificationId: 'n1', read: false }),
        createMockNotification({ notificationId: 'n2', read: true }),
      ];
      useNotificationStore.setState({ notifications: notifs, unreadCount: 1 });

      await useNotificationStore.getState().markAllRead();

      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(1);
      expect(state.notifications[0].read).toBe(false);
    });
  });

  // =========================================================================
  // removeNotification
  // =========================================================================
  describe('removeNotification', () => {
    it('should remove notification from array', async () => {
      (notificationService.deleteNotification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const notifs = [
        createMockNotification({ notificationId: 'n1' }),
        createMockNotification({ notificationId: 'n2' }),
      ];
      useNotificationStore.setState({ notifications: notifs, unreadCount: 2 });

      await useNotificationStore.getState().removeNotification('n1');

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].notificationId).toBe('n2');
    });

    it('should recalculate unreadCount after removal', async () => {
      (notificationService.deleteNotification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const notifs = [
        createMockNotification({ notificationId: 'n1', read: false }),
        createMockNotification({ notificationId: 'n2', read: true }),
      ];
      useNotificationStore.setState({ notifications: notifs, unreadCount: 1 });

      await useNotificationStore.getState().removeNotification('n1');

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('should rollback on API failure', async () => {
      (notificationService.deleteNotification as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );

      const notifs = [createMockNotification({ notificationId: 'n1', read: false })];
      useNotificationStore.setState({ notifications: notifs, unreadCount: 1 });

      await useNotificationStore.getState().removeNotification('n1');

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.unreadCount).toBe(1);
    });
  });

  // =========================================================================
  // addAlertRule
  // =========================================================================
  describe('addAlertRule', () => {
    it('should add rule to alertRules array on success', async () => {
      const mockRule = createMockAlertRule({ ruleId: 'rule-created' });
      (notificationService.createAlertRule as ReturnType<typeof vi.fn>).mockResolvedValue(mockRule);

      const result = await useNotificationStore.getState().addAlertRule({
        type: 'price_above',
        ticker: 'AAPL',
        targetValue: 200,
      });

      expect(result.success).toBe(true);
      const { alertRules } = useNotificationStore.getState();
      expect(alertRules).toHaveLength(1);
      expect(alertRules[0].ruleId).toBe('rule-created');
    });

    it('should enforce free plan limit (max 2 rules)', async () => {
      // Ensure free plan mock
      vi.mocked(getIsPremiumFromCache).mockReturnValue(false);

      // Pre-populate with 2 existing rules
      useNotificationStore.setState({
        alertRules: [
          createMockAlertRule({ ruleId: 'rule-1' }),
          createMockAlertRule({ ruleId: 'rule-2' }),
        ],
      });

      const result = await useNotificationStore.getState().addAlertRule({
        type: 'price_below',
        ticker: 'GOOG',
        targetValue: 100,
      });

      expect(result.success).toBe(false);
      expect(result.limitReached).toBe(true);
      expect(useNotificationStore.getState().alertRules).toHaveLength(2);
    });

    it('should allow up to 20 rules on premium plan', async () => {
      vi.mocked(getIsPremiumFromCache).mockReturnValue(true);

      const mockRule = createMockAlertRule();
      (notificationService.createAlertRule as ReturnType<typeof vi.fn>).mockResolvedValue(mockRule);

      // Pre-populate with 19 rules
      const existingRules = Array.from({ length: 19 }, (_, i) =>
        createMockAlertRule({ ruleId: `rule-${i}` })
      );
      useNotificationStore.setState({ alertRules: existingRules });

      const result = await useNotificationStore.getState().addAlertRule({
        type: 'price_above',
        ticker: 'TSLA',
        targetValue: 300,
      });

      expect(result.success).toBe(true);
      expect(useNotificationStore.getState().alertRules).toHaveLength(20);
    });

    it('should return validation errors for missing fields', async () => {
      const result = await useNotificationStore.getState().addAlertRule({
        type: '' as any,
        ticker: '',
        targetValue: undefined as any,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return error when API call fails', async () => {
      (notificationService.createAlertRule as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('サーバーエラー')
      );

      const result = await useNotificationStore.getState().addAlertRule({
        type: 'price_above',
        ticker: 'AAPL',
        targetValue: 200,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('サーバーエラー');
    });
  });

  // =========================================================================
  // removeAlertRule
  // =========================================================================
  describe('removeAlertRule', () => {
    it('should remove rule from array optimistically', async () => {
      (notificationService.deleteAlertRule as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      useNotificationStore.setState({
        alertRules: [
          createMockAlertRule({ ruleId: 'rule-A' }),
          createMockAlertRule({ ruleId: 'rule-B' }),
        ],
      });

      await useNotificationStore.getState().removeAlertRule('rule-A');

      const { alertRules } = useNotificationStore.getState();
      expect(alertRules).toHaveLength(1);
      expect(alertRules[0].ruleId).toBe('rule-B');
    });

    it('should rollback on API failure', async () => {
      (notificationService.deleteAlertRule as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );

      useNotificationStore.setState({
        alertRules: [createMockAlertRule({ ruleId: 'rule-A' })],
      });

      await useNotificationStore.getState().removeAlertRule('rule-A');

      expect(useNotificationStore.getState().alertRules).toHaveLength(1);
    });
  });

  // =========================================================================
  // evaluateAlerts
  // =========================================================================
  describe('evaluateAlerts', () => {
    const baseParams = {
      targetPortfolio: [] as any[],
      goals: [] as any[],
      totalValue: 100_000,
      exchangeRate: 150,
      baseCurrency: 'USD',
    };

    describe('price_above', () => {
      it('should trigger notification when price >= targetValue', () => {
        useNotificationStore.setState({
          alertRules: [
            createMockAlertRule({
              ruleId: 'pa-1',
              type: 'price_above',
              ticker: 'AAPL',
              targetValue: 200,
              enabled: true,
              lastTriggered: null,
            }),
          ],
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [{ ticker: 'AAPL', price: 210, holdings: 10 }],
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications.length).toBeGreaterThanOrEqual(1);
        const priceAlert = notifications.find((n) => n.type === 'price_alert');
        expect(priceAlert).toBeDefined();
        expect(priceAlert!.title).toContain('AAPL');
      });

      it('should NOT trigger when price < targetValue', () => {
        useNotificationStore.setState({
          alertRules: [
            createMockAlertRule({
              ruleId: 'pa-2',
              type: 'price_above',
              ticker: 'AAPL',
              targetValue: 200,
              enabled: true,
              lastTriggered: null,
            }),
          ],
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [{ ticker: 'AAPL', price: 180, holdings: 10 }],
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications.filter((n) => n.type === 'price_alert')).toHaveLength(0);
      });
    });

    describe('price_below', () => {
      it('should trigger notification when price <= targetValue', () => {
        useNotificationStore.setState({
          alertRules: [
            createMockAlertRule({
              ruleId: 'pb-1',
              type: 'price_below',
              ticker: 'GOOG',
              targetValue: 100,
              enabled: true,
              lastTriggered: null,
            }),
          ],
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [{ ticker: 'GOOG', price: 90, holdings: 5 }],
        });

        const { notifications } = useNotificationStore.getState();
        const priceAlert = notifications.find((n) => n.type === 'price_alert');
        expect(priceAlert).toBeDefined();
        expect(priceAlert!.title).toContain('GOOG');
      });

      it('should NOT trigger when price > targetValue', () => {
        useNotificationStore.setState({
          alertRules: [
            createMockAlertRule({
              ruleId: 'pb-2',
              type: 'price_below',
              ticker: 'GOOG',
              targetValue: 100,
              enabled: true,
              lastTriggered: null,
            }),
          ],
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [{ ticker: 'GOOG', price: 120, holdings: 5 }],
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications.filter((n) => n.type === 'price_alert')).toHaveLength(0);
      });
    });

    describe('rebalance_drift', () => {
      it('should trigger notification when drift >= threshold', () => {
        // Free plan threshold = 10%
        vi.mocked(getIsPremiumFromCache).mockReturnValue(false);

        useNotificationStore.setState({
          alertRules: [
            createMockAlertRule({
              ruleId: 'rb-1',
              type: 'rebalance_drift',
              ticker: 'PORTFOLIO',
              targetValue: 10,
              enabled: true,
              lastTriggered: null,
            }),
          ],
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [
            { ticker: 'AAPL', id: 'aapl', price: 200, holdings: 10 }, // value = 2000
          ],
          targetPortfolio: [
            { ticker: 'AAPL', id: 'aapl', targetPercentage: 50 }, // current: 2% (2000/100000), target: 50%, drift: 48%
          ],
          totalValue: 100_000,
        });

        const { notifications } = useNotificationStore.getState();
        const rebalanceNotif = notifications.find((n) => n.type === 'rebalance_suggestion');
        expect(rebalanceNotif).toBeDefined();
        expect(rebalanceNotif!.title).toContain('リバランス');
      });

      it('should NOT trigger when drift < threshold', () => {
        vi.mocked(getIsPremiumFromCache).mockReturnValue(false);

        useNotificationStore.setState({
          alertRules: [
            createMockAlertRule({
              ruleId: 'rb-2',
              type: 'rebalance_drift',
              ticker: 'PORTFOLIO',
              targetValue: 10,
              enabled: true,
              lastTriggered: null,
            }),
          ],
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [
            { ticker: 'AAPL', id: 'aapl', price: 100, holdings: 450 }, // value = 45000
          ],
          targetPortfolio: [
            { ticker: 'AAPL', id: 'aapl', targetPercentage: 45 }, // current: 45%, target: 45%, drift: 0%
          ],
          totalValue: 100_000,
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications.filter((n) => n.type === 'rebalance_suggestion')).toHaveLength(0);
      });
    });

    describe('goal_achieved', () => {
      it('should trigger notification when totalValue >= goal targetAmount', () => {
        useNotificationStore.setState({ alertRules: [], notifications: [] });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [],
          goals: [
            { id: 'goal-1', name: '老後資金', targetAmount: 50_000 },
          ],
          totalValue: 60_000,
        });

        const { notifications } = useNotificationStore.getState();
        const goalNotif = notifications.find((n) => n.type === 'goal_achieved');
        expect(goalNotif).toBeDefined();
        expect(goalNotif!.title).toContain('目標達成');
        expect(goalNotif!.metadata.goalId).toBe('goal-1');
      });

      it('should NOT trigger when totalValue < goal targetAmount', () => {
        useNotificationStore.setState({ alertRules: [], notifications: [] });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [],
          goals: [
            { id: 'goal-2', name: '住宅購入', targetAmount: 200_000 },
          ],
          totalValue: 100_000,
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications.filter((n) => n.type === 'goal_achieved')).toHaveLength(0);
      });

      it('should NOT trigger duplicate goal_achieved notification', () => {
        // Pre-populate with an existing goal_achieved notification
        useNotificationStore.setState({
          alertRules: [],
          notifications: [
            createMockNotification({
              type: 'goal_achieved',
              metadata: { goalId: 'goal-1' },
            }),
          ],
          unreadCount: 1,
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [],
          goals: [
            { id: 'goal-1', name: '老後資金', targetAmount: 50_000 },
          ],
          totalValue: 60_000,
        });

        const { notifications } = useNotificationStore.getState();
        const goalNotifs = notifications.filter(
          (n) => n.type === 'goal_achieved' && n.metadata?.goalId === 'goal-1'
        );
        expect(goalNotifs).toHaveLength(1);
      });
    });

    describe('cooldown check', () => {
      it('should NOT trigger alert within 1 hour cooldown', () => {
        const recentTimestamp = new Date(Date.now() - 1800_000).toISOString(); // 30 min ago

        useNotificationStore.setState({
          alertRules: [
            createMockAlertRule({
              ruleId: 'cooldown-1',
              type: 'price_above',
              ticker: 'AAPL',
              targetValue: 200,
              enabled: true,
              lastTriggered: recentTimestamp,
            }),
          ],
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [{ ticker: 'AAPL', price: 210, holdings: 10 }],
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications.filter((n) => n.type === 'price_alert')).toHaveLength(0);
      });
    });

    describe('disabled rules', () => {
      it('should skip disabled alert rules', () => {
        useNotificationStore.setState({
          alertRules: [
            createMockAlertRule({
              ruleId: 'disabled-1',
              type: 'price_above',
              ticker: 'AAPL',
              targetValue: 200,
              enabled: false,
              lastTriggered: null,
            }),
          ],
        });

        useNotificationStore.getState().evaluateAlerts({
          ...baseParams,
          currentAssets: [{ ticker: 'AAPL', price: 210, holdings: 10 }],
        });

        const { notifications } = useNotificationStore.getState();
        expect(notifications.filter((n) => n.type === 'price_alert')).toHaveLength(0);
      });
    });
  });

  // =========================================================================
  // getMaxAlertRules
  // =========================================================================
  describe('getMaxAlertRules', () => {
    it('should return 2 for free plan', () => {
      vi.mocked(getIsPremiumFromCache).mockReturnValue(false);
      expect(useNotificationStore.getState().getMaxAlertRules()).toBe(2);
    });

    it('should return 20 for premium plan', () => {
      vi.mocked(getIsPremiumFromCache).mockReturnValue(true);
      expect(useNotificationStore.getState().getMaxAlertRules()).toBe(20);
    });
  });

  // =========================================================================
  // getMaxHistory
  // =========================================================================
  describe('getMaxHistory', () => {
    it('should return 10 for free plan', () => {
      vi.mocked(getIsPremiumFromCache).mockReturnValue(false);
      expect(useNotificationStore.getState().getMaxHistory()).toBe(10);
    });

    it('should return 100 for premium plan', () => {
      vi.mocked(getIsPremiumFromCache).mockReturnValue(true);
      expect(useNotificationStore.getState().getMaxHistory()).toBe(100);
    });
  });

  // =========================================================================
  // fetchNotifications
  // =========================================================================
  describe('fetchNotifications', () => {
    it('should fetch and set notifications', async () => {
      const mockResponse = {
        notifications: [
          createMockNotification({ notificationId: 'fetched-1', read: false }),
          createMockNotification({ notificationId: 'fetched-2', read: true }),
        ],
        lastKey: null as string | null,
      };
      (notificationService.fetchNotifications as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await useNotificationStore.getState().fetchNotifications(true);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(state.unreadCount).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('should silently fail and keep existing data on error', async () => {
      (notificationService.fetchNotifications as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const existingNotifs = [createMockNotification({ notificationId: 'existing-1' })];
      useNotificationStore.setState({ notifications: existingNotifs, unreadCount: 1 });

      await useNotificationStore.getState().fetchNotifications(true);

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.loading).toBe(false);
    });
  });

  // =========================================================================
  // fetchAlertRules
  // =========================================================================
  describe('fetchAlertRules', () => {
    it('should fetch and set alert rules', async () => {
      const mockRules = [
        createMockAlertRule({ ruleId: 'fr-1' }),
        createMockAlertRule({ ruleId: 'fr-2' }),
      ];
      (notificationService.fetchAlertRules as ReturnType<typeof vi.fn>).mockResolvedValue(mockRules);

      await useNotificationStore.getState().fetchAlertRules();

      const state = useNotificationStore.getState();
      expect(state.alertRules).toHaveLength(2);
      expect(state.loading).toBe(false);
    });
  });

  // =========================================================================
  // updateAlertRule
  // =========================================================================
  describe('updateAlertRule', () => {
    it('should update rule in array on success', async () => {
      const updatedRule = createMockAlertRule({
        ruleId: 'update-1',
        targetValue: 300,
      });
      (notificationService.updateAlertRule as ReturnType<typeof vi.fn>).mockResolvedValue(updatedRule);

      useNotificationStore.setState({
        alertRules: [createMockAlertRule({ ruleId: 'update-1', targetValue: 200 })],
      });

      await useNotificationStore.getState().updateAlertRule('update-1', { targetValue: 300 });

      const rule = useNotificationStore.getState().alertRules[0];
      expect(rule.targetValue).toBe(300);
    });
  });
});
