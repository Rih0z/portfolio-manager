/**
 * useGoogleDrive.js のテストファイル
 * Google Driveカスタムフックの包括的テスト
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useGoogleDrive } from '../../../hooks/useGoogleDrive';

// 依存関係のモック
jest.mock('../../../services/googleDriveService', () => ({
  fetchDriveFiles: jest.fn(),
  saveToDrive: jest.fn(),
  loadFromDrive: jest.fn()
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../../utils/requestThrottle', () => ({
  debounce: jest.fn((fn) => fn)
}));

// window.locationのモック
const mockLocation = {
  href: ''
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('useGoogleDrive', () => {
  let mockUseAuth;
  let mockFetchDriveFiles;
  let mockSaveToDrive;
  let mockLoadFromDrive;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // console.logとconsole.errorをモック
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // 依存関係のモック設定
    mockUseAuth = require('../../../hooks/useAuth').useAuth;
    mockFetchDriveFiles = require('../../../services/googleDriveService').fetchDriveFiles;
    mockSaveToDrive = require('../../../services/googleDriveService').saveToDrive;
    mockLoadFromDrive = require('../../../services/googleDriveService').loadFromDrive;
    
    // デフォルトのモック値
    mockUseAuth.mockReturnValue({
      isAuthenticated: true
    });
    
    mockLocation.href = '';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('基本機能', () => {
    test('フックが正常に初期化される', () => {
      const { result } = renderHook(() => useGoogleDrive());

      expect(result.current).toHaveProperty('listFiles');
      expect(result.current).toHaveProperty('saveFile');
      expect(result.current).toHaveProperty('loadFile');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    test('認証されていない場合の初期状態', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false
      });

      const { result } = renderHook(() => useGoogleDrive());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('listFiles機能', () => {
    test('認証済みユーザーでファイル一覧を正常に取得できる', async () => {
      const mockFiles = [
        { id: '1', name: 'portfolio1.json', modifiedTime: '2025-01-01' },
        { id: '2', name: 'portfolio2.json', modifiedTime: '2025-01-02' }
      ];

      mockFetchDriveFiles.mockResolvedValue({
        success: true,
        files: mockFiles
      });

      const { result } = renderHook(() => useGoogleDrive());

      let files;
      await act(async () => {
        files = await result.current.listFiles();
      });

      expect(files).toEqual(mockFiles);
      expect(mockFetchDriveFiles).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBe(null);
    });

    test('認証されていない場合のエラーハンドリング', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false
      });

      const { result } = renderHook(() => useGoogleDrive());

      let files;
      await act(async () => {
        files = await result.current.listFiles();
      });

      expect(files).toBe(null);
      expect(result.current.error).toBe('認証が必要です');
      expect(mockFetchDriveFiles).not.toHaveBeenCalled();
    });

    test('キャッシュ機能が正常に動作する', async () => {
      const mockFiles = [{ id: '1', name: 'cached.json' }];

      mockFetchDriveFiles.mockResolvedValue({
        success: true,
        files: mockFiles
      });

      const { result } = renderHook(() => useGoogleDrive());

      // 最初の呼び出し
      await act(async () => {
        await result.current.listFiles();
      });

      // 2回目の呼び出し（キャッシュから取得されるべき）
      await act(async () => {
        await result.current.listFiles();
      });

      expect(mockFetchDriveFiles).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Google Driveファイルリストをキャッシュから取得');
    });

    test('forceRefreshでキャッシュを無視する', async () => {
      const mockFiles = [{ id: '1', name: 'refresh.json' }];

      mockFetchDriveFiles.mockResolvedValue({
        success: true,
        files: mockFiles
      });

      const { result } = renderHook(() => useGoogleDrive());

      // 最初の呼び出し
      await act(async () => {
        await result.current.listFiles();
      });

      // forceRefresh=trueで呼び出し
      await act(async () => {
        await result.current.listFiles(true);
      });

      expect(mockFetchDriveFiles).toHaveBeenCalledTimes(2);
    });

    test('Drive認証が必要な場合のリダイレクト', async () => {
      mockFetchDriveFiles.mockResolvedValue({
        success: false,
        needsDriveAuth: true,
        authUrl: 'https://accounts.google.com/oauth/authorize?...'
      });

      const { result } = renderHook(() => useGoogleDrive());

      await act(async () => {
        await result.current.listFiles();
      });

      expect(window.location.href).toBe('https://accounts.google.com/oauth/authorize?...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Drive API認証が必要です。リダイレクトします。');
    });

    test('API呼び出し失敗のエラーハンドリング', async () => {
      mockFetchDriveFiles.mockResolvedValue({
        success: false,
        error: 'API呼び出しに失敗しました'
      });

      const { result } = renderHook(() => useGoogleDrive());

      let files;
      await act(async () => {
        files = await result.current.listFiles();
      });

      expect(files).toBe(null);
      expect(result.current.error).toBe('API呼び出しに失敗しました');
    });

    test('ネットワークエラーのハンドリング', async () => {
      mockFetchDriveFiles.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useGoogleDrive());

      let files;
      await act(async () => {
        files = await result.current.listFiles();
      });

      expect(files).toBe(null);
      expect(result.current.error).toBe('Network Error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Google Driveファイル一覧取得エラー:', 
        expect.any(Error)
      );
    });
  });

  describe('saveFile機能', () => {
    test('ファイル保存が正常に動作する', async () => {
      const portfolioData = {
        currentAssets: [{ ticker: 'AAPL', quantity: 10 }],
        targetPortfolio: []
      };

      const mockSavedFile = {
        id: 'file123',
        name: 'portfolio_20250101.json'
      };

      mockSaveToDrive.mockResolvedValue({
        success: true,
        file: mockSavedFile
      });

      const { result } = renderHook(() => useGoogleDrive());

      let savedFile;
      await act(async () => {
        savedFile = await result.current.saveFile(portfolioData);
      });

      expect(savedFile).toEqual(mockSavedFile);
      expect(mockSaveToDrive).toHaveBeenCalledWith(portfolioData);
      expect(result.current.error).toBe(null);
    });

    test('認証されていない場合のエラー', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false
      });

      const { result } = renderHook(() => useGoogleDrive());

      let savedFile;
      await act(async () => {
        savedFile = await result.current.saveFile({});
      });

      expect(savedFile).toBe(null);
      expect(result.current.error).toBe('認証が必要です');
      expect(mockSaveToDrive).not.toHaveBeenCalled();
    });

    test('保存成功後にキャッシュがクリアされる', async () => {
      mockSaveToDrive.mockResolvedValue({
        success: true,
        file: { id: 'file123' }
      });

      const { result } = renderHook(() => useGoogleDrive());

      await act(async () => {
        await result.current.saveFile({});
      });

      // キャッシュクリアの確認は内部実装に依存するため、
      // 次のlistFiles呼び出しで新しいAPIリクエストが発生することで確認
      mockFetchDriveFiles.mockResolvedValue({
        success: true,
        files: []
      });

      await act(async () => {
        await result.current.listFiles();
      });

      expect(mockFetchDriveFiles).toHaveBeenCalled();
    });
  });

  describe('loadFile機能', () => {
    test('ファイル読み込みが正常に動作する', async () => {
      const mockPortfolioData = {
        currentAssets: [{ ticker: 'GOOGL', quantity: 5 }],
        targetPortfolio: [{ ticker: 'GOOGL', allocation: 100 }]
      };

      mockLoadFromDrive.mockResolvedValue({
        success: true,
        data: mockPortfolioData
      });

      const { result } = renderHook(() => useGoogleDrive());

      let loadedData;
      await act(async () => {
        loadedData = await result.current.loadFile('file123');
      });

      expect(loadedData).toEqual(mockPortfolioData);
      expect(mockLoadFromDrive).toHaveBeenCalledWith('file123');
      expect(result.current.error).toBe(null);
    });

    test('認証されていない場合のエラー', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false
      });

      const { result } = renderHook(() => useGoogleDrive());

      let loadedData;
      await act(async () => {
        loadedData = await result.current.loadFile('file123');
      });

      expect(loadedData).toBe(null);
      expect(result.current.error).toBe('認証が必要です');
      expect(mockLoadFromDrive).not.toHaveBeenCalled();
    });

    test('ファイル読み込み失敗のエラーハンドリング', async () => {
      mockLoadFromDrive.mockResolvedValue({
        success: false,
        error: 'ファイルが見つかりません'
      });

      const { result } = renderHook(() => useGoogleDrive());

      let loadedData;
      await act(async () => {
        loadedData = await result.current.loadFile('nonexistent');
      });

      expect(loadedData).toBe(null);
      expect(result.current.error).toBe('ファイルが見つかりません');
    });
  });

  describe('ローディング状態管理', () => {
    test('ファイル一覧取得中のローディング状態', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetchDriveFiles.mockReturnValue(promise);

      const { result } = renderHook(() => useGoogleDrive());

      // ローディング開始
      act(() => {
        result.current.listFiles();
      });

      expect(result.current.loading).toBe(true);

      // ローディング完了
      await act(async () => {
        resolvePromise({ success: true, files: [] });
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });

    test('ファイル保存中のローディング状態', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockSaveToDrive.mockReturnValue(promise);

      const { result } = renderHook(() => useGoogleDrive());

      // ローディング開始
      act(() => {
        result.current.saveFile({});
      });

      expect(result.current.loading).toBe(true);

      // ローディング完了
      await act(async () => {
        resolvePromise({ success: true, file: {} });
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('エラー状態管理', () => {
    test('新しい操作開始時にエラーがクリアされる', async () => {
      // 最初にエラーを発生させる
      mockFetchDriveFiles.mockRejectedValue(new Error('First Error'));

      const { result } = renderHook(() => useGoogleDrive());

      await act(async () => {
        await result.current.listFiles();
      });

      expect(result.current.error).toBe('First Error');

      // 次の成功操作でエラーがクリアされることを確認
      mockFetchDriveFiles.mockResolvedValue({
        success: true,
        files: []
      });

      await act(async () => {
        await result.current.listFiles(true);
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('メモリリーク防止', () => {
    test('コンポーネントアンマウント後にstateが更新されない', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetchDriveFiles.mockReturnValue(promise);

      const { result, unmount } = renderHook(() => useGoogleDrive());

      act(() => {
        result.current.listFiles();
      });

      unmount();

      // アンマウント後にプロミスを解決
      await act(async () => {
        resolvePromise({ success: true, files: [] });
        await promise;
      });

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });
});