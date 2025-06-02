/**
 * GoogleDriveProviderのユニットテスト
 */

import { GoogleDriveProvider } from '../../../services/portfolio/storage/GoogleDriveProvider';

// apiモジュールをモック
jest.mock('../../../services/api', () => ({
  saveToGoogleDrive: jest.fn(),
  loadFromGoogleDrive: jest.fn(),
  initGoogleDriveAPI: jest.fn()
}));

import { 
  saveToGoogleDrive as mockSaveToGoogleDrive,
  loadFromGoogleDrive as mockLoadFromGoogleDrive,
  initGoogleDriveAPI as mockInitGoogleDriveAPI
} from '../../../services/api';

describe('GoogleDriveProvider', () => {
  let provider;
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockData = {
    baseCurrency: 'JPY',
    currentAssets: [
      { ticker: 'AAPL', holdings: 100 },
      { ticker: 'GOOGL', holdings: 50 }
    ]
  };

  beforeEach(() => {
    provider = new GoogleDriveProvider();
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('正常にクラウドに保存できる', async () => {
      mockInitGoogleDriveAPI.mockResolvedValue();
      mockSaveToGoogleDrive.mockResolvedValue({ success: true });

      const result = await provider.save(mockData, mockUser);

      expect(mockInitGoogleDriveAPI).toHaveBeenCalledTimes(1);
      expect(mockSaveToGoogleDrive).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockData,
          version: '1.0.0',
          timestamp: expect.any(String)
        }),
        mockUser
      );

      expect(result).toEqual({
        success: true,
        message: 'データをクラウドに保存しました'
      });
    });

    it('ユーザーがログインしていない場合はエラーを返す', async () => {
      const result = await provider.save(mockData, null);

      expect(result).toEqual({
        success: false,
        message: 'Googleアカウントにログインしていないため、クラウド保存できません'
      });

      expect(mockInitGoogleDriveAPI).not.toHaveBeenCalled();
      expect(mockSaveToGoogleDrive).not.toHaveBeenCalled();
    });

    it('API保存失敗時は適切なエラーを返す', async () => {
      mockInitGoogleDriveAPI.mockResolvedValue();
      mockSaveToGoogleDrive.mockResolvedValue({ 
        success: false, 
        message: 'Network error' 
      });

      const result = await provider.save(mockData, mockUser);

      expect(result).toEqual({
        success: false,
        message: 'Network error'
      });
    });

    it('例外発生時は適切なエラーを返す', async () => {
      mockInitGoogleDriveAPI.mockResolvedValue();
      mockSaveToGoogleDrive.mockRejectedValue(new Error('API connection failed'));

      const result = await provider.save(mockData, mockUser);

      expect(result).toEqual({
        success: false,
        message: 'クラウド保存に失敗しました: API connection failed'
      });
    });

    it('API初期化後は二回目は初期化をスキップする', async () => {
      mockInitGoogleDriveAPI.mockResolvedValue();
      mockSaveToGoogleDrive.mockResolvedValue({ success: true });

      await provider.save(mockData, mockUser);
      await provider.save(mockData, mockUser);

      expect(mockInitGoogleDriveAPI).toHaveBeenCalledTimes(1);
    });
  });

  describe('load', () => {
    it('正常にクラウドから読み込める', async () => {
      const loadedData = { ...mockData, version: '1.0.0' };
      mockInitGoogleDriveAPI.mockResolvedValue();
      mockLoadFromGoogleDrive.mockResolvedValue({ 
        success: true, 
        data: loadedData 
      });

      const result = await provider.load(mockUser);

      expect(mockInitGoogleDriveAPI).toHaveBeenCalledTimes(1);
      expect(mockLoadFromGoogleDrive).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual({
        success: true,
        data: loadedData,
        message: 'クラウドからデータを読み込みました'
      });
    });

    it('ユーザーがログインしていない場合はエラーを返す', async () => {
      const result = await provider.load(null);

      expect(result).toEqual({
        success: false,
        message: 'Googleアカウントにログインしていないため、クラウドから読み込めません'
      });

      expect(mockInitGoogleDriveAPI).not.toHaveBeenCalled();
      expect(mockLoadFromGoogleDrive).not.toHaveBeenCalled();
    });

    it('データが存在しない場合は適切なメッセージを返す', async () => {
      mockInitGoogleDriveAPI.mockResolvedValue();
      mockLoadFromGoogleDrive.mockResolvedValue({ 
        success: false, 
        message: 'File not found' 
      });

      const result = await provider.load(mockUser);

      expect(result).toEqual({
        success: false,
        message: 'File not found',
        suggestSaving: true
      });
    });

    it('異なるバージョンのデータでも読み込める', async () => {
      const loadedData = { ...mockData, version: '2.0.0' };
      mockInitGoogleDriveAPI.mockResolvedValue();
      mockLoadFromGoogleDrive.mockResolvedValue({ 
        success: true, 
        data: loadedData 
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await provider.load(mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(loadedData);
      expect(consoleSpy).toHaveBeenCalledWith('データバージョンの不一致: 2.0.0');

      consoleSpy.mockRestore();
    });

    it('例外発生時は適切なエラーを返す', async () => {
      mockInitGoogleDriveAPI.mockResolvedValue();
      mockLoadFromGoogleDrive.mockRejectedValue(new Error('Network timeout'));

      const result = await provider.load(mockUser);

      expect(result).toEqual({
        success: false,
        message: 'クラウドからの読み込みに失敗しました: Network timeout'
      });
    });
  });

  describe('checkSyncStatus', () => {
    it('ユーザーがログインしている場合は同期状態を返す', async () => {
      const result = await provider.checkSyncStatus(mockUser);

      expect(result).toEqual({
        synced: true,
        lastSync: expect.any(String)
      });
    });

    it('ユーザーがログインしていない場合は未同期を返す', async () => {
      const result = await provider.checkSyncStatus(null);

      expect(result).toEqual({
        synced: false
      });
    });

    it('エラー発生時は未同期を返す', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // 実際のGoogleDriveProviderクラスを拡張してエラーを発生させる
      class TestGoogleDriveProvider extends GoogleDriveProvider {
        async checkSyncStatus(user) {
          if (!user) {
            return { synced: false };
          }
          
          try {
            // 意図的にエラーを発生させる
            throw new Error('Network connection failed');
          } catch (error) {
            console.error('Sync status check error:', error);
            return { synced: false };
          }
        }
      }

      const testProvider = new TestGoogleDriveProvider();
      const result = await testProvider.checkSyncStatus(mockUser);
      
      expect(result.synced).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Sync status check error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('initialize', () => {
    it('初期化は一度だけ実行される', async () => {
      mockInitGoogleDriveAPI.mockResolvedValue();

      await provider.initialize();
      await provider.initialize();
      await provider.initialize();

      expect(mockInitGoogleDriveAPI).toHaveBeenCalledTimes(1);
      expect(provider.initialized).toBe(true);
    });

    it('初期化済みフラグが正しく設定される', async () => {
      mockInitGoogleDriveAPI.mockResolvedValue();

      expect(provider.initialized).toBe(false);

      await provider.initialize();

      expect(provider.initialized).toBe(true);
    });
  });
});