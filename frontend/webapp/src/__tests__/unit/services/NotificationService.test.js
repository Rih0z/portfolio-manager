/**
 * NotificationServiceのユニットテスト
 */

import { NotificationService } from '../../../services/portfolio/NotificationService';

describe('NotificationService', () => {
  let service;

  beforeEach(() => {
    service = new NotificationService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('add', () => {
    it('通知を追加できる', () => {
      const id = service.add('テストメッセージ', 'info');
      
      expect(id).toBeTruthy();
      expect(service.getAll()).toHaveLength(1);
      expect(service.getAll()[0]).toMatchObject({
        message: 'テストメッセージ',
        type: 'info'
      });
    });

    it('エラー通知は自動削除されない', () => {
      service.add('エラーメッセージ', 'error');
      
      jest.advanceTimersByTime(6000);
      
      expect(service.getAll()).toHaveLength(1);
    });

    it('info/success/warning通知は5秒後に自動削除される', () => {
      service.add('情報メッセージ', 'info');
      service.add('成功メッセージ', 'success');
      service.add('警告メッセージ', 'warning');
      
      expect(service.getAll()).toHaveLength(3);
      
      jest.advanceTimersByTime(5000);
      
      expect(service.getAll()).toHaveLength(0);
    });

    it('デフォルトタイプはinfo', () => {
      service.add('メッセージ');
      
      expect(service.getAll()[0].type).toBe('info');
    });
  });

  describe('remove', () => {
    it('指定したIDの通知を削除できる', () => {
      const id1 = service.add('メッセージ1');
      const id2 = service.add('メッセージ2');
      const id3 = service.add('メッセージ3');
      
      service.remove(id2);
      
      const notifications = service.getAll();
      expect(notifications).toHaveLength(2);
      expect(notifications.find(n => n.id === id2)).toBeUndefined();
    });

    it('存在しないIDを削除してもエラーにならない', () => {
      service.add('メッセージ');
      
      expect(() => service.remove('non-existent-id')).not.toThrow();
      expect(service.getAll()).toHaveLength(1);
    });
  });

  describe('subscribe', () => {
    it('リスナーが通知の変更を受け取れる', () => {
      const listener = jest.fn();
      service.subscribe(listener);
      
      service.add('メッセージ');
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith([
        expect.objectContaining({
          message: 'メッセージ',
          type: 'info'
        })
      ]);
    });

    it('複数のリスナーが登録できる', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      service.subscribe(listener1);
      service.subscribe(listener2);
      
      service.add('メッセージ');
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('unsubscribeできる', () => {
      const listener = jest.fn();
      const unsubscribe = service.subscribe(listener);
      
      service.add('メッセージ1');
      unsubscribe();
      service.add('メッセージ2');
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});