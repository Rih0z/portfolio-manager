/**
 * GoalDialog unit tests (TDD — テストファースト)
 *
 * 目標作成/編集ダイアログのフォーム、バリデーション、送信を検証する。
 * @file src/__tests__/unit/components/goals/GoalDialog.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import GoalDialog from '../../../../components/goals/GoalDialog';
import type { InvestmentGoal } from '../../../../utils/goalCalculations';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

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

describe('GoalDialog', () => {
  // =========================================================================
  // Rendering
  // =========================================================================
  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <GoalDialog isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />
      );
      expect(screen.queryByTestId('goal-dialog')).not.toBeInTheDocument();
    });

    it('should render dialog when isOpen is true', () => {
      render(
        <GoalDialog isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
      );
      expect(screen.getByTestId('goal-dialog')).toBeInTheDocument();
    });

    it('should show create title when no existing goal', () => {
      render(
        <GoalDialog isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
      );
      expect(screen.getByText(/新しい目標/)).toBeInTheDocument();
    });

    it('should show edit title when existing goal provided', () => {
      render(
        <GoalDialog
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          existingGoal={createGoal()}
        />
      );
      expect(screen.getByText(/目標を編集/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Form fields
  // =========================================================================
  describe('form fields', () => {
    it('should have name input field', () => {
      render(
        <GoalDialog isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
      );
      expect(screen.getByTestId('goal-name-input')).toBeInTheDocument();
    });

    it('should have target amount input field', () => {
      render(
        <GoalDialog isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
      );
      expect(screen.getByTestId('goal-amount-input')).toBeInTheDocument();
    });

    it('should have target date input field', () => {
      render(
        <GoalDialog isOpen={true} onClose={vi.fn()} onSave={vi.fn()} />
      );
      expect(screen.getByTestId('goal-date-input')).toBeInTheDocument();
    });

    it('should pre-fill form when editing existing goal', () => {
      render(
        <GoalDialog
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          existingGoal={createGoal({ name: '教育資金', targetAmount: 5_000_000 })}
        />
      );
      const nameInput = screen.getByTestId('goal-name-input') as HTMLInputElement;
      expect(nameInput.value).toBe('教育資金');
    });
  });

  // =========================================================================
  // Validation
  // =========================================================================
  describe('validation', () => {
    it('should show error when submitting with empty name', async () => {
      const onSave = vi.fn();
      render(
        <GoalDialog isOpen={true} onClose={vi.fn()} onSave={onSave} />
      );

      fireEvent.click(screen.getByTestId('goal-save-button'));

      await waitFor(() => {
        expect(screen.getByTestId('goal-name-error')).toBeInTheDocument();
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should show error when target amount is 0', async () => {
      const onSave = vi.fn();
      render(
        <GoalDialog isOpen={true} onClose={vi.fn()} onSave={onSave} />
      );

      fireEvent.change(screen.getByTestId('goal-name-input'), { target: { value: '目標' } });
      fireEvent.click(screen.getByTestId('goal-save-button'));

      await waitFor(() => {
        expect(screen.getByTestId('goal-amount-error')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Save / Cancel
  // =========================================================================
  describe('save and cancel', () => {
    it('should call onSave with valid input', async () => {
      const onSave = vi.fn();
      render(
        <GoalDialog isOpen={true} onClose={vi.fn()} onSave={onSave} />
      );

      fireEvent.change(screen.getByTestId('goal-name-input'), { target: { value: '住宅購入' } });
      fireEvent.change(screen.getByTestId('goal-amount-input'), { target: { value: '30000000' } });
      fireEvent.change(screen.getByTestId('goal-date-input'), { target: { value: '2035-06-01' } });
      fireEvent.click(screen.getByTestId('goal-save-button'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: '住宅購入',
            type: 'amount',
            targetAmount: 30_000_000,
            targetDate: '2035-06-01',
          })
        );
      });
    });

    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(
        <GoalDialog isOpen={true} onClose={onClose} onSave={vi.fn()} />
      );

      fireEvent.click(screen.getByTestId('goal-cancel-button'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
