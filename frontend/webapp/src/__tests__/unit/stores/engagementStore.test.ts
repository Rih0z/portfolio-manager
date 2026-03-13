/**
 * engagementStore unit tests
 *
 * ストリーク（連続アクセス）、スコア変動追跡、マイルストーンイベントの
 * 全ロジックを検証する。
 *
 * @file src/__tests__/unit/stores/engagementStore.test.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useEngagementStore } from '../../../stores/engagementStore';

// --- Test helpers ---
const resetStore = () => {
  useEngagementStore.setState({
    lastVisitDate: null,
    currentStreak: 0,
    longestStreak: 0,
    totalVisits: 0,
    streakFreezeCount: 0,
    streakFreezeMonth: null,
    firstVisitDate: null,
    previousScore: null,
    previousGrade: null,
    scoreHistory: [],
    pendingEvents: [],
  });
};

describe('engagementStore', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // Initial State
  // =========================================================================
  describe('initial state', () => {
    it('should have default values', () => {
      const state = useEngagementStore.getState();
      expect(state.lastVisitDate).toBeNull();
      expect(state.currentStreak).toBe(0);
      expect(state.longestStreak).toBe(0);
      expect(state.totalVisits).toBe(0);
      expect(state.previousScore).toBeNull();
      expect(state.previousGrade).toBeNull();
      expect(state.scoreHistory).toEqual([]);
      expect(state.pendingEvents).toEqual([]);
    });
  });

  // =========================================================================
  // recordVisit
  // =========================================================================
  describe('recordVisit', () => {
    it('should record first visit with streak of 1', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0)); // 2026-03-12 10:00 ローカル
      useEngagementStore.getState().recordVisit();

      const state = useEngagementStore.getState();
      expect(state.lastVisitDate).toBe('2026-03-12');
      expect(state.currentStreak).toBe(1);
      expect(state.totalVisits).toBe(1);
    });

    it('should ignore same-day revisit', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      vi.setSystemTime(new Date(2026, 2, 12, 18, 0, 0)); // 同日18時
      useEngagementStore.getState().recordVisit();

      const state = useEngagementStore.getState();
      expect(state.totalVisits).toBe(1);
      expect(state.currentStreak).toBe(1);
    });

    it('should increment streak on consecutive day', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      vi.setSystemTime(new Date(2026, 2, 13, 10, 0, 0)); // 翌日
      useEngagementStore.getState().recordVisit();

      const state = useEngagementStore.getState();
      expect(state.currentStreak).toBe(2);
      expect(state.longestStreak).toBe(2);
      expect(state.totalVisits).toBe(2);
    });

    it('should continue streak after 1-day gap (grace period)', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0)); // 2日後（1日空き）
      useEngagementStore.getState().recordVisit();

      const state = useEngagementStore.getState();
      expect(state.currentStreak).toBe(2); // 寛容化: 1日空きOK
      expect(state.totalVisits).toBe(2);
    });

    it('should reset streak after gap of 3+ days for free user', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0)); // 3日後
      useEngagementStore.getState().recordVisit(); // isPremium=false

      const state = useEngagementStore.getState();
      expect(state.currentStreak).toBe(1); // リセット
      expect(state.totalVisits).toBe(2);
    });

    it('should use streak freeze for premium user on 3-day gap', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit(true);

      vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0)); // 3日後
      useEngagementStore.getState().recordVisit(true); // isPremium=true

      const state = useEngagementStore.getState();
      expect(state.currentStreak).toBe(2); // Freeze で継続
      expect(state.streakFreezeCount).toBe(1);

      // Freeze 使用イベントメッセージの内容検証
      const freezeEvents = state.pendingEvents.filter(e => e.type === 'streak' && e.message.includes('ストリーク保護'));
      expect(freezeEvents).toHaveLength(1);
      expect(freezeEvents[0].message).toContain('今月 1/3 回');
    });

    it('should limit streak freeze to 3 per month', () => {
      // 3回 Freeze を使い切る
      vi.setSystemTime(new Date(2026, 2, 1, 10, 0, 0));
      useEngagementStore.getState().recordVisit(true);

      vi.setSystemTime(new Date(2026, 2, 4, 10, 0, 0)); // 3日空き → Freeze 1
      useEngagementStore.getState().recordVisit(true);

      vi.setSystemTime(new Date(2026, 2, 7, 10, 0, 0)); // 3日空き → Freeze 2
      useEngagementStore.getState().recordVisit(true);

      vi.setSystemTime(new Date(2026, 2, 10, 10, 0, 0)); // 3日空き → Freeze 3
      useEngagementStore.getState().recordVisit(true);

      expect(useEngagementStore.getState().streakFreezeCount).toBe(3);

      vi.setSystemTime(new Date(2026, 2, 13, 10, 0, 0)); // 3日空き → Freeze 超過 → リセット
      useEngagementStore.getState().recordVisit(true);

      expect(useEngagementStore.getState().currentStreak).toBe(1);
    });

    it('should preserve longestStreak after reset', () => {
      // 3日連続
      vi.setSystemTime(new Date(2026, 2, 10, 10, 0, 0));
      useEngagementStore.getState().recordVisit();
      vi.setSystemTime(new Date(2026, 2, 11, 10, 0, 0));
      useEngagementStore.getState().recordVisit();
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();
      expect(useEngagementStore.getState().longestStreak).toBe(3);

      // ギャップ後にリセット
      vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      const state = useEngagementStore.getState();
      expect(state.currentStreak).toBe(1);
      expect(state.longestStreak).toBe(3); // 最長記録は保持
    });

    it('should fire streak milestone event at 7 days', () => {
      // 7日連続アクセス
      for (let day = 1; day <= 7; day++) {
        vi.setSystemTime(new Date(2026, 2, day, 10, 0, 0));
        useEngagementStore.getState().recordVisit();
      }

      const state = useEngagementStore.getState();
      expect(state.currentStreak).toBe(7);
      const streakEvents = state.pendingEvents.filter(e => e.type === 'streak');
      expect(streakEvents).toHaveLength(1);
      expect(streakEvents[0].message).toContain('7日連続');
    });

    it('should fire streak milestone at 14 days', () => {
      for (let day = 1; day <= 14; day++) {
        vi.setSystemTime(new Date(2026, 2, day, 10, 0, 0));
        useEngagementStore.getState().recordVisit();
      }

      const streakEvents = useEngagementStore.getState().pendingEvents.filter(e => e.type === 'streak');
      expect(streakEvents).toHaveLength(2);
      expect(streakEvents[1].message).toContain('14日連続');
    });

    it('should use local date, not UTC (JST midnight edge case)', () => {
      // 2026-03-13 00:30 ローカル → ローカル日付は 2026-03-13
      vi.setSystemTime(new Date(2026, 2, 13, 0, 30, 0));
      useEngagementStore.getState().recordVisit();

      expect(useEngagementStore.getState().lastVisitDate).toBe('2026-03-13');
    });
  });

  // =========================================================================
  // updateScore
  // =========================================================================
  describe('updateScore', () => {
    it('should store first score without firing events', () => {
      useEngagementStore.getState().updateScore(75, 'B');

      const state = useEngagementStore.getState();
      expect(state.previousScore).toBe(75);
      expect(state.previousGrade).toBe('B');
      expect(state.scoreHistory).toHaveLength(1);
      expect(state.scoreHistory[0]).toEqual({
        date: expect.any(String),
        score: 75,
        grade: 'B',
      });
      // 初回はイベントなし（previousScore was null）
      expect(state.pendingEvents).toHaveLength(0);
    });

    it('should fire score_up event when score increases', () => {
      useEngagementStore.getState().updateScore(60, 'C');
      useEngagementStore.getState().updateScore(75, 'B');

      const events = useEngagementStore.getState().pendingEvents;
      const scoreUp = events.filter(e => e.type === 'score_up');
      expect(scoreUp).toHaveLength(1);
      expect(scoreUp[0].message).toContain('60 → 75');
      expect(scoreUp[0].message).toContain('+15');
    });

    it('should fire rank_up event when grade improves', () => {
      useEngagementStore.getState().updateScore(60, 'C');
      useEngagementStore.getState().updateScore(80, 'A');

      const events = useEngagementStore.getState().pendingEvents;
      const rankUp = events.filter(e => e.type === 'rank_up');
      expect(rankUp).toHaveLength(1);
      expect(rankUp[0].message).toContain('C → A');
    });

    it('should NOT fire events when score decreases', () => {
      useEngagementStore.getState().updateScore(80, 'A');
      useEngagementStore.getState().updateScore(60, 'C');

      const events = useEngagementStore.getState().pendingEvents;
      expect(events.filter(e => e.type === 'score_up')).toHaveLength(0);
      // rank_up は発火しない（降格なので）
      expect(events.filter(e => e.type === 'rank_up')).toHaveLength(0);
    });

    it('should NOT fire events when score is unchanged', () => {
      useEngagementStore.getState().updateScore(75, 'B');
      useEngagementStore.getState().updateScore(75, 'B');

      expect(useEngagementStore.getState().pendingEvents).toHaveLength(0);
    });

    it('should update same-day snapshot instead of adding duplicate', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().updateScore(60, 'C');

      vi.setSystemTime(new Date(2026, 2, 12, 14, 0, 0)); // 同日
      useEngagementStore.getState().updateScore(65, 'C');

      expect(useEngagementStore.getState().scoreHistory).toHaveLength(1);
      expect(useEngagementStore.getState().scoreHistory[0].score).toBe(65);
    });

    it('should trim history to 90 days', () => {
      // 90件のスナップショットを生成
      for (let i = 0; i < 90; i++) {
        vi.setSystemTime(new Date(2026, 0, i + 1, 10, 0, 0));
        useEngagementStore.getState().updateScore(50 + i, 'B');
      }
      expect(useEngagementStore.getState().scoreHistory).toHaveLength(90);

      // 91件目 → トリミングされて90件
      vi.setSystemTime(new Date(2026, 3, 2, 10, 0, 0));
      useEngagementStore.getState().updateScore(80, 'A');

      expect(useEngagementStore.getState().scoreHistory).toHaveLength(90);
      // 最古のエントリが削除されている
      expect(useEngagementStore.getState().scoreHistory[0].score).not.toBe(50);
    });
  });

  // =========================================================================
  // addMilestoneEvent / dismissEvent / dismissAllEvents
  // =========================================================================
  describe('milestone events', () => {
    it('should add event with unique id and timestamp', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().addMilestoneEvent('goal_milestone', 'テスト到達');

      const events = useEngagementStore.getState().pendingEvents;
      expect(events).toHaveLength(1);
      expect(events[0].id).toBeDefined();
      expect(events[0].type).toBe('goal_milestone');
      expect(events[0].message).toBe('テスト到達');
      expect(events[0].timestamp).toBeGreaterThan(0);
      expect(events[0].dismissed).toBe(false);
    });

    it('should generate unique ids for multiple events', () => {
      useEngagementStore.getState().addMilestoneEvent('score_up', 'イベント1');
      useEngagementStore.getState().addMilestoneEvent('rank_up', 'イベント2');

      const events = useEngagementStore.getState().pendingEvents;
      expect(events).toHaveLength(2);
      expect(events[0].id).not.toBe(events[1].id);
    });

    it('should dismiss a specific event', () => {
      useEngagementStore.getState().addMilestoneEvent('score_up', 'イベント1');
      useEngagementStore.getState().addMilestoneEvent('rank_up', 'イベント2');

      const eventId = useEngagementStore.getState().pendingEvents[0].id;
      useEngagementStore.getState().dismissEvent(eventId);

      const remaining = useEngagementStore.getState().pendingEvents;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].type).toBe('rank_up');
    });

    it('should dismiss all events', () => {
      useEngagementStore.getState().addMilestoneEvent('score_up', 'イベント1');
      useEngagementStore.getState().addMilestoneEvent('rank_up', 'イベント2');
      useEngagementStore.getState().addMilestoneEvent('streak', 'イベント3');

      useEngagementStore.getState().dismissAllEvents();

      expect(useEngagementStore.getState().pendingEvents).toHaveLength(0);
    });

    it('should not throw when dismissing non-existent event', () => {
      expect(() => {
        useEngagementStore.getState().dismissEvent('non-existent-id');
      }).not.toThrow();
    });
  });

  // =========================================================================
  // Trial Period
  // =========================================================================
  describe('trial period', () => {
    it('should be in trial before first visit', () => {
      expect(useEngagementStore.getState().isInTrialPeriod()).toBe(true);
      expect(useEngagementStore.getState().getTrialDaysRemaining()).toBe(7);
    });

    it('should be in trial on first visit', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      expect(useEngagementStore.getState().isInTrialPeriod()).toBe(true);
      expect(useEngagementStore.getState().getTrialDaysRemaining()).toBe(7);
    });

    it('should be in trial on day 6', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      vi.setSystemTime(new Date(2026, 2, 18, 10, 0, 0)); // 6日後
      expect(useEngagementStore.getState().isInTrialPeriod()).toBe(true);
      expect(useEngagementStore.getState().getTrialDaysRemaining()).toBe(1);
    });

    it('should NOT be in trial after 7 days', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      vi.setSystemTime(new Date(2026, 2, 19, 10, 0, 0)); // 7日後
      expect(useEngagementStore.getState().isInTrialPeriod()).toBe(false);
      expect(useEngagementStore.getState().getTrialDaysRemaining()).toBe(0);
    });

    it('should record firstVisitDate on first visit', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      expect(useEngagementStore.getState().firstVisitDate).toBe('2026-03-12');
    });

    it('should not change firstVisitDate on subsequent visits', () => {
      vi.setSystemTime(new Date(2026, 2, 12, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      vi.setSystemTime(new Date(2026, 2, 13, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      expect(useEngagementStore.getState().firstVisitDate).toBe('2026-03-12');
    });
  });

  // =========================================================================
  // Persistence (partialize)
  // =========================================================================
  describe('persistence', () => {
    it('should persist streak and score data but not pendingEvents', () => {
      const store = useEngagementStore;
      const persistOptions = (store as unknown as { persist: { getOptions: () => { partialize: (s: unknown) => unknown } } }).persist?.getOptions?.();

      // partialize が存在しなければテスト失敗（条件ガードではなく明示的チェック）
      expect(persistOptions?.partialize).toBeDefined();

      const full = {
        lastVisitDate: '2026-03-12',
        currentStreak: 5,
        longestStreak: 10,
        totalVisits: 50,
        streakFreezeCount: 2,
        streakFreezeMonth: '2026-03',
        firstVisitDate: '2026-03-06',
        previousScore: 75,
        previousGrade: 'B',
        scoreHistory: [{ date: '2026-03-12', score: 75, grade: 'B' }],
        pendingEvents: [{ id: '1', type: 'score_up' as const, message: 'test', timestamp: 0, dismissed: false }],
      };
      const persisted = persistOptions!.partialize(full);

      // pendingEvents は含まれない
      expect(persisted).not.toHaveProperty('pendingEvents');
      // ストリーク・スコア・トライアルデータは含まれる
      expect(persisted).toHaveProperty('lastVisitDate');
      expect(persisted).toHaveProperty('currentStreak');
      expect(persisted).toHaveProperty('scoreHistory');
      expect(persisted).toHaveProperty('streakFreezeCount');
      expect(persisted).toHaveProperty('firstVisitDate');
    });
  });

  // =========================================================================
  // Error/Edge Path Tests
  // =========================================================================
  describe('error and edge cases', () => {
    it('should handle updateScore with very high score values', () => {
      expect(() => {
        useEngagementStore.getState().updateScore(999, 'S');
      }).not.toThrow();
      expect(useEngagementStore.getState().previousScore).toBe(999);
    });

    it('should handle updateScore with zero score', () => {
      useEngagementStore.getState().updateScore(50, 'C');
      useEngagementStore.getState().updateScore(0, 'F');
      expect(useEngagementStore.getState().previousScore).toBe(0);
      // スコア低下はイベント発火しない
      expect(useEngagementStore.getState().pendingEvents.filter(e => e.type === 'score_up')).toHaveLength(0);
    });

    it('should handle unknown grade in rank comparison', () => {
      useEngagementStore.getState().updateScore(50, 'X');
      useEngagementStore.getState().updateScore(60, 'Y');
      // gradeOrder にない場合 indexOf は -1 → rank_up は発火しない
      expect(useEngagementStore.getState().pendingEvents.filter(e => e.type === 'rank_up')).toHaveLength(0);
    });

    it('should handle streak freeze month boundary (month changes)', () => {
      // 2月末
      vi.setSystemTime(new Date(2026, 1, 28, 10, 0, 0));
      useEngagementStore.getState().recordVisit(true);

      // 3月3日（3日後 → Freeze）
      vi.setSystemTime(new Date(2026, 2, 3, 10, 0, 0));
      useEngagementStore.getState().recordVisit(true);

      const state = useEngagementStore.getState();
      expect(state.currentStreak).toBe(2);
      // 月が変わったので freezeCount はリセット後に +1 = 1
      expect(state.streakFreezeCount).toBe(1);
      expect(state.streakFreezeMonth).toBe('2026-03');
    });

    it('should record visit with negative diff gracefully (clock skew)', () => {
      // 未来の日付を先に記録
      vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      // 過去に戻った場合（時計ズレ）→ 同日判定ではない場合リセット
      vi.setSystemTime(new Date(2026, 2, 13, 10, 0, 0));
      useEngagementStore.getState().recordVisit();

      // diff = -2 → いずれの条件にも一致しない → newStreak = 1
      expect(useEngagementStore.getState().currentStreak).toBe(1);
    });

    it('should handle addMilestoneEvent called from within recordVisit (integration)', () => {
      // 7日連続アクセスで streak イベントが recordVisit 内から発火される
      for (let day = 1; day <= 7; day++) {
        vi.setSystemTime(new Date(2026, 2, day, 10, 0, 0));
        useEngagementStore.getState().recordVisit();
      }
      const events = useEngagementStore.getState().pendingEvents;
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'streak' && e.message.includes('7日連続'))).toBe(true);
    });

    it('should handle concurrent milestone events without losing any', () => {
      // score_up + rank_up を同時発生させる
      useEngagementStore.getState().updateScore(50, 'C');
      useEngagementStore.getState().updateScore(80, 'A');

      const events = useEngagementStore.getState().pendingEvents;
      expect(events.filter(e => e.type === 'score_up')).toHaveLength(1);
      expect(events.filter(e => e.type === 'rank_up')).toHaveLength(1);
    });
  });
});
