/**
 * googleDriveService.js のユニットテスト
 * Google Drive連携機能のテスト
 */

import {
  fetchDriveFiles,
  saveToDrive,
  loadFromDrive
} from '../../../services/googleDriveService';

// apiUtilsのモック
jest.mock('../../../utils/apiUtils', () => ({
  authFetch: jest.fn()
}));

// envUtilsのモック
jest.mock('../../../utils/envUtils', () => ({
  getApiEndpoint: jest.fn()
}));

import { authFetch } from '../../../utils/apiUtils';
import { getApiEndpoint } from '../../../utils/envUtils';

describe('googleDriveService', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // モックをクリア
    jest.clearAllMocks();
    
    // console.errorをモック
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // getApiEndpointのデフォルトモック
    getApiEndpoint.mockResolvedValue('https://mock-api.com/drive');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('fetchDriveFiles', () => {
    it('正常にファイル一覧を取得する', async () => {
      const mockResponse = {
        success: true,
        files: [
          {
            id: 'file1',
            name: 'portfolio_backup_1.json',
            modifiedTime: '2024-01-01T00:00:00Z'
          },
          {
            id: 'file2',
            name: 'portfolio_backup_2.json',
            modifiedTime: '2024-01-02T00:00:00Z'
          }
        ],
        count: 2
      };

      getApiEndpoint.mockResolvedValue('https://mock-api.com/drive/files');
      authFetch.mockResolvedValue(mockResponse);

      const result = await fetchDriveFiles();

      expect(getApiEndpoint).toHaveBeenCalledWith('drive/files');
      expect(authFetch).toHaveBeenCalledWith('https://mock-api.com/drive/files', 'get', null);
      expect(result).toEqual({
        success: true,
        files: mockResponse.files,
        count: 2
      });
    });

    it('ファイルが存在しない場合は空の配列を返す', async () => {
      const mockResponse = {
        success: true,
        files: [],
        count: 0
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: true,
        files: [],
        count: 0
      });
    });

    it('API呼び出しが失敗した場合はエラーを返す', async () => {
      const mockResponse = {
        success: false,
        message: 'ファイル取得に失敗しました',
        errorCode: 'FETCH_ERROR'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'ファイル取得に失敗しました',
        files: [],
        errorCode: 'FETCH_ERROR'
      });
    });

    it('Drive OAuth認証が必要な場合は認証URLを返す', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            errorCode: 'DRIVE_OAUTH_REQUIRED',
            message: 'Google Drive認証が必要です',
            authUrl: 'https://accounts.google.com/oauth/authorize?...'
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'Google Drive認証が必要です',
        files: [],
        needsDriveAuth: true,
        authUrl: 'https://accounts.google.com/oauth/authorize?...'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Google Driveファイル一覧取得エラー:', mockError);
    });

    it('一般的なネットワークエラーを正しく処理する', async () => {
      const mockError = new Error('Network Error');

      authFetch.mockRejectedValue(mockError);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'Network Error',
        files: []
      });
    });

    it('エンドポイント取得エラーを正しく処理する', async () => {
      const mockError = new Error('Endpoint configuration failed');
      getApiEndpoint.mockRejectedValue(mockError);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'Endpoint configuration failed',
        files: []
      });
    });
  });

  describe('saveToDrive', () => {
    const mockPortfolioData = {
      currentAssets: [
        { id: 1, name: 'Asset 1', value: 1000 }
      ],
      targetPortfolio: [
        { id: 1, percentage: 100 }
      ]
    };

    it('正常にポートフォリオデータを保存する', async () => {
      const mockResponse = {
        success: true,
        file: {
          id: 'saved_file_id',
          name: 'portfolio_backup.json'
        },
        message: 'Google Driveに保存しました'
      };

      getApiEndpoint.mockResolvedValue('https://mock-api.com/drive/save');
      authFetch.mockResolvedValue(mockResponse);

      const result = await saveToDrive(mockPortfolioData);

      expect(getApiEndpoint).toHaveBeenCalledWith('drive/save');
      expect(authFetch).toHaveBeenCalledWith(
        'https://mock-api.com/drive/save',
        'post',
        { portfolioData: mockPortfolioData }
      );
      expect(result).toEqual({
        success: true,
        file: mockResponse.file,
        message: 'Google Driveに保存しました'
      });
    });

    it('API呼び出しが失敗した場合はエラーを返す', async () => {
      const mockResponse = {
        success: false,
        message: '保存に失敗しました',
        errorCode: 'SAVE_ERROR'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await saveToDrive(mockPortfolioData);

      expect(result).toEqual({
        success: false,
        error: '保存に失敗しました',
        errorCode: 'SAVE_ERROR'
      });
    });

    it('Drive OAuth認証が必要な場合は認証URLを返す', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            errorCode: 'DRIVE_OAUTH_REQUIRED',
            message: 'Google Drive認証が必要です',
            authUrl: 'https://accounts.google.com/oauth/authorize?...'
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await saveToDrive(mockPortfolioData);

      expect(result).toEqual({
        success: false,
        error: 'Google Drive認証が必要です',
        needsDriveAuth: true,
        authUrl: 'https://accounts.google.com/oauth/authorize?...'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Google Drive保存エラー:', mockError);
    });

    it('一般的な401エラーの場合は認証が必要なエラーを返す', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Unauthorized'
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await saveToDrive(mockPortfolioData);

      expect(result).toEqual({
        success: false,
        error: '認証が必要です。ログインしてください。',
        needsAuth: true
      });
    });

    it('一般的なネットワークエラーを正しく処理する', async () => {
      const mockError = new Error('Network Error');

      authFetch.mockRejectedValue(mockError);

      const result = await saveToDrive(mockPortfolioData);

      expect(result).toEqual({
        success: false,
        error: 'Network Error'
      });
    });

    it('空のポートフォリオデータでも正しく動作する', async () => {
      const mockResponse = {
        success: true,
        file: { id: 'empty_file' },
        message: '保存完了'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await saveToDrive({});

      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'post',
        { portfolioData: {} }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('loadFromDrive', () => {
    const mockFileId = 'test_file_id';

    it('正常にポートフォリオデータを読み込む', async () => {
      const mockResponse = {
        success: true,
        data: {
          currentAssets: [
            { id: 1, name: 'Asset 1', value: 1000 }
          ],
          targetPortfolio: [
            { id: 1, percentage: 100 }
          ]
        },
        file: {
          id: mockFileId,
          name: 'portfolio_backup.json'
        },
        message: 'Google Driveから読み込みました'
      };

      getApiEndpoint.mockResolvedValue('https://mock-api.com/drive/load');
      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive(mockFileId);

      expect(getApiEndpoint).toHaveBeenCalledWith('drive/load');
      expect(authFetch).toHaveBeenCalledWith(
        'https://mock-api.com/drive/load',
        'get',
        { fileId: mockFileId }
      );
      expect(result).toEqual({
        success: true,
        data: mockResponse.data,
        file: mockResponse.file,
        message: 'Google Driveから読み込みました'
      });
    });

    it('API呼び出しが失敗した場合はエラーを返す', async () => {
      const mockResponse = {
        success: false,
        message: '読み込みに失敗しました',
        errorCode: 'LOAD_ERROR'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive(mockFileId);

      expect(result).toEqual({
        success: false,
        error: '読み込みに失敗しました',
        errorCode: 'LOAD_ERROR'
      });
    });

    it('Drive OAuth認証が必要な場合は認証URLを返す', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            errorCode: 'DRIVE_OAUTH_REQUIRED',
            message: 'Google Drive認証が必要です',
            authUrl: 'https://accounts.google.com/oauth/authorize?...'
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await loadFromDrive(mockFileId);

      expect(result).toEqual({
        success: false,
        error: 'Google Drive認証が必要です',
        needsDriveAuth: true,
        authUrl: 'https://accounts.google.com/oauth/authorize?...'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Google Drive読み込みエラー:', mockError);
    });

    it('一般的な401エラーの場合は認証が必要なエラーを返す', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Unauthorized'
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await loadFromDrive(mockFileId);

      expect(result).toEqual({
        success: false,
        error: '認証が必要です。ログインしてください。',
        needsAuth: true
      });
    });

    it('一般的なネットワークエラーを正しく処理する', async () => {
      const mockError = new Error('Network Error');

      authFetch.mockRejectedValue(mockError);

      const result = await loadFromDrive(mockFileId);

      expect(result).toEqual({
        success: false,
        error: 'Network Error'
      });
    });

    it('空のファイルIDでも正しく動作する', async () => {
      const mockResponse = {
        success: false,
        message: 'ファイルIDが無効です'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive('');

      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'get',
        { fileId: '' }
      );
      expect(result.success).toBe(false);
    });

    it('nullファイルIDでも正しく動作する', async () => {
      const mockResponse = {
        success: false,
        message: 'ファイルIDが無効です'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive(null);

      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'get',
        { fileId: null }
      );
    });
  });

  describe('デフォルトエクスポート', () => {
    it('全ての必要な関数をエクスポートする', () => {
      const googleDriveService = require('../../../services/googleDriveService').default;
      
      expect(googleDriveService).toHaveProperty('fetchDriveFiles');
      expect(googleDriveService).toHaveProperty('saveToDrive');
      expect(googleDriveService).toHaveProperty('loadFromDrive');
      
      expect(typeof googleDriveService.fetchDriveFiles).toBe('function');
      expect(typeof googleDriveService.saveToDrive).toBe('function');
      expect(typeof googleDriveService.loadFromDrive).toBe('function');
    });
  });

  describe('エラーケース詳細テスト', () => {
    it('undefinedレスポンスを正しく処理する', async () => {
      authFetch.mockResolvedValue(undefined);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'ファイル一覧の取得に失敗しました',
        files: [],
        errorCode: undefined
      });
    });

    it('nullレスポンスを正しく処理する', async () => {
      authFetch.mockResolvedValue(null);

      const result = await saveToDrive({ test: 'data' });

      expect(result).toEqual({
        success: false,
        error: '保存に失敗しました',
        errorCode: undefined
      });
    });

    it('空のレスポンスオブジェクトを正しく処理する', async () => {
      authFetch.mockResolvedValue({});

      const result = await loadFromDrive('test_id');

      expect(result).toEqual({
        success: false,
        error: '読み込みに失敗しました',
        errorCode: undefined
      });
    });

    it('401エラーでauthUrlが未設定の場合', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            errorCode: 'DRIVE_OAUTH_REQUIRED',
            message: 'Google Drive認証が必要です'
            // authUrlは未設定
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await fetchDriveFiles();

      // authUrlがundefinedでもneedsDriveAuthはfalseになる
      expect(result.needsDriveAuth).toBeFalsy();
      expect(result.authUrl).toBeUndefined();
    });

    it('401エラーでmessageが未設定の場合', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            errorCode: 'DRIVE_OAUTH_REQUIRED',
            authUrl: 'https://example.com/auth'
            // messageは未設定
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await saveToDrive({ test: 'data' });

      expect(result.error).toBe('Google Drive認証が必要です');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のファイル操作を効率的に処理する', async () => {
      const mockResponse = {
        success: true,
        files: Array.from({ length: 100 }, (_, i) => ({
          id: `file${i}`,
          name: `portfolio_${i}.json`
        })),
        count: 100
      };

      authFetch.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      
      const promises = Array.from({ length: 10 }, () => fetchDriveFiles());
      const results = await Promise.all(promises);
      
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.files).toHaveLength(100);
      });
    });

    it('複数の保存操作を並行実行できる', async () => {
      const mockResponse = {
        success: true,
        file: { id: 'saved_file' },
        message: '保存完了'
      };

      authFetch.mockResolvedValue(mockResponse);

      const portfolioData = { test: 'data' };
      
      const promises = Array.from({ length: 5 }, () => saveToDrive(portfolioData));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('統合テスト', () => {
    it('保存→読み込みの完全なフローが正しく動作する', async () => {
      const portfolioData = {
        currentAssets: [{ id: 1, name: 'Test Asset' }],
        targetPortfolio: [{ id: 1, percentage: 100 }]
      };

      // 保存のモック
      const saveResponse = {
        success: true,
        file: { id: 'saved_file_id', name: 'portfolio.json' },
        message: '保存完了'
      };

      // 読み込みのモック
      const loadResponse = {
        success: true,
        data: portfolioData,
        file: { id: 'saved_file_id', name: 'portfolio.json' },
        message: '読み込み完了'
      };

      getApiEndpoint
        .mockResolvedValueOnce('https://mock-api.com/drive/save')
        .mockResolvedValueOnce('https://mock-api.com/drive/load');

      authFetch
        .mockResolvedValueOnce(saveResponse)
        .mockResolvedValueOnce(loadResponse);

      // 保存
      const saveResult = await saveToDrive(portfolioData);
      expect(saveResult.success).toBe(true);

      // 読み込み
      const loadResult = await loadFromDrive(saveResult.file.id);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toEqual(portfolioData);
    });
  });
});