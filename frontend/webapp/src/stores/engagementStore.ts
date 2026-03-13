/**
 * EngagementStore - エンゲージメント追跡
 *
 * ストリーク（連続アクセス）、スコア変動履歴、
 * 目標マイルストーン到達を追跡する。
 *
 * @file src/stores/engagementStore.ts
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ScoreSnapshot {
  date: string;
  score: number;
  grade: string;
}

interface MilestoneEvent {
  id: string;
  type: 'score_up' | 'rank_up' | 'goal_milestone' | 'goal_achieved' | 'streak';
  message: string;
  timestamp: number;
  dismissed: boolean;
}

/** 初回トライアル期間（日数） */
const TRIAL_DURATION_DAYS = 7;
/** トライアル中の銘柄上限 */
export const TRIAL_MAX_HOLDINGS = 10;

interface EngagementState {
  // ストリーク
  lastVisitDate: string | null;
  currentStreak: number;
  longestStreak: number;
  totalVisits: number;
  streakFreezeCount: number;      // 今月のFreeze使用回数
  streakFreezeMonth: string | null; // Freeze使用月（YYYY-MM）

  // 初回トライアル
  firstVisitDate: string | null;  // 初回訪問日（トライアル開始日）

  // スコア履歴
  previousScore: number | null;
  previousGrade: string | null;
  scoreHistory: ScoreSnapshot[];

  // マイルストーンイベント（未消化分）
  pendingEvents: MilestoneEvent[];

  // アクション
  recordVisit: (isPremium?: boolean) => void;
  updateScore: (score: number, grade: string) => void;
  addMilestoneEvent: (type: MilestoneEvent['type'], message: string) => void;
  dismissEvent: (id: string) => void;
  dismissAllEvents: () => void;

  // 読み取り専用
  isInTrialPeriod: () => boolean;
  getTrialDaysRemaining: () => number;
}

/**
 * ローカルタイムゾーンの ISO 日付文字列を返す（YYYY-MM-DD）
 * ※ toISOString() は UTC を返すため使用禁止
 */
const toLocalDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 2つのローカル日付文字列 (YYYY-MM-DD) の差分日数
 * ローカル正午を基準にすることで DST 境界の端数問題を回避
 * （`T12:00:00` はタイムゾーン指定なしのためローカル時間として解釈される）
 */
const daysBetween = (a: string, b: string): number => {
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
};

