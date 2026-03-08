/**
 * NPS（Net Promoter Score）調査の表示ロジック
 *
 * 表示条件:
 *  1. ユーザーが認証済み
 *  2. 初回ログインから7日以上経過
 *  3. 前回NPS回答から90日以上、またはdismissから30日以上
 *  4. 1セッション中は1回のみ
 *
 * @file src/hooks/useNPSSurvey.ts
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';

const STORAGE_KEYS = {
  LAST_SUBMITTED: 'pfwise_nps_last_submitted',
  LAST_DISMISSED: 'pfwise_nps_last_dismissed',
  FIRST_LOGIN: 'pfwise_nps_first_login',
} as const;

const DAYS_BEFORE_FIRST_SHOW = 7;
const DAYS_BETWEEN_SUBMITS = 90;
const DAYS_BETWEEN_DISMISSES = 30;

export type NPSCategory = 'promoter' | 'passive' | 'detractor';

export const getNPSCategory = (score: number): NPSCategory => {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
};

const getStoredTimestamp = (key: string): number | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? parseInt(value, 10) : null;
  } catch {
    return null;
  }
};

const setStoredTimestamp = (key: string, value: number): void => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // localStorage unavailable
  }
};

const daysSince = (timestamp: number): number => {
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
};

export interface UseNPSSurveyReturn {
  shouldShow: boolean;
  submit: (score: number, comment?: string) => void;
  dismiss: () => void;
}

export const useNPSSurvey = (): UseNPSSurveyReturn => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [shouldShow, setShouldShow] = useState(false);
  const sessionChecked = useRef(false);

  useEffect(() => {
    if (sessionChecked.current || !isAuthenticated) return;
    sessionChecked.current = true;

    // 初回ログイン日を記録
    const firstLogin = getStoredTimestamp(STORAGE_KEYS.FIRST_LOGIN);
    if (!firstLogin) {
      setStoredTimestamp(STORAGE_KEYS.FIRST_LOGIN, Date.now());
      return; // 初回なので表示しない
    }

    // 初回ログインから7日未満なら表示しない
    if (daysSince(firstLogin) < DAYS_BEFORE_FIRST_SHOW) return;

    // 前回回答から90日未満なら表示しない
    const lastSubmitted = getStoredTimestamp(STORAGE_KEYS.LAST_SUBMITTED);
    if (lastSubmitted && daysSince(lastSubmitted) < DAYS_BETWEEN_SUBMITS) return;

    // 前回dismissから30日未満なら表示しない
    const lastDismissed = getStoredTimestamp(STORAGE_KEYS.LAST_DISMISSED);
    if (lastDismissed && daysSince(lastDismissed) < DAYS_BETWEEN_DISMISSES) return;

    setShouldShow(true);
  }, [isAuthenticated]);

  const submit = useCallback((score: number, comment?: string) => {
    const category = getNPSCategory(score);
    setStoredTimestamp(STORAGE_KEYS.LAST_SUBMITTED, Date.now());
    setShouldShow(false);

    trackEvent(AnalyticsEvents.NPS_SUBMIT, {
      score,
      category,
      comment_length: comment?.length || 0,
    });
  }, []);

  const dismiss = useCallback(() => {
    setStoredTimestamp(STORAGE_KEYS.LAST_DISMISSED, Date.now());
    setShouldShow(false);

    trackEvent(AnalyticsEvents.NPS_DISMISS);
  }, []);

  return { shouldShow, submit, dismiss };
};
