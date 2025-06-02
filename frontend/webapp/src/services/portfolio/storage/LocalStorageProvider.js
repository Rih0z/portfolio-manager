/**
 * LocalStorageプロバイダー
 * 
 * StorageProviderインターフェースの実装
 */

import { StorageProvider } from './StorageInterface';
import { EncryptionService } from '../EncryptionService';

export class LocalStorageProvider extends StorageProvider {
  constructor(encryptionEnabled = false) {
    super();
    this.encryptionEnabled = encryptionEnabled;
    this.password = null;
  }

  /**
   * 暗号化パスワードを設定
   * @param {string} password - パスワード
   */
  setPassword(password) {
    this.password = password;
  }

  /**
   * データを保存
   * @param {string} key - キー
   * @param {any} data - データ
   * @returns {Promise<void>}
   */
  async save(key, data) {
    try {
      let dataToStore = JSON.stringify(data);
      
      if (this.encryptionEnabled && this.password) {
        dataToStore = EncryptionService.encrypt(data, this.password);
      }
      
      localStorage.setItem(key, dataToStore);
    } catch (error) {
      console.error('LocalStorage save error:', error);
      throw new Error(`Failed to save data to LocalStorage: ${error.message}`);
    }
  }

  /**
   * データを読み込み
   * @param {string} key - キー
   * @returns {Promise<any>}
   */
  async load(key) {
    try {
      const storedData = localStorage.getItem(key);
      
      if (!storedData) {
        return null;
      }
      
      if (this.encryptionEnabled && this.password) {
        return EncryptionService.decrypt(storedData, this.password);
      }
      
      return JSON.parse(storedData);
    } catch (error) {
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
   * @param {string} key - キー
   * @returns {Promise<void>}
   */
  async clear(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage clear error:', error);
      throw new Error(`Failed to clear data from LocalStorage: ${error.message}`);
    }
  }

  /**
   * すべてのポートフォリオデータをクリア
   * @returns {Promise<void>}
   */
  async clearAll() {
    const keysToRemove = [
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