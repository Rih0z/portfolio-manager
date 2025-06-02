/**
 * api.js のユニットテスト
 * APIエントリーポイントとエンドポイント管理のテスト
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

// marketDataServiceのモック
jest.mock('../../../services/marketDataService', () => ({
  fetchStockData: jest.fn(),
  fetchExchangeRate: jest.fn(),
  fetchMultipleStocks: jest.fn(),
  fetchApiStatus: jest.fn()
}));

// useGoogleDriveフックのモック
jest.mock('../../../hooks/useGoogleDrive', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    saveFile: jest.fn(),
    loadFile: jest.fn(),
    listFiles: jest.fn()
  }))
}));

import { 
  fetchStockData,
  fetchExchangeRate as marketFetchExchangeRate,
  fetchMultipleStocks,
  fetchApiStatus as marketFetchApiStatus
} from '../../../services/marketDataService';

describe('api service', () => {
  let originalEnv;
  let consoleWarnSpy;

  beforeEach(() => {
    // 環境変数をバックアップ
    originalEnv = process.env;
    
    // console.warnをモック
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // モックをクリア
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
    
    // console.warnモックを復元
    consoleWarnSpy.mockRestore();
  });

  describe('getApiEndpoint', () => {
    it('market-dataエンドポイントを正しく生成する（本番環境）', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';

      const endpoint = getApiEndpoint('market-data');
      expect(endpoint).toBe('https://api.example.com/prod/api/market-data');
    });

    it('authエンドポイントを正しく生成する（本番環境）', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';

      const endpoint = getApiEndpoint('auth');
      expect(endpoint).toBe('https://api.example.com/prod/auth');
    });

    it('driveエンドポイントを正しく生成する（本番環境）', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';

      const endpoint = getApiEndpoint('drive');
      expect(endpoint).toBe('https://api.example.com/prod/drive');
    });

    it('デフォルトエンドポイントを正しく生成する（本番環境）', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';

      const endpoint = getApiEndpoint('unknown');
      expect(endpoint).toBe('https://api.example.com/prod');
    });

    it('localhostの場合はステージプレフィックスを追加しない', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'http://localhost:3000';
      process.env.REACT_APP_API_STAGE = 'dev';

      const endpoint = getApiEndpoint('market-data');
      expect(endpoint).toBe('http://localhost:3000/api/market-data');
    });

    it('localhost（HTTPS）の場合もステージプレフィックスを追加しない', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://localhost:3001';
      process.env.REACT_APP_API_STAGE = 'dev';

      const endpoint = getApiEndpoint('auth');
      expect(endpoint).toBe('https://localhost:3001/auth');
    });

    it('環境変数が未設定の場合はデフォルト値を使用する', () => {
      delete process.env.REACT_APP_MARKET_DATA_API_URL;
      delete process.env.REACT_APP_API_STAGE;

      const endpoint = getApiEndpoint('market-data');
      expect(endpoint).toBe('http://localhost:3000/api/market-data');
    });

    it('API_STAGEのみ未設定の場合はデフォルト値を使用する', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      delete process.env.REACT_APP_API_STAGE;

      const endpoint = getApiEndpoint('market-data');
      expect(endpoint).toBe('https://api.example.com/dev/api/market-data');
    });
  });

  describe('市場データ関数の再エクスポート', () => {
    it('fetchTickerDataがfetchStockDataを正しく呼び出す', async () => {
      const mockData = { ticker: 'AAPL', price: 150 };
      fetchStockData.mockResolvedValue(mockData);

      const result = await fetchTickerData('AAPL');

      expect(fetchStockData).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(mockData);
    });

    it('fetchExchangeRateが正しく呼び出される', async () => {
      const mockRate = { from: 'USD', to: 'JPY', rate: 150 };
      marketFetchExchangeRate.mockResolvedValue(mockRate);

      const result = await fetchExchangeRate('USD', 'JPY');

      expect(marketFetchExchangeRate).toHaveBeenCalledWith('USD', 'JPY');
      expect(result).toEqual(mockRate);
    });

    it('fetchMultipleTickerDataがfetchMultipleStocksを正しく呼び出す', async () => {
      const mockData = [{ ticker: 'AAPL' }, { ticker: 'GOOGL' }];
      fetchMultipleStocks.mockResolvedValue(mockData);

      const result = await fetchMultipleTickerData(['AAPL', 'GOOGL']);

      expect(fetchMultipleStocks).toHaveBeenCalledWith(['AAPL', 'GOOGL']);
      expect(result).toEqual(mockData);
    });

    it('fetchApiStatusが正しく呼び出される', async () => {
      const mockStatus = { status: 'active', requests: 100 };
      marketFetchApiStatus.mockResolvedValue(mockStatus);

      const result = await fetchApiStatus();

      expect(marketFetchApiStatus).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });
  });

  describe('互換性関数', () => {
    it('fetchFundInfoは警告を出してfetchTickerDataにフォールバックする', async () => {
      const mockData = { fundId: 'TEST_FUND', value: 1000 };
      fetchStockData.mockResolvedValue(mockData);

      const result = await fetchFundInfo('TEST_FUND');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] fetchFundInfo is not implemented yet. Using fetchTickerData as fallback.'
      );
      expect(fetchStockData).toHaveBeenCalledWith('TEST_FUND');
      expect(result).toEqual(mockData);
    });

    it('fetchDividendDataは警告を出してfetchTickerDataにフォールバックする', async () => {
      const mockData = { ticker: 'AAPL', dividend: 0.25 };
      fetchStockData.mockResolvedValue(mockData);

      const result = await fetchDividendData('AAPL');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] fetchDividendData is not implemented yet. Using fetchTickerData as fallback.'
      );
      expect(fetchStockData).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(mockData);
    });

    it('checkDataFreshnessは警告を出してダミーデータを返す', async () => {
      const result = await checkDataFreshness();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] checkDataFreshness is not implemented yet.'
      );
      expect(result).toEqual({ success: true, fresh: true });
    });
  });

  describe('Google Drive API（非推奨）', () => {
    it('initGoogleDriveAPIは警告を出してダミーオブジェクトを返す', () => {
      const api = initGoogleDriveAPI();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] initGoogleDriveAPI is deprecated. Use useGoogleDrive hook instead.'
      );
      expect(api).toHaveProperty('saveFile');
      expect(api).toHaveProperty('loadFile');
      expect(api).toHaveProperty('listFiles');
      expect(typeof api.saveFile).toBe('function');
    });

    it('initGoogleDriveAPI.saveFileは警告を出して失敗を返す', async () => {
      const api = initGoogleDriveAPI();
      const result = await api.saveFile({ test: 'data' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。'
      });
    });

    it('initGoogleDriveAPI.loadFileは警告を出して失敗を返す', async () => {
      const api = initGoogleDriveAPI();
      const result = await api.loadFile('file_id');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。'
      });
    });

    it('initGoogleDriveAPI.listFilesは警告を出して失敗を返す', async () => {
      const api = initGoogleDriveAPI();
      const result = await api.listFiles();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] Using deprecated Google Drive API method. Please update your code to use useGoogleDrive hook.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。useGoogleDriveフックを使用してください。'
      });
    });
  });

  describe('非推奨の認証関数', () => {
    it('setGoogleAccessTokenは警告を出す', () => {
      setGoogleAccessToken('test_token');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] setGoogleAccessToken is deprecated. Use AuthContext methods instead.'
      );
    });

    it('getGoogleAccessTokenは警告を出してnullを返す', async () => {
      const result = await getGoogleAccessToken();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] getGoogleAccessToken is deprecated. Use AuthContext methods instead.'
      );
      expect(result).toBeNull();
    });

    it('saveToGoogleDriveは警告を出して失敗を返す', async () => {
      const result = await saveToGoogleDrive({ test: 'data' }, { user: 'test' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] saveToGoogleDrive is deprecated. Use AuthContext.saveToDrive instead.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。AuthContext.saveToDriveを使用してください。'
      });
    });

    it('loadFromGoogleDriveは警告を出して失敗を返す', async () => {
      const result = await loadFromGoogleDrive({ user: 'test' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[API] loadFromGoogleDrive is deprecated. Use AuthContext.loadFromDrive instead.'
      );
      expect(result).toEqual({
        success: false,
        message: 'この関数は非推奨です。AuthContext.loadFromDriveを使用してください。'
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('marketDataService関数のエラーを正しく伝播する', async () => {
      const error = new Error('Market data service error');
      fetchStockData.mockRejectedValue(error);

      await expect(fetchTickerData('INVALID')).rejects.toThrow('Market data service error');
    });

    it('fetchExchangeRateのエラーを正しく伝播する', async () => {
      const error = new Error('Exchange rate error');
      marketFetchExchangeRate.mockRejectedValue(error);

      await expect(fetchExchangeRate('INVALID', 'CURRENCY')).rejects.toThrow('Exchange rate error');
    });

    it('fetchMultipleTickerDataのエラーを正しく伝播する', async () => {
      const error = new Error('Multiple stocks error');
      fetchMultipleStocks.mockRejectedValue(error);

      await expect(fetchMultipleTickerData(['INVALID'])).rejects.toThrow('Multiple stocks error');
    });
  });

  describe('パフォーマンステスト', () => {
    it('複数のエンドポイント生成を効率的に処理する', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';

      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        getApiEndpoint('market-data');
        getApiEndpoint('auth');
        getApiEndpoint('drive');
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });

    it('大量の非推奨関数呼び出しを効率的に処理する', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 100 }, async () => {
        await checkDataFreshness();
        setGoogleAccessToken('token');
        await getGoogleAccessToken();
      });
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('エッジケース', () => {
    it('空文字列のエンドポイントタイプでもエラーを起こさない', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';

      const endpoint = getApiEndpoint('');
      expect(endpoint).toBe('https://api.example.com/prod');
    });

    it('undefinedのエンドポイントタイプでもエラーを起こさない', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';

      const endpoint = getApiEndpoint(undefined);
      expect(endpoint).toBe('https://api.example.com/prod');
    });

    it('nullのエンドポイントタイプでもエラーを起こさない', () => {
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';

      const endpoint = getApiEndpoint(null);
      expect(endpoint).toBe('https://api.example.com/prod');
    });

    it('空のオブジェクトを非推奨関数に渡してもエラーを起こさない', async () => {
      await expect(fetchFundInfo({})).resolves.toBeDefined();
      await expect(fetchDividendData({})).resolves.toBeDefined();
      await expect(saveToGoogleDrive({}, {})).resolves.toBeDefined();
      await expect(loadFromGoogleDrive({})).resolves.toBeDefined();
    });
  });

  describe('統合テスト', () => {
    it('全ての主要関数が正しくエクスポートされている', () => {
      expect(typeof getApiEndpoint).toBe('function');
      expect(typeof fetchTickerData).toBe('function');
      expect(typeof fetchExchangeRate).toBe('function');
      expect(typeof fetchMultipleTickerData).toBe('function');
      expect(typeof fetchApiStatus).toBe('function');
      expect(typeof fetchFundInfo).toBe('function');
      expect(typeof fetchDividendData).toBe('function');
      expect(typeof checkDataFreshness).toBe('function');
      expect(typeof initGoogleDriveAPI).toBe('function');
      expect(typeof setGoogleAccessToken).toBe('function');
      expect(typeof getGoogleAccessToken).toBe('function');
      expect(typeof saveToGoogleDrive).toBe('function');
      expect(typeof loadFromGoogleDrive).toBe('function');
    });

    it('環境に応じてエンドポイントが正しく切り替わる', () => {
      // 開発環境
      process.env.REACT_APP_MARKET_DATA_API_URL = 'http://localhost:3000';
      process.env.REACT_APP_API_STAGE = 'dev';
      expect(getApiEndpoint('auth')).toBe('http://localhost:3000/auth');

      // 本番環境
      process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
      process.env.REACT_APP_API_STAGE = 'prod';
      expect(getApiEndpoint('auth')).toBe('https://api.example.com/prod/auth');
    });
  });
});