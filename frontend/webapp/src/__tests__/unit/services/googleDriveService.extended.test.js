/**
 * googleDriveService.js の拡張テスト
 * エッジケースと実際の使用シナリオをカバー
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

describe('googleDriveService - extended tests', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // デフォルトのモック設定
    getApiEndpoint.mockImplementation(async (path) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return `https://api.example.com/${path}`;
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('fetchDriveFiles - 詳細なエラーケース', () => {
    it('APIレスポンスにfilesプロパティがない場合', async () => {
      const mockResponse = {
        success: true,
        // filesプロパティなし
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

    it('APIレスポンスにcountプロパティがない場合', async () => {
      const mockResponse = {
        success: true,
        files: [
          { id: 'file1', name: 'test.json' },
          { id: 'file2', name: 'test2.json' }
        ]
        // countプロパティなし
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: true,
        files: mockResponse.files,
        count: 0
      });
    });

    it('エラーレスポンスでmessageがない場合', async () => {
      const mockResponse = {
        success: false,
        // messageプロパティなし
        errorCode: 'UNKNOWN_ERROR'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'ファイル一覧の取得に失敗しました',
        files: [],
        errorCode: 'UNKNOWN_ERROR'
      });
    });

    it('401エラーでresponse.dataがない場合', async () => {
      const mockError = {
        response: {
          status: 401
          // dataプロパティなし
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'Google Drive接続エラー',
        files: []
      });
    });

    it('401エラーでerrorCodeがDRIVE_OAUTH_REQUIREDでない場合', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            errorCode: 'INVALID_TOKEN',
            message: 'トークンが無効です'
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'Google Drive接続エラー',
        files: []
      });
      expect(result.needsDriveAuth).toBeUndefined();
    });

    it('エラーオブジェクトがnullの場合', async () => {
      authFetch.mockRejectedValue(null);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'Google Drive接続エラー',
        files: []
      });
    });

    it('エラーオブジェクトがundefinedの場合', async () => {
      authFetch.mockRejectedValue(undefined);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'Google Drive接続エラー',
        files: []
      });
    });

    it('エラーメッセージが空文字の場合', async () => {
      const mockError = new Error('');
      authFetch.mockRejectedValue(mockError);

      const result = await fetchDriveFiles();

      expect(result).toEqual({
        success: false,
        error: 'Google Drive接続エラー',
        files: []
      });
    });
  });

  describe('saveToDrive - 詳細なエラーケース', () => {
    it('大きなポートフォリオデータを保存する', async () => {
      const largePortfolioData = {
        currentAssets: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Asset ${i}`,
          value: Math.random() * 10000,
          currency: i % 2 === 0 ? 'USD' : 'JPY'
        })),
        targetPortfolio: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          percentage: 100 / 1000
        })),
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      const mockResponse = {
        success: true,
        file: { id: 'large_file_id', size: 1048576 },
        message: '大きなファイルを保存しました'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await saveToDrive(largePortfolioData);

      expect(result.success).toBe(true);
      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'post',
        { portfolioData: largePortfolioData }
      );
    });

    it('特殊文字を含むデータを保存する', async () => {
      const specialCharData = {
        currentAssets: [{
          id: 1,
          name: '日本株 / US株 & "特殊" <文字>',
          value: 1000,
          description: 'バックスラッシュ\\ と改行\nを含む'
        }]
      };

      const mockResponse = {
        success: true,
        file: { id: 'special_char_file' },
        message: '保存完了'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await saveToDrive(specialCharData);

      expect(result.success).toBe(true);
    });

    it('循環参照を含むオブジェクトの処理', async () => {
      const circularData = { 
        assets: [],
        parent: null
      };
      circularData.parent = circularData; // 循環参照

      const mockResponse = {
        success: true,
        file: { id: 'circular_file' },
        message: '保存完了'
      };

      authFetch.mockResolvedValue(mockResponse);

      // 循環参照があってもエラーにならないことを確認
      const result = await saveToDrive(circularData);

      expect(authFetch).toHaveBeenCalled();
      // JSON.stringifyがうまく処理するか、またはaxiosが処理することを期待
    });

    it('nullデータを保存する', async () => {
      const mockResponse = {
        success: true,
        file: { id: 'null_data_file' },
        message: '保存完了'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await saveToDrive(null);

      expect(result.success).toBe(true);
      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'post',
        { portfolioData: null }
      );
    });

    it('undefinedデータを保存する', async () => {
      const mockResponse = {
        success: true,
        file: { id: 'undefined_data_file' },
        message: '保存完了'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await saveToDrive(undefined);

      expect(result.success).toBe(true);
      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'post',
        { portfolioData: undefined }
      );
    });

    it('401エラーでresponseがない場合', async () => {
      const mockError = {
        // responseプロパティなし
        message: 'Unauthorized'
      };

      authFetch.mockRejectedValue(mockError);

      const result = await saveToDrive({ test: 'data' });

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('APIレスポンスにfileプロパティがない場合', async () => {
      const mockResponse = {
        success: true,
        // fileプロパティなし
        message: '保存完了'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await saveToDrive({ test: 'data' });

      expect(result).toEqual({
        success: true,
        file: undefined,
        message: '保存完了'
      });
    });
  });

  describe('loadFromDrive - 詳細なエラーケース', () => {
    it('非常に長いファイルIDで読み込む', async () => {
      const longFileId = 'a'.repeat(1000);
      const mockResponse = {
        success: true,
        data: { test: 'data' },
        file: { id: longFileId }
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive(longFileId);

      expect(result.success).toBe(true);
      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'get',
        { fileId: longFileId }
      );
    });

    it('特殊文字を含むファイルIDで読み込む', async () => {
      const specialFileId = 'file/id?with=special&chars#hash';
      const mockResponse = {
        success: true,
        data: { test: 'data' },
        file: { id: specialFileId }
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive(specialFileId);

      expect(result.success).toBe(true);
    });

    it('数値のファイルIDで読み込む', async () => {
      const numericFileId = 123456;
      const mockResponse = {
        success: true,
        data: { test: 'data' },
        file: { id: numericFileId }
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive(numericFileId);

      expect(result.success).toBe(true);
      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'get',
        { fileId: numericFileId }
      );
    });

    it('オブジェクトのファイルIDで読み込む', async () => {
      const objectFileId = { id: 'file123', type: 'portfolio' };
      const mockResponse = {
        success: false,
        message: '無効なファイルID'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive(objectFileId);

      expect(result.success).toBe(false);
      expect(authFetch).toHaveBeenCalledWith(
        expect.any(String),
        'get',
        { fileId: objectFileId }
      );
    });

    it('APIレスポンスにdataプロパティがない場合', async () => {
      const mockResponse = {
        success: true,
        // dataプロパティなし
        file: { id: 'test_file' },
        message: '読み込み完了'
      };

      authFetch.mockResolvedValue(mockResponse);

      const result = await loadFromDrive('test_file');

      expect(result).toEqual({
        success: true,
        data: undefined,
        file: mockResponse.file,
        message: '読み込み完了'
      });
    });

    it('401エラーでstatusがない場合', async () => {
      const mockError = {
        response: {
          // statusプロパティなし
          data: {
            message: 'Unauthorized'
          }
        }
      };

      authFetch.mockRejectedValue(mockError);

      const result = await loadFromDrive('test_file');

      expect(result).toEqual({
        success: false,
        error: 'Google Drive読み込みエラー'
      });
    });
  });

  describe('並行処理とレート制限', () => {
    it('複数のファイル操作を並行実行', async () => {
      const mockFileListResponse = {
        success: true,
        files: Array.from({ length: 5 }, (_, i) => ({
          id: `file_${i}`,
          name: `portfolio_${i}.json`
        })),
        count: 5
      };

      const mockSaveResponse = {
        success: true,
        file: { id: 'new_file' },
        message: '保存完了'
      };

      const mockLoadResponse = (fileId) => ({
        success: true,
        data: { fileId, content: 'test' },
        file: { id: fileId },
        message: '読み込み完了'
      });

      authFetch
        .mockResolvedValueOnce(mockFileListResponse) // fetchDriveFiles
        .mockResolvedValueOnce(mockSaveResponse) // saveToDrive
        .mockImplementation((endpoint, method, params) => {
          // loadFromDrive calls
          if (method === 'get' && params && params.fileId) {
            return Promise.resolve(mockLoadResponse(params.fileId));
          }
          return Promise.resolve({ success: false });
        });

      // 並行実行
      const [listResult, saveResult, loadResults] = await Promise.all([
        fetchDriveFiles(),
        saveToDrive({ test: 'data' }),
        Promise.all([
          loadFromDrive('file_0'),
          loadFromDrive('file_1'),
          loadFromDrive('file_2')
        ])
      ]);

      expect(listResult.success).toBe(true);
      expect(listResult.files).toHaveLength(5);
      expect(saveResult.success).toBe(true);
      expect(loadResults).toHaveLength(3);
      loadResults.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data.fileId).toBe(`file_${index}`);
      });
    });

    it('エラーと成功が混在する並行処理', async () => {
      authFetch
        .mockResolvedValueOnce({ success: true, files: [], count: 0 })
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockResolvedValueOnce({ success: true, data: { test: 'data' } })
        .mockRejectedValueOnce({ response: { status: 401, data: {} } });

      const operations = [
        fetchDriveFiles(),
        saveToDrive({ test: 'data' }).catch(err => ({ success: false, error: err.message })),
        loadFromDrive('file1'),
        loadFromDrive('file2').catch(err => ({ success: false, error: 'Auth error' }))
      ];

      const results = await Promise.allSettled(operations);

      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value.success).toBe(true);
      
      expect(results[1].status).toBe('fulfilled');
      expect(results[1].value.success).toBe(false);
      
      expect(results[2].status).toBe('fulfilled');
      expect(results[2].value.success).toBe(true);
      
      expect(results[3].status).toBe('fulfilled');
      expect(results[3].value.success).toBe(false);
    });
  });

  describe('実際の使用シナリオ', () => {
    it('ポートフォリオバックアップの完全なフロー', async () => {
      // 1. 既存のバックアップファイルをチェック
      const fileListResponse = {
        success: true,
        files: [
          { id: 'old_backup_1', name: 'portfolio_2024-01-01.json', modifiedTime: '2024-01-01T00:00:00Z' },
          { id: 'old_backup_2', name: 'portfolio_2024-01-02.json', modifiedTime: '2024-01-02T00:00:00Z' }
        ],
        count: 2
      };

      // 2. 新しいバックアップを保存
      const newPortfolioData = {
        currentAssets: [
          { id: 1, name: 'AAPL', value: 10000, currency: 'USD' },
          { id: 2, name: '7203.T', value: 500000, currency: 'JPY' }
        ],
        targetPortfolio: [
          { id: 1, percentage: 60 },
          { id: 2, percentage: 40 }
        ],
        metadata: {
          version: '2.0.0',
          lastModified: new Date().toISOString()
        }
      };

      const saveResponse = {
        success: true,
        file: { 
          id: 'new_backup_id', 
          name: 'portfolio_2024-01-03.json',
          modifiedTime: '2024-01-03T00:00:00Z'
        },
        message: '新しいバックアップを保存しました'
      };

      // 3. 保存したファイルを確認のため読み込み
      const loadResponse = {
        success: true,
        data: newPortfolioData,
        file: saveResponse.file,
        message: 'バックアップを読み込みました'
      };

      getApiEndpoint
        .mockResolvedValueOnce('https://api.example.com/drive/files')
        .mockResolvedValueOnce('https://api.example.com/drive/save')
        .mockResolvedValueOnce('https://api.example.com/drive/load');

      authFetch
        .mockResolvedValueOnce(fileListResponse)
        .mockResolvedValueOnce(saveResponse)
        .mockResolvedValueOnce(loadResponse);

      // 実行
      const existingFiles = await fetchDriveFiles();
      expect(existingFiles.count).toBe(2);

      const saveResult = await saveToDrive(newPortfolioData);
      expect(saveResult.success).toBe(true);
      expect(saveResult.file.id).toBe('new_backup_id');

      const verifyResult = await loadFromDrive(saveResult.file.id);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.data).toEqual(newPortfolioData);
    });

    it('認証フローを含む完全なシナリオ', async () => {
      // 最初は認証エラー
      const authError = {
        response: {
          status: 401,
          data: {
            errorCode: 'DRIVE_OAUTH_REQUIRED',
            message: 'Google Drive認証が必要です',
            authUrl: 'https://accounts.google.com/oauth/authorize?client_id=123&scope=drive.file'
          }
        }
      };

      authFetch.mockRejectedValueOnce(authError);

      // 認証エラーを受け取る
      const firstAttempt = await fetchDriveFiles();
      expect(firstAttempt.needsDriveAuth).toBe(true);
      expect(firstAttempt.authUrl).toContain('accounts.google.com');

      // ユーザーが認証完了後、再試行
      const successResponse = {
        success: true,
        files: [{ id: 'file1', name: 'portfolio.json' }],
        count: 1
      };

      authFetch.mockResolvedValueOnce(successResponse);

      const secondAttempt = await fetchDriveFiles();
      expect(secondAttempt.success).toBe(true);
      expect(secondAttempt.files).toHaveLength(1);
    });
  });

  describe('getApiEndpoint の非同期処理', () => {
    it('エンドポイント取得が遅延しても正しく処理される', async () => {
      getApiEndpoint.mockImplementation(async (path) => {
        // 100msの遅延をシミュレート
        await new Promise(resolve => setTimeout(resolve, 100));
        return `https://slow-api.example.com/${path}`;
      });

      const mockResponse = {
        success: true,
        files: [],
        count: 0
      };

      authFetch.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const result = await fetchDriveFiles();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(getApiEndpoint).toHaveBeenCalledWith('drive/files');
    });

    it('エンドポイント取得が失敗してもエラーメッセージが適切', async () => {
      getApiEndpoint.mockRejectedValue(new Error('Configuration not available'));

      const result = await saveToDrive({ test: 'data' });

      expect(result).toEqual({
        success: false,
        error: 'Configuration not available'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Google Drive保存エラー:',
        expect.any(Error)
      );
    });
  });
});