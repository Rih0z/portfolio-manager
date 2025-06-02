/**
 * envUtils.js のユニットテスト
 * 環境設定ユーティリティのテスト
 */

import {
  isDevelopment,
  isLocalDevelopment,
  getBaseApiUrl,
  getApiStage,
  getApiEndpoint,
  getGoogleClientId,
  getOrigin,
  getRedirectUri,
  getDefaultExchangeRate,
  initializeApiConfig
} from '../../../utils/envUtils';

// configServiceのモック
jest.mock('../../../services/configService', () => ({
  fetchApiConfig: jest.fn()
}));

import { fetchApiConfig } from '../../../services/configService';

// ブラウザAPIのモック
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    origin: 'http://localhost:3000'
  },
  writable: true
});

describe('envUtils', () => {
  let originalEnv;
  let consoleErrorSpy;

  beforeEach(() => {
    // 環境変数をバックアップ
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_DEFAULT_EXCHANGE_RATE: process.env.REACT_APP_DEFAULT_EXCHANGE_RATE
    };
    
    // コンソールエラーをモック
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // モックをクリア
    jest.clearAllMocks();
    
    // デフォルトモック設定
    fetchApiConfig.mockResolvedValue({
      marketDataApiUrl: 'https://mock-api.com',
      apiStage: 'test',
      googleClientId: 'mock-google-client-id',
      features: {
        useProxy: false,
        useMockApi: false,
        useDirectApi: true
      }
    });
    
    // APIキャッシュをクリア（モジュール内部のキャッシュをリセット）
    jest.resetModules();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = originalEnv.REACT_APP_DEFAULT_EXCHANGE_RATE;
    
    // コンソールモックを復元
    consoleErrorSpy.mockRestore();
  });

  describe('isDevelopment', () => {
    it('開発環境でtrueを返す', () => {
      process.env.NODE_ENV = 'development';
      
      expect(isDevelopment()).toBe(true);
    });

    it('本番環境でfalseを返す', () => {
      process.env.NODE_ENV = 'production';
      
      expect(isDevelopment()).toBe(false);
    });

    it('テスト環境でfalseを返す', () => {
      process.env.NODE_ENV = 'test';
      
      expect(isDevelopment()).toBe(false);
    });

    it('未定義環境でfalseを返す', () => {
      delete process.env.NODE_ENV;
      
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isLocalDevelopment', () => {
    it('localhostでtrueを返す', () => {
      window.location.hostname = 'localhost';
      
      expect(isLocalDevelopment()).toBe(true);
    });

    it('127.0.0.1でtrueを返す', () => {
      window.location.hostname = '127.0.0.1';
      
      expect(isLocalDevelopment()).toBe(true);
    });

    it('本番ドメインでfalseを返す', () => {
      window.location.hostname = 'portfolio-wise.com';
      
      expect(isLocalDevelopment()).toBe(false);
    });

    it('プレビュードメインでfalseを返す', () => {
      window.location.hostname = 'abc123.portfolio-manager-7bx.pages.dev';
      
      expect(isLocalDevelopment()).toBe(false);
    });
  });

  describe('getBaseApiUrl', () => {
    it('正常にAPIのベースURLを取得する', async () => {
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com'
      });
      
      const result = await getBaseApiUrl();
      
      expect(result).toBe('https://api.example.com');
    });

    it('設定取得失敗時は空文字を返す', async () => {
      fetchApiConfig.mockRejectedValue(new Error('Config error'));
      
      const result = await getBaseApiUrl();
      
      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'API設定の取得に失敗しました:',
        expect.any(Error)
      );
    });

    it('marketDataApiUrlが未設定の場合は空文字を返す', async () => {
      fetchApiConfig.mockResolvedValue({
        apiStage: 'test'
      });
      
      const result = await getBaseApiUrl();
      
      expect(result).toBe('');
    });
  });

  describe('getApiStage', () => {
    it('正常にAPIステージを取得する', async () => {
      fetchApiConfig.mockResolvedValue({
        apiStage: 'staging'
      });
      
      const result = await getApiStage();
      
      expect(result).toBe('staging');
    });

    it('設定取得失敗時はdevを返す', async () => {
      fetchApiConfig.mockRejectedValue(new Error('Config error'));
      
      const result = await getApiStage();
      
      expect(result).toBe('dev');
    });

    it('apiStageが未設定の場合はdevを返す', async () => {
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com'
      });
      
      const result = await getApiStage();
      
      expect(result).toBe('dev');
    });
  });

  describe('getApiEndpoint', () => {
    beforeEach(() => {
      window.location.hostname = 'localhost';
    });

    it('本番環境ではプロキシ経由のパスを返す', async () => {
      process.env.NODE_ENV = 'production';
      
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('/api-proxy/test/endpoint');
    });

    it('パスの先頭スラッシュを適切に処理する', async () => {
      process.env.NODE_ENV = 'production';
      
      const result = await getApiEndpoint('/test/endpoint');
      
      expect(result).toBe('/api-proxy/test/endpoint');
    });

    it('ローカル開発環境でプロキシ使用時はステージ付きパスを返す', async () => {
      process.env.NODE_ENV = 'development';
      window.location.hostname = 'localhost';
      
      fetchApiConfig.mockResolvedValue({
        apiStage: 'dev',
        features: { useProxy: true }
      });
      
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('/dev/test/endpoint');
    });

    it('AWS APIのURL使用時は完全なURLを返す', async () => {
      process.env.NODE_ENV = 'development';
      window.location.hostname = 'localhost';
      
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com',
        apiStage: 'prod',
        features: { useProxy: false }
      });
      
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('https://api.example.com/prod/test/endpoint');
    });

    it('baseURLに既にステージが含まれている場合はステージを追加しない', async () => {
      process.env.NODE_ENV = 'development';
      
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com/prod',
        apiStage: 'dev'
      });
      
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('https://api.example.com/prod/test/endpoint');
    });

    it('baseURLにdevステージが含まれている場合も適切に処理する', async () => {
      process.env.NODE_ENV = 'development';
      
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com/dev',
        apiStage: 'prod'
      });
      
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('https://api.example.com/dev/test/endpoint');
    });

    it('baseURLが空の場合はフォールバックパスを返す', async () => {
      process.env.NODE_ENV = 'development';
      
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: '',
        apiStage: 'test'
      });
      
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('/test/test/endpoint');
    });

    it('設定取得エラー時はフォールバックパスを返す', async () => {
      process.env.NODE_ENV = 'development';
      fetchApiConfig.mockRejectedValue(new Error('Config error'));
      
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('/dev/test/endpoint');
    });
  });

  describe('getGoogleClientId', () => {
    it('正常にGoogle Client IDを取得する', async () => {
      fetchApiConfig.mockResolvedValue({
        googleClientId: '123456789-abc.apps.googleusercontent.com'
      });
      
      const result = await getGoogleClientId();
      
      expect(result).toBe('123456789-abc.apps.googleusercontent.com');
    });

    it('設定取得失敗時は空文字を返す', async () => {
      fetchApiConfig.mockRejectedValue(new Error('Config error'));
      
      const result = await getGoogleClientId();
      
      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Google Client ID の取得に失敗しました:',
        expect.any(Error)
      );
    });

    it('googleClientIdが未設定の場合は空文字を返す', async () => {
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com'
      });
      
      const result = await getGoogleClientId();
      
      expect(result).toBe('');
    });

    it('googleClientIdがnullの場合は空文字を返す', async () => {
      fetchApiConfig.mockResolvedValue({
        googleClientId: null
      });
      
      const result = await getGoogleClientId();
      
      expect(result).toBe('');
    });
  });

  describe('getOrigin', () => {
    it('現在のオリジンを正しく取得する', () => {
      window.location.origin = 'https://portfolio-wise.com';
      
      const result = getOrigin();
      
      expect(result).toBe('https://portfolio-wise.com');
    });

    it('ローカル開発環境のオリジンを正しく取得する', () => {
      window.location.origin = 'http://localhost:3000';
      
      const result = getOrigin();
      
      expect(result).toBe('http://localhost:3000');
    });

    it('プレビュー環境のオリジンを正しく取得する', () => {
      window.location.origin = 'https://abc123.portfolio-manager-7bx.pages.dev';
      
      const result = getOrigin();
      
      expect(result).toBe('https://abc123.portfolio-manager-7bx.pages.dev');
    });
  });

  describe('getRedirectUri', () => {
    beforeEach(() => {
      window.location.origin = 'https://portfolio-wise.com';
    });

    it('デフォルトパスでリダイレクトURIを生成する', () => {
      const result = getRedirectUri();
      
      expect(result).toBe('https://portfolio-wise.com/auth/callback');
    });

    it('カスタムパスでリダイレクトURIを生成する', () => {
      const result = getRedirectUri('/custom/callback');
      
      expect(result).toBe('https://portfolio-wise.com/custom/callback');
    });

    it('先頭スラッシュなしのパスでも正しく動作する', () => {
      const result = getRedirectUri('auth/google/callback');
      
      expect(result).toBe('https://portfolio-wise.com/auth/google/callback');
    });

    it('空のパスでも正しく動作する', () => {
      const result = getRedirectUri('');
      
      expect(result).toBe('https://portfolio-wise.com/');
    });

    it('ローカル環境でも正しく動作する', () => {
      window.location.origin = 'http://localhost:3000';
      
      const result = getRedirectUri('/auth/callback');
      
      expect(result).toBe('http://localhost:3000/auth/callback');
    });
  });

  describe('getDefaultExchangeRate', () => {
    it('環境変数が設定されている場合はその値を返す', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '160.5';
      
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(160.5);
    });

    it('環境変数が未設定の場合はデフォルト値150.0を返す', () => {
      delete process.env.REACT_APP_DEFAULT_EXCHANGE_RATE;
      
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(150.0);
    });

    it('環境変数が無効な値の場合はデフォルト値150.0を返す', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = 'invalid';
      
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(150.0);
    });

    it('環境変数が空文字の場合はデフォルト値150.0を返す', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '';
      
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(150.0);
    });

    it('環境変数が0の場合は0を返す', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '0';
      
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(0);
    });

    it('負の値も正しく処理する', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '-10.5';
      
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(-10.5);
    });
  });

  describe('initializeApiConfig', () => {
    it('API設定を初期化する', async () => {
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://init-test.com'
      });
      
      await initializeApiConfig();
      
      expect(fetchApiConfig).toHaveBeenCalled();
    });

    it('初期化エラーでも例外を投げない', async () => {
      fetchApiConfig.mockRejectedValue(new Error('Init error'));
      
      await expect(initializeApiConfig()).resolves.toBeUndefined();
    });
  });

  describe('デフォルトエクスポート', () => {
    it('全ての関数をエクスポートしている', async () => {
      const envUtils = await import('../../../utils/envUtils');
      const defaultExport = envUtils.default;
      
      expect(defaultExport).toHaveProperty('isDevelopment');
      expect(defaultExport).toHaveProperty('isLocalDevelopment');
      expect(defaultExport).toHaveProperty('getBaseApiUrl');
      expect(defaultExport).toHaveProperty('getApiStage');
      expect(defaultExport).toHaveProperty('getApiEndpoint');
      expect(defaultExport).toHaveProperty('getGoogleClientId');
      expect(defaultExport).toHaveProperty('getOrigin');
      expect(defaultExport).toHaveProperty('getRedirectUri');
      expect(defaultExport).toHaveProperty('getDefaultExchangeRate');
      expect(defaultExport).toHaveProperty('initializeApiConfig');
    });
  });

  describe('エラーケース', () => {
    it('fetchApiConfigがnullを返した場合も処理する', async () => {
      fetchApiConfig.mockResolvedValue(null);
      
      const baseUrl = await getBaseApiUrl();
      const stage = await getApiStage();
      const clientId = await getGoogleClientId();
      
      expect(baseUrl).toBe('');
      expect(stage).toBe('dev');
      expect(clientId).toBe('');
    });

    it('fetchApiConfigがundefinedを返した場合も処理する', async () => {
      fetchApiConfig.mockResolvedValue(undefined);
      
      const baseUrl = await getBaseApiUrl();
      const stage = await getApiStage();
      
      expect(baseUrl).toBe('');
      expect(stage).toBe('dev');
    });

    it('window.locationが未定義でもエラーを起こさない', () => {
      const originalLocation = window.location;
      delete window.location;
      
      expect(() => {
        // getOriginとgetRedirectUriは呼び出さない（window.locationが必要）
        isDevelopment();
        getDefaultExchangeRate();
      }).not.toThrow();
      
      window.location = originalLocation;
    });
  });

  describe('パフォーマンステスト', () => {
    it('複数回の設定取得でキャッシュが効く', async () => {
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://cache-test.com',
        apiStage: 'cache'
      });
      
      // 複数回呼び出し
      await getBaseApiUrl();
      await getApiStage();
      await getBaseApiUrl();
      await getApiStage();
      
      // fetchApiConfigは最初の1回だけ呼ばれる
      expect(fetchApiConfig).toHaveBeenCalledTimes(1);
    });

    it('大量の同期関数呼び出しを高速で処理する', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        isDevelopment();
        getOrigin();
        getDefaultExchangeRate();
        getRedirectUri('/test');
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });

  describe('統合テスト', () => {
    it('完全な設定取得フローが動作する', async () => {
      const mockConfig = {
        marketDataApiUrl: 'https://integration-test.com',
        apiStage: 'integration',
        googleClientId: 'integration-client-id',
        features: {
          useProxy: true,
          useMockApi: false,
          useDirectApi: false
        }
      };
      
      fetchApiConfig.mockResolvedValue(mockConfig);
      
      await initializeApiConfig();
      
      const baseUrl = await getBaseApiUrl();
      const stage = await getApiStage();
      const clientId = await getGoogleClientId();
      const endpoint = await getApiEndpoint('test/path');
      
      expect(baseUrl).toBe('https://integration-test.com');
      expect(stage).toBe('integration');
      expect(clientId).toBe('integration-client-id');
      expect(endpoint).toBeDefined();
    });
  });
});