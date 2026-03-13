/**
 * StreakBadge - 連続アクセスバッジ
 *
 * ダッシュボード上部に表示。連続アクセス日数と
 * 最長記録を表示する。日次訪問のドーパミントリガー。
 *
 * @file src/components/dashboard/StreakBadge.tsx
 */
import React, { useEffect, useRef } from 'react';
import { useEngagementStore } from '../../stores/engagementStore';
import { useIsPremium } from '../../hooks/queries';

const StreakBadge: React.FC = () => {
  const { currentStreak, longestStreak, recordVisit } = useEngagementStore();
  const isPremium = useIsPremium();
  const hasRecorded = useRef(false);

  // ダッシュボード表示時に訪問記録（1回のみ。isPremium の非同期変更で再発火しない）
  useEffect(() => {
    if (hasRecorded.current) return;
    hasRecorded.current = true;
    recordVisit(isPremium);
  }, [recordVisit, isPremium]);

  if (currentStreak < 2) return null;

  return (
    <div
      data-testid="streak-badge"
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/20 text-sm"
    >
      <svg className="w-4 h-4 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
      <span className="font-semibold text-warning-700 dark:text-warning-400 font-mono tabular-nums">
        {currentStreak}日連続
      </span>
      {longestStreak > currentStreak && (
        <span className="text-xs text-muted-foreground ml-1">
          (最長 {longestStreak}日)
        </span>
      )}
    </div>
  );
};

export default StreakBadge;
