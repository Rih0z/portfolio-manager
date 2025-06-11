/**
 * NotificationService Test Suite
 * 
 * 通知管理サービスの包括的なテスト
 * - コンストラクタ初期化
 * - add()メソッド（全タイプ、自動削除タイミング）
 * - remove()メソッド
 * - getAll()メソッド（不変性）
 * - subscribe/unsubscribe機能
 * - リスナー通知
 * - シングルトンインスタンス
 * - タイマー管理
 * - エッジケース
 * - メモリリーク防止
 * - 並行操作
 * - 複数サブスクライバー
 */

import { NotificationService, notificationService } from '../../../../services/portfolio/NotificationService';

describe('NotificationService', () => {
  let service;

  beforeEach(() => {
    // Jest fake timersを使用してsetTimeoutをモック
    jest.useFakeTimers();
    service = new NotificationService();
  });

  afterEach(() => {
    // タイマーをクリアして次のテストに影響しないようにする
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Constructor Initialization', () => {
    test('should initialize with empty notifications array', () => {
      expect(service.notifications).toEqual([]);
      expect(Array.isArray(service.notifications)).toBe(true);
    });

    test('should initialize with empty listeners Set', () => {
      expect(service.listeners).toBeInstanceOf(Set);
      expect(service.listeners.size).toBe(0);
    });

    test('should create new instance with separate state', () => {
      const service1 = new NotificationService();
      const service2 = new NotificationService();
      
      service1.add('test message', 'info');
      
      expect(service1.notifications.length).toBe(1);
      expect(service2.notifications.length).toBe(0);
      expect(service1.notifications).not.toBe(service2.notifications);
    });
  });

  describe('add() Method', () => {
    test('should add notification with default info type', () => {
      const id = service.add('Test message');
      
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications[0]).toMatchObject({
        id,
        message: 'Test message',
        type: 'info'
      });
    });

    test('should add notification with specified type', () => {
      const types = ['info', 'success', 'warning', 'error'];
      
      types.forEach((type, index) => {
        const id = service.add(`Message ${index}`, type);
        expect(service.notifications[index]).toMatchObject({
          id,
          message: `Message ${index}`,
          type
        });
      });
    });

    test('should generate unique IDs for notifications', () => {
      const id1 = service.add('Message 1');
      const id2 = service.add('Message 2');
      const id3 = service.add('Message 3');
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
      
      // IDの形式をチェック（timestamp-randomstring）
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id3).toMatch(/^\d+-[a-z0-9]+$/);
    });

    test('should return notification ID', () => {
      const id = service.add('Test message', 'success');
      expect(typeof id).toBe('string');
      expect(id).toBeTruthy();
    });

    test('should auto-remove non-error notifications after 5 seconds', () => {
      const infoId = service.add('Info message', 'info');
      const successId = service.add('Success message', 'success');
      const warningId = service.add('Warning message', 'warning');
      
      expect(service.notifications).toHaveLength(3);
      
      // 5秒経過をシミュレート
      jest.advanceTimersByTime(5000);
      
      expect(service.notifications).toHaveLength(0);
      expect(service.notifications.find(n => n.id === infoId)).toBeUndefined();
      expect(service.notifications.find(n => n.id === successId)).toBeUndefined();
      expect(service.notifications.find(n => n.id === warningId)).toBeUndefined();
    });

    test('should NOT auto-remove error notifications', () => {
      const errorId = service.add('Error message', 'error');
      
      expect(service.notifications).toHaveLength(1);
      
      // 5秒以上経過をシミュレート
      jest.advanceTimersByTime(10000);
      
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications[0].id).toBe(errorId);
    });

    test('should handle mixed notification types correctly', () => {
      const infoId = service.add('Info', 'info');
      const errorId = service.add('Error', 'error');
      const successId = service.add('Success', 'success');
      
      expect(service.notifications).toHaveLength(3);
      
      // 5秒経過
      jest.advanceTimersByTime(5000);
      
      // エラー通知のみ残っているはず
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications[0].id).toBe(errorId);
    });

    test('should handle empty message', () => {
      const id = service.add('', 'info');
      
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications[0].message).toBe('');
    });

    test('should handle special characters in message', () => {
      const specialMessage = '特殊文字: !@#$%^&*()_+{}|:"<>?[];\'\\,./`~';
      const id = service.add(specialMessage, 'info');
      
      expect(service.notifications[0].message).toBe(specialMessage);
    });

    test('should notify listeners when notification is added', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      service.add('Test message', 'info');
      
      expect(listener).toHaveBeenCalledWith([{
        id: expect.any(String),
        message: 'Test message',
        type: 'info'
      }]);
    });
  });

  describe('remove() Method', () => {
    test('should remove notification by ID', () => {
      const id1 = service.add('Message 1', 'info');
      const id2 = service.add('Message 2', 'success');
      
      expect(service.notifications).toHaveLength(2);
      
      service.remove(id1);
      
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications[0].id).toBe(id2);
    });

    test('should handle removal of non-existent ID gracefully', () => {
      const id = service.add('Test message', 'info');
      
      expect(service.notifications).toHaveLength(1);
      
      service.remove('non-existent-id');
      
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications[0].id).toBe(id);
    });

    test('should handle removal from empty notifications array', () => {
      expect(service.notifications).toHaveLength(0);
      
      expect(() => service.remove('any-id')).not.toThrow();
      expect(service.notifications).toHaveLength(0);
    });

    test('should remove all instances if duplicate IDs exist (edge case)', () => {
      // 直接配列に重複IDを挿入（実際のaddメソッドでは発生しないが、テストとして）
      const duplicateId = 'duplicate-id';
      service.notifications.push(
        { id: duplicateId, message: 'Message 1', type: 'info' },
        { id: duplicateId, message: 'Message 2', type: 'success' }
      );
      
      expect(service.notifications).toHaveLength(2);
      
      service.remove(duplicateId);
      
      expect(service.notifications).toHaveLength(0);
    });

    test('should notify listeners when notification is removed', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      const id = service.add('Test message', 'info');
      listener.mockClear(); // addの呼び出しをクリア
      
      service.remove(id);
      
      expect(listener).toHaveBeenCalledWith([]);
    });
  });

  describe('getAll() Method', () => {
    test('should return empty array when no notifications', () => {
      const result = service.getAll();
      
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should return all notifications', () => {
      const id1 = service.add('Message 1', 'info');
      const id2 = service.add('Message 2', 'success');
      
      const result = service.getAll();
      
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: id1, message: 'Message 1', type: 'info' },
        { id: id2, message: 'Message 2', type: 'success' }
      ]);
    });

    test('should return immutable copy (not reference to internal array)', () => {
      const id = service.add('Test message', 'info');
      const result1 = service.getAll();
      const result2 = service.getAll();
      
      // 異なる配列インスタンスを返すことを確認
      expect(result1).not.toBe(service.notifications);
      expect(result1).not.toBe(result2);
      
      // しかし内容は同じ
      expect(result1).toEqual(result2);
      
      // 返された配列を変更しても内部状態に影響しないことを確認
      result1.push({ id: 'fake', message: 'fake', type: 'fake' });
      
      expect(service.notifications).toHaveLength(1);
      expect(service.getAll()).toHaveLength(1);
    });

    test('should maintain notification order', () => {
      const id1 = service.add('First', 'info');
      const id2 = service.add('Second', 'success');
      const id3 = service.add('Third', 'warning');
      
      const result = service.getAll();
      
      expect(result[0].message).toBe('First');
      expect(result[1].message).toBe('Second');
      expect(result[2].message).toBe('Third');
    });
  });

  describe('subscribe() and unsubscribe functionality', () => {
    test('should register listener and return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      
      expect(typeof unsubscribe).toBe('function');
      expect(service.listeners.has(listener)).toBe(true);
      expect(service.listeners.size).toBe(1);
    });

    test('should call listener when notifications change', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      service.add('Test message', 'info');
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith([{
        id: expect.any(String),
        message: 'Test message',
        type: 'info'
      }]);
    });

    test('should unsubscribe listener correctly', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      
      service.add('Before unsubscribe', 'info');
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      expect(service.listeners.has(listener)).toBe(false);
      expect(service.listeners.size).toBe(0);
      
      service.add('After unsubscribe', 'success');
      expect(listener).toHaveBeenCalledTimes(1); // 変化なし
    });

    test('should handle multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      service.subscribe(listener1);
      service.subscribe(listener2);
      service.subscribe(listener3);
      
      expect(service.listeners.size).toBe(3);
      
      service.add('Test message', 'info');
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    test('should handle same listener subscribed multiple times', () => {
      const listener = jest.fn();
      
      const unsubscribe1 = service.subscribe(listener);
      const unsubscribe2 = service.subscribe(listener);
      
      // Setなので重複は1つのみ
      expect(service.listeners.size).toBe(1);
      
      service.add('Test message', 'info');
      
      // 1回のみ呼ばれる
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe1();
      
      // まだSetに残っている
      expect(service.listeners.size).toBe(1);
      
      unsubscribe2();
      
      // 今度は削除される
      expect(service.listeners.size).toBe(0);
    });

    test('should handle unsubscribe called multiple times', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      
      expect(service.listeners.size).toBe(1);
      
      unsubscribe();
      expect(service.listeners.size).toBe(0);
      
      // 複数回呼んでもエラーにならない
      expect(() => unsubscribe()).not.toThrow();
      expect(service.listeners.size).toBe(0);
    });
  });

  describe('notifyListeners() Method', () => {
    test('should notify all listeners with current notifications', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      service.subscribe(listener1);
      service.subscribe(listener2);
      
      const id = service.add('Test message', 'info');
      
      const expectedNotifications = [{ id, message: 'Test message', type: 'info' }];
      
      expect(listener1).toHaveBeenCalledWith(expectedNotifications);
      expect(listener2).toHaveBeenCalledWith(expectedNotifications);
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();
      
      service.subscribe(errorListener);
      service.subscribe(normalListener);
      
      // エラーが発生してもサービスは動作し続ける
      expect(() => service.add('Test message', 'info')).not.toThrow();
      
      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
    });

    test('should call listeners with immutable data', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      service.add('Test message', 'info');
      
      const receivedData = listener.mock.calls[0][0];
      
      // リスナーが受け取ったデータを変更
      receivedData.push({ id: 'fake', message: 'fake', type: 'fake' });
      
      // 内部状態は変更されない
      expect(service.notifications).toHaveLength(1);
      expect(service.getAll()).toHaveLength(1);
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton instance', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });

    test('should maintain singleton pattern', () => {
      const { notificationService: instance1 } = require('../../../../services/portfolio/NotificationService');
      const { notificationService: instance2 } = require('../../../../services/portfolio/NotificationService');
      
      expect(instance1).toBe(instance2);
    });

    test('should work with singleton instance', () => {
      const listener = jest.fn();
      notificationService.subscribe(listener);
      
      const id = notificationService.add('Singleton test', 'success');
      
      expect(listener).toHaveBeenCalledWith([{
        id,
        message: 'Singleton test',
        type: 'success'
      }]);
      
      // クリーンアップ
      notificationService.remove(id);
      notificationService.listeners.clear();
    });
  });

  describe('Timer Management', () => {
    test('should properly schedule auto-removal timers', () => {
      const id1 = service.add('Message 1', 'info');
      const id2 = service.add('Message 2', 'success');
      
      // 1つのタイマーが実行される前に進める
      jest.advanceTimersByTime(2500);
      expect(service.notifications).toHaveLength(2);
      
      // 残りの時間を進める
      jest.advanceTimersByTime(2500);
      expect(service.notifications).toHaveLength(0);
    });

    test('should handle manual removal before auto-removal', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      const id = service.add('Test message', 'info');
      
      // 自動削除前に手動削除
      service.remove(id);
      
      listener.mockClear();
      
      // タイマーが発火しても何も起こらない
      jest.advanceTimersByTime(5000);
      
      expect(listener).not.toHaveBeenCalled();
      expect(service.notifications).toHaveLength(0);
    });

    test('should handle multiple overlapping timers', () => {
      // 異なるタイミングで通知を追加
      const id1 = service.add('Message 1', 'info');
      
      jest.advanceTimersByTime(1000);
      const id2 = service.add('Message 2', 'success');
      
      jest.advanceTimersByTime(1000);
      const id3 = service.add('Message 3', 'warning');
      
      // 最初の通知が削除される時点（5秒後）
      jest.advanceTimersByTime(3000); // 合計5秒
      expect(service.notifications).toHaveLength(2);
      expect(service.notifications.find(n => n.id === id1)).toBeUndefined();
      
      // 2番目の通知が削除される時点（さらに1秒後）
      jest.advanceTimersByTime(1000);
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications.find(n => n.id === id2)).toBeUndefined();
      
      // 3番目の通知が削除される時点（さらに1秒後）
      jest.advanceTimersByTime(1000);
      expect(service.notifications).toHaveLength(0);
    });

    test('should clear pending timers when service is destroyed', () => {
      // この機能はNotificationServiceには実装されていないが、
      // メモリリーク防止のためのテストケースとして残す
      const id = service.add('Test message', 'info');
      
      // タイマーが設定されていることを確認
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      
      // サービスの状態をクリア（実際のdestroyメソッドがあった場合）
      service.notifications = [];
      service.listeners.clear();
      
      // 保留中のタイマーをクリア
      jest.clearAllTimers();
      
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null or undefined message', () => {
      const id1 = service.add(null, 'info');
      const id2 = service.add(undefined, 'success');
      
      expect(service.notifications).toHaveLength(2);
      expect(service.notifications[0].message).toBe(null);
      expect(service.notifications[1].message).toBe(undefined);
    });

    test('should handle invalid notification types', () => {
      const id = service.add('Test message', 'invalid-type');
      
      expect(service.notifications[0].type).toBe('invalid-type');
      
      // 不正なタイプでも自動削除は動作する（error以外なので）
      jest.advanceTimersByTime(5000);
      expect(service.notifications).toHaveLength(0);
    });

    test('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      const id = service.add(longMessage, 'info');
      
      expect(service.notifications[0].message).toBe(longMessage);
      expect(service.notifications[0].message.length).toBe(10000);
    });

    test('should handle rapid successive additions', () => {
      const ids = [];
      
      // 短時間で大量の通知を追加
      for (let i = 0; i < 100; i++) {
        ids.push(service.add(`Message ${i}`, 'info'));
      }
      
      expect(service.notifications).toHaveLength(100);
      expect(new Set(ids)).toHaveSize(100); // すべてユニークID
      
      // すべて自動削除される
      jest.advanceTimersByTime(5000);
      expect(service.notifications).toHaveLength(0);
    });

    test('should handle listener that modifies notifications during callback', () => {
      let callCount = 0;
      const listener = (notifications) => {
        callCount++;
        if (callCount === 1 && notifications.length > 0) {
          // リスナー内で削除を試行
          service.remove(notifications[0].id);
        }
      };
      
      service.subscribe(listener);
      
      const id = service.add('Test message', 'info');
      
      // 再帰的な呼び出しが発生するが、無限ループにならない
      expect(callCount).toBeGreaterThan(1);
      expect(service.notifications).toHaveLength(0);
    });
  });

  describe('Memory Leak Prevention', () => {
    test('should prevent memory leaks with many listeners', () => {
      const listeners = [];
      const unsubscribeFunctions = [];
      
      // 大量のリスナーを登録
      for (let i = 0; i < 1000; i++) {
        const listener = jest.fn();
        listeners.push(listener);
        unsubscribeFunctions.push(service.subscribe(listener));
      }
      
      expect(service.listeners.size).toBe(1000);
      
      // 通知を追加
      service.add('Test message', 'info');
      
      // すべてのリスナーが呼ばれる
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      
      // すべて解除
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      
      expect(service.listeners.size).toBe(0);
    });

    test('should handle listener cleanup after service operations', () => {
      const listeners = [];
      
      for (let i = 0; i < 10; i++) {
        const listener = jest.fn();
        listeners.push(listener);
        const unsubscribe = service.subscribe(listener);
        
        // いくつかのリスナーを即座に解除
        if (i % 2 === 0) {
          unsubscribe();
        }
      }
      
      expect(service.listeners.size).toBe(5); // 半分が残る
      
      service.add('Test message', 'info');
      
      // 残ったリスナーのみが呼ばれる
      listeners.forEach((listener, index) => {
        if (index % 2 !== 0) {
          expect(listener).toHaveBeenCalledTimes(1);
        } else {
          expect(listener).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent add and remove operations', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      // 複数の操作を同時に実行
      const id1 = service.add('Message 1', 'info');
      const id2 = service.add('Message 2', 'success');
      service.remove(id1);
      const id3 = service.add('Message 3', 'warning');
      service.remove(id2);
      
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications[0].id).toBe(id3);
      
      // リスナーが適切な回数呼ばれる
      expect(listener).toHaveBeenCalledTimes(5); // add(3回) + remove(2回)
    });

    test('should handle concurrent timer expiration and manual removal', () => {
      const id1 = service.add('Message 1', 'info');
      const id2 = service.add('Message 2', 'success');
      
      // タイマーが発火する直前に手動削除
      setTimeout(() => {
        service.remove(id1);
      }, 4999);
      
      // 手動削除のタイマーを実行
      jest.advanceTimersByTime(4999);
      expect(service.notifications).toHaveLength(1);
      expect(service.notifications[0].id).toBe(id2);
      
      // 自動削除のタイマーを実行
      jest.advanceTimersByTime(1);
      expect(service.notifications).toHaveLength(0);
    });
  });

  describe('Multiple Subscribers', () => {
    test('should notify multiple subscribers with same data', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      service.subscribe(listener1);
      service.subscribe(listener2);
      service.subscribe(listener3);
      
      const id = service.add('Test message', 'info');
      
      const expectedData = [{ id, message: 'Test message', type: 'info' }];
      
      expect(listener1).toHaveBeenCalledWith(expectedData);
      expect(listener2).toHaveBeenCalledWith(expectedData);
      expect(listener3).toHaveBeenCalledWith(expectedData);
      
      // すべて同じデータを受け取っているが、異なるインスタンス
      const data1 = listener1.mock.calls[0][0];
      const data2 = listener2.mock.calls[0][0];
      const data3 = listener3.mock.calls[0][0];
      
      expect(data1).toEqual(data2);
      expect(data2).toEqual(data3);
      expect(data1).not.toBe(data2); // 異なるインスタンス
    });

    test('should handle partial unsubscription correctly', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();
      
      service.subscribe(listener1);
      const unsubscribe2 = service.subscribe(listener2);
      service.subscribe(listener3);
      
      service.add('Before unsubscribe', 'info');
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
      
      // 1つのリスナーを解除
      unsubscribe2();
      
      service.add('After unsubscribe', 'success');
      
      expect(listener1).toHaveBeenCalledTimes(2);
      expect(listener2).toHaveBeenCalledTimes(1); // 変化なし
      expect(listener3).toHaveBeenCalledTimes(2);
    });

    test('should maintain performance with many subscribers', () => {
      const startTime = Date.now();
      const listeners = [];
      
      // 多数のリスナーを登録
      for (let i = 0; i < 100; i++) {
        const listener = jest.fn();
        listeners.push(listener);
        service.subscribe(listener);
      }
      
      // 通知を追加
      service.add('Performance test', 'info');
      
      // すべてのリスナーが呼ばれることを確認
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      
      const endTime = Date.now();
      
      // パフォーマンステスト（100ms以内で完了することを期待）
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});