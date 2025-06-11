/**
 * GoogleDriveIntegration.jsx のテストファイル
 * Google Driveとの連携機能を提供するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GoogleDriveIntegration from '../../../../components/data/GoogleDriveIntegration';

// useAuthフックのモック
const mockInitiateDriveAuth = jest.fn();
jest.mock('../../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// usePortfolioContextフックのモック
const mockSaveToLocalStorage = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// useGoogleDriveフックのモック
const mockListFiles = jest.fn();
const mockSaveFile = jest.fn();
const mockLoadFile = jest.fn();
jest.mock('../../../../hooks/useGoogleDrive', () => ({
  useGoogleDrive: jest.fn()
}));

// cookieDebugUtilsのモック
jest.mock('../../../../utils/cookieDebugUtils', () => ({
  logCookieStatus: jest.fn(),
  testCookieSettings: jest.fn()
}));

describe('GoogleDriveIntegration Component', () => {
  const { useAuth } = require('../../../../hooks/useAuth');
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  const { useGoogleDrive } = require('../../../../hooks/useGoogleDrive');
  
  const defaultAuthState = {
    isAuthenticated: true,
    user: {
      name: 'テストユーザー',
      picture: 'https://example.com/avatar.jpg'
    },
    hasDriveAccess: true,
    initiateDriveAuth: mockInitiateDriveAuth
  };

  const defaultPortfolioState = {
    currentAssets: [
      { id: '1', name: 'テスト株式', ticker: 'TEST', price: 100, holdings: 10 }
    ],
    targetPortfolio: [
      { id: '1', name: 'テスト株式', ticker: 'TEST', targetPercentage: 50 }
    ],
    baseCurrency: 'JPY',
    additionalBudget: { amount: 100000, currency: 'JPY' },
    aiPromptTemplate: 'テストプロンプト',
    saveToLocalStorage: mockSaveToLocalStorage
  };

  const defaultDriveState = {
    listFiles: mockListFiles,
    saveFile: mockSaveFile,
    loadFile: mockLoadFile,
    loading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    useAuth.mockReturnValue(defaultAuthState);
    usePortfolioContext.mockReturnValue(defaultPortfolioState);
    useGoogleDrive.mockReturnValue(defaultDriveState);
    
    // モック関数のデフォルト動作
    mockListFiles.mockResolvedValue([
      {
        id: 'file1',
        name: 'portfolio_backup_2025-01-01.json',
        createdAt: '2025-01-01T10:00:00.000Z',
        webViewLink: 'https://drive.google.com/file/file1'
      }
    ]);
    
    mockSaveFile.mockResolvedValue({
      success: true,
      fileId: 'new-file-id',
      fileName: 'portfolio_backup.json'
    });
    
    mockLoadFile.mockResolvedValue({
      baseCurrency: 'USD',
      currentAssets: [],
      targetPortfolio: [],
      timestamp: '2025-01-01T10:00:00.000Z'
    });
  });

  describe('未認証状態', () => {
    test('未認証時の表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: false
      });

      render(<GoogleDriveIntegration />);

      expect(screen.getByText('Google Drive連携')).toBeInTheDocument();
      expect(screen.getByText('Google Driveと連携するにはログインしてください。')).toBeInTheDocument();
    });
  });

  describe('認証済み状態', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<GoogleDriveIntegration />);

      expect(screen.getByText('Google Drive連携')).toBeInTheDocument();
      expect(screen.getByText('テストユーザーとしてログイン中')).toBeInTheDocument();
      expect(screen.getByText('Google Driveに保存')).toBeInTheDocument();
      expect(screen.getByText('ファイル一覧更新')).toBeInTheDocument();
      expect(screen.getByText('保存済みファイル')).toBeInTheDocument();
    });

    test('ユーザー情報の表示', () => {
      render(<GoogleDriveIntegration />);

      const userAvatar = screen.getByAltText('テストユーザー');
      expect(userAvatar).toBeInTheDocument();
      expect(userAvatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    test('Drive権限がない場合の警告表示', () => {
      useAuth.mockReturnValue({
        ...defaultAuthState,
        hasDriveAccess: false
      });

      render(<GoogleDriveIntegration />);

      expect(screen.getByText('Google Driveへのアクセス権限がありません。')).toBeInTheDocument();
      expect(screen.getByText('再度ログインする（Drive権限付き）')).toBeInTheDocument();
    });
  });

  describe('ファイル操作', () => {
    test('ファイル一覧の表示', async () => {
      render(<GoogleDriveIntegration />);

      await waitFor(() => {
        expect(mockListFiles).toHaveBeenCalled();
      });

      expect(screen.getByText('portfolio_backup_2025-01-01.json')).toBeInTheDocument();
      expect(screen.getByText('2025/1/1 19:00:00')).toBeInTheDocument(); // JST表示
      expect(screen.getByText('読み込む')).toBeInTheDocument();
      expect(screen.getByText('表示')).toBeInTheDocument();
    });

    test('ファイル一覧が空の場合', async () => {
      mockListFiles.mockResolvedValue([]);

      render(<GoogleDriveIntegration />);

      await waitFor(() => {
        expect(screen.getByText('保存されたファイルはありません')).toBeInTheDocument();
      });
    });

    test('ファイル一覧更新ボタンのクリック', async () => {
      render(<GoogleDriveIntegration />);

      const updateButton = screen.getByText('ファイル一覧更新');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockListFiles).toHaveBeenCalledTimes(2); // 初期ロード + ボタンクリック
      });
    });
  });

  describe('Google Driveへの保存', () => {
    test('保存操作の成功', async () => {
      render(<GoogleDriveIntegration />);

      const saveButton = screen.getByText('Google Driveに保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveFile).toHaveBeenCalledWith({
          baseCurrency: 'JPY',
          currentAssets: defaultPortfolioState.currentAssets,
          targetPortfolio: defaultPortfolioState.targetPortfolio,
          additionalBudget: defaultPortfolioState.additionalBudget,
          aiPromptTemplate: defaultPortfolioState.aiPromptTemplate,
          timestamp: expect.any(String),
          version: '6.0'
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Google Driveへの保存が完了しました')).toBeInTheDocument();
      });
    });

    test('保存操作の失敗', async () => {
      mockSaveFile.mockResolvedValue(null);
      useGoogleDrive.mockReturnValue({
        ...defaultDriveState,
        error: 'Drive API error'
      });

      render(<GoogleDriveIntegration />);

      const saveButton = screen.getByText('Google Driveに保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('保存中にエラーが発生しました')).toBeInTheDocument();
      });
    });

    test('保存中のローディング状態', async () => {
      useGoogleDrive.mockReturnValue({
        ...defaultDriveState,
        loading: true
      });

      render(<GoogleDriveIntegration />);

      expect(screen.getByText('保存中...')).toBeInTheDocument();
      
      const saveButton = screen.getByText('保存中...');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('ファイルからの読み込み', () => {
    test('読み込み操作の成功', async () => {
      render(<GoogleDriveIntegration />);

      await waitFor(() => {
        expect(mockListFiles).toHaveBeenCalled();
      });

      const loadButton = screen.getByText('読み込む');
      fireEvent.click(loadButton);

      await waitFor(() => {
        expect(mockLoadFile).toHaveBeenCalledWith('file1');
      });

      await waitFor(() => {
        expect(screen.getByText('Google Driveからデータを読み込みました')).toBeInTheDocument();
        expect(mockSaveToLocalStorage).toHaveBeenCalled();
      });
    });

    test('読み込み操作の失敗', async () => {
      mockLoadFile.mockResolvedValue(null);
      useGoogleDrive.mockReturnValue({
        ...defaultDriveState,
        error: 'File not found'
      });

      render(<GoogleDriveIntegration />);

      await waitFor(() => {
        expect(mockListFiles).toHaveBeenCalled();
      });

      const loadButton = screen.getByText('読み込む');
      fireEvent.click(loadButton);

      await waitFor(() => {
        expect(screen.getByText('読み込み中にエラーが発生しました')).toBeInTheDocument();
      });
    });

    test('読み込み中のローディング状態', async () => {
      useGoogleDrive.mockReturnValue({
        ...defaultDriveState,
        loading: true
      });

      render(<GoogleDriveIntegration />);

      expect(screen.getByText('ファイル読み込み中...')).toBeInTheDocument();
    });
  });

  describe('同期ステータス表示', () => {
    test('最終同期時間の表示', async () => {
      render(<GoogleDriveIntegration />);

      const saveButton = screen.getByText('Google Driveに保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/最終同期:/)).toBeInTheDocument();
      });
    });

    test('操作結果の詳細表示', async () => {
      const detailedResult = {
        success: true,
        fileId: 'file123',
        fileName: 'test.json'
      };
      mockSaveFile.mockResolvedValue(detailedResult);

      render(<GoogleDriveIntegration />);

      const saveButton = screen.getByText('Google Driveに保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Google Driveへの保存が完了しました')).toBeInTheDocument();
        // 詳細情報の表示確認（JSON形式）
        expect(screen.getByText(JSON.stringify(detailedResult, null, 2))).toBeInTheDocument();
      });
    });
  });

  describe('エラー処理', () => {
    test('Drive APIエラーの表示', () => {
      useGoogleDrive.mockReturnValue({
        ...defaultDriveState,
        error: 'API quota exceeded'
      });

      render(<GoogleDriveIntegration />);

      expect(screen.getByText('エラー: API quota exceeded')).toBeInTheDocument();
    });

    test('ファイルリストが取得できない場合', async () => {
      mockListFiles.mockResolvedValue(null);

      render(<GoogleDriveIntegration />);

      await waitFor(() => {
        expect(screen.getByText('保存されたファイルはありません')).toBeInTheDocument();
      });
    });
  });

  describe('権限再取得フロー', () => {
    test('Drive権限再取得ボタンのクリック', () => {
      useAuth.mockReturnValue({
        ...defaultAuthState,
        hasDriveAccess: false
      });

      // window.locationのモック
      delete window.location;
      window.location = { href: '', origin: 'https://example.com' };

      render(<GoogleDriveIntegration />);

      const reloginButton = screen.getByText('再度ログインする（Drive権限付き）');
      fireEvent.click(reloginButton);

      expect(window.location.href).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(window.location.href).toContain('https://www.googleapis.com/auth/drive.file');
      expect(window.location.href).toContain('https://www.googleapis.com/auth/drive.appdata');
    });
  });

  describe('UIインタラクション', () => {
    test('webViewLinkのある場合の表示リンク', async () => {
      render(<GoogleDriveIntegration />);

      await waitFor(() => {
        const viewLink = screen.getByText('表示');
        expect(viewLink).toHaveAttribute('href', 'https://drive.google.com/file/file1');
        expect(viewLink).toHaveAttribute('target', '_blank');
        expect(viewLink).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    test('webViewLinkのない場合は表示リンクが表示されない', async () => {
      mockListFiles.mockResolvedValue([
        {
          id: 'file1',
          name: 'test.json',
          createdAt: '2025-01-01T10:00:00.000Z'
          // webViewLink なし
        }
      ]);

      render(<GoogleDriveIntegration />);

      await waitFor(() => {
        expect(screen.queryByText('表示')).not.toBeInTheDocument();
      });
    });

    test('ローディング中はボタンが無効化される', () => {
      useGoogleDrive.mockReturnValue({
        ...defaultDriveState,
        loading: true
      });

      render(<GoogleDriveIntegration />);

      const saveButton = screen.getByText('保存中...');
      const updateButton = screen.getByText('ファイル一覧更新');
      const loadButton = screen.getByText('読み込む');

      expect(saveButton).toBeDisabled();
      expect(updateButton).toBeDisabled();
      expect(loadButton).toBeDisabled();
    });
  });

  describe('データ構造', () => {
    test('保存データの形式が正しい', async () => {
      render(<GoogleDriveIntegration />);

      const saveButton = screen.getByText('Google Driveに保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveFile).toHaveBeenCalledWith(
          expect.objectContaining({
            baseCurrency: 'JPY',
            currentAssets: expect.any(Array),
            targetPortfolio: expect.any(Array),
            additionalBudget: expect.any(Object),
            aiPromptTemplate: expect.any(String),
            timestamp: expect.any(String),
            version: '6.0'
          })
        );
      });
    });

    test('タイムスタンプがISO形式で生成される', async () => {
      render(<GoogleDriveIntegration />);

      const saveButton = screen.getByText('Google Driveに保存');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const callArgs = mockSaveFile.mock.calls[0][0];
        expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });
  });

  describe('コンポーネントのライフサイクル', () => {
    test('認証状態とDrive権限がある場合、初期ロード時にファイル一覧を取得', async () => {
      render(<GoogleDriveIntegration />);

      await waitFor(() => {
        expect(mockListFiles).toHaveBeenCalled();
      });
    });

    test('認証されていない場合はファイル一覧を取得しない', () => {
      useAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: false
      });

      render(<GoogleDriveIntegration />);

      expect(mockListFiles).not.toHaveBeenCalled();
    });

    test('Drive権限がない場合はファイル一覧を取得しない', () => {
      useAuth.mockReturnValue({
        ...defaultAuthState,
        hasDriveAccess: false
      });

      render(<GoogleDriveIntegration />);

      expect(mockListFiles).not.toHaveBeenCalled();
    });
  });
});