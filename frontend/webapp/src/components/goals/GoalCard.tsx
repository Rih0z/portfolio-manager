/**
 * GoalCard
 *
 * 投資目標の進捗を表示するカード。進捗バー、達成率、
 * 月々の必要投資額、残り金額を表示する。
 *
 * @file src/components/goals/GoalCard.tsx
 */
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  calculateGoalProgress,
  calculateMonthlyRequired,
  type InvestmentGoal,
} from '../../utils/goalCalculations';
import { useEngagementStore } from '../../stores/engagementStore';

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
  const addMilestoneEvent = useEngagementStore(s => s.addMilestoneEvent);
  const prevPercentRef = useRef<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const progress = useMemo(
    () => calculateGoalProgress(goal, currentValue),
    [goal, currentValue]
  );

  const monthlyRequired = useMemo(() => {
    if (!goal.targetDate || progress.remainingAmount <= 0) return null;
    const amount = calculateMonthlyRequired(progress.remainingAmount, goal.targetDate);
    return amount === Infinity ? null : amount;
  }, [goal.targetDate, progress.remainingAmount]);

  // マイルストーン到達検知 (25%, 50%, 75%, 100%)
  useEffect(() => {
    const prev = prevPercentRef.current;
    const curr = progress.progressPercent;
    prevPercentRef.current = curr;

    if (prev === null) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    // 最も高い到達マイルストーンのみ通知する（例: 20%→80% は 75% のみ発火）
    // 低い閾値を個別通知すると大幅上昇時にスパム化するため意図的に最高値のみ
    const milestones = [100, 75, 50, 25]; // 降順チェック
    for (const m of milestones) {
      if (prev < m && curr >= m) {
        if (m === 100) {
          addMilestoneEvent('goal_achieved', `「${goal.name}」目標達成おめでとうございます！`);
          setShowCelebration(true);
          timer = setTimeout(() => setShowCelebration(false), 3000);
        } else {
          addMilestoneEvent('goal_milestone', `「${goal.name}」が${m}%に到達しました`);
        }
        break;
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [progress.progressPercent, goal.name, addMilestoneEvent]);

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
      className={`relative overflow-hidden ${showCelebration ? 'ring-2 ring-success-400 ring-offset-2' : ''}`}
    >
      {/* 達成セレブレーション */}
      {showCelebration && (
        <div className="absolute inset-0 pointer-events-none z-10" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-2 h-2 bg-success-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
          <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '100ms', animationDuration: '700ms' }} />
          <div className="absolute top-0 left-3/4 w-2 h-2 bg-warning-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '500ms' }} />
          <div className="absolute top-2 left-1/3 w-1.5 h-1.5 bg-danger-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '650ms' }} />
          <div className="absolute top-2 left-2/3 w-1.5 h-1.5 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '250ms', animationDuration: '550ms' }} />
        </div>
      )}
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

export default React.memo(GoalCard);
