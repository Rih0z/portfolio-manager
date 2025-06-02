/**
 * ストレージプロバイダーインターフェース
 * 
 * Dependency Inversion Principle: 高レベルモジュールは抽象に依存すべき
 */

/**
 * @interface StorageProvider
 */
export class StorageProvider {
  /**
   * データを保存
   * @param {string} key - キー
   * @param {any} data - データ
   * @returns {Promise<void>}
   */
  async save(key, data) {
    throw new Error('save method must be implemented');
  }

  /**
   * データを読み込み
   * @param {string} key - キー
   * @returns {Promise<any>}
   */
  async load(key) {
    throw new Error('load method must be implemented');
  }

  /**
   * データを削除
   * @param {string} key - キー
   * @returns {Promise<void>}
   */
  async clear(key) {
    throw new Error('clear method must be implemented');
  }
}

/**
 * @interface CloudSyncProvider
 */
export class CloudSyncProvider {
  /**
   * クラウドにデータを保存
   * @param {any} data - データ
   * @param {any} user - ユーザー情報
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async save(data, user) {
    throw new Error('save method must be implemented');
  }

  /**
   * クラウドからデータを読み込み
   * @param {any} user - ユーザー情報
   * @returns {Promise<{success: boolean, data?: any, message: string}>}
   */
  async load(user) {
    throw new Error('load method must be implemented');
  }

  /**
   * 同期状態を確認
   * @param {any} user - ユーザー情報
   * @returns {Promise<{synced: boolean, lastSync?: string}>}
   */
  async checkSyncStatus(user) {
    throw new Error('checkSyncStatus method must be implemented');
  }
}