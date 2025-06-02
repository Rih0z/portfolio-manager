/**
 * LocalStorageProviderのユニットテスト
 */

import { LocalStorageProvider } from '../../../services/portfolio/storage/LocalStorageProvider';
import { EncryptionService } from '../../../services/portfolio/EncryptionService';

// EncryptionServiceをモック
jest.mock('../../../services/portfolio/EncryptionService');

describe('LocalStorageProvider', () => {
  let provider;
  const mockData = {
    name: 'テストポートフォリオ',
    assets: [
      { ticker: 'AAPL', holdings: 100 },
      { ticker: 'GOOGL', holdings: 50 }
    ]
  };

  beforeEach(() => {
    localStorage.clear();
    EncryptionService.encrypt.mockClear();
    EncryptionService.decrypt.mockClear();
  });

  describe('暗号化なし', () => {
    beforeEach(() => {
      provider = new LocalStorageProvider(false);
    });

    it('データを保存できる', async () => {
      await provider.save('test-key', mockData);
      
      const stored = localStorage.getItem('test-key');
      expect(stored).toBe(JSON.stringify(mockData));
    });

    it('データを読み込める', async () => {
      localStorage.setItem('test-key', JSON.stringify(mockData));
      
      const loaded = await provider.load('test-key');
      expect(loaded).toEqual(mockData);
    });

    it('存在しないキーではnullを返す', async () => {
      const loaded = await provider.load('non-existent-key');
      expect(loaded).toBeNull();
    });

    it('データを削除できる', async () => {
      localStorage.setItem('test-key', JSON.stringify(mockData));
      
      await provider.clear('test-key');
      
      const stored = localStorage.getItem('test-key');
      expect(stored).toBeNull();
    });

    it('不正なJSONデータを読み込む際はエラーを投げる', async () => {
      localStorage.setItem('test-key', 'invalid-json');
      
      await expect(provider.load('test-key')).rejects.toThrow('Failed to load data from LocalStorage');
    });
  });

  describe('暗号化あり', () => {
    beforeEach(() => {
      provider = new LocalStorageProvider(true);
      provider.setPassword('test-password');
      
      // EncryptionServiceのモック設定
      EncryptionService.encrypt.mockReturnValue('encrypted-data');
      EncryptionService.decrypt.mockReturnValue(mockData);
    });

    it('データを暗号化して保存する', async () => {
      await provider.save('test-key', mockData);
      
      expect(EncryptionService.encrypt).toHaveBeenCalledWith(mockData, 'test-password');
      
      const stored = localStorage.getItem('test-key');
      expect(stored).toBe('encrypted-data');
    });

    it('暗号化されたデータを復号化して読み込む', async () => {
      localStorage.setItem('test-key', 'encrypted-data');
      
      const loaded = await provider.load('test-key');
      
      expect(EncryptionService.decrypt).toHaveBeenCalledWith('encrypted-data', 'test-password');
      expect(loaded).toEqual(mockData);
    });

    it('復号化エラー時はエラーを再スローする', async () => {
      localStorage.setItem('test-key', 'encrypted-data');
      EncryptionService.decrypt.mockImplementation(() => {
        throw new Error('データの復号化に失敗しました');
      });
      
      await expect(provider.load('test-key')).rejects.toThrow('データの復号化に失敗しました');
    });

    it('パスワードが設定されていない場合は暗号化しない', async () => {
      provider.setPassword(null);
      
      await provider.save('test-key', mockData);
      
      expect(EncryptionService.encrypt).not.toHaveBeenCalled();
      
      const stored = localStorage.getItem('test-key');
      expect(stored).toBe(JSON.stringify(mockData));
    });
  });

  describe('clearAll', () => {
    beforeEach(() => {
      provider = new LocalStorageProvider(false);
    });

    it('すべてのポートフォリオデータをクリアする', async () => {
      const keysToSet = [
        'portfolioData',
        'portfolio_data_encrypted',
        'portfolio_password_hash',
        'exchangeRate_JPY',
        'exchangeRate_USD',
        'other_key' // これは残るべき
      ];

      keysToSet.forEach(key => {
        localStorage.setItem(key, JSON.stringify({ data: key }));
      });

      await provider.clearAll();

      expect(localStorage.getItem('portfolioData')).toBeNull();
      expect(localStorage.getItem('portfolio_data_encrypted')).toBeNull();
      expect(localStorage.getItem('portfolio_password_hash')).toBeNull();
      expect(localStorage.getItem('exchangeRate_JPY')).toBeNull();
      expect(localStorage.getItem('exchangeRate_USD')).toBeNull();
      
      // ポートフォリオに関係ないキーは残る
      expect(localStorage.getItem('other_key')).not.toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      provider = new LocalStorageProvider(false);
    });

    it('保存エラー時は適切なエラーメッセージを返す', async () => {
      // localStorage.setItemでエラーが発生する状況をシミュレート
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(provider.save('test-key', mockData)).rejects.toThrow('Failed to save data to LocalStorage: Storage quota exceeded');

      Storage.prototype.setItem = originalSetItem;
    });

    it('削除エラー時は適切なエラーメッセージを返す', async () => {
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = jest.fn(() => {
        throw new Error('Access denied');
      });

      await expect(provider.clear('test-key')).rejects.toThrow('Failed to clear data from LocalStorage: Access denied');

      Storage.prototype.removeItem = originalRemoveItem;
    });
  });

  describe('setPassword', () => {
    it('パスワードを設定できる', () => {
      provider = new LocalStorageProvider(true);
      provider.setPassword('new-password');
      
      expect(provider.password).toBe('new-password');
    });
  });

  describe('constructor', () => {
    it('encryptionEnabledのデフォルト値はfalse', () => {
      const defaultProvider = new LocalStorageProvider(); // 引数なし
      expect(defaultProvider.encryptionEnabled).toBe(false);
      expect(defaultProvider.password).toBeNull();
    });

    it('encryptionEnabledを明示的に設定できる', () => {
      const enabledProvider = new LocalStorageProvider(true);
      expect(enabledProvider.encryptionEnabled).toBe(true);
      
      const disabledProvider = new LocalStorageProvider(false);
      expect(disabledProvider.encryptionEnabled).toBe(false);
    });
  });
});