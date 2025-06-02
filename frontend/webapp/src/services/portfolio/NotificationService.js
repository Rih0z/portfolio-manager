/**
 * 通知管理サービス
 * 
 * Single Responsibility: 通知の追加、削除、管理のみを担当
 */

export class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = new Set();
  }

  /**
   * 通知を追加
   * @param {string} message - 通知メッセージ
   * @param {'info' | 'success' | 'warning' | 'error'} type - 通知タイプ
   * @returns {string} 通知ID
   */
  add(message, type = 'info') {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification = { id, message, type };
    
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
   * @param {string} id - 通知ID
   */
  remove(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * すべての通知を取得
   * @returns {Array} 通知の配列
   */
  getAll() {
    return [...this.notifications];
  }

  /**
   * リスナーを登録
   * @param {Function} listener - 通知変更時に呼ばれる関数
   * @returns {Function} 登録解除関数
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * すべてのリスナーに通知
   * @private
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.getAll());
    });
  }
}

// シングルトンインスタンス
export const notificationService = new NotificationService();