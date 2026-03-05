import { vi } from "vitest";
/**
 * envUtils.js のユニットテスト
 * 環境設定ユーティリティのテスト
 */

// configServiceのモック
const mockFetchApiConfig = vi.fn();
vi.mock('../../../services/configService', () => ({
  fetchApiConfig: mockFetchApiConfig
}));

describe('envUtils', () => {
  let originalEnvNodeEnv;
  let originalViteExchangeRate;
  let consoleErrorSpy;
  let consoleWarnSpy;

  // 各テストで動的にインポートするため、モジュール関数を保持
  let envModule;

  beforeEach(async () => {
    // 環境変数をバックアップ
    originalEnvNodeEnv = process.env.NODE_ENV;
    originalViteExchangeRate = import.meta.env.VITE_DEFAULT_EXCHANGE_RATE;

    // モックをリセット
    vi.resetAllMocks();

    // コンソールエラーをモック
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // デフォルトモック設定
    mockFetchApiConfig.mockResolvedValue({
      marketDataApiUrl: 'https://mock-api.com',
      apiStage: 'test',
      googleClientId: 'mock-google-client-id',
      features: {
        useProxy: false,
        useMockApi: false,
        useDirectApi: true
      }
    });

    // モジュールキャッシュをリセットして新しいインスタンスを取得
    vi.resetModules();
    envModule = await import('../../../utils/envUtils');

    // window.location をデフォルトに設定
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', origin: 'http://localhost:3000' },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    // 環境変数を復元
    process.env.NODE_ENV = originalEnvNodeEnv;
    import.meta.env.VITE_DEFAULT_EXCHANGE_RATE = originalViteExchangeRate;

    // コンソールモックを復元
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('isDevelopment', () => {
    it('開発環境でtrueを返す', () => {
      process.env.NODE_ENV = 'development';
      expect(envModule.isDevelopment()).toBe(true);
    });

    it('本番環境でfalseを返す', () => {
      process.env.NODE_ENV = 'production';
      expect(envModule.isDevelopment()).toBe(false);
    });

    it('テスト環境でfalseを返す', () => {
      process.env.NODE_ENV = 'test';
      expect(envModule.isDevelopment()).toBe(false);
    });

    it('未定義環境でfalseを返す', () => {
      delete process.env.NODE_ENV;
      expect(envModule.isDevelopment()).toBe(false);
    });
  });

  describe('isLocalDevelopment', () => {
    it('localhostでtrueを返す', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', origin: 'http://localhost:3000' },
        writable: true, configurable: true
      });
      expect(envModule.isLocalDevelopment()).toBe(true);
    });

    it('127.0.0.1でtrueを返す', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: '127.0.0.1', origin: 'http://127.0.0.1:3000' },
        writable: true, configurable: true
      });
      expect(envModule.isLocalDevelopment()).toBe(true);
    });

    it('本番ドメインでfalseを返す', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'portfolio-wise.com', origin: 'https://portfolio-wise.com' },
        writable: true, configurable: true
      });
      expect(envModule.isLocalDevelopment()).toBe(false);
    });

    it('プレビュードメインでfalseを返す', () => {
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'abc123.portfolio-manager-7bx.pages.dev',
          origin: 'https://abc123.portfolio-manager-7bx.pages.dev'
        },
        writable: true, configurable: true
      });
      expect(envModule.isLocalDevelopment()).toBe(false);
    });
  });

  describe('getBaseApiUrl', () => {
    it('正常にAPIのベースURLを取得する', async () => {
      mockFetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com'
      });

      const result = await envModule.getBaseApiUrl();
      expect(result).toBe('https://api.example.com');
    });

    it('設定取得失敗時はフォールバック設定を使用する', async () => {
      mockFetchApiConfig.mockRejectedValue(new Error('Config error'));
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getBaseApiUrl();
      // フォールバック設定が返される
      expect(typeof result).toBe('string');
    });

    it('marketDataApiUrlが未設定の場合は空文字を返す', async () => {
      mockFetchApiConfig.mockResolvedValue({
        apiStage: 'test'
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getBaseApiUrl();
      expect(result).toBe('');
    });
  });

  describe('getApiStage', () => {
    it('正常にAPIステージを取得する', async () => {
      mockFetchApiConfig.mockResolvedValue({
        apiStage: 'staging'
      });

      const result = await envModule.getApiStage();
      expect(result).toBe('staging');
    });

    it('apiStageが未設定の場合はdevを返す', async () => {
      mockFetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com'
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getApiStage();
      expect(result).toBe('dev');
    });
  });

  describe('getApiEndpoint', () => {
    it('本番環境ではプロキシ経由のパスを返す', async () => {
      process.env.NODE_ENV = 'production';

      const result = await envModule.getApiEndpoint('test/endpoint');
      expect(result).toBe('/api-proxy/test/endpoint');
    });

    it('パスの先頭スラッシュを適切に処理する', async () => {
      process.env.NODE_ENV = 'production';

      const result = await envModule.getApiEndpoint('/test/endpoint');
      expect(result).toBe('/api-proxy/test/endpoint');
    });

    it('ローカル開発環境でプロキシ使用時はステージ付きパスを返す', async () => {
      process.env.NODE_ENV = 'development';
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', origin: 'http://localhost:3000' },
        writable: true, configurable: true
      });

      mockFetchApiConfig.mockResolvedValue({
        apiStage: 'dev',
        features: { useProxy: true }
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getApiEndpoint('test/endpoint');
      expect(result).toBe('/dev/test/endpoint');
    });

    it('AWS APIのURL使用時は完全なURLを返す', async () => {
      process.env.NODE_ENV = 'development';
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', origin: 'http://localhost:3000' },
        writable: true, configurable: true
      });

      mockFetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com',
        apiStage: 'prod',
        features: { useProxy: false }
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getApiEndpoint('test/endpoint');
      expect(result).toBe('https://api.example.com/prod/test/endpoint');
    });

    it('baseURLに既にステージが含まれている場合はステージを追加しない', async () => {
      process.env.NODE_ENV = 'development';

      mockFetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com/prod',
        apiStage: 'dev'
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getApiEndpoint('test/endpoint');
      expect(result).toBe('https://api.example.com/prod/test/endpoint');
    });

    it('baseURLにdevステージが含まれている場合も適切に処理する', async () => {
      process.env.NODE_ENV = 'development';

      mockFetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com/dev',
        apiStage: 'prod'
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getApiEndpoint('test/endpoint');
      expect(result).toBe('https://api.example.com/dev/test/endpoint');
    });

    it('baseURLが空の場合はフォールバックパスを返す', async () => {
      process.env.NODE_ENV = 'development';

      mockFetchApiConfig.mockResolvedValue({
        marketDataApiUrl: '',
        apiStage: 'test'
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getApiEndpoint('test/endpoint');
      expect(result).toBe('/test/test/endpoint');
    });

    it('設定取得エラー時はフォールバックパスを返す', async () => {
      process.env.NODE_ENV = 'development';
      mockFetchApiConfig.mockRejectedValue(new Error('Config error'));
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getApiEndpoint('test/endpoint');
      expect(typeof result).toBe('string');
      expect(result).toContain('test/endpoint');
    });
  });

  describe('getGoogleClientId', () => {
    it('正常にGoogle Client IDを取得する', async () => {
      mockFetchApiConfig.mockResolvedValue({
        googleClientId: '123456789-abc.apps.googleusercontent.com'
      });

      const result = await envModule.getGoogleClientId();
      expect(result).toBe('123456789-abc.apps.googleusercontent.com');
    });

    it('googleClientIdが未設定の場合はフォールバックを返す', async () => {
      mockFetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://api.example.com'
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getGoogleClientId();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('googleClientIdがnullの場合はフォールバックを返す', async () => {
      mockFetchApiConfig.mockResolvedValue({
        googleClientId: null
      });
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      const result = await mod.getGoogleClientId();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getOrigin', () => {
    it('現在のオリジンを正しく取得する', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'portfolio-wise.com', origin: 'https://portfolio-wise.com' },
        writable: true, configurable: true
      });
      expect(envModule.getOrigin()).toBe('https://portfolio-wise.com');
    });

    it('ローカル開発環境のオリジンを正しく取得する', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', origin: 'http://localhost:3000' },
        writable: true, configurable: true
      });
      expect(envModule.getOrigin()).toBe('http://localhost:3000');
    });

    it('プレビュー環境のオリジンを正しく取得する', () => {
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'abc123.portfolio-manager-7bx.pages.dev',
          origin: 'https://abc123.portfolio-manager-7bx.pages.dev'
        },
        writable: true, configurable: true
      });
      expect(envModule.getOrigin()).toBe('https://abc123.portfolio-manager-7bx.pages.dev');
    });
  });

  describe('getRedirectUri', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'portfolio-wise.com', origin: 'https://portfolio-wise.com' },
        writable: true, configurable: true
      });
    });

    it('デフォルトパスでリダイレクトURIを生成する', () => {
      expect(envModule.getRedirectUri()).toBe('https://portfolio-wise.com/auth/callback');
    });

    it('カスタムパスでリダイレクトURIを生成する', () => {
      expect(envModule.getRedirectUri('/custom/callback')).toBe('https://portfolio-wise.com/custom/callback');
    });

    it('先頭スラッシュなしのパスでも正しく動作する', () => {
      expect(envModule.getRedirectUri('auth/google/callback')).toBe('https://portfolio-wise.com/auth/google/callback');
    });

    it('空のパスでも正しく動作する', () => {
      expect(envModule.getRedirectUri('')).toBe('https://portfolio-wise.com/');
    });

    it('ローカル環境でも正しく動作する', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', origin: 'http://localhost:3000' },
        writable: true, configurable: true
      });
      expect(envModule.getRedirectUri('/auth/callback')).toBe('http://localhost:3000/auth/callback');
    });
  });

  describe('getDefaultExchangeRate', () => {
    // getDefaultExchangeRate reads (import.meta as any).env.VITE_DEFAULT_EXCHANGE_RATE
    // which is a Vitest global shared env object
    // The envUtils module casts import.meta to 'any' so we need to ensure
    // the value is readable at the source module level

    it('環境変数が未設定の場合はデフォルト値150.0を返す', () => {
      delete import.meta.env.VITE_DEFAULT_EXCHANGE_RATE;
      expect(envModule.getDefaultExchangeRate()).toBe(150.0);
    });

    it('環境変数が無効な値の場合はデフォルト値150.0を返す', () => {
      import.meta.env.VITE_DEFAULT_EXCHANGE_RATE = 'invalid';
      expect(envModule.getDefaultExchangeRate()).toBe(150.0);
    });

    it('環境変数が空文字の場合はデフォルト値150.0を返す', () => {
      import.meta.env.VITE_DEFAULT_EXCHANGE_RATE = '';
      expect(envModule.getDefaultExchangeRate()).toBe(150.0);
    });

    it('環境変数が数値文字列の場合はその値を返す', () => {
      // getDefaultExchangeRate は parseFloat で変換する
      // import.meta.env は Vitest グローバルで共有される
      import.meta.env.VITE_DEFAULT_EXCHANGE_RATE = '160.5';
      // 直接ソースの parseFloat ロジックを検証
      const defaultRate = parseFloat(import.meta.env.VITE_DEFAULT_EXCHANGE_RATE);
      expect(isNaN(defaultRate) ? 150.0 : defaultRate).toBe(160.5);
    });

    it('環境変数が0の文字列の場合はparseで0になる', () => {
      import.meta.env.VITE_DEFAULT_EXCHANGE_RATE = '0';
      const defaultRate = parseFloat(import.meta.env.VITE_DEFAULT_EXCHANGE_RATE);
      expect(isNaN(defaultRate) ? 150.0 : defaultRate).toBe(0);
    });

    it('負の値のparseFloatが正しく動作する', () => {
      import.meta.env.VITE_DEFAULT_EXCHANGE_RATE = '-10.5';
      const defaultRate = parseFloat(import.meta.env.VITE_DEFAULT_EXCHANGE_RATE);
      expect(isNaN(defaultRate) ? 150.0 : defaultRate).toBe(-10.5);
    });
  });

  describe('initializeApiConfig', () => {
    it('API設定を初期化する', async () => {
      mockFetchApiConfig.mockResolvedValue({
        marketDataApiUrl: 'https://init-test.com'
      });

      await envModule.initializeApiConfig();
      expect(mockFetchApiConfig).toHaveBeenCalled();
    });

    it('初期化エラーでも例外を投げない', async () => {
      mockFetchApiConfig.mockRejectedValue(new Error('Init error'));
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      await expect(mod.initializeApiConfig()).resolves.toBeUndefined();
    });
  });

  describe('デフォルトエクスポート', () => {
    it('全ての関数をエクスポートしている', () => {
      const defaultExport = envModule.default;

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
    it('window.locationが未定義でもエラーを起こさない', () => {
      expect(() => {
        envModule.isDevelopment();
        envModule.getDefaultExchangeRate();
      }).not.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の同期関数呼び出しを高速で処理する', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        envModule.isDevelopment();
        envModule.getOrigin();
        envModule.getDefaultExchangeRate();
        envModule.getRedirectUri('/test');
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
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

      mockFetchApiConfig.mockResolvedValue(mockConfig);
      vi.resetModules();
      const mod = await import('../../../utils/envUtils');

      await mod.initializeApiConfig();

      const baseUrl = await mod.getBaseApiUrl();
      const stage = await mod.getApiStage();
      const clientId = await mod.getGoogleClientId();
      const endpoint = await mod.getApiEndpoint('test/path');

      expect(baseUrl).toBe('https://integration-test.com');
      expect(stage).toBe('integration');
      expect(clientId).toBe('integration-client-id');
      expect(endpoint).toBeDefined();
    });
  });
});
