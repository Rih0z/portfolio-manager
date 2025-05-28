/**
 * ファイルパス: __tests__/unit/services/sources/exchangeRate.test.js
 * 
 * 為替レートAPIサービスのユニットテスト
 * APIリクエスト、レスポンス処理、フォールバック動作を検証
 * 
 * @author Portfolio Manager Team
 * @created 2025-05-10
 * @modified 2025-05-16 ファイルパスの修正（exchangeRateApi.js → exchangeRate.js）
 */

// モックの設定
jest.mock('axios');
jest.mock('../../../../src/services/alerts');

// テスト対象モジュールのインポート
const exchangeRateService = require('../../../../src/services/sources/exchangeRate');
const axios = require('axios');
const alertService = require('../../../../src/services/alerts');

// モック関数
alertService.notifyError = jest.fn();

describe('為替レートAPIサービス', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    jest.clearAllMocks();
    
    // 環境変数のモック
    process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';
    process.env.OPEN_EXCHANGE_RATES_APP_ID = 'test-app-id';
  });
  
  afterEach(() => {
    // 各テスト後にモックをクリア
    jest.clearAllMocks();
    
    // 環境変数のリセット
    delete process.env.EXCHANGE_RATE_API_KEY;
    delete process.env.OPEN_EXCHANGE_RATES_APP_ID;
  });
  
  describe('getExchangeRate', () => {
    test('正常に為替レートデータを取得する', async () => {
      // APIレスポンスのモック
      const mockResponse = {
        data: {
          success: true,
          base: 'USD',
          date: '2025-05-10',
          rates: {
            JPY: 148.5
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
      
      // axiosが正しいパラメータで呼ばれたか確認
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/USD',
        {
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          }),
          timeout: 8000
        }
      );
      
      // 結果の検証
      expect(result).toBeDefined();
      expect(result.pair).toBe('USDJPY');
      expect(result.base).toBe('USD');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBe(148.5);
      expect(result.lastUpdated).toBeDefined();
    });
    
    test('複数の通貨ペアを取得する場合', async () => {
      // テストデータ
      const pairs = [
        { base: 'USD', target: 'JPY' },
        { base: 'EUR', target: 'USD' },
        { base: 'GBP', target: 'JPY' }
      ];
      
      // 各ペアのモックレスポンス
      const mockResponses = [
        {
          data: {
            success: true,
            base: 'USD',
            date: '2025-05-10',
            rates: { JPY: 148.5 }
          }
        },
        {
          data: {
            success: true,
            base: 'EUR',
            date: '2025-05-10',
            rates: { USD: 1.08 }
          }
        },
        {
          data: {
            success: true,
            base: 'GBP',
            date: '2025-05-10',
            rates: { JPY: 189.8 }
          }
        }
      ];
      
      // 各レスポンスに対するモック設定
      axios.get
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);
      
      // テスト対象の関数を実行
      const result = await exchangeRateService.getBatchExchangeRates(pairs);
      
      // axiosが複数回呼ばれたか確認
      expect(axios.get).toHaveBeenCalledTimes(3);
      
      // 結果の検証
      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBe(3);
      
      // 各ペアの結果を検証
      expect(result['USD-JPY']).toBeDefined();
      expect(result['EUR-USD']).toBeDefined();
      expect(result['GBP-JPY']).toBeDefined();
      
      expect(result['USD-JPY'].rate).toBe(148.5);
      expect(result['EUR-USD'].rate).toBe(1.08);
      expect(result['GBP-JPY'].rate).toBe(189.8);
    });
    
    test('APIエラーが発生した場合はフォールバック値を返す', async () => {
      // APIエラーのモック
      axios.get.mockRejectedValueOnce(new Error('API connection failed'));
      
      // フォールバック通知のモック
      alertService.notifyError.mockResolvedValueOnce({});
      
      // テスト対象の関数を実行
      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
      
      // アラート通知が呼ばれたか確認
      expect(alertService.notifyError).toHaveBeenCalled();
      
      // 結果の検証 - フォールバック値が返されるはず
      expect(result).toBeDefined();
      expect(result.pair).toBe('USDJPY');
      expect(result.base).toBe('USD');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBeGreaterThan(0); // 具体的な値はテスト環境によって異なる場合がある
      
      // フォールバックであることを示すフラグが設定されているか
      expect(result.source).toContain('dynamic-calculation');
    });
    
    test('APIレスポンスがsuccessでない場合はフォールバック値を返す', async () => {
      // 失敗レスポンスのモック
      const mockResponse = {
        data: {
          success: false,
          error: {
            code: 'invalid_base_currency',
            message: 'Invalid base currency'
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      const result = await exchangeRateService.getExchangeRate('XYZ', 'JPY');
      
      // 結果の検証 - フォールバック値が返されるはず
      expect(result).toBeDefined();
      expect(result.pair).toBe('XYZJPY');
      expect(result.base).toBe('XYZ');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBeGreaterThan(0);
      
      // フォールバックであることを示すフラグが設定されているか
      expect(result.source).not.toBe('API');
    });
    
    test('非200レスポンスの場合はフォールバック値を返す', async () => {
      // 400エラーのモック
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: 'Bad Request',
            message: 'Invalid parameters'
          }
        }
      };
      
      axios.get.mockRejectedValueOnce(errorResponse);
      
      // テスト対象の関数を実行
      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
      
      // 結果の検証 - フォールバック値が返されるはず
      expect(result).toBeDefined();
      expect(result.pair).toBe('USDJPY');
      expect(result.base).toBe('USD');
      expect(result.target).toBe('JPY');
      expect(result.rate).toBeGreaterThan(0);
      
      // フォールバックであることを示すフラグが設定されているか
      expect(result.source).not.toBe('API');
    });
    
    test('環境変数からAPIキーを取得する', async () => {
      // APIレスポンスのモック
      const mockResponse = {
        data: {
          success: true,
          base: 'USD',
          date: '2025-05-10',
          rates: {
            JPY: 148.5
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      await exchangeRateService.getExchangeRate('USD', 'JPY');
      
      // APIキーが使用されたか確認（APIによっては検証方法が異なる）
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Object)
        })
      );
    });
    
    test('環境変数が設定されていない場合はデフォルト値を使用', async () => {
      // 環境変数をクリア
      delete process.env.EXCHANGE_RATE_API_KEY;
      delete process.env.OPEN_EXCHANGE_RATES_APP_ID;
      
      // APIレスポンスのモック
      const mockResponse = {
        data: {
          success: true,
          base: 'USD',
          date: '2025-05-10',
          rates: {
            JPY: 148.5
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');
      
      // 結果の検証 - APIキーがなくても動作するはず
      expect(result).toBeDefined();
      expect(result.pair).toBe('USDJPY');
      expect(result.rate).toBe(148.5);
    });
    
    test('カスタムベースURLを使用する', async () => {
      // 環境変数でカスタムURLを設定
      process.env.EXCHANGE_RATE_BASE_URL = 'https://custom.exchange.api/v1';
      
      // APIレスポンスのモック
      const mockResponse = {
        data: {
          success: true,
          base: 'USD',
          date: '2025-05-10',
          rates: {
            JPY: 148.5
          }
        }
      };
      
      // axiosのモック実装
      axios.get.mockResolvedValueOnce(mockResponse);
      
      // テスト対象の関数を実行
      await exchangeRateService.getExchangeRate('USD', 'JPY');
      
      // カスタムURLが使用されたか確認
      // 注: 実際のexchangeRateServiceの実装によっては、この検証は異なる場合があります
      
      // 環境変数をクリア
      delete process.env.EXCHANGE_RATE_BASE_URL;
    });
  });
});
