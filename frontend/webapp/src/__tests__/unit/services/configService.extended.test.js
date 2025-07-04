/**
 * configService.js の拡張テスト
 * エッジケースと実際の使用シナリオをカバー
 */

import {
  fetchApiConfig,
  getApiUrl,
  getApiStage,
  getGoogleClientId,
  getFeatureFlags,
  clearConfigCache
} from '../../../services/configService';

// axiosのモック
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios;

describe('configService - extended tests', () => {
  let originalEnv;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    jest.clearAllMocks();
    clearConfigCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    
    clearConfigCache();
  });

  describe('CONFIG_ENDPOINT の正しいパス', () => {
    it('/config/public パスでエンドポイントを構築する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com/prod';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com',
            apiStage: 'prod'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await fetchApiConfig();

      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.example.com/prod/config/public');
    });

    it('API_BASE_URLが未設定の場合はプロキシパスを使用する', async () => {
      delete process.env.REACT_APP_API_BASE_URL;

      await fetchApiConfig();

      expect(mockedAxios.get).not.toHaveBeenCalled();
      // フォールバック設定が返される
    });
  });

  describe('エラーケースの詳細処理', () => {
    it('ネットワークタイムアウトエラーを処理する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      const config = await fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith('API設定の取得エラー:', 'timeout of 10000ms exceeded');
      expect(config.marketDataApiUrl).toBe('https://api.example.com');
    });

    it('403 Forbiddenエラーを処理する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Access denied' }
        }
      };
      mockedAxios.get.mockRejectedValue(forbiddenError);

      const config = await fetchApiConfig();

      expect(config).toBeDefined();
      expect(config.features.useProxy).toBe(true);
    });

    it('500 サーバーエラーを処理する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };
      mockedAxios.get.mockRejectedValue(serverError);

      const config = await fetchApiConfig();

      expect(config).toBeDefined();
      expect(config.apiStage).toBe('dev');
    });

    it('DNS解決エラーを処理する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const dnsError = new Error('getaddrinfo ENOTFOUND api.example.com');
      dnsError.code = 'ENOTFOUND';
      mockedAxios.get.mockRejectedValue(dnsError);

      const config = await fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'API設定の取得エラー:',
        'getaddrinfo ENOTFOUND api.example.com'
      );
      expect(config).toBeDefined();
    });
  });

  describe('部分的な設定レスポンス', () => {
    it('marketDataApiUrlのみが設定されている場合', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com/v2'
            // 他のプロパティは未定義
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const config = await fetchApiConfig();
      
      expect(config.marketDataApiUrl).toBe('https://api.example.com/v2');
      expect(await getApiStage()).toBe('dev'); // デフォルト値
      expect(await getGoogleClientId()).toBe(''); // デフォルト値
      expect(await getFeatureFlags()).toEqual({}); // デフォルト値
    });

    it('featuresのみが設定されている場合', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            features: {
              useProxy: true,
              enableBetaFeatures: true
            }
            // 他のプロパティは未定義
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const features = await getFeatureFlags();
      
      expect(features).toEqual({
        useProxy: true,
        enableBetaFeatures: true
      });
      expect(await getApiUrl()).toBe(''); // デフォルト値
    });
  });

  describe('環境変数の組み合わせ', () => {
    it('すべての環境変数が設定されている場合', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com/prod';
      process.env.REACT_APP_GOOGLE_CLIENT_ID = 'env-google-client-id';
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(error);

      const config = await fetchApiConfig();

      expect(config.marketDataApiUrl).toBe('https://api.example.com/prod');
      expect(config.apiStage).toBe('prod');
      expect(config.googleClientId).toBe('env-google-client-id');
    });

    it('開発環境でのデバッグ出力', async () => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_API_BASE_URL = 'https://dev-api.example.com';
      
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid API key'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'API設定の取得エラー:',
        '設定の取得に失敗しました'
      );
    });
  });

  describe('キャッシュの動作', () => {
    it('エラー後のキャッシュ動作', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      // 最初はエラー
      mockedAxios.get.mockRejectedValueOnce(new Error('First attempt failed'));
      
      const config1 = await fetchApiConfig();
      expect(config1.marketDataApiUrl).toBe('https://api.example.com');
      
      // 2回目もエラーだが、キャッシュが使われる
      mockedAxios.get.mockRejectedValueOnce(new Error('Second attempt failed'));
      
      const config2 = await fetchApiConfig();
      expect(config2).toEqual(config1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // キャッシュにより2回目は呼ばれない
    });

    it('成功後の再試行でもキャッシュを使用', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com',
            apiStage: 'prod',
            googleClientId: 'test-client-id'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      // 最初の成功
      const config1 = await fetchApiConfig();
      
      // キャッシュクリア前の呼び出し
      const config2 = await fetchApiConfig();
      
      expect(config1).toEqual(config2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      
      // キャッシュクリア後
      clearConfigCache();
      
      // 新しいレスポンス
      const newMockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://new-api.example.com',
            apiStage: 'staging'
          }
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(newMockResponse);
      
      const config3 = await fetchApiConfig();
      
      expect(config3.marketDataApiUrl).toBe('https://new-api.example.com');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('実際の使用シナリオ', () => {
    it('初回起動時の設定取得フロー', async () => {
      // アプリケーション起動時のシナリオ
      delete process.env.REACT_APP_API_BASE_URL;
      
      // 設定取得試行
      const config = await fetchApiConfig();
      
      // フォールバック設定でアプリが動作することを確認
      expect(config).toBeDefined();
      expect(config.features.useDirectApi).toBe(true);
      
      // 各種サービスが設定を取得
      const apiUrl = await getApiUrl();
      const stage = await getApiStage();
      const clientId = await getGoogleClientId();
      const features = await getFeatureFlags();
      
      expect(apiUrl).toBe('');
      expect(stage).toBe('dev');
      expect(clientId).toBe('');
      expect(features).toEqual({
        useProxy: false,
        useMockApi: false,
        useDirectApi: true
      });
    });

    it('本番環境での完全な設定取得フロー', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://gglwlh6sc7.execute-api.us-west-2.amazonaws.com/prod',
            apiStage: 'prod',
            googleClientId: '243939385276-0gga06ocrn3vumf7lasubcpdqjk49j3n.apps.googleusercontent.com',
            features: {
              useProxy: false,
              useMockApi: false,
              useDirectApi: true,
              enableBetaFeatures: false
            }
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);
      
      // 初期設定取得
      const config = await fetchApiConfig();
      
      expect(config.marketDataApiUrl).toContain('amazonaws.com');
      expect(config.apiStage).toBe('prod');
      expect(config.googleClientId).toContain('apps.googleusercontent.com');
      
      // 各サービスが設定を使用
      const promises = [
        getApiUrl(),
        getApiStage(),
        getGoogleClientId(),
        getFeatureFlags()
      ];
      
      const [apiUrl, stage, clientId, features] = await Promise.all(promises);
      
      expect(apiUrl).toContain('amazonaws.com');
      expect(stage).toBe('prod');
      expect(clientId).toContain('apps.googleusercontent.com');
      expect(features.useDirectApi).toBe(true);
      
      // APIは一度だけ呼ばれる（キャッシュ効果）
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('並行処理とレース条件', () => {
    it('複数のコンポーネントから同時に設定を要求', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com',
            apiStage: 'prod'
          }
        }
      };

      // 遅延を持つモックレスポンス
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(mockResponse), 50)
        )
      );

      // 複数のコンポーネントから同時にアクセス
      const componentRequests = [
        // HeaderComponent
        Promise.all([getApiUrl(), getGoogleClientId()]),
        // DashboardComponent
        Promise.all([getApiUrl(), getApiStage(), getFeatureFlags()]),
        // SettingsComponent
        Promise.all([getFeatureFlags(), getGoogleClientId()]),
        // MarketDataService
        fetchApiConfig()
      ];

      const startTime = Date.now();
      await Promise.all(componentRequests);
      const endTime = Date.now();

      // 一度だけAPIが呼ばれることを確認
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      // 並行処理でも適切な時間内に完了
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('キャッシュクリア中の並行アクセス', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse1 = {
        data: {
          success: true,
          data: { marketDataApiUrl: 'https://api1.example.com' }
        }
      };
      
      const mockResponse2 = {
        data: {
          success: true,
          data: { marketDataApiUrl: 'https://api2.example.com' }
        }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // 最初の設定取得
      const config1 = await fetchApiConfig();
      expect(config1.marketDataApiUrl).toBe('https://api1.example.com');

      // キャッシュクリアと新しい取得を同時実行
      const clearAndFetchPromises = [
        clearConfigCache(),
        fetchApiConfig(),
        fetchApiConfig(),
        clearConfigCache(),
        fetchApiConfig()
      ];

      await Promise.all(clearAndFetchPromises);

      // 複数回の呼び出しがあっても適切に処理される
      expect(mockedAxios.get.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockedAxios.get.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  describe('メモリリークの防止', () => {
    it('大量の設定取得でもメモリを適切に管理', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com',
            // 大きなデータを含む設定
            features: Array.from({ length: 1000 }, (_, i) => ({
              [`feature${i}`]: true
            })).reduce((acc, curr) => ({ ...acc, ...curr }), {})
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // 多数の呼び出し
      for (let i = 0; i < 100; i++) {
        await fetchApiConfig();
        if (i % 20 === 0) {
          clearConfigCache();
        }
      }

      // キャッシュクリアによりメモリが解放されることを確認
      // （実際のメモリ使用量はJestでは測定困難だが、
      // キャッシュクリアが正しく動作することを確認）
      expect(mockedAxios.get.mock.calls.length).toBeLessThan(10);
    });
  });
});