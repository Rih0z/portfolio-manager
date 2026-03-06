/**
 * GoalProgressSection
 *
 * ダッシュボード用の投資目標進捗セクション。
 * 目標一覧表示 + 追加/編集/削除のアクション。
 *
 * @file src/components/goals/GoalProgressSection.tsx
 */
import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import GoalCard from './GoalCard';
import GoalDialog from './GoalDialog';
import { useGoalStore } from '../../stores/goalStore';
import type { GoalInput, InvestmentGoal } from '../../utils/goalCalculations';

interface GoalProgressSectionProps {
  totalValue: number;
  baseCurrency: string;
}

const GoalProgressSection: React.FC<GoalProgressSectionProps> = ({
  totalValue,
  baseCurrency,
}) => {
  const goals = useGoalStore((s) => s.goals);
  const addGoal = useGoalStore((s) => s.addGoal);
  const updateGoal = useGoalStore((s) => s.updateGoal);
  const removeGoal = useGoalStore((s) => s.removeGoal);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | undefined>();

  const handleAddClick = useCallback(() => {
    setEditingGoal(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (goal) {
      setEditingGoal(goal);
      setDialogOpen(true);
    }
  }, [goals]);

  const handleSave = useCallback((input: GoalInput) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, {
        name: input.name,
        type: input.type,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate,
      });
    } else {
      addGoal(input);
    }
    setDialogOpen(false);
    setEditingGoal(undefined);
  }, [editingGoal, addGoal, updateGoal]);

  const handleDelete = useCallback((id: string) => {
    removeGoal(id);
  }, [removeGoal]);

  return (
    <div data-testid="goal-progress-section">
      <Card padding="medium">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">投資目標</CardTitle>
            <Button
              data-testid="add-goal-button"
              variant="secondary"
              size="sm"
              onClick={handleAddClick}
            >
              目標を設定
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p data-testid="goal-empty-state" className="text-sm text-muted-foreground text-center py-4">
              投資目標を設定して、資産形成の進捗を追跡しましょう
            </p>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currentValue={totalValue}
                  baseCurrency={baseCurrency}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalDialog
        isOpen={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingGoal(undefined); }}
        onSave={handleSave}
        existingGoal={editingGoal}
      />
    </div>
  );
};

export default GoalProgressSection;
