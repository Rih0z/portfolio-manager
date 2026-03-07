/**
 * notificationService unit tests
 *
 * 通知・アラートルール API 呼び出しの正常系・異常系を検証する。
 * @file src/__tests__/unit/services/notificationService.test.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// --- Mock dependencies BEFORE imports ---
vi.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: vi.fn((path: string) => Promise.resolve(`https://api.test.com/${path}`)),
}));

vi.mock('../../../utils/apiUtils', () => ({
  authFetch: vi.fn(),
}));

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
} from '../../../services/notificationService';
import { authFetch } from '../../../utils/apiUtils';
import { getApiEndpoint } from '../../../utils/envUtils';

// Typed mock helpers
const mockedAuthFetch = authFetch as ReturnType<typeof vi.fn>;
const mockedGetApiEndpoint = getApiEndpoint as ReturnType<typeof vi.fn>;

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetApiEndpoint.mockImplementation((path: string) =>
      Promise.resolve(`https://api.test.com/${path}`)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // fetchNotifications
  // =========================================================================
  describe('fetchNotifications', () => {
    it('should call authFetch with correct endpoint and return data', async () => {
      const mockData = {
        notifications: [
          {
            notificationId: 'n-1',
            userId: 'u-1',
            type: 'price_alert',
            title: 'テスト',
            message: 'メッセージ',
            read: false,
            metadata: {},
            createdAt: '2026-03-01T00:00:00Z',
          },
        ],
        lastKey: null,
      };
      mockedAuthFetch.mockResolvedValue({ success: true, data: mockData });

      const result = await fetchNotifications(20);

      expect(mockedGetApiEndpoint).toHaveBeenCalledWith('api/notifications');
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/notifications',
        'get',
        { limit: 20 }
      );
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].notificationId).toBe('n-1');
    });

    it('should pass lastKey as parameter when provided', async () => {
      mockedAuthFetch.mockResolvedValue({
        success: true,
        data: { notifications: [], lastKey: null },
      });

      await fetchNotifications(10, 'some-last-key');

      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/notifications',
        'get',
        { limit: 10, lastKey: 'some-last-key' }
      );
    });

    it('should throw error on failed response', async () => {
      mockedAuthFetch.mockResolvedValue({
        success: false,
        error: { message: '認証が必要です' },
      });

      await expect(fetchNotifications()).rejects.toThrow('認証が必要です');
    });

    it('should throw default error message when no error message provided', async () => {
      mockedAuthFetch.mockResolvedValue({ success: false });

      await expect(fetchNotifications()).rejects.toThrow('通知の取得に失敗しました');
    });
  });

  // =========================================================================
  // markNotificationRead
  // =========================================================================
  describe('markNotificationRead', () => {
    it('should call PUT with correct endpoint', async () => {
      mockedAuthFetch.mockResolvedValue({ success: true });

      await markNotificationRead('notif-123');

      expect(mockedGetApiEndpoint).toHaveBeenCalledWith('api/notifications/notif-123/read');
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/notifications/notif-123/read',
        'put'
      );
    });

    it('should throw error on failed response', async () => {
      mockedAuthFetch.mockResolvedValue({
        success: false,
        error: { message: '通知が見つかりません' },
      });

      await expect(markNotificationRead('notif-999')).rejects.toThrow('通知が見つかりません');
    });

    it('should throw default error message when no error detail', async () => {
      mockedAuthFetch.mockResolvedValue({ success: false });

      await expect(markNotificationRead('notif-999')).rejects.toThrow('既読処理に失敗しました');
    });
  });

  // =========================================================================
  // markAllNotificationsRead
  // =========================================================================
  describe('markAllNotificationsRead', () => {
    it('should call POST with correct endpoint', async () => {
      mockedAuthFetch.mockResolvedValue({ success: true });

      await markAllNotificationsRead();

      expect(mockedGetApiEndpoint).toHaveBeenCalledWith('api/notifications/read-all');
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/notifications/read-all',
        'post'
      );
    });

    it('should throw error on failed response', async () => {
      mockedAuthFetch.mockResolvedValue({ success: false });

      await expect(markAllNotificationsRead()).rejects.toThrow('一括既読処理に失敗しました');
    });
  });

  // =========================================================================
  // deleteNotification
  // =========================================================================
  describe('deleteNotification', () => {
    it('should call DELETE with correct endpoint', async () => {
      mockedAuthFetch.mockResolvedValue({ success: true });

      await deleteNotification('notif-456');

      expect(mockedGetApiEndpoint).toHaveBeenCalledWith('api/notifications/notif-456');
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/notifications/notif-456',
        'delete'
      );
    });

    it('should throw error on failed response', async () => {
      mockedAuthFetch.mockResolvedValue({
        success: false,
        error: { message: '削除権限がありません' },
      });

      await expect(deleteNotification('notif-456')).rejects.toThrow('削除権限がありません');
    });

    it('should throw default error message when no error detail', async () => {
      mockedAuthFetch.mockResolvedValue({ success: false });

      await expect(deleteNotification('notif-456')).rejects.toThrow('通知の削除に失敗しました');
    });
  });

  // =========================================================================
  // fetchAlertRules
  // =========================================================================
  describe('fetchAlertRules', () => {
    it('should return rules array from response.data.rules', async () => {
      const mockRules = [
        {
          ruleId: 'r-1',
          userId: 'u-1',
          type: 'price_above',
          ticker: 'AAPL',
          targetValue: 200,
          enabled: true,
          lastTriggered: null,
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: '2026-03-01T00:00:00Z',
        },
      ];
      mockedAuthFetch.mockResolvedValue({
        success: true,
        data: { rules: mockRules },
      });

      const result = await fetchAlertRules();

      expect(mockedGetApiEndpoint).toHaveBeenCalledWith('api/alert-rules');
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/alert-rules',
        'get'
      );
      expect(result).toHaveLength(1);
      expect(result[0].ruleId).toBe('r-1');
    });

    it('should return data directly when rules key is absent', async () => {
      const mockRules = [
        {
          ruleId: 'r-2',
          userId: 'u-1',
          type: 'price_below',
          ticker: 'GOOG',
          targetValue: 100,
          enabled: true,
          lastTriggered: null,
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: '2026-03-01T00:00:00Z',
        },
      ];
      mockedAuthFetch.mockResolvedValue({
        success: true,
        data: mockRules,
      });

      const result = await fetchAlertRules();
      expect(result).toHaveLength(1);
      expect(result[0].ruleId).toBe('r-2');
    });

    it('should throw error on failed response', async () => {
      mockedAuthFetch.mockResolvedValue({ success: false });

      await expect(fetchAlertRules()).rejects.toThrow('アラートルールの取得に失敗しました');
    });
  });

  // =========================================================================
  // createAlertRule
  // =========================================================================
  describe('createAlertRule', () => {
    it('should send input data and return created rule', async () => {
      const input = { type: 'price_above' as const, ticker: 'AAPL', targetValue: 200 };
      const createdRule = {
        ruleId: 'new-rule-1',
        userId: 'u-1',
        ...input,
        enabled: true,
        lastTriggered: null,
        createdAt: '2026-03-07T00:00:00Z',
        updatedAt: '2026-03-07T00:00:00Z',
      };
      mockedAuthFetch.mockResolvedValue({ success: true, data: createdRule });

      const result = await createAlertRule(input);

      expect(mockedGetApiEndpoint).toHaveBeenCalledWith('api/alert-rules');
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/alert-rules',
        'post',
        input
      );
      expect(result.ruleId).toBe('new-rule-1');
    });

    it('should throw error on failed response', async () => {
      mockedAuthFetch.mockResolvedValue({
        success: false,
        error: { message: 'プラン上限に達しています' },
      });

      await expect(
        createAlertRule({ type: 'price_above', ticker: 'AAPL', targetValue: 200 })
      ).rejects.toThrow('プラン上限に達しています');
    });

    it('should throw default error message when no error detail', async () => {
      mockedAuthFetch.mockResolvedValue({ success: false });

      await expect(
        createAlertRule({ type: 'price_above', ticker: 'AAPL', targetValue: 200 })
      ).rejects.toThrow('アラートルールの作成に失敗しました');
    });
  });

  // =========================================================================
  // updateAlertRule
  // =========================================================================
  describe('updateAlertRule', () => {
    it('should send partial updates and return updated rule', async () => {
      const updates = { targetValue: 300 };
      const updatedRule = {
        ruleId: 'rule-1',
        userId: 'u-1',
        type: 'price_above',
        ticker: 'AAPL',
        targetValue: 300,
        enabled: true,
        lastTriggered: null,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-07T00:00:00Z',
      };
      mockedAuthFetch.mockResolvedValue({ success: true, data: updatedRule });

      const result = await updateAlertRule('rule-1', updates);

      expect(mockedGetApiEndpoint).toHaveBeenCalledWith('api/alert-rules/rule-1');
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/alert-rules/rule-1',
        'put',
        updates
      );
      expect(result.targetValue).toBe(300);
    });

    it('should throw error on failed response', async () => {
      mockedAuthFetch.mockResolvedValue({
        success: false,
        error: { message: 'ルールが見つかりません' },
      });

      await expect(updateAlertRule('rule-999', { targetValue: 500 })).rejects.toThrow(
        'ルールが見つかりません'
      );
    });

    it('should throw default error message when no error detail', async () => {
      mockedAuthFetch.mockResolvedValue({ success: false });

      await expect(updateAlertRule('rule-999', { targetValue: 500 })).rejects.toThrow(
        'アラートルールの更新に失敗しました'
      );
    });
  });

  // =========================================================================
  // deleteAlertRule
  // =========================================================================
  describe('deleteAlertRule', () => {
    it('should call DELETE with correct endpoint', async () => {
      mockedAuthFetch.mockResolvedValue({ success: true });

      await deleteAlertRule('rule-del-1');

      expect(mockedGetApiEndpoint).toHaveBeenCalledWith('api/alert-rules/rule-del-1');
      expect(mockedAuthFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/alert-rules/rule-del-1',
        'delete'
      );
    });

    it('should throw error on failed response', async () => {
      mockedAuthFetch.mockResolvedValue({
        success: false,
        error: { message: '削除権限がありません' },
      });

      await expect(deleteAlertRule('rule-del-1')).rejects.toThrow('削除権限がありません');
    });

    it('should throw default error message when no error detail', async () => {
      mockedAuthFetch.mockResolvedValue({ success: false });

      await expect(deleteAlertRule('rule-del-1')).rejects.toThrow(
        'アラートルールの削除に失敗しました'
      );
    });
  });
});
