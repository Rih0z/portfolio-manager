/**
 * GoalDialog
 *
 * 投資目標の作成/編集ダイアログ。
 * フォームバリデーション付きで、name, targetAmount, targetDate を入力。
 *
 * @file src/components/goals/GoalDialog.tsx
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  validateGoalInput,
  type InvestmentGoal,
  type GoalInput,
} from '../../utils/goalCalculations';

interface GoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: GoalInput) => void;
  existingGoal?: InvestmentGoal;
}

const GoalDialog: React.FC<GoalDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  existingGoal,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const formIdRef = useRef(`goal-form-${Date.now()}`);

  // Reset form when dialog opens or existingGoal changes
  useEffect(() => {
    if (isOpen) {
      if (existingGoal) {
        setName(existingGoal.name);
        setTargetAmount(existingGoal.targetAmount?.toString() || '');
        setTargetDate(existingGoal.targetDate || '');
      } else {
        setName('');
        setTargetAmount('');
        setTargetDate('');
      }
      setErrors([]);
      setSaving(false);
    }
  }, [isOpen, existingGoal]);

  const handleSave = useCallback(() => {
    if (saving) return;

    const input: GoalInput = {
      name: name.trim(),
      type: 'amount',
      targetAmount: parseFloat(targetAmount) || 0,
      targetDate: targetDate || undefined,
    };

    const validation = validateGoalInput(input);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      onSave(input);
    } finally {
      setSaving(false);
    }
  }, [name, targetAmount, targetDate, onSave, saving]);

  if (!isOpen) return null;

  const isEditing = !!existingGoal;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <div data-testid="goal-dialog">
        <DialogHeader onClose={onClose}>
          <DialogTitle>
            {isEditing ? '目標を編集' : '新しい目標を追加'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor={`${formIdRef.current}-name`} className="block text-sm font-medium text-foreground mb-1">
                目標名
              </label>
              <Input
                id={`${formIdRef.current}-name`}
                data-testid="goal-name-input"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="例: 老後資金、住宅購入、教育費"
                maxLength={50}
              />
              {errors.includes('name') && (
                <p data-testid="goal-name-error" className="mt-1 text-sm text-danger-500">
                  目標名を入力してください（50文字以内）
                </p>
              )}
            </div>

            {/* Target Amount */}
            <div>
              <label htmlFor={`${formIdRef.current}-amount`} className="block text-sm font-medium text-foreground mb-1">
                目標金額
              </label>
              <Input
                id={`${formIdRef.current}-amount`}
                data-testid="goal-amount-input"
                type="number"
                value={targetAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetAmount(e.target.value)}
                placeholder="例: 10000000"
                min={1}
              />
              {errors.includes('targetAmount') && (
                <p data-testid="goal-amount-error" className="mt-1 text-sm text-danger-500">
                  1以上の目標金額を入力してください
                </p>
              )}
            </div>

            {/* Target Date */}
            <div>
              <label htmlFor={`${formIdRef.current}-date`} className="block text-sm font-medium text-foreground mb-1">
                目標期限（任意）
              </label>
              <Input
                id={`${formIdRef.current}-date`}
                data-testid="goal-date-input"
                type="date"
                value={targetDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetDate(e.target.value)}
              />
              {errors.includes('targetDate') && (
                <p data-testid="goal-date-error" className="mt-1 text-sm text-danger-500">
                  有効な日付を入力してください
                </p>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            data-testid="goal-cancel-button"
            variant="secondary"
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button
            data-testid="goal-save-button"
            variant="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {isEditing ? '更新' : '追加'}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
};

export default React.memo(GoalDialog);
