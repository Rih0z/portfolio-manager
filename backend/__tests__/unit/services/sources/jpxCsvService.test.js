const sinon = require('sinon');
const axios = require('axios');
const iconv = require('iconv-lite');
const cacheService = require('../../../../src/services/cache');
const { getJPXStockData, getBatchJPXData, getTOPIXData, fetchJPXDailyData } = require('../../../../src/services/sources/jpxCsvService');

jest.mock('../../../../src/services/cache');

describe('jpxCsvService', () => {
  let axiosStub;

  beforeEach(() => {
    axiosStub = sinon.stub(axios, 'get');
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue();
  });

  afterEach(() => {
    sinon.restore();
    jest.clearAllMocks();
  });

  describe('fetchJPXDailyData', () => {
    it('should fetch and parse JPX CSV data successfully', async () => {
      const csvContent = `コード,銘柄名,終値,前日比,前日比%
7203,トヨタ自動車,2850.5,25.0,0.88
6501,日立製作所,8950.0,-50.0,-0.56`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await fetchJPXDailyData('20240115');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        'コード': '7203',
        '銘柄名': 'トヨタ自動車',
        '終値': '2850.5'
      });
    });

    it('should handle network errors', async () => {
      axiosStub.rejects(new Error('Network error'));

      await expect(fetchJPXDailyData('20240115')).rejects.toThrow('Network error');
    });

    it('should handle encoding without iconv-lite', async () => {
      const csvContent = `Code,Name,Close
7203,Toyota,2850.5`;

      axiosStub.resolves({
        data: Buffer.from(csvContent),
        status: 200
      });

      const result = await fetchJPXDailyData('20240115');
      expect(result).toHaveLength(1);
    });
  });

  describe('getJPXStockData', () => {
    it('should fetch and parse Japanese stock data successfully', async () => {
      const csvContent = `コード,銘柄名,終値,前日比,前日比%,前日終値,始値,高値,安値,出来高
7203,トヨタ自動車,2850.5,25.0,0.88,2825.5,2830.0,2855.0,2825.0,8500000`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJPXStockData('7203');

      expect(result).toMatchObject({
        ticker: '7203',
        name: 'トヨタ自動車',
        price: 2850.5,
        change: 25.0,
        changePercent: 0.88,
        previousClose: 2825.5,
        open: 2830.0,
        dayHigh: 2855.0,
        dayLow: 2825.0,
        volume: 8500000,
        source: 'JPX CSV Data',
        currency: 'JPY',
        isStock: true,
        isMutualFund: false
      });
    });

    it('should return cached data when available', async () => {
      const cachedData = {
        ticker: '7203',
        price: 2850.5,
        source: 'JPX CSV Data (cached)'
      };

      cacheService.get.mockResolvedValue(cachedData);

      const result = await getJPXStockData('7203');

      expect(result).toEqual(cachedData);
      expect(axiosStub.called).toBe(false);
    });

    it('should handle stock not found in JPX data', async () => {
      const csvContent = `コード,銘柄名,終値
7203,トヨタ自動車,2850.5`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      await expect(getJPXStockData('9999')).rejects.toThrow('Stock 9999 not found in JPX data');
    });

    it('should handle negative price changes', async () => {
      const csvContent = `コード,銘柄名,終値,前日比,前日比%
6501,日立製作所,8950.0,-50.0,-0.56`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJPXStockData('6501');

      expect(result.change).toBe(-50.0);
      expect(result.changePercent).toBe(-0.56);
    });

    it('should handle unchanged prices', async () => {
      const csvContent = `コード,銘柄名,終値,前日比,前日比%
8001,伊藤忠商事,4500.0,0.0,0.0`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJPXStockData('8001');

      expect(result.change).toBe(0.0);
      expect(result.changePercent).toBe(0.0);
    });

    it('should handle API errors', async () => {
      axiosStub.rejects(new Error('Network error'));

      await expect(getJPXStockData('7203')).rejects.toThrow('Network error');
    });

    it('should handle special characters in company names', async () => {
      const csvContent = `コード,銘柄名,終値
9984,ソフトバンクグループ,5000.0`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJPXStockData('9984');

      expect(result.name).toBe('ソフトバンクグループ');
    });

    it('should parse all numeric fields correctly', async () => {
      const csvContent = `コード,銘柄名,終値,前日比,前日比%,前日終値,始値,高値,安値,出来高
7203,トヨタ自動車,2850.5,25.0,0.88,2825.5,2830.0,2855.0,2825.0,8500000`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJPXStockData('7203');

      expect(typeof result.price).toBe('number');
      expect(typeof result.change).toBe('number');
      expect(typeof result.changePercent).toBe('number');
      expect(typeof result.previousClose).toBe('number');
      expect(typeof result.open).toBe('number');
      expect(typeof result.dayHigh).toBe('number');
      expect(typeof result.dayLow).toBe('number');
      expect(typeof result.volume).toBe('number');
    });

    it('should handle weekend date calculation', async () => {
      // Mock date to be Sunday
      const mockDate = new Date('2024-01-14T10:00:00Z'); // Sunday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const csvContent = `コード,銘柄名,終値
7203,トヨタ自動車,2850.5`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      await getJPXStockData('7203');

      // Should request Friday's date (2024-01-12 -> 20240112)
      expect(axiosStub.called).toBe(true);
      const callArgs = axiosStub.getCall(0).args[0];
      expect(callArgs).toMatch(/20240112/);

      global.Date.mockRestore();
    });
  });

  describe('getBatchJPXData', () => {
    it('should fetch multiple stocks in one request', async () => {
      const csvContent = `コード,銘柄名,終値,前日比,前日比%
7203,トヨタ自動車,2850.5,25.0,0.88
6501,日立製作所,8950.0,-50.0,-0.56`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getBatchJPXData(['7203', '6501']);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['7203']).toMatchObject({
        ticker: '7203',
        name: 'トヨタ自動車',
        price: 2850.5
      });
      expect(result['6501']).toMatchObject({
        ticker: '6501',
        name: '日立製作所',
        price: 8950.0
      });
    });

    it('should return null for stocks not found', async () => {
      const csvContent = `コード,銘柄名,終値
7203,トヨタ自動車,2850.5`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getBatchJPXData(['7203', '9999']);

      expect(result['7203']).toBeTruthy();
      expect(result['9999']).toBeNull();
    });

    it('should handle batch API errors', async () => {
      axiosStub.rejects(new Error('API Error'));

      await expect(getBatchJPXData(['7203', '6501'])).rejects.toThrow('API Error');
    });
  });

  describe('getTOPIXData', () => {
    it('should return cached TOPIX data when available', async () => {
      const cachedData = {
        name: 'TOPIX',
        value: 2400.0,
        source: 'JPX'
      };

      cacheService.get.mockResolvedValue(cachedData);

      const result = await getTOPIXData();

      expect(result).toEqual(cachedData);
    });

    it('should fetch and cache TOPIX data when not cached', async () => {
      cacheService.get.mockResolvedValue(null);

      const result = await getTOPIXData();

      expect(result).toMatchObject({
        name: 'TOPIX',
        value: 0,
        source: 'JPX'
      });
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should handle TOPIX data errors', async () => {
      cacheService.get.mockResolvedValue(null);
      // This will test the error handling path
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getTOPIXData();

      expect(result.name).toBe('TOPIX');
      consoleSpy.mockRestore();
    });
  });
});