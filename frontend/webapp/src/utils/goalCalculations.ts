/**
 * goalCalculations
 *
 * 投資目標の達成率計算、月々必要投資額、達成予測日、バリデーション。
 * 純粋関数のみで構成され、外部依存なし。
 *
 * @file src/utils/goalCalculations.ts
 */

// ─── Types ───────────────────────────────────────────

export interface InvestmentGoal {
  id: string;
  name: string;
  type: 'amount' | 'allocation';
  targetAmount?: number;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  name: string;
  type: 'amount' | 'allocation';
  targetAmount?: number;
  targetDate?: string;
}

export interface GoalProgress {
  progressPercent: number;
  remainingAmount: number;
  isCompleted: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Functions ───────────────────────────────────────

/**
 * 目標の達成率を計算する
 */
export function calculateGoalProgress(
  goal: InvestmentGoal,
  currentValue: number
): GoalProgress {
  const target = goal.targetAmount ?? 0;
  const safeCurrentValue = Math.max(0, currentValue);

  if (target <= 0) {
    return { progressPercent: 100, remainingAmount: 0, isCompleted: true };
  }

  const progressPercent = Math.min(100, Math.round((safeCurrentValue / target) * 100));
  const remainingAmount = Math.max(0, target - safeCurrentValue);
  const isCompleted = safeCurrentValue >= target;

  return { progressPercent, remainingAmount, isCompleted };
}

/**
 * 目標達成に必要な月額積立額を計算する
 */
export function calculateMonthlyRequired(
  remainingAmount: number,
  targetDate: string | undefined
): number {
  if (!targetDate) return 0;
  if (remainingAmount <= 0) return 0;

  const now = new Date();
  const target = new Date(targetDate);
  const monthsDiff =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());

  if (monthsDiff <= 0) return Infinity;

  return Math.ceil(remainingAmount / monthsDiff);
}

/**
 * 月額積立額から達成予測日を計算する
 */
export function estimateCompletionDate(
  remainingAmount: number,
  monthlyContribution: number
): string | null {
  if (remainingAmount <= 0) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  if (monthlyContribution <= 0) return null;

  const monthsNeeded = Math.ceil(remainingAmount / monthlyContribution);
  const now = new Date();
  const estimated = new Date(now.getFullYear(), now.getMonth() + monthsNeeded, 1);
  return estimated.toISOString();
}

/**
 * 目標入力のバリデーション
 */
export function validateGoalInput(input: GoalInput): ValidationResult {
  const errors: string[] = [];

  // name
  if (!input.name || input.name.trim().length === 0) {
    errors.push('name');
  } else if (input.name.length > 50) {
    errors.push('name');
  }

  // type
  if (!input.type || !['amount', 'allocation'].includes(input.type)) {
    errors.push('type');
  }

  // targetAmount (required for amount type)
  if (input.type === 'amount') {
    if (!input.targetAmount || input.targetAmount <= 0) {
      errors.push('targetAmount');
    }
  }

  // targetDate (optional but must be valid if provided)
  if (input.targetDate) {
    const parsed = new Date(input.targetDate);
    if (isNaN(parsed.getTime())) {
      errors.push('targetDate');
    }
  }

  return { valid: errors.length === 0, errors };
}
