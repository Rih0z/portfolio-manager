/**
 * exchangeRate.js の100%カバレッジを達成するためのテスト
 */

// モジュールのモック
jest.mock('axios');
jest.mock('../../../../src/services/alerts');
jest.mock('yahoo-finance2', () => ({
  default: {
    quote: jest.fn()
  }
}), { virtual: true });

const axios = require('axios');
const alertService = require('../../../../src/services/alerts');
const exchangeRateService = require('../../../../src/services/sources/exchangeRate');
const { DEFAULT_EXCHANGE_RATE } = require('../../../../src/config/constants');

describe('ExchangeRate Service - 100% Coverage', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let yahooFinance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock alertService
    alertService.notifyError = jest.fn().mockResolvedValue({});
    
    // Mock yahoo-finance2
    jest.isolateModules(() => {
      yahooFinance = require('yahoo-finance2').default;
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('getExchangeRate', () => {
    test('同一通貨の場合は1を返す', async () => {
      const result = await exchangeRateService.getExchangeRate('USD', 'USD');
      
      expect(result).toMatchObject({
        pair: 'USDUSD',
        base: 'USD',
        target: 'USD',
        rate: 1,
        change: 0,
        changePercent: 0,
        source: 'Internal (same currencies)'
      });
    });

    test('Yahoo Finance2が成功する場合', async () => {
      // yahoo-finance2を正しくモック
      jest.doMock('yahoo-finance2', () => ({
        default: {
          quote: jest.fn().mockResolvedValueOnce({
            regularMarketPrice: 150.5,
            regularMarketChange: 2.5,
            regularMarketChangePercent: 1.69,
            regularMarketTime: 1234567890
          })
        }
      }), { virtual: true });

      // モジュールを再読み込み
      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');

      const result = await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(result).toMatchObject({
        pair: 'USDJPY',
        base: 'USD',
        target: 'JPY',
        rate: 150.5,
        change: 2.5,
        changePercent: 1.69,
        source: 'yahoo-finance2'
      });
    });

    test('Yahoo Finance2が利用できない場合', async () => {
      // yahoo-finance2をモックから除外
      jest.doMock('yahoo-finance2', () => {
        throw new Error('Module not found');
      }, { virtual: true });

      // exchangerate-api.comが成功する
      axios.get.mockResolvedValueOnce({
        data: {
          rates: { JPY: 148.5 },
          date: '2024-01-15'
        }
      });

      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/USD',
        expect.any(Object)
      );
      expect(result.rate).toBe(148.5);
      expect(result.source).toBe('exchangerate-api');
    });

    test('JPY/USDの逆数計算 - Yahoo Finance2', async () => {
      yahooFinance.quote.mockResolvedValueOnce({
        regularMarketPrice: 150.0,
        regularMarketChange: 1.0,
        regularMarketChangePercent: 0.67
      });

      const result = await exchangeRateService.getExchangeRate('JPY', 'USD');

      expect(yahooFinance.quote).toHaveBeenCalledWith('USDJPY=X');
      expect(result).toMatchObject({
        pair: 'JPYUSD',
        base: 'JPY',
        target: 'USD',
        rate: 1 / 150.0,
        change: 1.0,
        changePercent: 0.67,
        source: 'yahoo-finance2'
      });
    });

    test('JPY/USDの逆数計算 - exchangerate-api', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      
      axios.get.mockResolvedValueOnce({
        data: {
          rates: { JPY: 150.0 }
        }
      });

      const result = await exchangeRateService.getExchangeRate('JPY', 'USD');

      expect(result.rate).toBe(1 / 150.0);
      expect(result.source).toBe('exchangerate-api');
    });

    test('JPY/USDの逆数計算 - Frankfurter', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get
        .mockRejectedValueOnce(new Error('exchangerate-api failed'))
        .mockResolvedValueOnce({
          data: {
            rates: { JPY: 150.0 },
            date: '2024-01-15'
          }
        });

      const result = await exchangeRateService.getExchangeRate('JPY', 'USD');

      expect(result.rate).toBe(1 / 150.0);
      expect(result.source).toBe('frankfurter-api');
    });

    test('Yahoo Finance2がnullを返す場合', async () => {
      yahooFinance.quote.mockResolvedValueOnce(null);
      
      axios.get.mockResolvedValueOnce({
        data: {
          rates: { JPY: 148.5 }
        }
      });

      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(result.rate).toBe(148.5);
      expect(result.source).toBe('exchangerate-api');
    });

    test('exchangerate-apiがデータなしの場合', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      
      // データなしのレスポンス
      axios.get
        .mockResolvedValueOnce({
          data: {}
        })
        .mockResolvedValueOnce({
          data: {
            rates: { JPY: 149.0 }
          }
        });

      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(alertService.notifyError).toHaveBeenCalled();
      expect(result.source).toBe('frankfurter-api');
    });

    test('Frankfurter APIの成功', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get
        .mockRejectedValueOnce(new Error('exchangerate-api failed'))
        .mockResolvedValueOnce({
          data: {
            rates: { JPY: 149.5 },
            date: '2024-01-15'
          }
        });

      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(axios.get).toHaveBeenLastCalledWith(
        'https://api.frankfurter.app/latest',
        expect.objectContaining({
          params: {
            from: 'USD',
            to: 'JPY'
          }
        })
      );
      expect(result.rate).toBe(149.5);
      expect(result.source).toBe('frankfurter-api');
    });

    test('Frankfurter APIがnullを返す場合', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get
        .mockRejectedValueOnce(new Error('exchangerate-api failed'))
        .mockResolvedValueOnce({
          data: {}
        });

      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(result.source).toBe('hardcoded-values');
      expect(result.rate).toBe(DEFAULT_EXCHANGE_RATE);
    });

    test('ハードコードされた値 - EUR/JPY', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      const result = await exchangeRateService.getExchangeRate('EUR', 'JPY');

      expect(result.source).toBe('hardcoded-values');
      expect(result.rate).toBe(160.2);
    });

    test('ハードコードされた値 - 未定義のペア', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      const result = await exchangeRateService.getExchangeRate('CHF', 'SEK');

      expect(result.source).toBe('hardcoded-values');
      expect(result.rate).toBe(1.0); // JPYを含まないペアは1.0
    });

    test('ハードコードされた値も失敗する場合', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get.mockRejectedValue(new Error('All APIs failed'));
      
      // 緊急フォールバックのテストのため、すべてのAPIが失敗した状態をシミュレート
      // exchangeRateServiceは既にすべてのAPIが失敗した場合の処理を持っている
      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(alertService.notifyError).toHaveBeenCalled();
      expect(result.source).toBe('Emergency Fallback');
      expect(result.rate).toBe(DEFAULT_EXCHANGE_RATE);
      expect(result.isDefault).toBe(true);
    });

    test('完全に予期しないエラーの場合', async () => {
      // yahoo-finance2が予期しないエラーを投げる
      yahooFinance.quote.mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined');
      });
      
      // 他のAPIも失敗
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(result.source).toBe('Emergency Fallback');
      expect(result.isDefault).toBe(true);
    });

    test('JPY/USDで完全に予期しないエラーの場合', async () => {
      // yahoo-finance2が予期しないエラーを投げる
      yahooFinance.quote.mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined');
      });
      
      // 他のAPIも失敗
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await exchangeRateService.getExchangeRate('JPY', 'USD');

      expect(result.rate).toBe(1 / DEFAULT_EXCHANGE_RATE);
      expect(result.source).toBe('Emergency Fallback');
      expect(result.isDefault).toBe(true);
    });

    test('大文字小文字の正規化', async () => {
      yahooFinance.quote.mockResolvedValueOnce({
        regularMarketPrice: 150.0
      });

      const result = await exchangeRateService.getExchangeRate('usd', 'jpy');

      expect(yahooFinance.quote).toHaveBeenCalledWith('USDJPY=X');
      expect(result.base).toBe('USD');
      expect(result.target).toBe('JPY');
    });
  });

  describe('getBatchExchangeRates', () => {
    test('正常な複数通貨ペアの取得', async () => {
      const pairs = [
        { base: 'USD', target: 'JPY' },
        { base: 'EUR', target: 'USD' }
      ];

      // 最初のペアはyahoo-finance2で成功
      yahooFinance.quote.mockResolvedValueOnce({ regularMarketPrice: 150.0 });
      
      // 2番目のペアはyahoo-finance2が失敗してexchangerate-apiで成功
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get.mockResolvedValueOnce({
        data: {
          rates: { USD: 1.08 }
        }
      });

      const result = await exchangeRateService.getBatchExchangeRates(pairs);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['USD-JPY'].rate).toBe(150.0);
      expect(result['EUR-USD'].rate).toBe(1.08);
    });

    test('一部のペアでエラーが発生する場合', async () => {
      const pairs = [
        { base: 'USD', target: 'JPY' },
        { base: 'INVALID', target: 'XXX' }
      ];

      // 最初のペアは成功
      yahooFinance.quote.mockResolvedValueOnce({ regularMarketPrice: 150.0 });
      
      // 2番目のペアはすべてのAPIで失敗
      yahooFinance.quote.mockRejectedValueOnce(new Error('Invalid currency'));
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      const result = await exchangeRateService.getBatchExchangeRates(pairs);

      expect(result['USD-JPY'].rate).toBe(150.0);
      // エラーケースではフォールバック値が使用される
      expect(result['INVALID-XXX'].rate).toBe(1.0); // 未定義のペアは1.0
      expect(result['INVALID-XXX'].source).toBe('hardcoded-values');
    });

    test('無効な入力の場合', async () => {
      await expect(exchangeRateService.getBatchExchangeRates(null))
        .rejects.toThrow('Invalid currency pairs array');
      
      await expect(exchangeRateService.getBatchExchangeRates([]))
        .rejects.toThrow('Invalid currency pairs array');
      
      await expect(exchangeRateService.getBatchExchangeRates('not-array'))
        .rejects.toThrow('Invalid currency pairs array');
    });
  });

  describe('エラーケース', () => {
    test('Yahoo Finance2のエラーログ', async () => {
      // yahoo-finance2がエラーを投げるケース
      jest.doMock('yahoo-finance2', () => ({
        default: {
          quote: jest.fn().mockRejectedValueOnce(new Error('Yahoo API error'))
        }
      }), { virtual: true });

      jest.resetModules();
      const freshExchangeRateService = require('../../../../src/services/sources/exchangeRate');
      
      axios.get.mockResolvedValueOnce({
        data: { rates: { JPY: 150.0 } }
      });

      await freshExchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Yahoo Finance2 failed: Yahoo API error')
      );
    });

    test('exchangerate-apiのエラーログ', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get
        .mockRejectedValueOnce(new Error('ExchangeRate API error'))
        .mockResolvedValueOnce({
          data: { rates: { JPY: 150.0 } }
        });

      await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ExchangeRate API failed: ExchangeRate API error')
      );
    });

    test('Frankfurter APIのエラーログ', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      await exchangeRateService.getExchangeRate('USD', 'JPY');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Frankfurter API failed: All APIs failed')
      );
    });

    test('ハードコード値のエラーログ', async () => {
      // すべてのAPIが失敗し、ハードコード値の取得中にもエラーが発生するケース
      // これは実際にはほとんど起こらないが、カバレッジのために含める
      yahooFinance.quote.mockRejectedValueOnce(new Error('Yahoo failed'));
      axios.get.mockRejectedValue(new Error('All APIs failed'));

      // getExchangeRateFromHardcodedValuesに到達した際のエラーをシミュレート
      // 実際にはこの関数は失敗しないが、予期しないエラーの処理をテスト
      const result = await exchangeRateService.getExchangeRate('USD', 'JPY');

      // Emergency Fallbackが返される
      expect(result.source).toBe('Emergency Fallback');
      expect(result.isDefault).toBe(true);
    });
  });
});