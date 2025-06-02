/**
 * configService.js のユニットテスト
 * AWS設定取得とキャッシュ機能のテスト
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

describe('configService', () => {
  let originalEnv;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    // 環境変数をバックアップ
    originalEnv = process.env;
    
    // コンソールメソッドをモック
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // モックをクリア
    jest.clearAllMocks();
    
    // キャッシュをクリア
    clearConfigCache();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
    
    // コンソールモックを復元
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    
    // キャッシュをクリア
    clearConfigCache();
  });

  describe('fetchApiConfig', () => {
    it('正常にAPI設定を取得してキャッシュする', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
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

      mockedAxios.get.mockResolvedValue(mockResponse);

      const config = await fetchApiConfig();

      expect(mockedAxios.get).toHaveBeenCalledWith('https://api.example.com/config/client');
      expect(config).toEqual(mockResponse.data.data);
    });

    it('キャッシュされた設定を再利用する', async () => {
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

      mockedAxios.get.mockResolvedValue(mockResponse);

      // 最初の呼び出し
      const config1 = await fetchApiConfig();
      // 2回目の呼び出し
      const config2 = await fetchApiConfig();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(config1).toEqual(config2);
    });

    it('並行リクエストが同じPromiseを共有する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // 並行して複数回呼び出し
      const promises = [
        fetchApiConfig(),
        fetchApiConfig(),
        fetchApiConfig()
      ];

      const results = await Promise.all(promises);

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });

    it('REACT_APP_API_BASE_URLが未設定の場合はフォールバック設定を返す', async () => {
      delete process.env.REACT_APP_API_BASE_URL;

      const config = await fetchApiConfig();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'REACT_APP_API_BASE_URL が設定されていません。.env ファイルを確認してください。'
      );
      expect(config).toEqual({
        marketDataApiUrl: '',
        apiStage: 'dev',
        googleClientId: '',
        features: {
          useProxy: false,
          useMockApi: false,
          useDirectApi: true
        }
      });
    });

    it('API取得に失敗した場合はフォールバック設定を返す', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const error = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(error);

      const config = await fetchApiConfig();

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
      process.env.REACT_APP_API_BASE_URL = 'https://abc123.execute-api.us-west-2.amazonaws.com/prod';
      
      const error = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(error);

      const config = await fetchApiConfig();

      expect(config.apiStage).toBe('prod');
    });

    it('本番環境でプロキシ経由の再試行が成功する', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://abc123.execute-api.us-west-2.amazonaws.com/prod';
      
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
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Direct API failed'))
        .mockResolvedValueOnce(proxyResponse);

      const config = await fetchApiConfig();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedAxios.get).toHaveBeenNthCalledWith(1, 'https://abc123.execute-api.us-west-2.amazonaws.com/prod/config/client');
      expect(mockedAxios.get).toHaveBeenNthCalledWith(2, '/api-proxy/config/client');
      expect(config).toEqual(proxyResponse.data.data);
    });

    it('本番環境でプロキシ経由の再試行も失敗した場合はフォールバック設定を返す', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://abc123.execute-api.us-west-2.amazonaws.com/prod';
      
      // 両方のリクエストが失敗
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Direct API failed'))
        .mockRejectedValueOnce(new Error('Proxy API failed'));

      const config = await fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith('API設定の取得エラー:', 'Direct API failed');
      expect(consoleWarnSpy).toHaveBeenCalledWith('プロキシ経由でもAPI設定の取得に失敗:', 'Proxy API failed');
      expect(config.features.useProxy).toBe(true);
      expect(config.features.useDirectApi).toBe(false);
    });

    it('無効なレスポンス形式の場合はエラーを投げる', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: false,
          error: 'Invalid request'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const config = await fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith('API設定の取得エラー:', '設定の取得に失敗しました');
      expect(config.marketDataApiUrl).toBe('https://api.example.com');
    });
  });

  describe('getApiUrl', () => {
    it('API URLを正しく取得する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com/v2'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const url = await getApiUrl();

      expect(url).toBe('https://api.example.com/v2');
    });

    it('API URLが空の場合は空文字を返す', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const url = await getApiUrl();

      expect(url).toBe('');
    });
  });

  describe('getApiStage', () => {
    it('APIステージを正しく取得する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            apiStage: 'staging'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const stage = await getApiStage();

      expect(stage).toBe('staging');
    });

    it('APIステージが未設定の場合はdevを返す', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const stage = await getApiStage();

      expect(stage).toBe('dev');
    });
  });

  describe('getGoogleClientId', () => {
    it('Google Client IDを正しく取得する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            googleClientId: '123456789-abc.apps.googleusercontent.com'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const clientId = await getGoogleClientId();

      expect(clientId).toBe('123456789-abc.apps.googleusercontent.com');
    });

    it('Google Client IDが未設定の場合は空文字を返す', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const clientId = await getGoogleClientId();

      expect(clientId).toBe('');
    });
  });

  describe('getFeatureFlags', () => {
    it('機能フラグを正しく取得する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
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

      mockedAxios.get.mockResolvedValue(mockResponse);

      const features = await getFeatureFlags();

      expect(features).toEqual({
        useProxy: true,
        useMockApi: false,
        useDirectApi: false,
        enableBetaFeatures: true
      });
    });

    it('機能フラグが未設定の場合は空オブジェクトを返す', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const features = await getFeatureFlags();

      expect(features).toEqual({});
    });
  });

  describe('clearConfigCache', () => {
    it('キャッシュを正しくクリアする', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // 最初の呼び出し
      await fetchApiConfig();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // キャッシュクリア
      clearConfigCache();

      // 再度呼び出し
      await fetchApiConfig();
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('複数回呼び出してもエラーが発生しない', () => {
      expect(() => {
        clearConfigCache();
        clearConfigCache();
        clearConfigCache();
      }).not.toThrow();
    });
  });

  describe('開発環境デバッグログ', () => {
    it('開発環境でデバッグ情報を出力する', () => {
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      // モジュールを再読み込みしてデバッグログをトリガー
      delete require.cache[require.resolve('../../../services/configService')];
      require('../../../services/configService');

      expect(consoleLogSpy).toHaveBeenCalledWith('ConfigService initialization:', {
        CONFIG_ENDPOINT: 'https://api.example.com/config/client',
        REACT_APP_API_BASE_URL: 'https://api.example.com',
        NODE_ENV: 'development'
      });
    });

    it('本番環境ではデバッグ情報を出力しない', () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      // モジュールを再読み込み
      delete require.cache[require.resolve('../../../services/configService')];
      require('../../../services/configService');

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('ConfigService initialization:')
      );
    });
  });

  describe('デフォルトエクスポート', () => {
    it('全ての必要な関数をエクスポートする', () => {
      const configService = require('../../../services/configService').default;
      
      expect(configService).toHaveProperty('fetchApiConfig');
      expect(configService).toHaveProperty('getApiUrl');
      expect(configService).toHaveProperty('getApiStage');
      expect(configService).toHaveProperty('getGoogleClientId');
      expect(configService).toHaveProperty('getFeatureFlags');
      expect(configService).toHaveProperty('clearConfigCache');
      
      expect(typeof configService.fetchApiConfig).toBe('function');
      expect(typeof configService.getApiUrl).toBe('function');
      expect(typeof configService.getApiStage).toBe('function');
      expect(typeof configService.getGoogleClientId).toBe('function');
      expect(typeof configService.getFeatureFlags).toBe('function');
      expect(typeof configService.clearConfigCache).toBe('function');
    });
  });

  describe('エラーケース詳細テスト', () => {
    it('undefined レスポンスを正しく処理する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      mockedAxios.get.mockResolvedValue(undefined);

      const config = await fetchApiConfig();

      expect(config.marketDataApiUrl).toBe('https://api.example.com');
      expect(config.apiStage).toBe('dev');
    });

    it('null データレスポンスを正しく処理する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: null
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const config = await fetchApiConfig();

      expect(config.marketDataApiUrl).toBe('https://api.example.com');
    });

    it('空のデータレスポンスを正しく処理する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: null
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const config = await fetchApiConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith('API設定の取得エラー:', '設定の取得に失敗しました');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量の並行リクエストを効率的に処理する', async () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            marketDataApiUrl: 'https://api.example.com'
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      
      const promises = Array.from({ length: 100 }, () => fetchApiConfig());
      const results = await Promise.all(promises);
      
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // キャッシュにより1回のみ
    });
  });
});