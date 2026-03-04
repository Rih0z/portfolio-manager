/**
 * LocalStorageプロバイダー
 *
 * StorageProviderインターフェースの実装
 */

import { StorageProvider } from './StorageInterface';
import { EncryptionService } from '../EncryptionService';

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
    } catch (error: any) {
      console.error('LocalStorage save error:', error);
      throw new Error(`Failed to save data to LocalStorage: ${error.message}`);
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
    } catch (error: any) {
      console.error('LocalStorage load error:', error);
      // パスワードが間違っている可能性があるため、エラーを再スロー
      if (error.message.includes('復号化')) {
        throw error;
      }
      throw new Error(`Failed to load data from LocalStorage: ${error.message}`);
    }
  }

  /**
   * データを削除
   */
  async clear(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error: any) {
      console.error('LocalStorage clear error:', error);
      throw new Error(`Failed to clear data from LocalStorage: ${error.message}`);
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
