/**
 * goalStore unit tests (TDD — テストファースト)
 *
 * 投資目標のCRUD、プラン制限、localStorage永続化を検証する。
 * @file src/__tests__/unit/stores/goalStore.test.ts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// --- Mock external dependencies ---
vi.mock('../../../stores/uiStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      addNotification: vi.fn(() => 'mock-notification-id'),
      removeNotification: vi.fn(),
    })),
  },
}));

vi.mock('../../../hooks/queries', () => ({
  getIsPremiumFromCache: vi.fn(() => false),
}));

vi.mock('../../../utils/analytics', () => ({
  trackEvent: vi.fn(),
  AnalyticsEvents: {
    GOAL_CREATE: 'goal_create',
    GOAL_UPDATE: 'goal_update',
    GOAL_DELETE: 'goal_delete',
  },
}));

// --- Import store after mocks ---
import { useGoalStore } from '../../../stores/goalStore';
import { getIsPremiumFromCache } from '../../../hooks/queries';
import type { InvestmentGoal } from '../../../utils/goalCalculations';

// --- Test helpers ---
const getInitialState = () => ({
  goals: [] as InvestmentGoal[],
});

describe('goalStore', () => {
  beforeEach(() => {
    useGoalStore.setState(getInitialState());
    vi.clearAllMocks();
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Initial State
  // =========================================================================
  describe('initial state', () => {
    it('should have empty goals array', () => {
      const state = useGoalStore.getState();
      expect(state.goals).toEqual([]);
    });
  });

  // =========================================================================
  // addGoal
  // =========================================================================
  describe('addGoal', () => {
    it('should add a goal with generated id and timestamps', () => {
      const { addGoal } = useGoalStore.getState();
      const result = addGoal({
        name: '老後資金',
        type: 'amount',
        targetAmount: 10_000_000,
        targetDate: '2040-01-01',
      });

      expect(result.success).toBe(true);
      const { goals } = useGoalStore.getState();
      expect(goals).toHaveLength(1);
      expect(goals[0].name).toBe('老後資金');
      expect(goals[0].type).toBe('amount');
      expect(goals[0].targetAmount).toBe(10_000_000);
      expect(goals[0].id).toBeDefined();
      expect(goals[0].createdAt).toBeDefined();
      expect(goals[0].updatedAt).toBeDefined();
    });

    it('should reject goal when validation fails', () => {
      const { addGoal } = useGoalStore.getState();
      const result = addGoal({
        name: '',
        type: 'amount',
        targetAmount: 10_000_000,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('name');
      expect(useGoalStore.getState().goals).toHaveLength(0);
    });

    it('should enforce free plan limit (max 1 goal)', () => {
      const { addGoal } = useGoalStore.getState();

      // First goal should succeed
      const result1 = addGoal({ name: '目標1', type: 'amount', targetAmount: 1_000_000 });
      expect(result1.success).toBe(true);

      // Second goal should fail on free plan
      const result2 = addGoal({ name: '目標2', type: 'amount', targetAmount: 2_000_000 });
      expect(result2.success).toBe(false);
      expect(result2.limitReached).toBe(true);
    });

    it('should allow up to 5 goals on standard plan', () => {
      // Override subscription mock to standard
      vi.mocked(getIsPremiumFromCache).mockReturnValue(true);

      const { addGoal } = useGoalStore.getState();
      for (let i = 1; i <= 5; i++) {
        const result = addGoal({ name: `目標${i}`, type: 'amount', targetAmount: i * 1_000_000 });
        expect(result.success).toBe(true);
      }
      expect(useGoalStore.getState().goals).toHaveLength(5);

      // 6th should fail
      const result6 = addGoal({ name: '目標6', type: 'amount', targetAmount: 6_000_000 });
      expect(result6.success).toBe(false);
      expect(result6.limitReached).toBe(true);
    });
  });

  // =========================================================================
  // updateGoal
  // =========================================================================
  describe('updateGoal', () => {
    it('should update goal name and targetAmount', () => {
      const { addGoal, updateGoal } = useGoalStore.getState();
      addGoal({ name: '目標', type: 'amount', targetAmount: 1_000_000 });
      const goalId = useGoalStore.getState().goals[0].id;

      updateGoal(goalId, { name: '新しい目標', targetAmount: 2_000_000 });

      const updated = useGoalStore.getState().goals[0];
      expect(updated.name).toBe('新しい目標');
      expect(updated.targetAmount).toBe(2_000_000);
    });

    it('should update updatedAt timestamp', () => {
      const { addGoal, updateGoal } = useGoalStore.getState();
      addGoal({ name: '目標', type: 'amount', targetAmount: 1_000_000 });
      const goalId = useGoalStore.getState().goals[0].id;

      updateGoal(goalId, { name: '更新済み' });

      const updated = useGoalStore.getState().goals[0];
      expect(updated.updatedAt).toBeDefined();
      expect(updated.name).toBe('更新済み');
    });

    it('should not modify other goals', () => {
      // Use standard plan for multiple goals
      vi.mocked(getIsPremiumFromCache).mockReturnValue(true);

      const { addGoal, updateGoal } = useGoalStore.getState();
      addGoal({ name: '目標A', type: 'amount', targetAmount: 1_000_000 });
      addGoal({ name: '目標B', type: 'amount', targetAmount: 2_000_000 });

      const goals = useGoalStore.getState().goals;
      updateGoal(goals[0].id, { name: '変更済みA' });

      const updated = useGoalStore.getState().goals;
      expect(updated[0].name).toBe('変更済みA');
      expect(updated[1].name).toBe('目標B');
    });

    it('should ignore update for non-existent goal', () => {
      const { addGoal, updateGoal } = useGoalStore.getState();
      addGoal({ name: '目標', type: 'amount', targetAmount: 1_000_000 });

      updateGoal('non-existent-id', { name: '幽霊目標' });

      expect(useGoalStore.getState().goals).toHaveLength(1);
      expect(useGoalStore.getState().goals[0].name).toBe('目標');
    });
  });

  // =========================================================================
  // removeGoal
  // =========================================================================
  describe('removeGoal', () => {
    it('should remove a goal by id', () => {
      const { addGoal, removeGoal } = useGoalStore.getState();
      addGoal({ name: '目標', type: 'amount', targetAmount: 1_000_000 });
      const goalId = useGoalStore.getState().goals[0].id;

      removeGoal(goalId);

      expect(useGoalStore.getState().goals).toHaveLength(0);
    });

    it('should not throw for non-existent goal', () => {
      const { removeGoal } = useGoalStore.getState();
      expect(() => removeGoal('non-existent-id')).not.toThrow();
    });

    it('should only remove the specified goal', () => {
      vi.mocked(getIsPremiumFromCache).mockReturnValue(true);

      const { addGoal, removeGoal } = useGoalStore.getState();
      addGoal({ name: '目標A', type: 'amount', targetAmount: 1_000_000 });
      addGoal({ name: '目標B', type: 'amount', targetAmount: 2_000_000 });

      const goalAId = useGoalStore.getState().goals[0].id;
      removeGoal(goalAId);

      const remaining = useGoalStore.getState().goals;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('目標B');
    });
  });

  // =========================================================================
  // getGoalCount / getMaxGoals
  // =========================================================================
  describe('getGoalCount and getMaxGoals', () => {
    it('should return correct goal count', () => {
      const { addGoal, getGoalCount } = useGoalStore.getState();
      expect(getGoalCount()).toBe(0);

      addGoal({ name: '目標', type: 'amount', targetAmount: 1_000_000 });
      expect(useGoalStore.getState().getGoalCount()).toBe(1);
    });

    it('should return 1 for free plan max goals', () => {
      // Ensure free plan mock is active
      vi.mocked(getIsPremiumFromCache).mockReturnValue(false);
      expect(useGoalStore.getState().getMaxGoals()).toBe(1);
    });

    it('should return 5 for standard plan max goals', () => {
      vi.mocked(getIsPremiumFromCache).mockReturnValue(true);
      expect(useGoalStore.getState().getMaxGoals()).toBe(5);
    });
  });
});
