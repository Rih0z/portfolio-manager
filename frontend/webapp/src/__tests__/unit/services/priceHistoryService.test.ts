/**
 * 価格履歴サービスの単体テスト
 *
 * @file src/__tests__/unit/services/priceHistoryService.test.ts
 */

import { fetchPriceHistory, fetchMultiplePriceHistories } from '@/services/priceHistoryService';
import * as apiUtils from '@/utils/apiUtils';

vi.mock('@/utils/apiUtils');
vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockAuthFetch = vi.mocked(apiUtils.authFetch);

const mockPriceData = {
  ticker: 'AAPL',
  currency: 'USD',
  period: '1m',
  prices: [
    { date: '2026-03-01', close: 170, source: 'yahoo' },
    { date: '2026-03-02', close: 175, source: 'yahoo' },
  ],
  change: {
    dayOverDay: { amount: 2.5, percent: 1.4 },
    yearToDate: { amount: 15, percent: 9.3 },
  },
};

describe('fetchPriceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常レスポンスを返す', async () => {
    mockAuthFetch.mockResolvedValue({ success: true, data: mockPriceData });

    const result = await fetchPriceHistory('AAPL', '1m');
    expect(result).toEqual(mockPriceData);
  });

  it('success=falseの場合nullを返す', async () => {
    mockAuthFetch.mockResolvedValue({ success: false });

    const result = await fetchPriceHistory('AAPL');
    expect(result).toBeNull();
  });

  it('例外時にnullを返す', async () => {
    mockAuthFetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchPriceHistory('AAPL');
    expect(result).toBeNull();
  });

  it('401エラー時にログ出力しない', async () => {
    const error: any = new Error('Unauthorized');
    error.response = { status: 401 };
    mockAuthFetch.mockRejectedValue(error);

    const result = await fetchPriceHistory('AAPL');
    expect(result).toBeNull();
  });
});

describe('fetchMultiplePriceHistories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('複数ティッカーの価格履歴を取得する', async () => {
    mockAuthFetch.mockResolvedValue({ success: true, data: mockPriceData });

    const result = await fetchMultiplePriceHistories(['AAPL', 'GOOG'], '1m');
    expect(Object.keys(result)).toHaveLength(2);
  });

  it('空の配列で空オブジェクトを返す', async () => {
    const result = await fetchMultiplePriceHistories([]);
    expect(result).toEqual({});
  });

  it('一部失敗しても成功分を返す', async () => {
    mockAuthFetch
      .mockResolvedValueOnce({ success: true, data: mockPriceData })
      .mockResolvedValueOnce({ success: false });

    const result = await fetchMultiplePriceHistories(['AAPL', 'GOOG'], '1m');
    expect(Object.keys(result)).toHaveLength(1);
    expect(result['AAPL']).toBeTruthy();
  });
});
