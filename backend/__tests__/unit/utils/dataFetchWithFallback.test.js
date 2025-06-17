/**
 * ファイルパス: __tests__/unit/utils/dataFetchWithFallback.test.js
 *
 * dataFetchWithFallbackユーティリティのテスト
 * キャッシュ利用、フォールバック処理、デフォルト値適用を検証する
 */

const {
  fetchDataWithFallback,
  fetchBatchDataWithFallback
} = require('../../../src/utils/dataFetchWithFallback');
const cacheService = require('../../../src/services/cache');
const alertService = require('../../../src/services/alerts');
const logger = require('../../../src/utils/logger');

jest.mock('../../../src/services/cache');
jest.mock('../../../src/services/alerts');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/retry', () => ({ sleep: jest.fn(() => Promise.resolve()) }));

describe('fetchDataWithFallback', () => {
  const defaultValues = { price: 0 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('キャッシュからデータを返す', async () => {
    cacheService.get.mockResolvedValue({ data: { ticker: 'AAPL', price: 150 } });
    const fetchFn = jest.fn();

    const result = await fetchDataWithFallback({
      symbol: 'AAPL',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues,
      cache: { time: 300 }
    });

    expect(result).toEqual({ ticker: 'AAPL', price: 150 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('データ取得成功時にキャッシュ保存して返す', async () => {
    cacheService.get.mockResolvedValue(null);
    const fetchFn = jest
      .fn()
      .mockResolvedValue({ price: 100, lastUpdated: '2025-05-01T00:00:00Z' });

    const result = await fetchDataWithFallback({
      symbol: 'MSFT',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues,
      cache: { time: 300 }
    });

    expect(fetchFn).toHaveBeenCalledWith('MSFT');
    expect(cacheService.set).toHaveBeenCalledWith(
      'US_STOCK:MSFT',
      expect.objectContaining({ ticker: 'MSFT', price: 100 }),
      300
    );
    expect(result).toEqual({
      ticker: 'MSFT',
      price: 100,
      lastUpdated: '2025-05-01T00:00:00Z'
    });
  });

  test('すべてのデータソース失敗時にデフォルト値を返す', async () => {
    cacheService.get.mockResolvedValue(null);
    const fetchFn1 = jest.fn().mockRejectedValue(new Error('fail'));
    const fetchFn2 = jest.fn().mockResolvedValue({});
    jest.spyOn(Math, 'random').mockReturnValue(0.05);

    const result = await fetchDataWithFallback({
      symbol: 'IBM',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn1, fetchFn2],
      defaultValues,
      cache: { time: 300 }
    });

    expect(fetchFn1).toHaveBeenCalled();
    expect(fetchFn2).toHaveBeenCalled();
    expect(alertService.notifyError).toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ ticker: 'IBM', price: 0, isDefault: true })
    );
    Math.random.mockRestore();
  });

  test('無効なパラメータでエラーを投げる', async () => {
    await expect(fetchDataWithFallback({})).rejects.toThrow('Invalid fetchDataWithFallback parameters');
    
    await expect(fetchDataWithFallback({
      symbol: 'AAPL',
      dataType: 'US_STOCK',
      fetchFunctions: null,
      defaultValues
    })).rejects.toThrow('Invalid fetchDataWithFallback parameters');
    
    await expect(fetchDataWithFallback({
      symbol: 'AAPL',
      dataType: 'US_STOCK',
      fetchFunctions: 'not-array',
      defaultValues
    })).rejects.toThrow('Invalid fetchDataWithFallback parameters');
  });

  test('キャッシュエラーを無視して処理を継続', async () => {
    cacheService.get.mockRejectedValue(new Error('Cache error'));
    const fetchFn = jest.fn().mockResolvedValue({ price: 100 });

    const result = await fetchDataWithFallback({
      symbol: 'AAPL',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues,
      cache: { time: 300 }
    });

    expect(fetchFn).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ticker: 'AAPL', price: 100 }));
  });

  test('キャッシュ保存エラーを無視して処理を継続', async () => {
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockRejectedValue(new Error('Cache save error'));
    const fetchFn = jest.fn().mockResolvedValue({ price: 100 });

    const result = await fetchDataWithFallback({
      symbol: 'AAPL',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues,
      cache: { time: 300 }
    });

    expect(result).toEqual(expect.objectContaining({ ticker: 'AAPL', price: 100 }));
  });

  test('refreshフラグがtrueの場合はキャッシュを無視', async () => {
    cacheService.get.mockResolvedValue({ data: { ticker: 'AAPL', price: 150 } });
    const fetchFn = jest.fn().mockResolvedValue({ price: 200 });

    const result = await fetchDataWithFallback({
      symbol: 'AAPL',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues,
      refresh: true,
      cache: { time: 300 }
    });

    expect(fetchFn).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ticker: 'AAPL', price: 200 }));
  });

  test('Math.random >= 0.1の場合はアラートを送信しない', async () => {
    cacheService.get.mockResolvedValue(null);
    const fetchFn = jest.fn().mockRejectedValue(new Error('fail'));
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // > 0.1

    await fetchDataWithFallback({
      symbol: 'IBM',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues,
      cache: { time: 300 }
    });

    expect(alertService.notifyError).not.toHaveBeenCalled();
    Math.random.mockRestore();
  });

  test('データに価格が含まれていない場合は次のソースを試す', async () => {
    cacheService.get.mockResolvedValue(null);
    const fetchFn1 = jest.fn().mockResolvedValue({}); // No price
    const fetchFn2 = jest.fn().mockResolvedValue({ price: 100 });

    const result = await fetchDataWithFallback({
      symbol: 'AAPL',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn1, fetchFn2],
      defaultValues,
      cache: { time: 300 }
    });

    expect(fetchFn1).toHaveBeenCalled();
    expect(fetchFn2).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ticker: 'AAPL', price: 100 }));
  });

  test('データの価格がNaNの場合は次のソースを試す', async () => {
    cacheService.get.mockResolvedValue(null);
    const fetchFn1 = jest.fn().mockResolvedValue({ price: NaN });
    const fetchFn2 = jest.fn().mockResolvedValue({ price: 100 });

    const result = await fetchDataWithFallback({
      symbol: 'AAPL',
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn1, fetchFn2],
      defaultValues,
      cache: { time: 300 }
    });

    expect(fetchFn1).toHaveBeenCalled();
    expect(fetchFn2).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ ticker: 'AAPL', price: 100 }));
  });
});

