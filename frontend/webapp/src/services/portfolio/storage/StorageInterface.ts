/**
 * ストレージプロバイダーインターフェース
 *
 * Dependency Inversion Principle: 高レベルモジュールは抽象に依存すべき
 */

export interface StorageSaveResult {
  success: boolean;
  message: string;
}

export interface StorageLoadResult {
  success: boolean;
  data?: any;
  message: string;
  suggestSaving?: boolean;
}

export interface SyncStatus {
  synced: boolean;
  lastSync?: string;
}

/**
 * @interface StorageProvider
 */
export class StorageProvider {
  /**
   * データを保存
   */
  async save(key: string, data: any): Promise<void> {
    throw new Error('save method must be implemented');
  }

  /**
   * データを読み込み
   */
  async load(key: string): Promise<any> {
    throw new Error('load method must be implemented');
  }

  /**
   * データを削除
   */
  async clear(key: string): Promise<void> {
    throw new Error('clear method must be implemented');
  }
}

/**
 * @interface CloudSyncProvider
 */
export class CloudSyncProvider {
  /**
   * クラウドにデータを保存
   */
  async save(data: any, user: any): Promise<StorageSaveResult> {
    throw new Error('save method must be implemented');
  }

  /**
   * クラウドからデータを読み込み
   */
  async load(user: any): Promise<StorageLoadResult> {
    throw new Error('load method must be implemented');
  }

  /**
   * 同期状態を確認
   */
  async checkSyncStatus(user: any): Promise<SyncStatus> {
    throw new Error('checkSyncStatus method must be implemented');
  }
}
