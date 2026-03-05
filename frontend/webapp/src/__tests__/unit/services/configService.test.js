import { vi } from "vitest";
/**
 * configService.js のユニットテスト
 * AWS設定取得とキャッシュ機能のテスト
 */

// axiosのモック - factory pattern で明示的にモックを定義
const mockAxiosGet = vi.fn();
vi.mock('axios', () => ({
  default: {
    get: mockAxiosGet
  },
  __esModule: true
}));

describe('configService', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let configModule;

  beforeEach(async () => {
    // 環境変数を設定
    import.meta.env.VITE_API_BASE_URL = 'https://api.example.com';

    // モックをリセット
    vi.resetAllMocks();

    // コンソールメソッドをモック（resetAllMocks の後）
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // モジュールをリセットして再インポート
    vi.resetModules();
    configModule = await import('../../../services/configService');
  });

  afterEach(() => {
    // コンソールモックを復元
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('fetchApiConfig', () => {
    it('正常にAPI設定を取得してキャッシュする', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com',
            apiStage: 'prod',
            googleClientId: 'mock-google-client-id',
            features: {
              useProxy: false,
              useMockApi: false,
              useDirectApi: true
            }
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const config = await configModule.fetchApiConfig();

      expect(mockAxiosGet).toHaveBeenCalledWith('https://api.example.com/config/client');
      expect(config).toEqual(mockResponse.data.data);
    });

    it('キャッシュされた設定を再利用する', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com',
            apiStage: 'prod'
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      // 最初の呼び出し
      const config1 = await configModule.fetchApiConfig();
      // 2回目の呼び出し
      const config2 = await configModule.fetchApiConfig();

      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
      expect(config1).toEqual(config2);
    });

    it('並行リクエストが同じPromiseを共有する', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com'
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      // 並行して複数回呼び出し
      const promises = [
        configModule.fetchApiConfig(),
        configModule.fetchApiConfig(),
        configModule.fetchApiConfig()
      ];

      const results = await Promise.all(promises);

      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });

    it('API取得に失敗した場合はフォールバック設定を返す', async () => {
      const error = new Error('Network Error');
      mockAxiosGet.mockRejectedValue(error);

      const config = await configModule.fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith('API設定の取得エラー:', 'Network Error');
      expect(config).toEqual({
        marketDataApiUrl: 'https://api.example.com',
        apiStage: 'dev',
        googleClientId: '',
        features: {
          useProxy: false,
          useMockApi: false,
          useDirectApi: true
        }
      });
    });

    it('AWS URL（prod）の場合はステージを正しく設定する', async () => {
      import.meta.env.VITE_API_BASE_URL = 'https://abc123.execute-api.us-west-2.amazonaws.com/prod';
      vi.resetModules();
      vi.resetAllMocks();
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mod = await import('../../../services/configService');

      mockAxiosGet.mockRejectedValue(new Error('Network Error'));

      const config = await mod.fetchApiConfig();

      expect(config.apiStage).toBe('prod');
    });

    it('本番環境でプロキシ経由の再試行が成功する', async () => {
      process.env.NODE_ENV = 'production';
      import.meta.env.VITE_API_BASE_URL = 'https://abc123.execute-api.us-west-2.amazonaws.com/prod';
      vi.resetModules();
      vi.resetAllMocks();
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mod = await import('../../../services/configService');

      const proxyResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com',
            apiStage: 'prod',
            googleClientId: 'proxy-google-client-id'
          }
        }
      };

      // 最初のリクエストは失敗、プロキシリクエストは成功
      mockAxiosGet
        .mockRejectedValueOnce(new Error('Direct API failed'))
        .mockResolvedValueOnce(proxyResponse);

      const config = await mod.fetchApiConfig();

      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
      expect(mockAxiosGet).toHaveBeenNthCalledWith(1, 'https://abc123.execute-api.us-west-2.amazonaws.com/prod/config/client');
      expect(mockAxiosGet).toHaveBeenNthCalledWith(2, '/api-proxy/config/client');
      expect(config).toEqual(proxyResponse.data.data);

      process.env.NODE_ENV = 'test';
    });

    it('本番環境でプロキシ経由の再試行も失敗した場合はフォールバック設定を返す', async () => {
      process.env.NODE_ENV = 'production';
      import.meta.env.VITE_API_BASE_URL = 'https://abc123.execute-api.us-west-2.amazonaws.com/prod';
      vi.resetModules();
      vi.resetAllMocks();
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mod = await import('../../../services/configService');

      // 両方のリクエストが失敗
      mockAxiosGet
        .mockRejectedValueOnce(new Error('Direct API failed'))
        .mockRejectedValueOnce(new Error('Proxy API failed'));

      const config = await mod.fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith('API設定の取得エラー:', 'Direct API failed');
      expect(consoleWarnSpy).toHaveBeenCalledWith('プロキシ経由でもAPI設定の取得に失敗:', 'Proxy API failed');
      expect(config.features.useProxy).toBe(true);
      expect(config.features.useDirectApi).toBe(false);

      process.env.NODE_ENV = 'test';
    });

    it('無効なレスポンス形式の場合はエラーを投げる', async () => {
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid request'
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const config = await configModule.fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith('API設定の取得エラー:', '設定の取得に失敗しました');
      expect(config.marketDataApiUrl).toBe('https://api.example.com');
    });
  });

  describe('getApiUrl', () => {
    it('API URLを正しく取得する', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com/v2'
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const url = await configModule.getApiUrl();

      expect(url).toBe('https://api.example.com/v2');
    });

    it('API URLが空の場合は空文字を返す', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const url = await configModule.getApiUrl();

      expect(url).toBe('');
    });
  });

  describe('getApiStage', () => {
    it('APIステージを正しく取得する', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            apiStage: 'staging'
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const stage = await configModule.getApiStage();

      expect(stage).toBe('staging');
    });

    it('APIステージが未設定の場合はdevを返す', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const stage = await configModule.getApiStage();

      expect(stage).toBe('dev');
    });
  });

  describe('getGoogleClientId', () => {
    it('Google Client IDを正しく取得する', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            googleClientId: '123456789-abc.apps.googleusercontent.com'
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const clientId = await configModule.getGoogleClientId();

      expect(clientId).toBe('123456789-abc.apps.googleusercontent.com');
    });

    it('Google Client IDが未設定の場合は空文字を返す', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const clientId = await configModule.getGoogleClientId();

      expect(clientId).toBe('');
    });
  });

  describe('getFeatureFlags', () => {
    it('機能フラグを正しく取得する', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            features: {
              useProxy: true,
              useMockApi: false,
              useDirectApi: false,
              enableBetaFeatures: true
            }
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const features = await configModule.getFeatureFlags();

      expect(features).toEqual({
        useProxy: true,
        useMockApi: false,
        useDirectApi: false,
        enableBetaFeatures: true
      });
    });

    it('機能フラグが未設定の場合は空オブジェクトを返す', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const features = await configModule.getFeatureFlags();

      expect(features).toEqual({});
    });
  });

  describe('clearConfigCache', () => {
    it('キャッシュを正しくクリアする', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com'
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      // 最初の呼び出し
      await configModule.fetchApiConfig();
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);

      // キャッシュクリア
      configModule.clearConfigCache();

      // 再度呼び出し
      await configModule.fetchApiConfig();
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });

    it('複数回呼び出してもエラーが発生しない', () => {
      expect(() => {
        configModule.clearConfigCache();
        configModule.clearConfigCache();
        configModule.clearConfigCache();
      }).not.toThrow();
    });
  });

  describe('デフォルトエクスポート', () => {
    it('全ての必要な関数をエクスポートする', () => {
      const defaultExport = configModule.default;

      expect(defaultExport).toHaveProperty('fetchApiConfig');
      expect(defaultExport).toHaveProperty('getApiUrl');
      expect(defaultExport).toHaveProperty('getApiStage');
      expect(defaultExport).toHaveProperty('getGoogleClientId');
      expect(defaultExport).toHaveProperty('getFeatureFlags');
      expect(defaultExport).toHaveProperty('clearConfigCache');

      expect(typeof defaultExport.fetchApiConfig).toBe('function');
      expect(typeof defaultExport.getApiUrl).toBe('function');
      expect(typeof defaultExport.getApiStage).toBe('function');
      expect(typeof defaultExport.getGoogleClientId).toBe('function');
      expect(typeof defaultExport.getFeatureFlags).toBe('function');
      expect(typeof defaultExport.clearConfigCache).toBe('function');
    });
  });

  describe('エラーケース詳細テスト', () => {
    // 各テストでキャッシュをクリアして独立させる
    beforeEach(() => {
      configModule.clearConfigCache();
    });

    it('undefined レスポンスを正しく処理する', async () => {
      mockAxiosGet.mockResolvedValue(undefined);

      const config = await configModule.fetchApiConfig();

      expect(config.marketDataApiUrl).toBe('https://api.example.com');
      expect(config.apiStage).toBe('dev');
    });

    it('null データレスポンスを正しく処理する', async () => {
      const mockResponse = {
        data: null
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const config = await configModule.fetchApiConfig();

      expect(config.marketDataApiUrl).toBe('https://api.example.com');
    });

    it('空のデータレスポンスを正しく処理する', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: null
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const config = await configModule.fetchApiConfig();

      // success: true だが data が null
      // ソースコード: configCache = response.data.data (= null)
      // null を返すが、configCache が null のままなので次回呼び出しで再取得される
      // この場合エラーは投げられないため、返された値を検証
      expect(config).toBeNull();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の並行リクエストを効率的に処理する', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com'
          }
        }
      };

      mockAxiosGet.mockResolvedValue(mockResponse);

      const startTime = Date.now();

      const promises = Array.from({ length: 100 }, () => configModule.fetchApiConfig());
      const results = await Promise.all(promises);

      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      expect(mockAxiosGet).toHaveBeenCalledTimes(1); // キャッシュにより1回のみ
    });
  });
});