describe('fetchBatchDataWithFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.get.mockResolvedValue(null);
  });

  test('複数シンボルを処理して結果を返す', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ price: 100 });

    const results = await fetchBatchDataWithFallback({
      symbols: ['AAA', 'BBB'],
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues: { price: 0 },
      batchSize: 1,
      delay: 0
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(Object.keys(results)).toEqual(['AAA', 'BBB']);
  });

  test('無効なsymbolsパラメータでエラーを投げる', async () => {
    await expect(fetchBatchDataWithFallback({
      symbols: null,
      dataType: 'US_STOCK',
      fetchFunctions: [jest.fn()],
      defaultValues: { price: 0 }
    })).rejects.toThrow('Invalid symbols array');
    
    await expect(fetchBatchDataWithFallback({
      symbols: [],
      dataType: 'US_STOCK',
      fetchFunctions: [jest.fn()],
      defaultValues: { price: 0 }
    })).rejects.toThrow('Invalid symbols array');
    
    await expect(fetchBatchDataWithFallback({
      symbols: 'not-array',
      dataType: 'US_STOCK',
      fetchFunctions: [jest.fn()],
      defaultValues: { price: 0 }
    })).rejects.toThrow('Invalid symbols array');
  });

  test('無効なfetchFunctionsパラメータでエラーを投げる', async () => {
    await expect(fetchBatchDataWithFallback({
      symbols: ['AAA'],
      dataType: 'US_STOCK',
      fetchFunctions: null,
      defaultValues: { price: 0 }
    })).rejects.toThrow('Invalid fetchBatchDataWithFallback parameters');
  });

  test('キャッシュから一部データを取得し、残りを新規取得', async () => {
    // AAAはキャッシュから、BBBは新規取得
    cacheService.get.mockImplementation((key) => {
      if (key === 'US_STOCK:AAA') {
        return Promise.resolve({ data: { ticker: 'AAA', price: 150 } });
      }
      return Promise.resolve(null);
    });

    const fetchFn = jest.fn().mockResolvedValue({ price: 100 });

    const results = await fetchBatchDataWithFallback({
      symbols: ['AAA', 'BBB'],
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues: { price: 0 },
      batchSize: 10,
      delay: 0
    });

    expect(fetchFn).toHaveBeenCalledTimes(1); // BBBのみ
    expect(fetchFn).toHaveBeenCalledWith('BBB');
    expect(results.AAA).toEqual({ ticker: 'AAA', price: 150 });
    expect(results.BBB).toEqual(expect.objectContaining({ ticker: 'BBB', price: 100 }));
  });

  test('全てのデータがキャッシュから取得される場合', async () => {
    cacheService.get.mockResolvedValue({ data: { ticker: 'TEST', price: 150 } });
    const fetchFn = jest.fn();

    const results = await fetchBatchDataWithFallback({
      symbols: ['AAA', 'BBB'],
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues: { price: 0 },
      batchSize: 10,
      delay: 0
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(Object.keys(results)).toEqual(['AAA', 'BBB']);
  });

  test('refreshフラグがtrueの場合はキャッシュを無視', async () => {
    cacheService.get.mockResolvedValue({ data: { ticker: 'TEST', price: 150 } });
    const fetchFn = jest.fn().mockResolvedValue({ price: 100 });

    const results = await fetchBatchDataWithFallback({
      symbols: ['AAA'],
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues: { price: 0 },
      refresh: true,
      batchSize: 10,
      delay: 0
    });

    expect(fetchFn).toHaveBeenCalledWith('AAA');
    expect(results.AAA).toEqual(expect.objectContaining({ ticker: 'AAA', price: 100 }));
  });


  test('キャッシュチェック中のエラーを無視', async () => {
    cacheService.get.mockRejectedValue(new Error('Cache error'));
    const fetchFn = jest.fn().mockResolvedValue({ price: 100 });

    const results = await fetchBatchDataWithFallback({
      symbols: ['AAA'],
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues: { price: 0 },
      batchSize: 10,
      delay: 0
    });

    expect(fetchFn).toHaveBeenCalledWith('AAA');
    expect(results.AAA).toEqual(expect.objectContaining({ ticker: 'AAA', price: 100 }));
  });

  test('バッチサイズによる分割処理とdelay', async () => {
    const { sleep } = require('../../../src/utils/retry');
    const fetchFn = jest.fn().mockResolvedValue({ price: 100 });

    await fetchBatchDataWithFallback({
      symbols: ['AAA', 'BBB', 'CCC'],
      dataType: 'US_STOCK',
      fetchFunctions: [fetchFn],
      defaultValues: { price: 0 },
      batchSize: 2,
      delay: 100
    });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(100); // delayが呼ばれる
  });
});
