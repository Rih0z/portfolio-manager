/**
 * ソーシャル共有管理フック（TanStack Query）
 *
 * socialService の共有関連関数をラップし、
 * ユーザーの共有一覧取得・作成・削除を提供する。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserSharesApi,
  createShareApi,
  deleteShareApi,
} from '../../services/socialService';

export const userShareKeys = {
  all: ['userShares'] as const,
  list: () => ['userShares', 'list'] as const,
};

export function useUserShares(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userShareKeys.list(),
    queryFn: getUserSharesApi,
    staleTime: 1 * 60 * 1000,          // 1分
    gcTime: 10 * 60 * 1000,            // 10分
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof createShareApi>[0]) =>
      createShareApi(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userShareKeys.all });
    },
  });
}

export function useDeleteShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => deleteShareApi(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userShareKeys.all });
    },
  });
}
