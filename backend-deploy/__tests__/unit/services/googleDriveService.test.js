/**
 * ファイルパス: __tests__/unit/services/googleDriveService.test.js
 * 
 * GoogleDriveServiceのユニットテスト
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-20
 */

// テスト対象モジュールのインポート
const googleDriveService = require('../../../src/services/googleDriveService');

// 依存モジュールのインポート
const { google } = require('googleapis');
const { withRetry } = require('../../../src/utils/retry');
const logger = require('../../../src/utils/logger');

// モックの設定
jest.mock('googleapis');
jest.mock('../../../src/utils/retry');
jest.mock('../../../src/utils/logger');

describe('GoogleDriveService', () => {
  // モックデータ
  const mockAccessToken = 'test-access-token';
  const mockFolderId = 'test-folder-id';
  const mockFileId = 'test-file-id';
  const mockBackupFolderId = 'test-backup-folder-id';
  const mockFileName = 'test-file.json';
  const mockFileContent = JSON.stringify({ name: 'Test Data' });

  // モックのDriveクライアント
  const mockDriveClient = {
    files: {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      copy: jest.fn()
    }
  };

  // モックの認証クライアント
  const mockAuth = {
    setCredentials: jest.fn()
  };

  beforeEach(() => {
    // テスト前の準備
    jest.clearAllMocks();

    // googlapisのモック設定
    google.auth.OAuth2 = jest.fn().mockReturnValue(mockAuth);
    google.drive = jest.fn().mockReturnValue(mockDriveClient);

    // withRetryのモック設定
    withRetry.mockImplementation(fn => fn());

    // フォルダのモック応答
    mockDriveClient.files.list.mockImplementation((params) => {
      if (params.q && params.q.includes('folder')) {
        if (params.q.includes('PortfolioManagerBackups')) {
          return Promise.resolve({
            data: {
              files: [{ id: mockBackupFolderId, name: 'PortfolioManagerBackups' }]
            }
          });
        } else {
          return Promise.resolve({
            data: {
              files: [{ id: mockFolderId, name: 'PortfolioManagerData' }]
            }
          });
        }
      } else {
        return Promise.resolve({
          data: {
            files: [{
              id: mockFileId,
              name: mockFileName,
              mimeType: 'application/json',
              size: '100',
              createdTime: '2025-05-10T00:00:00Z',
              modifiedTime: '2025-05-15T00:00:00Z',
              webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
            }]
          }
        });
      }
    });

    // ファイルの作成・更新モック
    mockDriveClient.files.create.mockImplementation((params) => {
      if (params.resource.mimeType === 'application/vnd.google-apps.folder') {
        return Promise.resolve({
          data: {
            id: params.resource.name === 'PortfolioManagerBackups' ? mockBackupFolderId : mockFolderId
          }
        });
      } else {
        return Promise.resolve({
          data: {
            id: mockFileId,
            name: params.resource.name,
            createdTime: '2025-05-20T00:00:00Z',
            modifiedTime: '2025-05-20T00:00:00Z',
            webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
          }
        });
      }
    });

    // ファイルの更新モック
    mockDriveClient.files.update.mockResolvedValue({
      data: {
        id: mockFileId,
        name: mockFileName,
        createdTime: '2025-05-10T00:00:00Z',
        modifiedTime: '2025-05-20T00:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
      }
    });

    // ファイルの取得モック
    mockDriveClient.files.get.mockImplementation((params) => {
      if (params.alt === 'media') {
        return Promise.resolve({ data: mockFileContent });
      } else {
        return Promise.resolve({
          data: {
            id: params.fileId,
            name: mockFileName,
            createdTime: '2025-05-10T00:00:00Z',
            modifiedTime: '2025-05-15T00:00:00Z',
            webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
          }
        });
      }
    });

    // コピーモック
    mockDriveClient.files.copy.mockResolvedValue({
      data: {
        id: 'backup-file-id',
        name: `${mockFileName}.2025-05-20T00-00-00Z.bak`
      }
    });
  });
  
  afterEach(() => {
    // テスト後のクリーンアップ
  });
  
  // エクスポートされた関数をテスト
  describe('getOrCreateFolder', () => {
    test('既存のフォルダを見つけた場合はそのIDを返す', async () => {
      const result = await googleDriveService.getOrCreateFolder(mockAccessToken);
      
      expect(result).toBe(mockFolderId);
      expect(mockDriveClient.files.list).toHaveBeenCalledWith(expect.objectContaining({
        q: expect.stringContaining('PortfolioManagerData')
      }));
      // create関数は呼ばれないはず
      expect(mockDriveClient.files.create).not.toHaveBeenCalled();
    });

    test('フォルダが存在しない場合は新規作成する', async () => {
      // フォルダが見つからないように設定
      mockDriveClient.files.list.mockResolvedValueOnce({
        data: { files: [] }
      });

      const result = await googleDriveService.getOrCreateFolder(mockAccessToken);
      
      expect(result).toBe(mockFolderId);
      expect(mockDriveClient.files.create).toHaveBeenCalledWith(expect.objectContaining({
        resource: {
          name: 'PortfolioManagerData',
          mimeType: 'application/vnd.google-apps.folder'
        }
      }));
    });
  });

  describe('saveFile', () => {
    test('新規ファイルを作成する', async () => {
      const result = await googleDriveService.saveFile(
        mockFileName,
        mockFileContent,
        'application/json',
        mockAccessToken
      );
      
      expect(result).toEqual({
        id: mockFileId,
        name: expect.any(String),
        createdTime: expect.any(String),
        modifiedTime: expect.any(String),
        webViewLink: expect.any(String)
      });

      // フォルダIDを取得していることを確認
      expect(mockDriveClient.files.list).toHaveBeenCalled();
      
      // ファイル作成を呼んでいることを確認
      expect(mockDriveClient.files.create).toHaveBeenCalledWith(expect.objectContaining({
        resource: expect.objectContaining({
          name: mockFileName,
          parents: [mockFolderId]
        }),
        media: expect.objectContaining({
          mimeType: 'application/json',
          body: mockFileContent
        })
      }));
    });

    test('既存ファイルを更新する', async () => {
      const result = await googleDriveService.saveFile(
        mockFileName,
        mockFileContent,
        'application/json',
        mockAccessToken,
        mockFileId
      );
      
      expect(result).toEqual({
        id: mockFileId,
        name: expect.any(String),
        createdTime: expect.any(String),
        modifiedTime: expect.any(String),
        webViewLink: expect.any(String)
      });
      
      // ファイル更新を呼んでいることを確認
      expect(mockDriveClient.files.update).toHaveBeenCalledWith(expect.objectContaining({
        fileId: mockFileId,
        resource: expect.objectContaining({
          name: mockFileName
        }),
        media: expect.objectContaining({
          mimeType: 'application/json',
          body: mockFileContent
        })
      }));
    });

    test('更新時にバックアップを作成する', async () => {
      // モックコピー関数を設定
      const copySpy = jest.fn().mockResolvedValue({
        data: {
          id: 'backup-file-id',
          name: `${mockFileName}.backup`
        }
      });
      mockDriveClient.files.copy = copySpy;

      await googleDriveService.saveFile(
        mockFileName,
        mockFileContent,
        'application/json',
        mockAccessToken,
        mockFileId,
        true // バックアップを作成
      );
      
      // ファイル情報取得とコピー操作が呼ばれていることを確認
      expect(mockDriveClient.files.get).toHaveBeenCalled();
      expect(mockDriveClient.files.copy).toHaveBeenCalled();
    });
  });

  describe('getFile', () => {
    test('ファイルを取得する', async () => {
      const result = await googleDriveService.getFile(mockFileId, mockAccessToken);
      
      expect(result).toBe(mockFileContent);
      expect(mockDriveClient.files.get).toHaveBeenCalledWith({
        fileId: mockFileId,
        alt: 'media'
      });
    });
  });

  describe('getFileMetadata', () => {
    test('ファイルメタデータを取得する', async () => {
      const result = await googleDriveService.getFileMetadata(mockFileId, mockAccessToken);
      
      expect(result).toEqual({
        id: mockFileId,
        name: mockFileName,
        createdTime: expect.any(String),
        modifiedTime: expect.any(String),
        webViewLink: expect.any(String)
      });
      
      expect(mockDriveClient.files.get).toHaveBeenCalledWith(expect.objectContaining({
        fileId: mockFileId,
        fields: expect.any(String)
      }));
    });
  });

  describe('getFileWithMetadata', () => {
    test('ファイルとメタデータを同時に取得する', async () => {
      const result = await googleDriveService.getFileWithMetadata(mockFileId, mockAccessToken);
      
      expect(result).toEqual({
        content: mockFileContent,
        metadata: {
          id: mockFileId,
          name: mockFileName,
          createdTime: expect.any(String),
          modifiedTime: expect.any(String),
          webViewLink: expect.any(String)
        }
      });
      
      // getFileとgetFileMetadataが呼ばれることを確認
      expect(mockDriveClient.files.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('listFiles', () => {
    test('ファイル一覧を取得する', async () => {
      // モックレスポンスの設定
      mockDriveClient.files.list.mockResolvedValueOnce({
        data: {
          files: [{
            id: mockFileId,
            name: mockFileName,
            mimeType: 'application/json',
            size: '100',
            createdTime: '2025-05-10T00:00:00Z',
            modifiedTime: '2025-05-15T00:00:00Z',
            webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
          }]
        }
      });
      
      const result = await googleDriveService.listFiles(mockAccessToken);
      
      expect(result).toEqual([{
        id: mockFileId,
        name: mockFileName,
        mimeType: 'application/json',
        size: '100',
        createdTime: expect.any(String),
        modifiedTime: expect.any(String),
        webViewLink: expect.any(String)
      }]);
    });

    test('検索フィルターを適用する', async () => {
      await googleDriveService.listFiles(mockAccessToken, {
        nameFilter: 'portfolio',
        mimeType: 'application/json'
      });
      
      expect(mockDriveClient.files.list).toHaveBeenCalledWith(expect.objectContaining({
        q: expect.stringContaining('name contains \'portfolio\'')
      }));
    });
  });

  describe('deleteFile', () => {
    test('ファイルをゴミ箱に移動する（デフォルト）', async () => {
      const result = await googleDriveService.deleteFile(mockFileId, mockAccessToken);
      
      expect(result).toBe(true);
      expect(mockDriveClient.files.update).toHaveBeenCalledWith({
        fileId: mockFileId,
        resource: {
          trashed: true
        }
      });
    });

    test('ファイルを完全に削除する（オプション）', async () => {
      const result = await googleDriveService.deleteFile(mockFileId, mockAccessToken, true);
      
      expect(result).toBe(true);
      expect(mockDriveClient.files.delete).toHaveBeenCalledWith({
        fileId: mockFileId
      });
    });
  });

  describe('loadPortfolioFromDrive', () => {
    test('ポートフォリオデータを読み込む', async () => {
      const result = await googleDriveService.loadPortfolioFromDrive(mockAccessToken, mockFileId);
      
      expect(result).toEqual({
        success: true,
        data: JSON.parse(mockFileContent),
        fileName: mockFileName,
        fileId: mockFileId,
        createdTime: expect.any(String),
        modifiedTime: expect.any(String),
        webViewLink: expect.any(String)
      });
    });

    test('無効なJSONデータの場合はエラーをスローする', async () => {
      // 無効なJSONを返すようにモック
      mockDriveClient.files.get.mockImplementationOnce((params) => {
        if (params.alt === 'media') {
          return Promise.resolve({ data: 'invalid-json' });
        }
        return mockDriveClient.files.get.getMockImplementation()(params);
      });

      await expect(googleDriveService.loadPortfolioFromDrive(mockAccessToken, mockFileId))
        .rejects
        .toThrow('Invalid portfolio data format');
    });
  });

  describe('savePortfolioToDrive', () => {
    test('ポートフォリオデータを保存する', async () => {
      // 日付をモック化して固定値を返すようにする
      const realDate = global.Date;
      const mockDate = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            return new realDate('2025-05-18T04:20:39.943Z');
          }
          return new realDate(...args);
        }
        static now() {
          return new realDate('2025-05-18T04:20:39.943Z').getTime();
        }
      };
      global.Date = mockDate;
      
      // saveFileをモック
      const saveFileSpy = jest.spyOn(googleDriveService, 'saveFile').mockResolvedValue({
        id: mockFileId,
        name: 'portfolio-data-2025-05-18T04-20-39-943Z.json',
        createdTime: '2025-05-20T00:00:00Z',
        modifiedTime: '2025-05-20T00:00:00Z',
        webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
      });

      const portfolioData = { name: 'Test Portfolio', holdings: [] };
      
      const result = await googleDriveService.savePortfolioToDrive(mockAccessToken, portfolioData);
      
      expect(result).toEqual({
        success: true,
        fileId: mockFileId,
        fileName: 'portfolio-data-2025-05-18T04-20-39-943Z.json',
        webViewLink: expect.any(String),
        createdTime: expect.any(String),
        modifiedTime: expect.any(String)
      });
      
      expect(saveFileSpy).toHaveBeenCalledWith(
        'portfolio-data-2025-05-18T04-20-39-943Z.json',
        expect.stringContaining('Test Portfolio'),
        'application/json',
        mockAccessToken,
        null,
        true
      );
      
      // スパイをリストア
      saveFileSpy.mockRestore();
      // Dateをリストア
      global.Date = realDate;
    });
  });

  describe('getPortfolioVersionHistory', () => {
    test('ポートフォリオファイルの履歴バージョンを取得する', async () => {
      // backupフォルダIDとfile.listのモックを設定
      mockDriveClient.files.list.mockImplementation((params) => {
        if (params.q && params.q.includes('PortfolioManagerBackups')) {
          return Promise.resolve({
            data: {
              files: [{ id: mockBackupFolderId, name: 'PortfolioManagerBackups' }]
            }
          });
        } else if (params.q && params.q.includes(mockBackupFolderId)) {
          return Promise.resolve({
            data: {
              files: [{
                id: mockFileId,
                name: mockFileName,
                mimeType: 'application/json',
                size: '100',
                createdTime: '2025-05-10T00:00:00Z',
                modifiedTime: '2025-05-15T00:00:00Z',
                webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
              }]
            }
          });
        } else {
          return Promise.resolve({
            data: {
              files: [{ id: mockFolderId, name: 'PortfolioManagerData' }]
            }
          });
        }
      });
      
      const result = await googleDriveService.getPortfolioVersionHistory(mockFileId, mockAccessToken);
      
      expect(result).toEqual([{
        id: mockFileId,
        name: mockFileName,
        mimeType: 'application/json',
        size: '100',
        createdTime: expect.any(String),
        modifiedTime: expect.any(String),
        webViewLink: expect.any(String)
      }]);
    });
  });
});
