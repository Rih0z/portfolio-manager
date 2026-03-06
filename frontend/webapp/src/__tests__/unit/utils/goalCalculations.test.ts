/**
 * goalCalculations unit tests (TDD — テストファースト)
 *
 * 投資目標の達成率計算、月々必要投資額、達成予測日を検証する。
 * @file src/__tests__/unit/utils/goalCalculations.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  calculateGoalProgress,
  calculateMonthlyRequired,
  estimateCompletionDate,
  validateGoalInput,
  type InvestmentGoal,
  type GoalInput,
} from '../../../utils/goalCalculations';

// --- Test helpers ---
const createGoal = (overrides: Partial<InvestmentGoal> = {}): InvestmentGoal => ({
  id: 'goal-1',
  name: '老後資金',
  type: 'amount',
  targetAmount: 10_000_000,
  targetDate: '2040-01-01',
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
  ...overrides,
});

describe('goalCalculations', () => {
  // =========================================================================
  // calculateGoalProgress
  // =========================================================================
  describe('calculateGoalProgress', () => {
    it('should return 0% when currentValue is 0', () => {
      const goal = createGoal({ targetAmount: 10_000_000 });
      const result = calculateGoalProgress(goal, 0);
      expect(result.progressPercent).toBe(0);
      expect(result.remainingAmount).toBe(10_000_000);
    });

    it('should return correct percentage for partial progress', () => {
      const goal = createGoal({ targetAmount: 10_000_000 });
      const result = calculateGoalProgress(goal, 3_000_000);
      expect(result.progressPercent).toBe(30);
      expect(result.remainingAmount).toBe(7_000_000);
    });

    it('should cap at 100% when currentValue exceeds target', () => {
      const goal = createGoal({ targetAmount: 10_000_000 });
      const result = calculateGoalProgress(goal, 15_000_000);
      expect(result.progressPercent).toBe(100);
      expect(result.remainingAmount).toBe(0);
    });

    it('should handle targetAmount of 0 gracefully', () => {
      const goal = createGoal({ targetAmount: 0 });
      const result = calculateGoalProgress(goal, 1_000_000);
      expect(result.progressPercent).toBe(100);
      expect(result.remainingAmount).toBe(0);
    });

    it('should return correct status for completed goal', () => {
      const goal = createGoal({ targetAmount: 5_000_000 });
      const result = calculateGoalProgress(goal, 5_000_000);
      expect(result.progressPercent).toBe(100);
      expect(result.isCompleted).toBe(true);
    });

    it('should return isCompleted false for incomplete goal', () => {
      const goal = createGoal({ targetAmount: 5_000_000 });
      const result = calculateGoalProgress(goal, 4_999_999);
      expect(result.isCompleted).toBe(false);
    });

    it('should handle negative currentValue as 0', () => {
      const goal = createGoal({ targetAmount: 10_000_000 });
      const result = calculateGoalProgress(goal, -500_000);
      expect(result.progressPercent).toBe(0);
      expect(result.remainingAmount).toBe(10_000_000);
    });
  });

  // =========================================================================
  // calculateMonthlyRequired
  // =========================================================================
  describe('calculateMonthlyRequired', () => {
    it('should calculate monthly amount needed to reach target', () => {
      // 10M target, 3M current, 14 years (168 months) to go
      const result = calculateMonthlyRequired(7_000_000, '2040-01-01');
      // 7,000,000 / ~168 months ≈ 41,667
      expect(result).toBeGreaterThan(40_000);
      expect(result).toBeLessThan(50_000);
    });

    it('should return 0 when remaining is 0', () => {
      const result = calculateMonthlyRequired(0, '2040-01-01');
      expect(result).toBe(0);
    });

    it('should return 0 when remaining is negative', () => {
      const result = calculateMonthlyRequired(-1_000_000, '2040-01-01');
      expect(result).toBe(0);
    });

    it('should return Infinity when target date is in the past', () => {
      const result = calculateMonthlyRequired(1_000_000, '2020-01-01');
      expect(result).toBe(Infinity);
    });

    it('should return full amount when target date is this month', () => {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const result = calculateMonthlyRequired(1_000_000, thisMonth);
      expect(result).toBe(Infinity);
    });

    it('should handle undefined target date', () => {
      const result = calculateMonthlyRequired(1_000_000, undefined);
      expect(result).toBe(0);
    });
  });

  // =========================================================================
  // estimateCompletionDate
  // =========================================================================
  describe('estimateCompletionDate', () => {
    it('should estimate completion date based on monthly contribution', () => {
      // 7M remaining, 100K/month → 70 months
      const result = estimateCompletionDate(7_000_000, 100_000);
      expect(result).toBeDefined();
      const estimated = new Date(result!);
      const now = new Date();
      const monthsDiff = (estimated.getFullYear() - now.getFullYear()) * 12
        + (estimated.getMonth() - now.getMonth());
      expect(monthsDiff).toBeGreaterThanOrEqual(69);
      expect(monthsDiff).toBeLessThanOrEqual(71);
    });

    it('should return null when monthly contribution is 0', () => {
      const result = estimateCompletionDate(7_000_000, 0);
      expect(result).toBeNull();
    });

    it('should return null when monthly contribution is negative', () => {
      const result = estimateCompletionDate(7_000_000, -10_000);
      expect(result).toBeNull();
    });

    it('should return current month when remaining is 0', () => {
      const result = estimateCompletionDate(0, 100_000);
      expect(result).toBeDefined();
      const estimated = new Date(result!);
      const now = new Date();
      expect(estimated.getFullYear()).toBe(now.getFullYear());
      expect(estimated.getMonth()).toBe(now.getMonth());
    });

    it('should return current month when remaining is negative (already achieved)', () => {
      const result = estimateCompletionDate(-500_000, 0);
      expect(result).toBeDefined();
      const estimated = new Date(result!);
      const now = new Date();
      expect(estimated.getFullYear()).toBe(now.getFullYear());
      expect(estimated.getMonth()).toBe(now.getMonth());
    });
  });

  // =========================================================================
  // validateGoalInput
  // =========================================================================
  describe('validateGoalInput', () => {
    it('should pass valid amount goal', () => {
      const input: GoalInput = {
        name: '老後資金',
        type: 'amount',
        targetAmount: 10_000_000,
        targetDate: '2040-01-01',
      };
      const result = validateGoalInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when name is empty', () => {
      const input: GoalInput = {
        name: '',
        type: 'amount',
        targetAmount: 10_000_000,
      };
      const result = validateGoalInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name');
    });

    it('should fail when name is too long', () => {
      const input: GoalInput = {
        name: 'a'.repeat(51),
        type: 'amount',
        targetAmount: 10_000_000,
      };
      const result = validateGoalInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name');
    });

    it('should fail when targetAmount is 0 for amount type', () => {
      const input: GoalInput = {
        name: '目標',
        type: 'amount',
        targetAmount: 0,
      };
      const result = validateGoalInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('targetAmount');
    });

    it('should fail when targetAmount is negative', () => {
      const input: GoalInput = {
        name: '目標',
        type: 'amount',
        targetAmount: -100,
      };
      const result = validateGoalInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('targetAmount');
    });

    it('should fail when type is missing', () => {
      const input = {
        name: '目標',
        targetAmount: 10_000_000,
      } as GoalInput;
      const result = validateGoalInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('type');
    });

    it('should pass without targetDate (optional)', () => {
      const input: GoalInput = {
        name: '目標',
        type: 'amount',
        targetAmount: 10_000_000,
      };
      const result = validateGoalInput(input);
      expect(result.valid).toBe(true);
    });

    it('should fail when targetDate is invalid format', () => {
      const input: GoalInput = {
        name: '目標',
        type: 'amount',
        targetAmount: 10_000_000,
        targetDate: 'not-a-date',
      };
      const result = validateGoalInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('targetDate');
    });
  });
});
