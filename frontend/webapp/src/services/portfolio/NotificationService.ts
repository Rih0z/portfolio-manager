/**
 * 通知管理サービス
 *
 * Single Responsibility: 通知の追加、削除、管理のみを担当
 */

import type { Notification } from '../../types/portfolio.types';

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type NotificationListener = (notifications: Notification[]) => void;

export class NotificationService {
  notifications: Notification[];
  listeners: Set<NotificationListener>;

  constructor() {
    this.notifications = [];
    this.listeners = new Set();
  }

  /**
   * 通知を追加
   */
  add(message: string, type: NotificationType = 'info'): string {
    const id: string = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: Notification = { id, message, type };

    this.notifications.push(notification);
    this.notifyListeners();

    // 情報・成功・警告通知は自動消去（5秒後）
    if (type !== 'error') {
      setTimeout(() => {
        this.remove(id);
      }, 5000);
    }

    return id;
  }

  /**
   * 通知を削除
   */
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * すべての通知を取得
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }

  /**
   * リスナーを登録
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * すべてのリスナーに通知
   * @private
   */
  notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.getAll());
    });
  }
}

// シングルトンインスタンス
export const notificationService = new NotificationService();
