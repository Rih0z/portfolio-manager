/**
 * 通知サービス
 *
 * 通知・アラートルールの API 呼び出しを一元管理する。
 *
 * @file src/services/notificationService.ts
 */

import { getApiEndpoint } from '../utils/envUtils';
import { authFetch } from '../utils/apiUtils';
import type {
  AppNotification,
  AlertRule,
  AlertRuleInput,
  NotificationsResponse,
} from '../types/notification.types';

// ─── Notifications ───────────────────────────────────

/**
 * 通知一覧を取得（ページネーション対応、降順）
 */
export const fetchNotifications = async (
  limit: number = 20,
  lastKey?: string | null
): Promise<NotificationsResponse> => {
  const endpoint = await getApiEndpoint('api/notifications');
  const params: Record<string, any> = { limit };
  if (lastKey) params.lastKey = lastKey;

  const response: any = await authFetch(endpoint, 'get', params);
  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || '通知の取得に失敗しました');
};

/**
 * 通知を既読にする
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  const endpoint = await getApiEndpoint(`api/notifications/${notificationId}/read`);
  const response: any = await authFetch(endpoint, 'put');
  if (!response?.success) {
    throw new Error(response?.error?.message || '既読処理に失敗しました');
  }
};

/**
 * 全通知を既読にする
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  const endpoint = await getApiEndpoint('api/notifications/read-all');
  const response: any = await authFetch(endpoint, 'post');
  if (!response?.success) {
    throw new Error(response?.error?.message || '一括既読処理に失敗しました');
  }
};

/**
 * 通知を削除する
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  const endpoint = await getApiEndpoint(`api/notifications/${notificationId}`);
  const response: any = await authFetch(endpoint, 'delete');
  if (!response?.success) {
    throw new Error(response?.error?.message || '通知の削除に失敗しました');
  }
};

// ─── Alert Rules ─────────────────────────────────────

/**
 * アラートルール一覧を取得
 */
export const fetchAlertRules = async (): Promise<AlertRule[]> => {
  const endpoint = await getApiEndpoint('api/alert-rules');
  const response: any = await authFetch(endpoint, 'get');
  if (response?.success && response.data) {
    return response.data.rules || response.data;
  }
  throw new Error(response?.error?.message || 'アラートルールの取得に失敗しました');
};

/**
 * アラートルールを作成
 */
export const createAlertRule = async (input: AlertRuleInput): Promise<AlertRule> => {
  const endpoint = await getApiEndpoint('api/alert-rules');
  const response: any = await authFetch(endpoint, 'post', input);
  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'アラートルールの作成に失敗しました');
};

/**
 * アラートルールを更新
 */
export const updateAlertRule = async (
  ruleId: string,
  updates: Partial<AlertRuleInput>
): Promise<AlertRule> => {
  const endpoint = await getApiEndpoint(`api/alert-rules/${ruleId}`);
  const response: any = await authFetch(endpoint, 'put', updates);
  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'アラートルールの更新に失敗しました');
};

/**
 * アラートルールを削除
 */
export const deleteAlertRule = async (ruleId: string): Promise<void> => {
  const endpoint = await getApiEndpoint(`api/alert-rules/${ruleId}`);
  const response: any = await authFetch(endpoint, 'delete');
  if (!response?.success) {
    throw new Error(response?.error?.message || 'アラートルールの削除に失敗しました');
  }
};
