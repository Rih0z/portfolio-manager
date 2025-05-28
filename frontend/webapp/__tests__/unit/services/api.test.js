import { getApiEndpoint, fetchFundInfo, fetchDividendData, checkDataFreshness, initGoogleDriveAPI, setGoogleAccessToken, getGoogleAccessToken, saveToGoogleDrive, loadFromGoogleDrive } from '@/services/api';
import * as marketDataService from '@/services/marketDataService';

describe('api service helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_MARKET_DATA_API_URL = 'https://api.example.com';
    process.env.REACT_APP_API_STAGE = 'test';
  });

  it('getApiEndpoint returns proper urls', () => {
    expect(getApiEndpoint('market-data')).toBe('https://api.example.com/test/api/market-data');
    expect(getApiEndpoint('auth')).toBe('https://api.example.com/test/auth');
    expect(getApiEndpoint('drive')).toBe('https://api.example.com/test/drive');
    expect(getApiEndpoint('other')).toBe('https://api.example.com/test');
  });

  it('fetchFundInfo delegates to fetchTickerData', async () => {
    jest.spyOn(marketDataService, 'fetchStockData').mockResolvedValue('data');
    const result = await fetchFundInfo('1234');
    expect(marketDataService.fetchStockData).toHaveBeenCalledWith('1234');
    expect(result).toBe('data');
  });

  it('fetchDividendData delegates to fetchTickerData', async () => {
    jest.spyOn(marketDataService, 'fetchStockData').mockResolvedValue('data');
    const result = await fetchDividendData('ABC');
    expect(marketDataService.fetchStockData).toHaveBeenCalledWith('ABC');
    expect(result).toBe('data');
  });

  it('checkDataFreshness returns default response', async () => {
    await expect(checkDataFreshness()).resolves.toEqual({ success: true, fresh: true });
  });

  it('initGoogleDriveAPI returns deprecated stub functions', async () => {
    const drive = initGoogleDriveAPI();
    const save = await drive.saveFile({});
    const load = await drive.loadFile('id');
    const list = await drive.listFiles();
    expect(save).toEqual({ success: false, message: expect.any(String) });
    expect(load).toEqual({ success: false, message: expect.any(String) });
    expect(list).toEqual({ success: false, message: expect.any(String) });
  });

  it('deprecated Google Drive helpers return fallback values', async () => {
    expect(setGoogleAccessToken('token')).toBeUndefined();
    await expect(getGoogleAccessToken()).resolves.toBeNull();
    await expect(saveToGoogleDrive({}, {})).resolves.toEqual({ success: false, message: expect.any(String) });
    await expect(loadFromGoogleDrive({}, 'file')).resolves.toEqual({ success: false, message: expect.any(String) });
  });
});
