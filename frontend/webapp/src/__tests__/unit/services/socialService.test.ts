/**
 * ソーシャルサービスの単体テスト
 *
 * @file src/__tests__/unit/services/socialService.test.ts
 */

import {
  createShareApi,
  getShareApi,
  deleteShareApi,
  getUserSharesApi,
  getPeerComparisonApi,
} from '@/services/socialService';
import * as apiUtils from '@/utils/apiUtils';
import * as envUtils from '@/utils/envUtils';

vi.mock('@/utils/apiUtils');
vi.mock('@/utils/envUtils');

const mockAuthFetch = vi.mocked(apiUtils.authFetch);
const mockFetchWithRetry = vi.mocked(apiUtils.fetchWithRetry);
const mockGetApiEndpoint = vi.mocked(envUtils.getApiEndpoint);

describe('socialService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiEndpoint.mockResolvedValue('https://api.test.com/api/social');
  });

  describe('createShareApi', () => {
    it('正常にシェアを作成する', async () => {
      const mockData = { shareId: 'share-1', displayName: 'テスト' };
      mockAuthFetch.mockResolvedValue({ success: true, data: mockData });

      const result = await createShareApi({
        displayName: 'テスト',
        ageGroup: '30s',
        allocationSnapshot: [],
        portfolioScore: 75,
        assetCount: 5,
      });

      expect(result).toEqual(mockData);
    });

    it('API エラー時に例外をスローする', async () => {
      mockAuthFetch.mockResolvedValue({ success: false, error: { message: '制限超過' } });

      await expect(createShareApi({
        displayName: 'テスト',
        ageGroup: '30s',
        allocationSnapshot: [],
        portfolioScore: 75,
        assetCount: 5,
      })).rejects.toThrow('制限超過');
    });
  });

  describe('getShareApi', () => {
    it('公開シェアを取得する', async () => {
      const mockData = { shareId: 'share-1' };
      mockFetchWithRetry.mockResolvedValue({ success: true, data: mockData });

      const result = await getShareApi('share-1');
      expect(result).toEqual(mockData);
    });

    it('取得失敗時に例外をスローする', async () => {
      mockFetchWithRetry.mockResolvedValue({ success: false, error: { message: 'Not found' } });

      await expect(getShareApi('nonexistent')).rejects.toThrow('Not found');
    });
  });

  describe('deleteShareApi', () => {
    it('正常にシェアを削除する', async () => {
      mockAuthFetch.mockResolvedValue({ success: true });

      await expect(deleteShareApi('share-1')).resolves.not.toThrow();
    });

    it('削除失敗時に例外をスローする', async () => {
      mockAuthFetch.mockResolvedValue({ success: false, error: { message: '削除失敗' } });

      await expect(deleteShareApi('share-1')).rejects.toThrow('削除失敗');
    });
  });

  describe('getUserSharesApi', () => {
    it('ユーザーのシェア一覧を取得する', async () => {
      const mockData = { shares: [{ shareId: 'share-1' }] };
      mockAuthFetch.mockResolvedValue({ success: true, data: mockData });

      const result = await getUserSharesApi();
      expect(result).toEqual(mockData);
    });
  });

  describe('getPeerComparisonApi', () => {
    it('同年代比較データを取得する', async () => {
      const mockData = { ageGroup: '30s', totalParticipants: 50 };
      mockAuthFetch.mockResolvedValue({ success: true, data: mockData });

      const result = await getPeerComparisonApi('30s');
      expect(result).toEqual(mockData);
    });
  });
});
