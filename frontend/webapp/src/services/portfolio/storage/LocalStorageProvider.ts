/**
 * LocalStorageプロバイダー
 *
 * StorageProviderインターフェースの実装
 */

import { StorageProvider } from './StorageInterface';
import { EncryptionService } from '../EncryptionService';
import { getErrorMessage } from '../../../utils/errorUtils';
import logger from '../../../utils/logger';

export class LocalStorageProvider extends StorageProvider {
  encryptionEnabled: boolean;
  password: string | null;

  constructor(encryptionEnabled: boolean = false) {
    super();
    this.encryptionEnabled = encryptionEnabled;
    this.password = null;
  }

  /**
   * 暗号化パスワードを設定
   */
  setPassword(password: string): void {
    this.password = password;
  }

  /**
   * データを保存
   */
  async save(key: string, data: any): Promise<void> {
    try {
      let dataToStore: string = JSON.stringify(data);

      if (this.encryptionEnabled && this.password) {
        dataToStore = EncryptionService.encrypt(data, this.password);
      }

      localStorage.setItem(key, dataToStore);
    } catch (error: unknown) {
      logger.error('LocalStorage save error:', error);
      throw new Error(`Failed to save data to LocalStorage: ${getErrorMessage(error)}`);
    }
  }

  /**
   * データを読み込み
   */
  async load(key: string): Promise<any> {
    try {
      const storedData = localStorage.getItem(key);

      if (!storedData) {
        return null;
      }

      if (this.encryptionEnabled && this.password) {
        return EncryptionService.decrypt(storedData, this.password);
      }

      return JSON.parse(storedData);
    } catch (error: unknown) {
      logger.error('LocalStorage load error:', error);
      // パスワードが間違っている可能性があるため、エラーを再スロー
      if (getErrorMessage(error).includes('復号化')) {
        throw error;
      }
      throw new Error(`Failed to load data from LocalStorage: ${getErrorMessage(error)}`);
    }
  }

  /**
   * データを削除
   */
  async clear(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error: unknown) {
      logger.error('LocalStorage clear error:', error);
      throw new Error(`Failed to clear data from LocalStorage: ${getErrorMessage(error)}`);
    }
  }

  /**
   * すべてのポートフォリオデータをクリア
   */
  async clearAll(): Promise<void> {
    const keysToRemove: string[] = [
      'portfolioData',
      'portfolio_data_encrypted',
      'portfolio_password_hash',
      'exchangeRate_JPY',
      'exchangeRate_USD'
    ];

    for (const key of keysToRemove) {
      await this.clear(key);
    }
  }
}
