const sinon = require('sinon');
const axios = require('axios');
const iconv = require('iconv-lite');
const { getJpxCsvData } = require('../../../../src/services/sources/jpxCsvService');

describe('jpxCsvService', () => {
  let axiosStub;

  beforeEach(() => {
    axiosStub = sinon.stub(axios, 'get');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getJpxCsvData', () => {
    it('should fetch and parse Japanese stock data successfully', async () => {
      // Mock CSV data (Shift_JIS encoded)
      const csvContent = `コード,銘柄名,市場・商品区分,33業種コード,33業種区分,17業種コード,17業種区分,規模コード,規模区分,日付,終値,前日比,騰落率（％）,前日終値,始値,高値,安値,出来高,売買代金
7203,トヨタ自動車,プライム（内国株式）,3050,輸送用機器,8,機械,7,TOPIX Large70,2024/01/15,2850.5,+25.0,+0.88,2825.5,2830.0,2855.0,2825.0,8500000,24229250000
6501,日立製作所,プライム（内国株式）,3650,電気機器,7,電機・精密,7,TOPIX Large70,2024/01/15,8950.0,-50.0,-0.56,9000.0,9010.0,9020.0,8940.0,3200000,28640000000`;

      // Convert CSV to Buffer as if it was Shift_JIS encoded
      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJpxCsvData('7203');

      expect(result).toMatchObject({
        code: '7203',
        name: 'トヨタ自動車',
        market: 'プライム（内国株式）',
        sector: '輸送用機器',
        date: '2024/01/15',
        close: 2850.5,
        change: 25.0,
        changePercent: 0.88,
        previousClose: 2825.5,
        open: 2830.0,
        high: 2855.0,
        low: 2825.0,
        volume: 8500000,
        turnover: 24229250000,
        source: 'JPX'
      });

      expect(axiosStub).toHaveBeenCalledWith(
        'https://www.jpx.co.jp/markets/statistics-equities/daily/nlsgeu000009dyq5-att/data_j.csv',
        {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': sinon.match.string
          }
        }
      );
    });

    it('should return null when stock code is not found', async () => {
      const csvContent = `コード,銘柄名,市場・商品区分,33業種コード,33業種区分,17業種コード,17業種区分,規模コード,規模区分,日付,終値,前日比,騰落率（％）,前日終値,始値,高値,安値,出来高,売買代金
7203,トヨタ自動車,プライム（内国株式）,3050,輸送用機器,8,機械,7,TOPIX Large70,2024/01/15,2850.5,+25.0,+0.88,2825.5,2830.0,2855.0,2825.0,8500000,24229250000`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJpxCsvData('9999'); // Non-existent code

      expect(result).toBeNull();
    });

    it('should handle negative price changes', async () => {
      const csvContent = `コード,銘柄名,市場・商品区分,33業種コード,33業種区分,17業種コード,17業種区分,規模コード,規模区分,日付,終値,前日比,騰落率（％）,前日終値,始値,高値,安値,出来高,売買代金
6501,日立製作所,プライム（内国株式）,3650,電気機器,7,電機・精密,7,TOPIX Large70,2024/01/15,8950.0,-50.0,-0.56,9000.0,9010.0,9020.0,8940.0,3200000,28640000000`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJpxCsvData('6501');

      expect(result.change).toBe(-50.0);
      expect(result.changePercent).toBe(-0.56);
    });

    it('should handle unchanged prices', async () => {
      const csvContent = `コード,銘柄名,市場・商品区分,33業種コード,33業種区分,17業種コード,17業種区分,規模コード,規模区分,日付,終値,前日比,騰落率（％）,前日終値,始値,高値,安値,出来高,売買代金
8001,伊藤忠商事,プライム（内国株式）,5050,卸売業,10,商社・卸売,7,TOPIX Large70,2024/01/15,5432.0,0.0,0.00,5432.0,5432.0,5445.0,5420.0,2100000,11407200000`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJpxCsvData('8001');

      expect(result.change).toBe(0.0);
      expect(result.changePercent).toBe(0.0);
    });

    it('should handle API errors', async () => {
      axiosStub.rejects(new Error('Network error'));

      await expect(getJpxCsvData('7203')).rejects.toThrow('Network error');
    });

    it('should handle empty CSV response', async () => {
      const csvContent = `コード,銘柄名,市場・商品区分,33業種コード,33業種区分,17業種コード,17業種区分,規模コード,規模区分,日付,終値,前日比,騰落率（％）,前日終値,始値,高値,安値,出来高,売買代金`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJpxCsvData('7203');

      expect(result).toBeNull();
    });

    it('should handle malformed CSV data', async () => {
      const csvContent = `Invalid CSV Format
This is not a proper CSV`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      await expect(getJpxCsvData('7203')).rejects.toThrow();
    });

    it('should retry on failure', async () => {
      const csvContent = `コード,銘柄名,市場・商品区分,33業種コード,33業種区分,17業種コード,17業種区分,規模コード,規模区分,日付,終値,前日比,騰落率（％）,前日終値,始値,高値,安値,出来高,売買代金
7203,トヨタ自動車,プライム（内国株式）,3050,輸送用機器,8,機械,7,TOPIX Large70,2024/01/15,2850.5,+25.0,+0.88,2825.5,2830.0,2855.0,2825.0,8500000,24229250000`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      
      // First call fails, second succeeds
      axiosStub.onFirstCall().rejects(new Error('Temporary error'));
      axiosStub.onSecondCall().resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJpxCsvData('7203');

      expect(result).toBeTruthy();
      expect(result.code).toBe('7203');
      expect(axiosStub).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in company names', async () => {
      const csvContent = `コード,銘柄名,市場・商品区分,33業種コード,33業種区分,17業種コード,17業種区分,規模コード,規模区分,日付,終値,前日比,騰落率（％）,前日終値,始値,高値,安値,出来高,売買代金
9984,ソフトバンクグループ,プライム（内国株式）,5250,情報・通信業,9,情報通信・サービスその他,7,TOPIX Large70,2024/01/15,7156.0,+156.0,+2.23,7000.0,7010.0,7180.0,6990.0,15000000,107340000000`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJpxCsvData('9984');

      expect(result.name).toBe('ソフトバンクグループ');
    });

    it('should parse all numeric fields correctly', async () => {
      const csvContent = `コード,銘柄名,市場・商品区分,33業種コード,33業種区分,17業種コード,17業種区分,規模コード,規模区分,日付,終値,前日比,騰落率（％）,前日終値,始値,高値,安値,出来高,売買代金
7203,トヨタ自動車,プライム（内国株式）,3050,輸送用機器,8,機械,7,TOPIX Large70,2024/01/15,2850.5,+25.0,+0.88,2825.5,2830.0,2855.0,2825.0,8500000,24229250000`;

      const shiftJisBuffer = iconv.encode(csvContent, 'Shift_JIS');
      axiosStub.resolves({
        data: shiftJisBuffer,
        status: 200
      });

      const result = await getJpxCsvData('7203');

      // Verify all numeric fields are numbers, not strings
      expect(typeof result.close).toBe('number');
      expect(typeof result.change).toBe('number');
      expect(typeof result.changePercent).toBe('number');
      expect(typeof result.previousClose).toBe('number');
      expect(typeof result.open).toBe('number');
      expect(typeof result.high).toBe('number');
      expect(typeof result.low).toBe('number');
      expect(typeof result.volume).toBe('number');
      expect(typeof result.turnover).toBe('number');
    });
  });
});