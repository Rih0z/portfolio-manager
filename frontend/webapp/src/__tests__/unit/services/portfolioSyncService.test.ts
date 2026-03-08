/**
 * ポートフォリオ同期サービスの単体テスト
 *
 * @file src/__tests__/unit/services/portfolioSyncService.test.ts
 */

import { fetchServerPortfolio, saveServerPortfolio } from '@/services/portfolioSyncService';
import * as apiUtils from '@/utils/apiUtils';

vi.mock('@/utils/apiUtils');
vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const mockAuthFetch = vi.mocked(apiUtils.authFetch);

const mockPortfolio = {
  currentAssets: [{ ticker: 'AAPL', name: 'Apple', price: 175, holdings: 10, currency: 'USD' }],
  targetPortfolio: [{ category: '米国株', targetPercentage: 50 }],
  baseCurrency: 'USD',
  exchangeRate: { rate: 150, source: 'yahoo', timestamp: '2026-03-01' },
  additionalBudget: { amount: 1000, currency: 'USD' },
  aiPromptTemplate: null,
  version: 1,
  updatedAt: '2026-03-01T00:00:00Z',
};

describe('portfolioSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchServerPortfolio', () => {
    it('サーバーからポートフォリオを取得する', async () => {
      mockAuthFetch.mockResolvedValue({ success: true, data: mockPortfolio });

      const result = await fetchServerPortfolio();
      expect(result).toEqual(mockPortfolio);
      expect(result!.version).toBe(1);
    });

    it('success=falseでnullを返す', async () => {
      mockAuthFetch.mockResolvedValue({ success: false });

      const result = await fetchServerPortfolio();
      expect(result).toBeNull();
    });

    it('401エラー時にnullを返す', async () => {
      const error: any = new Error('Unauthorized');
      error.response = { status: 401 };
      mockAuthFetch.mockRejectedValue(error);

      const result = await fetchServerPortfolio();
      expect(result).toBeNull();
    });

    it('非401エラー時にスローする', async () => {
      const error: any = new Error('Server error');
      error.response = { status: 500 };
      mockAuthFetch.mockRejectedValue(error);

      await expect(fetchServerPortfolio()).rejects.toThrow('Server error');
    });
  });

  describe('saveServerPortfolio', () => {
    it('ポートフォリオを保存し結果を返す', async () => {
      const saveResult = { version: 2, updatedAt: '2026-03-02T00:00:00Z' };
      mockAuthFetch.mockResolvedValue({ success: true, data: saveResult });

      const result = await saveServerPortfolio(
        {
          currentAssets: mockPortfolio.currentAssets,
          targetPortfolio: mockPortfolio.targetPortfolio,
          baseCurrency: 'USD',
          exchangeRate: mockPortfolio.exchangeRate,
          additionalBudget: mockPortfolio.additionalBudget,
          aiPromptTemplate: null,
        },
        1
      );

      expect(result.version).toBe(2);
    });

    it('バージョンコンフリクト時にVERSION_CONFLICTエラーをスローする', async () => {
      mockAuthFetch.mockResolvedValue({
        success: false,
        error: { code: 'VERSION_CONFLICT', message: 'Conflict', details: { serverVersion: 3 } },
      });

      try {
        await saveServerPortfolio(
          { currentAssets: [], targetPortfolio: [], baseCurrency: 'USD' },
          1
        );
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('VERSION_CONFLICT');
        expect(e.code).toBe('VERSION_CONFLICT');
        expect(e.serverVersion).toBe(3);
      }
    });

    it('一般エラー時に例外をスローする', async () => {
      mockAuthFetch.mockResolvedValue({
        success: false,
        error: { message: 'Server error' },
      });

      await expect(
        saveServerPortfolio(
          { currentAssets: [], targetPortfolio: [], baseCurrency: 'USD' },
          1
        )
      ).rejects.toThrow('Server error');
    });
  });
});
