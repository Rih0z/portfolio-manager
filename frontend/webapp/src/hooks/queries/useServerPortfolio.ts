/**
 * サーバーポートフォリオ同期フック（TanStack Query）
 *
 * portfolioSyncService をラップし、
 * サーバーとのポートフォリオ同期（取得・保存）を提供する。
 * バージョン管理（楽観的並行性制御）付き。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchServerPortfolio,
  saveServerPortfolio,
} from '../../services/portfolioSyncService';

export const serverPortfolioKeys = {
  all: ['serverPortfolio'] as const,
  data: () => ['serverPortfolio', 'data'] as const,
};

export function useServerPortfolio(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: serverPortfolioKeys.data(),
    queryFn: fetchServerPortfolio,
    staleTime: 5 * 60 * 1000,          // 5分
    gcTime: 30 * 60 * 1000,            // 30分
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function useSavePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      version,
    }: {
      data: Parameters<typeof saveServerPortfolio>[0];
      version: number | null;
    }) => saveServerPortfolio(data, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serverPortfolioKeys.all });
    },
    onError: (error: any) => {
      // VERSION_CONFLICT は呼び出し元でハンドリング
      if (error?.code === 'VERSION_CONFLICT') {
        queryClient.invalidateQueries({ queryKey: serverPortfolioKeys.all });
      }
    },
  });
}
