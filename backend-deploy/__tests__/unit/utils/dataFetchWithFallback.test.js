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
    cacheService.get.mockResolvedValue({ ticker: 'AAPL', price: 150 });
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
});
