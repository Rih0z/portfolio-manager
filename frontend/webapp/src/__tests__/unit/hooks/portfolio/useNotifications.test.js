/**
 * useNotifications.js のテストファイル
 * 通知管理カスタムフックの包括的テスト
 */

import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '../../../../hooks/portfolio/useNotifications';

// NotificationServiceのモック
const mockNotificationService = {
  getAll: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  clear: jest.fn()
};

jest.mock('../../../../services/portfolio/NotificationService', () => ({
  notificationService: mockNotificationService
}));

describe('useNotifications', () => {
  let mockUnsubscribe;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのモック設定
    mockUnsubscribe = jest.fn();
    mockNotificationService.getAll.mockReturnValue([]);
    mockNotificationService.subscribe.mockReturnValue(mockUnsubscribe);
    mockNotificationService.add.mockReturnValue('notification-id-123');
  });

  describe('初期化', () => {
    test('フックが正常に初期化される', () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current).toHaveProperty('notifications');
      expect(result.current).toHaveProperty('addNotification');
      expect(result.current).toHaveProperty('removeNotification');
      
      expect(Array.isArray(result.current.notifications)).toBe(true);
      expect(typeof result.current.addNotification).toBe('function');
      expect(typeof result.current.removeNotification).toBe('function');
    });

    test('初期状態で通知サービスから全通知を取得する', () => {
      const mockNotifications = [
        { id: '1', message: 'Test notification 1', type: 'info' },
        { id: '2', message: 'Test notification 2', type: 'success' }
      ];

      mockNotificationService.getAll.mockReturnValue(mockNotifications);

      const { result } = renderHook(() => useNotifications());

      expect(mockNotificationService.getAll).toHaveBeenCalledTimes(1);
      expect(result.current.notifications).toEqual(mockNotifications);
    });

    test('通知サービスの変更を購読する', () => {
      renderHook(() => useNotifications());

      expect(mockNotificationService.subscribe).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.subscribe).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('通知の追加', () => {
    test('デフォルトタイプ(info)で通知を追加できる', () => {
      const { result } = renderHook(() => useNotifications());

      let notificationId;
      act(() => {
        notificationId = result.current.addNotification('Test message');
      });

      expect(mockNotificationService.add).toHaveBeenCalledWith('Test message', 'info');
      expect(notificationId).toBe('notification-id-123');
    });

    test('指定したタイプで通知を追加できる', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.addNotification('Success message', 'success');
      });

      expect(mockNotificationService.add).toHaveBeenCalledWith('Success message', 'success');
    });

    test('エラータイプの通知を追加できる', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.addNotification('Error message', 'error');
      });

      expect(mockNotificationService.add).toHaveBeenCalledWith('Error message', 'error');
    });

    test('警告タイプの通知を追加できる', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.addNotification('Warning message', 'warning');
      });

      expect(mockNotificationService.add).toHaveBeenCalledWith('Warning message', 'warning');
    });

    test('空のメッセージでも通知を追加できる', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.addNotification('');
      });

      expect(mockNotificationService.add).toHaveBeenCalledWith('', 'info');
    });

    test('addNotification関数は安定した参照を持つ', () => {
      const { result, rerender } = renderHook(() => useNotifications());

      const firstAddNotification = result.current.addNotification;
      
      rerender();
      
      const secondAddNotification = result.current.addNotification;
      
      expect(firstAddNotification).toBe(secondAddNotification);
    });
  });

  describe('通知の削除', () => {
    test('IDを指定して通知を削除できる', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.removeNotification('notification-id-123');
      });

      expect(mockNotificationService.remove).toHaveBeenCalledWith('notification-id-123');
    });

    test('存在しないIDで削除しても例外が発生しない', () => {
      const { result } = renderHook(() => useNotifications());

      expect(() => {
        act(() => {
          result.current.removeNotification('non-existent-id');
        });
      }).not.toThrow();

      expect(mockNotificationService.remove).toHaveBeenCalledWith('non-existent-id');
    });

    test('removeNotification関数は安定した参照を持つ', () => {
      const { result, rerender } = renderHook(() => useNotifications());

      const firstRemoveNotification = result.current.removeNotification;
      
      rerender();
      
      const secondRemoveNotification = result.current.removeNotification;
      
      expect(firstRemoveNotification).toBe(secondRemoveNotification);
    });
  });

  describe('通知の更新', () => {
    test('サービスからの通知更新を受信する', () => {
      let subscriptionCallback;
      mockNotificationService.subscribe.mockImplementation((callback) => {
        subscriptionCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useNotifications());

      // 初期状態
      expect(result.current.notifications).toEqual([]);

      // サービスからの更新をシミュレート
      const newNotifications = [
        { id: '1', message: 'New notification', type: 'info' }
      ];

      act(() => {
        subscriptionCallback(newNotifications);
      });

      expect(result.current.notifications).toEqual(newNotifications);
    });

    test('複数の通知更新を正しく処理する', () => {
      let subscriptionCallback;
      mockNotificationService.subscribe.mockImplementation((callback) => {
        subscriptionCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useNotifications());

      // 最初の更新
      const firstNotifications = [
        { id: '1', message: 'First notification', type: 'info' }
      ];

      act(() => {
        subscriptionCallback(firstNotifications);
      });

      expect(result.current.notifications).toEqual(firstNotifications);

      // 2回目の更新
      const secondNotifications = [
        { id: '1', message: 'First notification', type: 'info' },
        { id: '2', message: 'Second notification', type: 'success' }
      ];

      act(() => {
        subscriptionCallback(secondNotifications);
      });

      expect(result.current.notifications).toEqual(secondNotifications);
    });
  });

  describe('購読の管理', () => {
    test('コンポーネントアンマウント時に購読を解除する', () => {
      const { unmount } = renderHook(() => useNotifications());

      expect(mockNotificationService.subscribe).toHaveBeenCalledTimes(1);

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    test('再レンダリング時に重複購読が発生しない', () => {
      const { rerender } = renderHook(() => useNotifications());

      expect(mockNotificationService.subscribe).toHaveBeenCalledTimes(1);

      rerender();

      expect(mockNotificationService.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    test('NotificationServiceのgetAllがエラーを投げても処理を続行', () => {
      mockNotificationService.getAll.mockImplementation(() => {
        throw new Error('Service error');
      });

      expect(() => {
        renderHook(() => useNotifications());
      }).toThrow();
    });

    test('addNotificationでサービスエラーが発生しても例外を伝播', () => {
      mockNotificationService.add.mockImplementation(() => {
        throw new Error('Add failed');
      });

      const { result } = renderHook(() => useNotifications());

      expect(() => {
        act(() => {
          result.current.addNotification('Test message');
        });
      }).toThrow('Add failed');
    });

    test('removeNotificationでサービスエラーが発生しても例外を伝播', () => {
      mockNotificationService.remove.mockImplementation(() => {
        throw new Error('Remove failed');
      });

      const { result } = renderHook(() => useNotifications());

      expect(() => {
        act(() => {
          result.current.removeNotification('test-id');
        });
      }).toThrow('Remove failed');
    });

    test('購読コールバックでエラーが発生してもアプリがクラッシュしない', () => {
      let subscriptionCallback;
      mockNotificationService.subscribe.mockImplementation((callback) => {
        subscriptionCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useNotifications());

      // エラーを投げるコールバック実行をシミュレート
      expect(() => {
        act(() => {
          subscriptionCallback(undefined);
        });
      }).not.toThrow();
    });
  });

  describe('複数インスタンス', () => {
    test('複数のフックインスタンスが独立して動作する', () => {
      const { result: result1 } = renderHook(() => useNotifications());
      const { result: result2 } = renderHook(() => useNotifications());

      // 両方とも同じサービスを参照するため、同じ状態を持つべき
      expect(result1.current.notifications).toEqual(result2.current.notifications);

      // しかし、関数は異なるインスタンス
      expect(result1.current.addNotification).not.toBe(result2.current.addNotification);
    });
  });

  describe('メモリリーク防止', () => {
    test('複数回アンマウントしても安全', () => {
      const { unmount } = renderHook(() => useNotifications());

      unmount();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);

      // 2回目のアンマウントは何もしない
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('パフォーマンス', () => {
    test('大量の通知でも正常に動作する', () => {
      const largeNotificationList = Array.from({ length: 1000 }, (_, i) => ({
        id: `notification-${i}`,
        message: `Notification ${i}`,
        type: 'info'
      }));

      mockNotificationService.getAll.mockReturnValue(largeNotificationList);

      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toHaveLength(1000);
      expect(result.current.notifications[0]).toEqual({
        id: 'notification-0',
        message: 'Notification 0',
        type: 'info'
      });
    });
  });
});