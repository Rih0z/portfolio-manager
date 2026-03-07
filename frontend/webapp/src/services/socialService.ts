/**
 * Social Portfolio サービス
 *
 * ポートフォリオ共有・ピア比較の API 呼び出しを一元管理する。
 *
 * @file src/services/socialService.ts
 */

import { getApiEndpoint } from '../utils/envUtils';
import { authFetch, fetchWithRetry } from '../utils/apiUtils';
import type {
  SharedPortfolio,
  PeerComparison,
  UserSharesResponse,
} from '../types/social.types';

/**
 * ポートフォリオ共有を作成する
 */
export const createShareApi = async (params: {
  displayName: string;
  ageGroup: string;
  allocationSnapshot: { category: string; percentage: number }[];
  portfolioScore: number;
  assetCount: number;
}): Promise<SharedPortfolio> => {
  const endpoint = await getApiEndpoint('api/social/share');
  const response: any = await authFetch(endpoint, 'post', params);

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || '共有の作成に失敗しました');
};

/**
 * 共有ポートフォリオを取得する（公開）
 */
export const getShareApi = async (shareId: string): Promise<SharedPortfolio> => {
  const endpoint = await getApiEndpoint(`api/social/share/${shareId}`);
  const response: any = await fetchWithRetry(endpoint);

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || '共有ポートフォリオの取得に失敗しました');
};

/**
 * 共有ポートフォリオを削除する
 */
export const deleteShareApi = async (shareId: string): Promise<void> => {
  const endpoint = await getApiEndpoint(`api/social/share/${shareId}`);
  const response: any = await authFetch(endpoint, 'delete');

  if (response?.success) {
    return;
  }
  throw new Error(response?.error?.message || '共有の削除に失敗しました');
};

/**
 * ユーザーの全共有を取得する
 */
export const getUserSharesApi = async (): Promise<UserSharesResponse> => {
  const endpoint = await getApiEndpoint('api/social/shares');
  const response: any = await authFetch(endpoint, 'get');

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || '共有一覧の取得に失敗しました');
};

/**
 * ピア比較データを取得する
 */
export const getPeerComparisonApi = async (ageGroup: string): Promise<PeerComparison> => {
  const endpoint = await getApiEndpoint('api/social/compare');
  const response: any = await authFetch(endpoint, 'get', { ageGroup });

  if (response?.success && response.data) {
    return response.data;
  }
  throw new Error(response?.error?.message || 'ピア比較データの取得に失敗しました');
};
