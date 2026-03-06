/**
 * GoalCard
 *
 * 投資目標の進捗を表示するカード。進捗バー、達成率、
 * 月々の必要投資額、残り金額を表示する。
 *
 * @file src/components/goals/GoalCard.tsx
 */
import React, { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  calculateGoalProgress,
  calculateMonthlyRequired,
  type InvestmentGoal,
} from '../../utils/goalCalculations';

interface GoalCardProps {
  goal: InvestmentGoal;
  currentValue: number;
  baseCurrency?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const formatCurrency = (value: number, currency = 'JPY'): string => {
  if (currency === 'JPY') {
    return `¥${Math.round(value).toLocaleString()}`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currentValue,
  baseCurrency = 'JPY',
  onEdit,
  onDelete,
}) => {
  const progress = useMemo(
    () => calculateGoalProgress(goal, currentValue),
    [goal, currentValue]
  );

  const monthlyRequired = useMemo(() => {
    if (!goal.targetDate || progress.remainingAmount <= 0) return null;
    const amount = calculateMonthlyRequired(progress.remainingAmount, goal.targetDate);
    return amount === Infinity ? null : amount;
  }, [goal.targetDate, progress.remainingAmount]);

  const progressVariant = progress.isCompleted
    ? 'success'
    : progress.progressPercent >= 60
      ? 'default'
      : progress.progressPercent >= 30
        ? 'warning'
        : 'danger';

  return (
    <Card
      data-testid="goal-card"
      data-completed={progress.isCompleted ? 'true' : 'false'}
      padding="medium"
      className="relative"
    >
      <CardContent className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">{goal.name}</h4>
            {progress.isCompleted && (
              <Badge variant="success">達成</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                data-testid="goal-edit-button"
                onClick={() => onEdit(goal.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="編集"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                data-testid="goal-delete-button"
                onClick={() => onDelete(goal.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-danger-500 hover:bg-danger-50 transition-colors"
                title="削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(currentValue, baseCurrency)}
            </span>
            <span className="font-mono font-semibold text-foreground">
              {progress.progressPercent}%
            </span>
          </div>
          <Progress value={progress.progressPercent} max={100} variant={progressVariant} size="md" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>目標: {formatCurrency(goal.targetAmount || 0, baseCurrency)}</span>
            {progress.remainingAmount > 0 && (
              <span>残り: {formatCurrency(progress.remainingAmount, baseCurrency)}</span>
            )}
          </div>
        </div>

        {/* Monthly required */}
        {monthlyRequired !== null && goal.targetDate && (
          <div
            data-testid="monthly-required"
            className="pt-2 border-t border-border text-sm text-muted-foreground"
          >
            <span>月々 </span>
            <span className="font-mono font-semibold text-foreground">
              {formatCurrency(monthlyRequired, baseCurrency)}
            </span>
            <span> の積立が必要</span>
            <span className="ml-2 text-xs">
              （{goal.targetDate.slice(0, 7)}まで）
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalCard;
