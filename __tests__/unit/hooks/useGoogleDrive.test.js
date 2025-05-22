/**
 * ファイルパス: __tests__/unit/hooks/useGoogleDrive.test.js
 *
 * useGoogleDriveフックの単体テスト
 * ファイル一覧取得、保存、読み込み機能のテスト
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { useAuth } from '@/hooks/useAuth';
import { authApiClient } from '@/utils/apiUtils';
import { getApiEndpoint } from '@/utils/envUtils';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

jest.mock('@/utils/apiUtils', () => ({
  authApiClient: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

jest.mock('@/utils/envUtils', () => ({
  getApiEndpoint: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ isAuthenticated: true });
  getApiEndpoint.mockImplementation(path => `https://api.example.com/dev/${path}`);
});

describe('useGoogleDrive フック', () => {
  describe('listFiles', () => {
    it('認証が必要な場合はエラーを返す', async () => {
      useAuth.mockReturnValue({ isAuthenticated: false });
      const { result } = renderHook(() => useGoogleDrive());

      let files;
      await act(async () => {
        files = await result.current.listFiles();
      });

      expect(files).toBeNull();
      expect(result.current.error).toBe('認証が必要です');
      expect(authApiClient.get).not.toHaveBeenCalled();
    });

    it('ファイル一覧を取得できる', async () => {
      authApiClient.get.mockResolvedValue({ data: { success: true, files: [{ id: '1', name: 'test.txt' }] } });
      const { result } = renderHook(() => useGoogleDrive());

      let files;
      await act(async () => {
        files = await result.current.listFiles();
      });

      expect(authApiClient.get).toHaveBeenCalledWith('https://api.example.com/dev/drive/files');
      expect(files).toEqual([{ id: '1', name: 'test.txt' }]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('saveFile', () => {
    it('ポートフォリオデータを保存できる', async () => {
      const mockFile = { id: '1', name: 'save.json' };
      authApiClient.post.mockResolvedValue({ data: { success: true, file: mockFile } });
      const { result } = renderHook(() => useGoogleDrive());

      let res;
      await act(async () => {
        res = await result.current.saveFile({ foo: 'bar' });
      });

      expect(authApiClient.post).toHaveBeenCalledWith('https://api.example.com/dev/drive/save', { portfolioData: { foo: 'bar' } });
      expect(res).toEqual(mockFile);
      expect(result.current.error).toBeNull();
    });
  });

  describe('loadFile', () => {
    it('エラー応答の場合はnullを返す', async () => {
      authApiClient.get.mockResolvedValue({ data: { success: false, message: '失敗' } });
      const { result } = renderHook(() => useGoogleDrive());

      let res;
      await act(async () => {
        res = await result.current.loadFile('1');
      });

      expect(authApiClient.get).toHaveBeenCalledWith('https://api.example.com/dev/drive/load', { params: { fileId: '1' } });
      expect(res).toBeNull();
      expect(result.current.error).toBe('失敗');
    });
  });
});
