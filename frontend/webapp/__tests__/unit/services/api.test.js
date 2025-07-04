/**
 * ファイルパス: __tests__/unit/services/api.test.js
 * 
 * API サービスの単体テスト
 * APIエンドポイント生成、マーケットデータ関連の委譲、非推奨関数の警告テスト
 * 
 * @author プロジェクトチーム
 * @created 2025-05-21
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
} from '@/services/api';
import * as marketDataService from '@/services/marketDataService';
import useGoogleDrive from '@/hooks/useGoogleDrive';

// マーケットデータサービスのモック
jest.mock('@/services/marketDataService');
// useGoogleDriveフックのモック
jest.mock('@/hooks/useGoogleDrive');

describe('api service', () => {
  const originalEnv = process.env;
  const originalConsoleWarn = console.warn;
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = jest.fn();
    process.env = { 
      ...originalEnv,
      REACT_APP_MARKET_DATA_API_URL: 'https://api.example.com',
      REACT_APP_API_STAGE: 'test'
    };
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    process.env = originalEnv;
  });

  describe('getApiEndpoint', () => {
    it('各エンドポイントタイプに対して正しいURLを返す', () => {
      expect(getApiEndpoint('market-data')).toBe('https://api.example.com/test/api/market-data');
      expect(getApiEndpoint('auth')).toBe('https://api.example.com/test/auth');
      expect(getApiEndpoint('drive')).toBe('https://api.example.com/test/drive');
      expect(getApiEndpoint('other')).toBe('https://api.example.com/test');
    });

    it('ローカル開発環境ではステージプレフィックスを追加しない', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'http://localhost:3000';
      
      expect(getApiEndpoint('market-data')).toBe('http://localhost:3000/api/market-data');
      expect(getApiEndpoint('auth')).toBe('http://localhost:3000/auth');
      expect(getApiEndpoint('drive')).toBe('http://localhost:3000/drive');
      expect(getApiEndpoint('other')).toBe('http://localhost:3000');
    });

    it('環境変数が未設定の場合はデフォルト値を使用', () => {
      delete process.env.REACT_APP_MARKET_DATA_API_URL;
      delete process.env.REACT_APP_API_STAGE;
      
      expect(getApiEndpoint('market-data')).toBe('http://localhost:3000/api/market-data');
      expect(getApiEndpoint('auth')).toBe('http://localhost:3000/auth');
    });
  });

  describe('marketDataService のエクスポート', () => {
    it('fetchTickerData が正しくエクスポートされている', () => {
      expect(fetchTickerData).toBe(marketDataService.fetchStockData);
    });

    it('fetchExchangeRate が正しくエクスポートされている', () => {
      expect(fetchExchangeRate).toBe(marketDataService.fetchExchangeRate);
    });

    it('fetchMultipleTickerData が正しくエクスポートされている', () => {
      expect(fetchMultipleTickerData).toBe(marketDataService.fetchMultipleStocks);
    });

    it('fetchApiStatus が正しくエクスポートされている', () => {
      expect(fetchApiStatus).toBe(marketDataService.fetchApiStatus);
    });
  });

  describe('仮実装の警告機能', () => {
    it('fetchFundInfo は fetchTickerData に委譲し警告を出力', async () => {
      const mockData = { ticker: '1234', price: 100 };
      marketDataService.fetchStockData.mockResolvedValue(mockData);
      
      const result = await fetchFundInfo('1234');
      
      expect(console.warn).toHaveBeenCalledWith('[API] fetchFundInfo is not implemented yet. Using fetchTickerData as fallback.');
      expect(marketDataService.fetchStockData).toHaveBeenCalledWith('1234');
      expect(result).toEqual(mockData);
    });

    it('fetchDividendData は fetchTickerData に委譲し警告を出力', async () => {
      const mockData = { ticker: 'AAPL', price: 150 };
      marketDataService.fetchStockData.mockResolvedValue(mockData);
      
      const result = await fetchDividendData('AAPL');
      
      expect(console.warn).toHaveBeenCalledWith('[API] fetchDividendData is not implemented yet. Using fetchTickerData as fallback.');
      expect(marketDataService.fetchStockData).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(mockData);
    });

    it('checkDataFreshness は警告を出力しデフォルト値を返す', async () => {
      const result = await checkDataFreshness();
      
      expect(console.warn).toHaveBeenCalledWith('[API] checkDataFreshness is not implemented yet.');
      expect(result).toEqual({ success: true, fresh: true });
    });
  });

  describe('非推奨の Google Drive API', () => {
    it('initGoogleDriveAPI は非推奨の警告を出力し、スタブオブジェクトを返す', () => {
      const driveApi = initGoogleDriveAPI();
      
      expect(console.warn).toHaveBeenCalledWith('[API] initGoogleDriveAPI is deprecated. Use useGoogleDrive hook instead.');
      expect(driveApi).toHaveProperty('saveFile');
      expect(driveApi).toHaveProperty('loadFile');
      expect(driveApi).toHaveProperty('listFiles');
    });

    it('initGoogleDriveAPI の saveFile メソッドは非推奨メッセージを返す', async () => {
      const driveApi = initGoogleDriveAPI();
      const portfolioData = { holdings: [] };
      
      const result = await driveApi.saveFile(portfolioData);
      
      expect(console.warn).toHaveBeenCalledWith('[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.');
      expect(result).toEqual({ 
        success: false, 
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。' 
      });
    });

    it('initGoogleDriveAPI の loadFile メソッドは非推奨メッセージを返す', async () => {
      const driveApi = initGoogleDriveAPI();
      
      const result = await driveApi.loadFile('file-id-123');
      
      expect(console.warn).toHaveBeenCalledWith('[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.');
      expect(result).toEqual({ 
        success: false, 
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。' 
      });
    });

    it('initGoogleDriveAPI の listFiles メソッドは非推奨メッセージを返す', async () => {
      const driveApi = initGoogleDriveAPI();
      
      const result = await driveApi.listFiles();
      
      expect(console.warn).toHaveBeenCalledWith('[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.');
      expect(result).toEqual({ 
        success: false, 
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。' 
      });
    });
  });

  describe('非推奨の認証関連関数', () => {
    it('setGoogleAccessToken は非推奨の警告を出力', () => {
      const result = setGoogleAccessToken('test-token-123');
      
      expect(console.warn).toHaveBeenCalledWith('[API] setGoogleAccessToken is deprecated. Use AuthContext methods instead.');
      expect(result).toBeUndefined();
    });

    it('getGoogleAccessToken は非推奨の警告を出力し null を返す', async () => {
      const result = await getGoogleAccessToken();
      
      expect(console.warn).toHaveBeenCalledWith('[API] getGoogleAccessToken is deprecated. Use AuthContext methods instead.');
      expect(result).toBeNull();
    });

    it('saveToGoogleDrive は非推奨の警告を出力しエラーを返す', async () => {
      const data = { test: 'data' };
      const userData = { id: 'user123' };
      const filename = 'test.json';
      
      const result = await saveToGoogleDrive(data, userData, filename);
      
      expect(console.warn).toHaveBeenCalledWith('[API] saveToGoogleDrive is deprecated. Use AuthContext.saveToDrive instead.');
      expect(result).toEqual({ 
        success: false, 
        message: 'この関数は非推奨です。AuthContext.saveToDriveを使用してください。' 
      });
    });

    it('saveToGoogleDrive はデフォルトファイル名を使用', async () => {
      const result = await saveToGoogleDrive({}, {});
      
      expect(console.warn).toHaveBeenCalledWith('[API] saveToGoogleDrive is deprecated. Use AuthContext.saveToDrive instead.');
      expect(result).toEqual({ 
        success: false, 
        message: 'この関数は非推奨です。AuthContext.saveToDriveを使用してください。' 
      });
    });

    it('loadFromGoogleDrive は非推奨の警告を出力しエラーを返す', async () => {
      const userData = { id: 'user123' };
      const filename = 'test.json';
      
      const result = await loadFromGoogleDrive(userData, filename);
      
      expect(console.warn).toHaveBeenCalledWith('[API] loadFromGoogleDrive is deprecated. Use AuthContext.loadFromDrive instead.');
      expect(result).toEqual({ 
        success: false, 
        message: 'この関数は非推奨です。AuthContext.loadFromDriveを使用してください。' 
      });
    });

    it('loadFromGoogleDrive はデフォルトファイル名を使用', async () => {
      const result = await loadFromGoogleDrive({});
      
      expect(console.warn).toHaveBeenCalledWith('[API] loadFromGoogleDrive is deprecated. Use AuthContext.loadFromDrive instead.');
      expect(result).toEqual({ 
        success: false, 
        message: 'この関数は非推奨です。AuthContext.loadFromDriveを使用してください。' 
      });
    });
  });
});
