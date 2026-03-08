/**
 * 通知・アラートルール管理フック（TanStack Query）
 *
 * notificationService の各関数をラップし、
 * 通知一覧・アラートルールCRUDを提供する。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../services/notificationService';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit?: number) => ['notifications', 'list', limit] as const,
  alertRules: () => ['notifications', 'alertRules'] as const,
};

export function useNotifications(limit: number = 20, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: () => fetchNotifications(limit),
    staleTime: 5 * 60 * 1000,        // 5分
    gcTime: 15 * 60 * 1000,          // 15分
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function useAlertRules(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.alertRules(),
    queryFn: fetchAlertRules,
    staleTime: 10 * 60 * 1000,       // 10分
    gcTime: 30 * 60 * 1000,          // 30分
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rule: Parameters<typeof createAlertRule>[0]) =>
      createAlertRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.alertRules() });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, updates }: { ruleId: string; updates: Parameters<typeof updateAlertRule>[1] }) =>
      updateAlertRule(ruleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.alertRules() });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => deleteAlertRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.alertRules() });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
