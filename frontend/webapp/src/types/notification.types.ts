/**
 * 通知・アラートルール型定義
 *
 * @file src/types/notification.types.ts
 */

// ─── Notification ─────────────────────────────────────

export type NotificationType = 'price_alert' | 'goal_achieved' | 'rebalance_suggestion';

export interface AppNotification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  ttl?: number;
}

// ─── Alert Rule ──────────────────────────────────────

export type AlertRuleType = 'price_above' | 'price_below' | 'rebalance_drift';

export interface AlertRule {
  ruleId: string;
  userId: string;
  type: AlertRuleType;
  ticker: string;
  targetValue: number;
  enabled: boolean;
  lastTriggered: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRuleInput {
  type: AlertRuleType;
  ticker: string;
  targetValue: number;
  enabled?: boolean;
}

// ─── API Response ────────────────────────────────────

export interface NotificationsResponse {
  notifications: AppNotification[];
  lastKey?: string | null;
}

export interface AlertRulesResponse {
  rules: AlertRule[];
}

// ─── Plan Limits ─────────────────────────────────────

export const NOTIFICATION_LIMITS = {
  FREE: {
    maxAlertRules: 2,
    rebalanceThreshold: 10, // 固定 10%
    maxHistory: 10,
  },
  STANDARD: {
    maxAlertRules: 20,
    rebalanceThresholdMin: 1,
    rebalanceThresholdMax: 20,
    maxHistory: 100,
  },
} as const;
