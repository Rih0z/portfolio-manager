/**
 * ScoreChangeIndicator - スコア変動通知
 *
 * ダッシュボード訪問時にスコアが変動していた場合、
 * トースト風のフロート通知を表示する。
 * ランクアップ時は特別なスタイルで強調。
 *
 * @file src/components/dashboard/ScoreChangeIndicator.tsx
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useEngagementStore } from '../../stores/engagementStore';

const ScoreChangeIndicator: React.FC = () => {
  const pendingEvents = useEngagementStore(s => s.pendingEvents);
  const dismissEvent = useEngagementStore(s => s.dismissEvent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 表示対象はスコア・ランク変動・ストリークイベントのみ（useMemoで安定化）
  // dismissEvent は配列からイベントを完全除去するため !e.dismissed チェックは不要
  const visibleEvents = useMemo(
    () => pendingEvents.filter(
      e => e.type === 'score_up' || e.type === 'rank_up' || e.type === 'streak'
    ),
    [pendingEvents]
  );

  // 5秒後に自動消去（ref でタイマー管理し、連鎖再レンダーを回避）
  useEffect(() => {
    if (visibleEvents.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const eventIds = visibleEvents.map(e => e.id);
    timerRef.current = setTimeout(() => {
      eventIds.forEach(id => dismissEvent(id));
      timerRef.current = null;
    }, 5000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visibleEvents, dismissEvent]);

  if (visibleEvents.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm" role="status" aria-live="polite">
      {visibleEvents.map(event => {
        const isRankUp = event.type === 'rank_up';
        const isStreak = event.type === 'streak';
        const bgClass = isRankUp
          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-primary-600'
          : isStreak
            ? 'bg-warning-50 dark:bg-warning-900/50 text-warning-800 dark:text-warning-200 border-warning-300 dark:border-warning-600'
            : 'bg-success-50 dark:bg-success-900/50 text-success-800 dark:text-success-200 border-success-300 dark:border-success-600';

        const iconPath = isRankUp
          ? 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
          : isStreak
            ? 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z'
            : 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';

        return (
          <div
            key={event.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-fade-in ${bgClass}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
            </svg>
            <span className="text-sm font-medium">{event.message}</span>
            <button
              onClick={() => dismissEvent(event.id)}
              className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="閉じる"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ScoreChangeIndicator;
