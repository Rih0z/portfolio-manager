/**
 * Google Driveプロバイダー
 *
 * CloudSyncProviderインターフェースの実装
 */

import { CloudSyncProvider } from './StorageInterface';
import type { StorageSaveResult, StorageLoadResult, SyncStatus } from './StorageInterface';
import {
  saveToGoogleDrive as apiSaveToGoogleDrive,
  loadFromGoogleDrive as apiLoadFromGoogleDrive,
  initGoogleDriveAPI
} from '../../../services/api';

export class GoogleDriveProvider extends CloudSyncProvider {
  initialized: boolean;

  constructor() {
    super();
    this.initialized = false;
  }

  /**
   * Google Drive APIを初期化
   * @private
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      await initGoogleDriveAPI();
      this.initialized = true;
    }
  }

  /**
   * クラウドにデータを保存
   */
  async save(data: any, user: any): Promise<StorageSaveResult> {
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
    } catch (error: any) {
      console.error('Google Drive save error:', error);
      return {
        success: false,
        message: `クラウド保存に失敗しました: ${error.message}`
      };
    }
  }

  /**
   * クラウドからデータを読み込み
   */
  async load(user: any): Promise<StorageLoadResult> {
    if (!user) {
      return {
        success: false,
        message: 'Googleアカウントにログインしていないため、クラウドから読み込めません'
      };
    }

    try {
      await this.initialize();

      const result = await apiLoadFromGoogleDrive(user);

      if (result.success && (result as any).data) {
        // バージョンチェック
        if ((result as any).data.version && (result as any).data.version !== '1.0.0') {
          console.warn(`データバージョンの不一致: ${(result as any).data.version}`);
        }

        return {
          success: true,
          data: (result as any).data,
          message: 'クラウドからデータを読み込みました'
        };
      } else {
        return {
          success: false,
          message: result.message || 'クラウドにデータがありません',
          suggestSaving: true
        };
      }
    } catch (error: any) {
      console.error('Google Drive load error:', error);
      return {
        success: false,
        message: `クラウドからの読み込みに失敗しました: ${error.message}`
      };
    }
  }

  /**
   * 同期状態を確認
   */
  async checkSyncStatus(user: any): Promise<SyncStatus> {
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
