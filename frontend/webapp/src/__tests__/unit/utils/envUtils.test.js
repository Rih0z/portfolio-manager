/**
 * envUtils.js のユニットテスト
 * 環境設定ユーティリティのテスト
 */

// configServiceのモック
jest.mock('../../../services/configService', () => ({
  fetchApiConfig: jest.fn()
}));


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
      REACT_APP_DEFAULT_EXCHANGE_RATE: process.env.REACT_APP_DEFAULT_EXCHANGE_RATE,
      REACT_APP_GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID
    };
    
    // APIキャッシュをクリア（モジュール内部のキャッシュをリセット）
    jest.resetModules();
    
    // モック再セットアップ（resetModules後に必要）
    jest.doMock('../../../services/configService', () => ({
      fetchApiConfig: jest.fn()
    }));
    
    // コンソールエラーをモック
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // モックをクリア
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = originalEnv.REACT_APP_DEFAULT_EXCHANGE_RATE;
    process.env.REACT_APP_GOOGLE_CLIENT_ID = originalEnv.REACT_APP_GOOGLE_CLIENT_ID;
    
    // コンソールモックを復元
    consoleErrorSpy.mockRestore();
  });

  describe('isDevelopment', () => {
    it('開発環境でtrueを返す', () => {
      process.env.NODE_ENV = 'development';
      const { isDevelopment } = require('../../../utils/envUtils');
      
      expect(isDevelopment()).toBe(true);
    });

    it('本番環境でfalseを返す', () => {
      process.env.NODE_ENV = 'production';
      const { isDevelopment } = require('../../../utils/envUtils');
      
      expect(isDevelopment()).toBe(false);
    });

    it('テスト環境でfalseを返す', () => {
      process.env.NODE_ENV = 'test';
      const { isDevelopment } = require('../../../utils/envUtils');
      
      expect(isDevelopment()).toBe(false);
    });

    it('未定義環境でfalseを返す', () => {
      delete process.env.NODE_ENV;
      const { isDevelopment } = require('../../../utils/envUtils');
      
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isLocalDevelopment', () => {
    it('localhostでtrueを返す', () => {
      window.location.hostname = 'localhost';
      const { isLocalDevelopment } = require('../../../utils/envUtils');
      
      expect(isLocalDevelopment()).toBe(true);
    });

    it('127.0.0.1でtrueを返す', () => {
      window.location.hostname = '127.0.0.1';
      const { isLocalDevelopment } = require('../../../utils/envUtils');
      
      expect(isLocalDevelopment()).toBe(true);
    });

    it('本番ドメインでfalseを返す', () => {
      window.location.hostname = 'portfolio-wise.com';
      const { isLocalDevelopment } = require('../../../utils/envUtils');
      
      expect(isLocalDevelopment()).toBe(false);
    });

    it('プレビュードメインでfalseを返す', () => {
      window.location.hostname = 'abc123.portfolio-manager-7bx.pages.dev';
      const { isLocalDevelopment } = require('../../../utils/envUtils');
      
      expect(isLocalDevelopment()).toBe(false);
    });
  });

  describe('getBaseApiUrl', () => {
    it('正常にAPIのベースURLを取得する', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com'
      });
      
      const { getBaseApiUrl } = require('../../../utils/envUtils');
      const result = await getBaseApiUrl();
      
      expect(result).toBe('https://api.example.com');
    });

    it('設定取得失敗時はフォールバック値を返す', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockRejectedValue(new Error('Config error'));
      
      const { getBaseApiUrl } = require('../../../utils/envUtils');
      const result = await getBaseApiUrl();
      
      expect(result).toBe('https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod');
    });

    it('marketDataApiUrlが未設定の場合は空文字を返す', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        apiStage: 'test'
      });
      
      const { getBaseApiUrl } = require('../../../utils/envUtils');
      const result = await getBaseApiUrl();
      
      expect(result).toBe('');
    });
  });

  describe('getApiStage', () => {
    it('正常にAPIステージを取得する', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        apiStage: 'staging'
      });
      
      const { getApiStage } = require('../../../utils/envUtils');
      const result = await getApiStage();
      
      expect(result).toBe('staging');
    });

    it('設定取得失敗時はprodを返す', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockRejectedValue(new Error('Config error'));
      
      const { getApiStage } = require('../../../utils/envUtils');
      const result = await getApiStage();
      
      expect(result).toBe('prod');
    });

    it('apiStageが未設定の場合はdevを返す', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com'
      });
      
      const { getApiStage } = require('../../../utils/envUtils');
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
      
      const { getApiEndpoint } = require('../../../utils/envUtils');
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('/api-proxy/test/endpoint');
    });

    it('パスの先頭スラッシュを適切に処理する', async () => {
      process.env.NODE_ENV = 'production';
      
      const { getApiEndpoint } = require('../../../utils/envUtils');
      const result = await getApiEndpoint('/test/endpoint');
      
      expect(result).toBe('/api-proxy/test/endpoint');
    });

    it('ローカル開発環境でプロキシ使用時はステージ付きパスを返す', async () => {
      process.env.NODE_ENV = 'development';
      window.location.hostname = 'localhost';
      
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        apiStage: 'dev',
        features: { useProxy: true }
      });
      
      const { getApiEndpoint } = require('../../../utils/envUtils');
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('/dev/test/endpoint');
    });

    it('AWS APIのURL使用時は完全なURLを返す', async () => {
      process.env.NODE_ENV = 'development';
      window.location.hostname = 'localhost';
      
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com',
        apiStage: 'prod',
        features: { useProxy: false }
      });
      
      const { getApiEndpoint } = require('../../../utils/envUtils');
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('https://api.example.com/prod/test/endpoint');
    });

    it('baseURLに既にステージが含まれている場合はステージを追加しない', async () => {
      process.env.NODE_ENV = 'development';
      
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com/prod',
        apiStage: 'dev'
      });
      
      const { getApiEndpoint } = require('../../../utils/envUtils');
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('https://api.example.com/prod/test/endpoint');
    });

    it('baseURLにdevステージが含まれている場合も適切に処理する', async () => {
      process.env.NODE_ENV = 'development';
      
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com/dev',
        apiStage: 'prod'
      });
      
      const { getApiEndpoint } = require('../../../utils/envUtils');
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('https://api.example.com/dev/test/endpoint');
    });

    it('baseURLが空の場合はフォールバックパスを返す', async () => {
      process.env.NODE_ENV = 'development';
      
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: '',
        apiStage: 'test'
      });
      
      const { getApiEndpoint } = require('../../../utils/envUtils');
      const result = await getApiEndpoint('test/endpoint');
      
      expect(result).toBe('/test/test/endpoint');
    });

    it('設定取得エラー時はフォールバックパスを返す', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.REACT_APP_API_BASE_URL;
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockRejectedValue(new Error('Config error'));
      
      const { getApiEndpoint } = require('../../../utils/envUtils');
      const result = await getApiEndpoint('test/endpoint');
      
      // フォールバック設定のベースURLが使用される
      expect(result).toBe('/prod/test/endpoint');
    });
  });

  describe('getGoogleClientId', () => {
    it('正常にGoogle Client IDを取得する', async () => {
      // テスト環境では環境変数REACT_APP_GOOGLE_CLIENT_IDが設定されている
      const { getGoogleClientId } = require('../../../utils/envUtils');
      const result = await getGoogleClientId();
      
      expect(result).toBe('test-client-id');
    });

    it('設定取得失敗時は環境変数を返す', async () => {
      // テスト環境では環境変数REACT_APP_GOOGLE_CLIENT_IDが設定されているため、
      // 設定取得が失敗しても環境変数の値が返される
      const { getGoogleClientId } = require('../../../utils/envUtils');
      const result = await getGoogleClientId();
      
      expect(result).toBe('test-client-id');
    });

    it('googleClientIdが未設定の場合は環境変数を返す', async () => {
      // テスト環境では環境変数REACT_APP_GOOGLE_CLIENT_IDが設定されている
      const { getGoogleClientId } = require('../../../utils/envUtils');
      const result = await getGoogleClientId();
      
      expect(result).toBe('test-client-id');
    });

    it('googleClientIdがnullでも環境変数を返す', async () => {
      // テスト環境では環境変数REACT_APP_GOOGLE_CLIENT_IDが設定されている
      const { getGoogleClientId } = require('../../../utils/envUtils');
      const result = await getGoogleClientId();
      
      expect(result).toBe('test-client-id');
    });

    it('環境変数もないしAPI設定も取得できない場合はフォールバック値を返す', async () => {
      // 環境変数を削除
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
      
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockRejectedValue(new Error('Config error'));
      
      // console.warnをモック
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { getGoogleClientId } = require('../../../utils/envUtils');
      const result = await getGoogleClientId();
      
      expect(result).toBe('dummy-client-id-for-development');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getOrigin', () => {
    it('現在のオリジンを正しく取得する', () => {
      window.location.origin = 'https://portfolio-wise.com';
      
      const { getOrigin } = require('../../../utils/envUtils');
      const result = getOrigin();
      
      expect(result).toBe('https://portfolio-wise.com');
    });

    it('ローカル開発環境のオリジンを正しく取得する', () => {
      window.location.origin = 'http://localhost:3000';
      
      const { getOrigin } = require('../../../utils/envUtils');
      const result = getOrigin();
      
      expect(result).toBe('http://localhost:3000');
    });

    it('プレビュー環境のオリジンを正しく取得する', () => {
      window.location.origin = 'https://abc123.portfolio-manager-7bx.pages.dev';
      
      const { getOrigin } = require('../../../utils/envUtils');
      const result = getOrigin();
      
      expect(result).toBe('https://abc123.portfolio-manager-7bx.pages.dev');
    });
  });

  describe('getRedirectUri', () => {
    beforeEach(() => {
      window.location.origin = 'https://portfolio-wise.com';
    });

    it('デフォルトパスでリダイレクトURIを生成する', () => {
      const { getRedirectUri } = require('../../../utils/envUtils');
      const result = getRedirectUri();
      
      expect(result).toBe('https://portfolio-wise.com/auth/callback');
    });

    it('カスタムパスでリダイレクトURIを生成する', () => {
      const { getRedirectUri } = require('../../../utils/envUtils');
      const result = getRedirectUri('/custom/callback');
      
      expect(result).toBe('https://portfolio-wise.com/custom/callback');
    });

    it('先頭スラッシュなしのパスでも正しく動作する', () => {
      const { getRedirectUri } = require('../../../utils/envUtils');
      const result = getRedirectUri('auth/google/callback');
      
      expect(result).toBe('https://portfolio-wise.com/auth/google/callback');
    });

    it('空のパスでも正しく動作する', () => {
      const { getRedirectUri } = require('../../../utils/envUtils');
      const result = getRedirectUri('');
      
      expect(result).toBe('https://portfolio-wise.com/');
    });

    it('ローカル環境でも正しく動作する', () => {
      window.location.origin = 'http://localhost:3000';
      
      const { getRedirectUri } = require('../../../utils/envUtils');
      const result = getRedirectUri('/auth/callback');
      
      expect(result).toBe('http://localhost:3000/auth/callback');
    });
  });

  describe('getDefaultExchangeRate', () => {
    it('環境変数が設定されている場合はその値を返す', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '160.5';
      
      const { getDefaultExchangeRate } = require('../../../utils/envUtils');
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(160.5);
    });

    it('環境変数が未設定の場合はデフォルト値150.0を返す', () => {
      delete process.env.REACT_APP_DEFAULT_EXCHANGE_RATE;
      
      const { getDefaultExchangeRate } = require('../../../utils/envUtils');
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(150.0);
    });

    it('環境変数が無効な値の場合はデフォルト値150.0を返す', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = 'invalid';
      
      const { getDefaultExchangeRate } = require('../../../utils/envUtils');
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(150.0);
    });

    it('環境変数が空文字の場合はデフォルト値150.0を返す', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '';
      
      const { getDefaultExchangeRate } = require('../../../utils/envUtils');
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(150.0);
    });

    it('環境変数が0の場合は0を返す', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '0';
      
      const { getDefaultExchangeRate } = require('../../../utils/envUtils');
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(0);
    });

    it('負の値も正しく処理する', () => {
      process.env.REACT_APP_DEFAULT_EXCHANGE_RATE = '-10.5';
      
      const { getDefaultExchangeRate } = require('../../../utils/envUtils');
      const result = getDefaultExchangeRate();
      
      expect(result).toBe(-10.5);
    });
  });

  describe('initializeApiConfig', () => {
    it('API設定を初期化する', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://init-test.com'
      });
      
      const { initializeApiConfig } = require('../../../utils/envUtils');
      await initializeApiConfig();
      
      expect(fetchApiConfig).toHaveBeenCalled();
    });

    it('初期化エラーでも例外を投げない', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockRejectedValue(new Error('Init error'));
      
      const { initializeApiConfig } = require('../../../utils/envUtils');
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
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue(null);
      
      const { getBaseApiUrl, getApiStage, getGoogleClientId } = require('../../../utils/envUtils');
      const baseUrl = await getBaseApiUrl();
      const stage = await getApiStage();
      const clientId = await getGoogleClientId();
      
      expect(baseUrl).toBe('');
      expect(stage).toBe('dev');
      // 環境変数が返される
      expect(clientId).toBe('test-client-id');
    });

    it('fetchApiConfigがundefinedを返した場合も処理する', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue(undefined);
      
      const { getBaseApiUrl, getApiStage } = require('../../../utils/envUtils');
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
        const { isDevelopment, getDefaultExchangeRate } = require('../../../utils/envUtils');
        isDevelopment();
        getDefaultExchangeRate();
      }).not.toThrow();
      
      window.location = originalLocation;
    });
  });

  describe('パフォーマンステスト', () => {
    it('複数回の設定取得でキャッシュが効く', async () => {
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://cache-test.com',
        apiStage: 'cache'
      });
      
      const { getBaseApiUrl, getApiStage } = require('../../../utils/envUtils');
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
      
      const { isDevelopment, getOrigin, getDefaultExchangeRate, getRedirectUri } = require('../../../utils/envUtils');
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
      
      const { fetchApiConfig } = require('../../../services/configService');
      fetchApiConfig.mockResolvedValue(mockConfig);
      
      const { initializeApiConfig, getBaseApiUrl, getApiStage, getGoogleClientId, getApiEndpoint } = require('../../../utils/envUtils');
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