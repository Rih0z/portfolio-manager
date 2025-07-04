/**
 * temporaryAuthFix.js のユニットテスト
 * 一時的な認証修正機能のテスト
 */

import { testGoogleAuth } from '../../../utils/temporaryAuthFix';

// fetch APIのモック
global.fetch = jest.fn();

describe('temporaryAuthFix', () => {
  let consoleSpy;
  let consoleErrorSpy;
  
  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    
    // window.locationのモック
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://portfolio-wise.com'
      },
      writable: true
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('testGoogleAuth', () => {
    it('OPTIONSとPOSTリクエストを順次実行する', async () => {
      // OPTIONS リクエストのモック
      const optionsResponse = {
        status: 200,
        headers: {
          get: jest.fn((headerName) => {
            const headers = {
              'access-control-allow-origin': 'https://portfolio-wise.com',
              'access-control-allow-methods': 'GET, POST, OPTIONS',
              'access-control-allow-headers': 'content-type',
              'access-control-allow-credentials': 'true'
            };
            return headers[headerName] || null;
          })
        }
      };

      // POST リクエストのモック
      const postResponse = {
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: false,
          message: '認証コードが不足しています'
        })
      };

      fetch
        .mockResolvedValueOnce(optionsResponse) // OPTIONS
        .mockResolvedValueOnce(postResponse);    // POST

      await testGoogleAuth();

      // fetch が2回呼ばれることを確認
      expect(fetch).toHaveBeenCalledTimes(2);

      // コンソール出力の確認
      expect(consoleSpy).toHaveBeenCalledWith('=== Google認証テスト開始 ===');
      expect(consoleSpy).toHaveBeenCalledWith('=== テスト完了 ===');
    });

    it('window.testGoogleAuth が正しく設定される', () => {
      // モジュールのロードによってwindow.testGoogleAuthが設定されることを確認
      expect(window.testGoogleAuth).toBe(testGoogleAuth);
      expect(typeof window.testGoogleAuth).toBe('function');
    });
  });
});