export const useEngagementStore = create<EngagementState>()(
  persist(
    (set, get) => ({
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

      recordVisit: (isPremium = false) => {
        const today = toLocalDateString();
        const { lastVisitDate, currentStreak, longestStreak, totalVisits, streakFreezeCount, streakFreezeMonth } = get();

        // 同日再訪問は無視
        if (lastVisitDate === today) return;

        let newStreak = 1;
        let newFreezeCount = streakFreezeCount;
        let newFreezeMonth = streakFreezeMonth;

        // 月が変わったら Freeze カウントをリセット
        const currentMonth = today.slice(0, 7);
        if (newFreezeMonth !== currentMonth) {
          newFreezeCount = 0;
          newFreezeMonth = currentMonth;
        }

        if (lastVisitDate) {
          const diff = daysBetween(lastVisitDate, today);
          if (diff === 1) {
            // 連続日
            newStreak = currentStreak + 1;
          } else if (diff === 0) {
            // 安全弁: daysBetween の丸め誤差で 0 が返る理論上のエッジケース用
            // （通常は L108 の同日チェックで先に return するため到達しない）
            return;
          } else if (diff === 2) {
            // 1日空き — 全ユーザー寛容（週末スキップ許容）
            newStreak = currentStreak + 1;
          } else if (diff <= 4 && isPremium && newFreezeCount < 3) {
            // 2〜3日空き — Standard ユーザーはストリーク Freeze（月3回まで）
            newStreak = currentStreak + 1;
            newFreezeCount += 1;
            get().addMilestoneEvent(
              'streak',
              `ストリーク保護を使用しました（今月 ${newFreezeCount}/3 回）`
            );
          }
          // それ以外は newStreak = 1（リセット）
        }

        const newLongest = Math.max(longestStreak, newStreak);

        // ストリークマイルストーン（7日ごと）
        if (newStreak > 0 && newStreak % 7 === 0) {
          get().addMilestoneEvent(
            'streak',
            `${newStreak}日連続アクセス達成！`
          );
        }

        // 初回訪問日を記録（トライアル開始日）
        const firstDate = get().firstVisitDate || today;

        set({
          lastVisitDate: today,
          currentStreak: newStreak,
          longestStreak: newLongest,
          totalVisits: totalVisits + 1,
          streakFreezeCount: newFreezeCount,
          streakFreezeMonth: newFreezeMonth,
          firstVisitDate: firstDate,
        });
      },

      updateScore: (score: number, grade: string) => {
        const { previousScore, previousGrade, scoreHistory } = get();
        const today = toLocalDateString();

        // 同日の最後のスナップショットを更新、または新規追加
        const lastSnapshot = scoreHistory[scoreHistory.length - 1];
        let newHistory: ScoreSnapshot[];
        if (lastSnapshot && lastSnapshot.date === today) {
          newHistory = [
            ...scoreHistory.slice(0, -1),
            { date: today, score, grade },
          ];
        } else {
          // 最大90日分保持
          const trimmed = scoreHistory.length >= 90
            ? scoreHistory.slice(-89)
            : scoreHistory;
          newHistory = [...trimmed, { date: today, score, grade }];
        }

        // スコア変動イベント
        if (previousScore !== null && previousScore !== score) {
          const diff = score - previousScore;
          if (diff > 0) {
            get().addMilestoneEvent(
              'score_up',
              `スコアが ${previousScore} → ${score} に上昇しました（+${diff}）`
            );
          }
        }

        // ランク変動イベント
        if (previousGrade && previousGrade !== grade) {
          const gradeOrder = ['F', 'D', 'C', 'B', 'A', 'S'];
          const prevIdx = gradeOrder.indexOf(previousGrade);
          const newIdx = gradeOrder.indexOf(grade);
          if (newIdx > prevIdx) {
            get().addMilestoneEvent(
              'rank_up',
              `ランクが ${previousGrade} → ${grade} にアップしました！`
            );
          }
        }

        set({
          previousScore: score,
          previousGrade: grade,
          scoreHistory: newHistory,
        });
      },

      addMilestoneEvent: (type, message) => {
        const event: MilestoneEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          type,
          message,
          timestamp: Date.now(),
          dismissed: false,
        };
        set(state => ({
          pendingEvents: [...state.pendingEvents, event],
        }));
      },

      dismissEvent: (id: string) => {
        set(state => ({
          pendingEvents: state.pendingEvents.filter(e => e.id !== id),
        }));
      },

      dismissAllEvents: () => {
        set({ pendingEvents: [] });
      },

      isInTrialPeriod: () => {
        const { firstVisitDate } = get();
        if (!firstVisitDate) return true; // 未訪問 = まだトライアル開始前
        const today = toLocalDateString();
        return daysBetween(firstVisitDate, today) < TRIAL_DURATION_DAYS;
      },

      getTrialDaysRemaining: () => {
        const { firstVisitDate } = get();
        if (!firstVisitDate) return TRIAL_DURATION_DAYS;
        const today = toLocalDateString();
        const elapsed = daysBetween(firstVisitDate, today);
        return Math.max(0, TRIAL_DURATION_DAYS - elapsed);
      },
    }),
    {
      name: 'pfwise-engagement',
      // スキーマ変更時は version をインクリメントし、migrate 関数で旧→新変換を実装すること
      // 例: version: 2, migrate: (persisted, version) => { if (version === 1) { ... } return persisted; }
      version: 1,
      partialize: (state) => ({
        lastVisitDate: state.lastVisitDate,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        totalVisits: state.totalVisits,
        streakFreezeCount: state.streakFreezeCount,
        streakFreezeMonth: state.streakFreezeMonth,
        firstVisitDate: state.firstVisitDate,
        previousScore: state.previousScore,
        previousGrade: state.previousGrade,
        scoreHistory: state.scoreHistory,
        // pendingEvents は persist しない（セッション内のみ）
      }),
    }
  )
);
