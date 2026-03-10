/**
 * GoalStore — 投資目標状態管理
 *
 * Zustand store でゴールのCRUD、プラン制限チェック、
 * localStorage永続化を管理する。
 *
 * @file src/stores/goalStore.ts
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  validateGoalInput,
  type InvestmentGoal,
  type GoalInput,
} from '../utils/goalCalculations';
import { getIsPremiumFromCache } from '../hooks/queries';
import { useUIStore } from './uiStore';
import { trackEvent, AnalyticsEvents } from '../utils/analytics';

// ─── Constants ───────────────────────────────────────

const MAX_GOALS_FREE = 1;
const MAX_GOALS_STANDARD = 5;

// ─── Types ───────────────────────────────────────────

interface AddGoalResult {
  success: boolean;
  errors?: string[];
  limitReached?: boolean;
}

interface GoalState {
  goals: InvestmentGoal[];

  // Actions
  addGoal: (input: GoalInput) => AddGoalResult;
  updateGoal: (id: string, updates: Partial<Omit<InvestmentGoal, 'id' | 'createdAt'>>) => void;
  removeGoal: (id: string) => void;

  // Computed
  getGoalCount: () => number;
  getMaxGoals: () => number;
}

// ─── Store ───────────────────────────────────────────

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],

      addGoal: (input: GoalInput): AddGoalResult => {
        // Validate input
        const validation = validateGoalInput(input);
        if (!validation.valid) {
          return { success: false, errors: validation.errors };
        }

        // Check plan limit
        const maxGoals = get().getMaxGoals();
        if (get().goals.length >= maxGoals) {
          const uiStore = useUIStore.getState();
          uiStore.addNotification(
            maxGoals === MAX_GOALS_FREE
              ? 'Standardプランにアップグレードすると最大5つの目標を設定できます'
              : '目標数の上限に達しています',
            'warning'
          );
          return { success: false, limitReached: true };
        }

        const now = new Date().toISOString();
        const newGoal: InvestmentGoal = {
          id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: input.name.trim(),
          type: input.type,
          targetAmount: input.targetAmount,
          targetDate: input.targetDate,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ goals: [...state.goals, newGoal] }));
        trackEvent(AnalyticsEvents.GOAL_CREATE, { type: input.type });

        return { success: true };
      },

      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id
              ? { ...g, ...updates, updatedAt: new Date().toISOString() }
              : g
          ),
        }));
        trackEvent(AnalyticsEvents.GOAL_UPDATE, { goalId: id });
      },

      removeGoal: (id) => {
        set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
        trackEvent(AnalyticsEvents.GOAL_DELETE, { goalId: id });
      },

      getGoalCount: () => get().goals.length,

      getMaxGoals: () => {
        return getIsPremiumFromCache() ? MAX_GOALS_STANDARD : MAX_GOALS_FREE;
      },
    }),
    {
      name: 'pfwise-goals',
      partialize: (state) => ({ goals: state.goals }),
    }
  )
);
