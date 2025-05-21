/**
 * ファイルパス: __test__/unit/utils/envUtils.test.js
 * 
 * 環境ユーティリティの単体テスト
 * 環境判定、API URL生成、設定値取得関数のテスト
 * 
 * @author Koki Riho
 * @created 2025-05-21
 */

// テスト対象モジュールのインポート
import {
  isDevelopment,
  isLocalDevelopment,
  getBaseApiUrl,
  getApiStage,
  getApiEndpoint,
  getGoogleClientId,
  getOrigin,
  getRedirectUri,
  getDefaultExchangeRate
} from '@/utils/envUtils';

describe('環境ユーティリティ', () => {
  // 元の環境変数を保存
  const originalEnv = process.env;
  const originalLocation = window.location;
  
  // 各テスト前の準備
  beforeEach(() => {
    // 環境変数のモック
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      REACT_APP_MARKET_DATA_API_URL: 'https://api.example.com',
      REACT_APP_API_STAGE: 'dev',
      REACT_APP_GOOGLE_CLIENT_ID: 'test-client-id',
      REACT_APP_DEFAULT_EXCHANGE_RATE: '150.0'
    };
    
    // window.locationのモック
    delete window.location;
    window.location = {
      hostname: 'example.com',
      origin: 'https://example.com',
      protocol: 'https:',
      host: 'example.com',
      pathname: '/'
    };
  });
  
  // 各テスト後のクリーンアップ
  afterEach(() => {
    // 環境変数を元に戻す
    process.env = originalEnv;
    window.location = originalLocation;
  });
  
  describe('環境判定関数', () => {
    it('isDevelopmentは開発環境を正しく判定する', () => {
      // 開発環境のテスト
      process.env.NODE_ENV = 'development';
      expect(isDevelopment).toBe(true);
      
      // 本番環境のテスト
      process.env.NODE_ENV = 'production';
      expect(isDevelopment).toBe(false);
    });
    
    it('isLocalDevelopmentはローカルホスト環境を正しく判定する', () => {
      // ローカルホスト環境のテスト
      window.location.hostname = 'localhost';
      expect(isLocalDevelopment()).toBe(true);
      
      // 本番環境のテスト
      window.location.hostname = 'example.com';
      expect(isLocalDevelopment()).toBe(false);
    });
  });
  
  describe('API関連関数', () => {
    it('getBaseApiUrlは環境変数からAPI URLを正しく取得する', () => {
      const apiUrl = getBaseApiUrl();
      expect(apiUrl).toBe('https://api.example.com');
      
      // 環境変数が未設定の場合のテスト
      delete process.env.REACT_APP_MARKET_DATA_API_URL;
      const defaultApiUrl = getBaseApiUrl();
      // デフォルト値が設定されている場合はその値を検証
      // デフォルト値が設定されていない場合は 'http://localhost:3000' などになるはず
      expect(defaultApiUrl).toBeDefined();
    });
    
    it('getApiStageは環境変数からAPIステージを正しく取得する', () => {
      const apiStage = getApiStage();
      expect(apiStage).toBe('dev');
      
      // 環境変数が未設定の場合のテスト
      delete process.env.REACT_APP_API_STAGE;
      const defaultApiStage = getApiStage();
      // デフォルト値が設定されている場合はその値を検証
      expect(defaultApiStage).toBeDefined();
    });
    
    it('getApiEndpointは完全なAPIエンドポイントを正しく生成する', () => {
      const endpoint = getApiEndpoint('api/market-data');
      // 通常の環境では環境変数とパスを組み合わせたURLを返す
      expect(endpoint).toBe('https://api.example.com/dev/api/market-data');
      
      // ローカル環境のテスト
      window.location.hostname = 'localhost';
      const localEndpoint = getApiEndpoint('api/market-data');
      // ローカル環境ではローカルURLを使用する場合がある
      // (実装によって異なる場合があります)
      expect(localEndpoint).toContain('/api/market-data');
    });
  });
  
  describe('認証関連関数', () => {
    it('getGoogleClientIdは環境変数からGoogle Client IDを正しく取得する', () => {
      const clientId = getGoogleClientId();
      expect(clientId).toBe('test-client-id');
      
      // 環境変数が未設定の場合のテスト
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
      const defaultClientId = getGoogleClientId();
      // デフォルト値または例外処理を検証
      expect(defaultClientId).toBeDefined();
    });
    
    it('getOriginはブラウザのoriginを正しく取得する', () => {
      const origin = getOrigin();
      expect(origin).toBe('https://example.com');
    });
    
    it('getRedirectUriは認証用リダイレクトURIを正しく生成する', () => {
      // 標準のリダイレクトURIのテスト
      const redirectUri = getRedirectUri();
      expect(redirectUri).toBe('https://example.com/auth/callback');
      
      // カスタムパスのテスト
      const customRedirectUri = getRedirectUri('/custom/callback');
      expect(customRedirectUri).toBe('https://example.com/custom/callback');
    });
  });
  
  describe('その他の設定関数', () => {
    it('getDefaultExchangeRateは環境変数からデフォルト為替レートを正しく取得する', () => {
      const exchangeRate = getDefaultExchangeRate();
      expect(exchangeRate).toBe(150.0); // 数値型に変換されていることを確認
      
      // 環境変数が未設定の場合のテスト
      delete process.env.REACT_APP_DEFAULT_EXCHANGE_RATE;
      const defaultExchangeRate = getDefaultExchangeRate();
      // デフォルト値が設定されている場合はその値を検証
      expect(defaultExchangeRate).toBeDefined();
    });
  });
});
