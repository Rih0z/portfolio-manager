/**
 * api.js のテストファイル
 * APIエントリーポイントの包括的テスト
 */

import {
  getApiEndpoint,
  fetchTickerData,
  fetchExchangeRate,
  fetchMultipleTickerData,
  fetchApiStatus,
  fetchFundInfo,
  fetchDividendData,
  checkDataFreshness,
  initGoogleDriveAPI,
  setGoogleAccessToken,
  getGoogleAccessToken,
  saveToGoogleDrive,
  loadFromGoogleDrive
} from '../../../services/api';

import * as marketDataService from '../../../services/marketDataService';

// モック
jest.mock('../../../services/marketDataService', () => ({
  fetchStockData: jest.fn(),
  fetchExchangeRate: jest.fn(),
  fetchMultipleStocks: jest.fn(),
  fetchApiStatus: jest.fn()
}));

jest.mock('../../../hooks/useGoogleDrive', () => ({
  default: jest.fn()
}));

// 環境変数のモック
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    REACT_APP_MARKET_DATA_API_URL: 'https://api.example.com',
    REACT_APP_API_STAGE: 'prod'
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// console.warnのモック
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});

describe('api.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApiEndpoint', () => {
    test('market-dataタイプのエンドポイントを生成する', () => {
      const endpoint = getApiEndpoint('market-data');
      expect(endpoint).toBe('https://api.example.com/prod/api/market-data');
    });

    test('authタイプのエンドポイントを生成する', () => {
      const endpoint = getApiEndpoint('auth');
      expect(endpoint).toBe('https://api.example.com/prod/auth');
    });

    test('driveタイプのエンドポイントを生成する', () => {
      const endpoint = getApiEndpoint('drive');
      expect(endpoint).toBe('https://api.example.com/prod/drive');
    });

    test('デフォルトのエンドポイントを生成する', () => {
      const endpoint = getApiEndpoint('unknown');
      expect(endpoint).toBe('https://api.example.com/prod');
    });

    test('ローカル開発環境ではステージプレフィックスを追加しない', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'http://localhost:3000';
      
      const endpoint = getApiEndpoint('market-data');
      expect(endpoint).toBe('http://localhost:3000/api/market-data');
      
      // 環境変数を戻す
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
    });

    test('API_STAGEが設定されていない場合はdevを使用する', () => {
      delete process.env.REACT_APP_API_STAGE;
      
      const endpoint = getApiEndpoint('market-data');
      expect(endpoint).toBe('https://api.example.com/dev/api/market-data');
      
      // 環境変数を戻す
      process.env.REACT_APP_API_STAGE = 'prod';
    });
  });

  describe('市場データ関数のエクスポート', () => {
    test('fetchTickerDataが正しくエクスポートされている', async () => {
      const mockData = { ticker: 'AAPL', price: 100 };
      marketDataService.fetchStockData.mockResolvedValue(mockData);
      
      const result = await fetchTickerData('AAPL');
      
      expect(marketDataService.fetchStockData).toHaveBeenCalledWith('AAPL');
      expect(result).toBe(mockData);
    });

    test('fetchExchangeRateが正しくエクスポートされている', async () => {
      const mockData = { rate: 150 };
      marketDataService.fetchExchangeRate.mockResolvedValue(mockData);
      
      const result = await fetchExchangeRate();
      
      expect(marketDataService.fetchExchangeRate).toHaveBeenCalled();
      expect(result).toBe(mockData);
    });

    test('fetchMultipleTickerDataが正しくエクスポートされている', async () => {
      const mockData = [
        { ticker: 'AAPL', price: 100 },
        { ticker: 'GOOGL', price: 200 }
      ];
      marketDataService.fetchMultipleStocks.mockResolvedValue(mockData);
      
      const result = await fetchMultipleTickerData(['AAPL', 'GOOGL']);
      
      expect(marketDataService.fetchMultipleStocks).toHaveBeenCalledWith(['AAPL', 'GOOGL']);
      expect(result).toBe(mockData);
    });

    test('fetchApiStatusが正しくエクスポートされている', async () => {
      const mockData = { status: 'healthy' };
      marketDataService.fetchApiStatus.mockResolvedValue(mockData);
      
      const result = await fetchApiStatus();
      
      expect(marketDataService.fetchApiStatus).toHaveBeenCalled();
      expect(result).toBe(mockData);
    });
  });

  describe('互換性のための仮実装', () => {
    test('fetchFundInfoはfetchTickerDataを呼び出す', async () => {
      const mockData = { ticker: 'FUND001', price: 10000 };
      marketDataService.fetchStockData.mockResolvedValue(mockData);
      
      const result = await fetchFundInfo('FUND001');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] fetchFundInfo is not implemented yet. Using fetchTickerData as fallback.'
      );
      expect(marketDataService.fetchStockData).toHaveBeenCalledWith('FUND001');
      expect(result).toBe(mockData);
    });

    test('fetchDividendDataはfetchTickerDataを呼び出す', async () => {
      const mockData = { ticker: '7203', price: 2000 };
      marketDataService.fetchStockData.mockResolvedValue(mockData);
      
      const result = await fetchDividendData('7203');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] fetchDividendData is not implemented yet. Using fetchTickerData as fallback.'
      );
      expect(marketDataService.fetchStockData).toHaveBeenCalledWith('7203');
      expect(result).toBe(mockData);
    });

    test('checkDataFreshnessは成功を返す', async () => {
      const result = await checkDataFreshness();
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] checkDataFreshness is not implemented yet.'
      );
      expect(result).toEqual({ success: true, fresh: true });
    });
  });

  describe('Google Drive API互換性関数', () => {
    test('initGoogleDriveAPIは非推奨警告を出力する', () => {
      const driveApi = initGoogleDriveAPI();
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] initGoogleDriveAPI is deprecated. Use useGoogleDrive hook instead.'
      );
      expect(driveApi).toHaveProperty('saveFile');
      expect(driveApi).toHaveProperty('loadFile');
      expect(driveApi).toHaveProperty('listFiles');
    });

    test('saveFileメソッドは非推奨メッセージを返す', async () => {
      const driveApi = initGoogleDriveAPI();
      const portfolioData = { assets: [] };
      
      const result = await driveApi.saveFile(portfolioData);
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。'
      });
    });

    test('loadFileメソッドは非推奨メッセージを返す', async () => {
      const driveApi = initGoogleDriveAPI();
      
      const result = await driveApi.loadFile('file123');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。'
      });
    });

    test('listFilesメソッドは非推奨メッセージを返す', async () => {
      const driveApi = initGoogleDriveAPI();
      
      const result = await driveApi.listFiles();
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。'
      });
    });
  });

  describe('非推奨の認証関数', () => {
    test('setGoogleAccessTokenは非推奨警告を出力する', () => {
      setGoogleAccessToken('test-token');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] setGoogleAccessToken is deprecated. Use AuthContext methods instead.'
      );
    });

    test('getGoogleAccessTokenはnullを返す', async () => {
      const result = await getGoogleAccessToken();
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] getGoogleAccessToken is deprecated. Use AuthContext methods instead.'
      );
      expect(result).toBeNull();
    });

    test('saveToGoogleDriveは非推奨メッセージを返す', async () => {
      const data = { test: 'data' };
      const userData = { id: 'user123' };
      
      const result = await saveToGoogleDrive(data, userData, 'test.json');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] saveToGoogleDrive is deprecated. Use AuthContext.saveToDrive instead.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。AuthContext.saveToDriveを使用してください。'
      });
    });

    test('loadFromGoogleDriveは非推奨メッセージを返す', async () => {
      const userData = { id: 'user123' };
      
      const result = await loadFromGoogleDrive(userData, 'test.json');
      
      expect(console.warn).toHaveBeenCalledWith(
        '[API] loadFromGoogleDrive is deprecated. Use AuthContext.loadFromDrive instead.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。AuthContext.loadFromDriveを使用してください。'
      });
    });

    test('saveToGoogleDriveはデフォルトファイル名を使用する', async () => {
      const data = { test: 'data' };
      const userData = { id: 'user123' };
      
      const result = await saveToGoogleDrive(data, userData);
      
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。AuthContext.saveToDriveを使用してください。'
      });
    });

    test('loadFromGoogleDriveはデフォルトファイル名を使用する', async () => {
      const userData = { id: 'user123' };
      
      const result = await loadFromGoogleDrive(userData);
      
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。AuthContext.loadFromDriveを使用してください。'
      });
    });
  });

  describe('環境変数のデフォルト値', () => {
    test('MARKET_DATA_API_URLのデフォルト値を使用する', () => {
      delete process.env.REACT_APP_MARKET_DATA_API_URL;
      
      // モジュールを再インポートして環境変数の変更を反映
      jest.resetModules();
      const { getApiEndpoint: getApiEndpointNew } = require('../../../services/api');
      
      const endpoint = getApiEndpointNew('market-data');
      expect(endpoint).toBe('http://localhost:3000/api/market-data');
      
      // 環境変数を戻す
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
    });
  });
});