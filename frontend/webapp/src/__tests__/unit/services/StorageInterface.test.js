/**
 * StorageInterfaceのユニットテスト
 * 抽象クラスのインターフェース契約をテスト
 */

import { StorageProvider, CloudSyncProvider } from '../../../services/portfolio/storage/StorageInterface';

describe('StorageInterface', () => {
  describe('StorageProvider', () => {
    let provider;

    beforeEach(() => {
      provider = new StorageProvider();
    });

    it('save メソッドが未実装の場合はエラーを投げる', async () => {
      await expect(provider.save('key', 'data')).rejects.toThrow('save method must be implemented');
    });

    it('load メソッドが未実装の場合はエラーを投げる', async () => {
      await expect(provider.load('key')).rejects.toThrow('load method must be implemented');
    });

    it('clear メソッドが未実装の場合はエラーを投げる', async () => {
      await expect(provider.clear('key')).rejects.toThrow('clear method must be implemented');
    });
  });

  describe('CloudSyncProvider', () => {
    let provider;

    beforeEach(() => {
      provider = new CloudSyncProvider();
    });

    it('save メソッドが未実装の場合はエラーを投げる', async () => {
      await expect(provider.save('data', 'user')).rejects.toThrow('save method must be implemented');
    });

    it('load メソッドが未実装の場合はエラーを投げる', async () => {
      await expect(provider.load('user')).rejects.toThrow('load method must be implemented');
    });

    it('checkSyncStatus メソッドが未実装の場合はエラーを投げる', async () => {
      await expect(provider.checkSyncStatus('user')).rejects.toThrow('checkSyncStatus method must be implemented');
    });
  });

  describe('プロバイダーの継承テスト', () => {
    class TestStorageProvider extends StorageProvider {
      async save(key, data) {
        return `Saved ${key}: ${data}`;
      }

      async load(key) {
        return `Loaded ${key}`;
      }

      async clear(key) {
        return `Cleared ${key}`;
      }
    }

    class TestCloudSyncProvider extends CloudSyncProvider {
      async save(data, user) {
        return { success: true, message: `Saved for ${user}` };
      }

      async load(user) {
        return { success: true, data: `Data for ${user}` };
      }

      async checkSyncStatus(user) {
        return { synced: true, lastSync: `Synced for ${user}` };
      }
    }

    it('StorageProvider を正しく継承して実装できる', async () => {
      const provider = new TestStorageProvider();

      expect(await provider.save('test-key', 'test-data')).toBe('Saved test-key: test-data');
      expect(await provider.load('test-key')).toBe('Loaded test-key');
      expect(await provider.clear('test-key')).toBe('Cleared test-key');
    });

    it('CloudSyncProvider を正しく継承して実装できる', async () => {
      const provider = new TestCloudSyncProvider();

      expect(await provider.save('data', 'user')).toEqual({ 
        success: true, 
        message: 'Saved for user' 
      });
      
      expect(await provider.load('user')).toEqual({ 
        success: true, 
        data: 'Data for user' 
      });
      
      expect(await provider.checkSyncStatus('user')).toEqual({ 
        synced: true, 
        lastSync: 'Synced for user' 
      });
    });

    it('StorageProvider のインスタンスチェック', () => {
      const provider = new TestStorageProvider();
      expect(provider instanceof StorageProvider).toBe(true);
    });

    it('CloudSyncProvider のインスタンスチェック', () => {
      const provider = new TestCloudSyncProvider();
      expect(provider instanceof CloudSyncProvider).toBe(true);
    });
  });
});