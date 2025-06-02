/**
 * Google Driveプロバイダー
 * 
 * CloudSyncProviderインターフェースの実装
 */

import { CloudSyncProvider } from './StorageInterface';
import { 
  saveToGoogleDrive as apiSaveToGoogleDrive, 
  loadFromGoogleDrive as apiLoadFromGoogleDrive,
  initGoogleDriveAPI 
} from '../../../services/api';

export class GoogleDriveProvider extends CloudSyncProvider {
  constructor() {
    super();
    this.initialized = false;
  }

  /**
   * Google Drive APIを初期化
   * @private
   */
  async initialize() {
    if (!this.initialized) {
      await initGoogleDriveAPI();
      this.initialized = true;
    }
  }

  /**
   * クラウドにデータを保存
   * @param {any} data - データ
   * @param {any} user - ユーザー情報
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async save(data, user) {
    if (!user) {
      return { 
        success: false, 
        message: 'Googleアカウントにログインしていないため、クラウド保存できません' 
      };
    }

    try {
      await this.initialize();

      // メタデータを追加
      const portfolioData = {
        ...data,
        version: '1.0.0',
        timestamp: new Date().toISOString()
      };

      const result = await apiSaveToGoogleDrive(portfolioData, user);

      if (result.success) {
        return {
          success: true,
          message: 'データをクラウドに保存しました'
        };
      } else {
        return {
          success: false,
          message: result.message || 'クラウド保存に失敗しました'
        };
      }
    } catch (error) {
      console.error('Google Drive save error:', error);
      return {
        success: false,
        message: `クラウド保存に失敗しました: ${error.message}`
      };
    }
  }

  /**
   * クラウドからデータを読み込み
   * @param {any} user - ユーザー情報
   * @returns {Promise<{success: boolean, data?: any, message: string}>}
   */
  async load(user) {
    if (!user) {
      return { 
        success: false, 
        message: 'Googleアカウントにログインしていないため、クラウドから読み込めません' 
      };
    }

    try {
      await this.initialize();

      const result = await apiLoadFromGoogleDrive(user);

      if (result.success && result.data) {
        // バージョンチェック
        if (result.data.version && result.data.version !== '1.0.0') {
          console.warn(`データバージョンの不一致: ${result.data.version}`);
        }

        return {
          success: true,
          data: result.data,
          message: 'クラウドからデータを読み込みました'
        };
      } else {
        return {
          success: false,
          message: result.message || 'クラウドにデータがありません',
          suggestSaving: true
        };
      }
    } catch (error) {
      console.error('Google Drive load error:', error);
      return {
        success: false,
        message: `クラウドからの読み込みに失敗しました: ${error.message}`
      };
    }
  }

  /**
   * 同期状態を確認
   * @param {any} user - ユーザー情報
   * @returns {Promise<{synced: boolean, lastSync?: string}>}
   */
  async checkSyncStatus(user) {
    if (!user) {
      return { synced: false };
    }

    try {
      // 実装: Google DriveのファイルメタデータをチェックしてlastModifiedを取得
      // 現在は簡易実装
      return {
        synced: true,
        lastSync: new Date().toISOString()
      };
    } catch (error) {
      console.error('Sync status check error:', error);
      return { synced: false };
    }
  }
}