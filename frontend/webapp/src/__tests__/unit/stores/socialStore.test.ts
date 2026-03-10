/**
 * ソーシャルストアの単体テスト
 *
 * @file src/__tests__/unit/stores/socialStore.test.ts
 */

import { useSocialStore } from '@/stores/socialStore';
import * as socialService from '@/services/socialService';
import { getIsPremiumFromCache } from '@/hooks/queries';

vi.mock('@/services/socialService');
vi.mock('@/hooks/queries', () => ({
  getIsPremiumFromCache: vi.fn(() => false),
}));
vi.mock('@/utils/analytics', () => ({
  trackEvent: vi.fn(),
  AnalyticsEvents: {},
}));

const mockCreateShare = vi.mocked(socialService.createShareApi);
const mockDeleteShare = vi.mocked(socialService.deleteShareApi);
const mockGetUserShares = vi.mocked(socialService.getUserSharesApi);
const mockGetPeerComparison = vi.mocked(socialService.getPeerComparisonApi);

const mockShare = {
  shareId: 'share-1',
  userId: 'user-1',
  displayName: 'テストユーザー',
  ageGroup: '30s',
  allocationSnapshot: [{ category: '米国株', percentage: 60 }],
  portfolioScore: 75,
  assetCount: 5,
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2026-01-08T00:00:00Z',
};

const mockInput = {
  displayName: 'テスト',
  ageGroup: '30s',
  allocationSnapshot: [{ category: '米国株', percentage: 60 }],
  portfolioScore: 75,
  assetCount: 5,
};

describe('useSocialStore', () => {
  beforeEach(() => {
    useSocialStore.setState({
      shares: [],
      peerComparison: null,
      loading: false,
      peerLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('初期状態が正しい', () => {
    const state = useSocialStore.getState();
    expect(state.shares).toEqual([]);
    expect(state.peerComparison).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('createShareが成功した場合sharesに追加される', async () => {
    mockCreateShare.mockResolvedValue(mockShare);

    const result = await useSocialStore.getState().createShare(mockInput);

    expect(result).toEqual(mockShare);
    expect(useSocialStore.getState().shares).toContainEqual(mockShare);
  });

  it('createShareが失敗した場合nullを返す', async () => {
    mockCreateShare.mockRejectedValue(new Error('API error'));

    const result = await useSocialStore.getState().createShare(mockInput);

    expect(result).toBeNull();
    expect(useSocialStore.getState().error).toBeTruthy();
  });

  it('deleteShareが成功した場合sharesから削除される', async () => {
    useSocialStore.setState({ shares: [mockShare] });
    mockDeleteShare.mockResolvedValue(undefined);

    const result = await useSocialStore.getState().deleteShare('share-1');

    expect(result).toBe(true);
    expect(useSocialStore.getState().shares).toHaveLength(0);
  });

  it('deleteShareが失敗した場合falseを返す', async () => {
    useSocialStore.setState({ shares: [mockShare] });
    mockDeleteShare.mockRejectedValue(new Error('API error'));

    const result = await useSocialStore.getState().deleteShare('share-1');

    expect(result).toBe(false);
  });

  it('fetchUserSharesがsharesを更新する', async () => {
    mockGetUserShares.mockResolvedValue({ shares: [mockShare], limits: { maxShares: 5, currentCount: 1 } });

    await useSocialStore.getState().fetchUserShares();

    expect(useSocialStore.getState().shares).toEqual([mockShare]);
    expect(useSocialStore.getState().loading).toBe(false);
  });

  it('fetchPeerComparisonがpeerComparisonを更新する', async () => {
    const mockComparison = {
      ageGroup: '30s',
      totalParticipants: 50,
      averageAllocation: [{ category: '米国株', percentage: 55 }],
      userRank: 5,
      percentile: 90,
    };
    mockGetPeerComparison.mockResolvedValue(mockComparison);

    await useSocialStore.getState().fetchPeerComparison('30s');

    expect(useSocialStore.getState().peerComparison).toEqual(mockComparison);
  });

  it('getShareCountがshares.lengthを返す', () => {
    useSocialStore.setState({ shares: [mockShare] });
    expect(useSocialStore.getState().getShareCount()).toBe(1);
  });

  it('canCreateShareがプラン制限を反映する', () => {
    vi.mocked(getIsPremiumFromCache).mockReturnValue(false);
    useSocialStore.setState({ shares: [] });
    expect(useSocialStore.getState().canCreateShare()).toBe(true);

    useSocialStore.setState({ shares: [mockShare] });
    expect(useSocialStore.getState().canCreateShare()).toBe(false);
  });
});
