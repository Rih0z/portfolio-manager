/**
 * GoalCard unit tests (TDD — テストファースト)
 *
 * 個別ゴール表示カード: 進捗バー、達成率、月々必要額を検証する。
 * @file src/__tests__/unit/components/goals/GoalCard.test.tsx
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import GoalCard from '../../../../components/goals/GoalCard';
import type { InvestmentGoal } from '../../../../utils/goalCalculations';

// Mock i18n
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

describe('GoalCard', () => {
  it('should render goal name', () => {
    render(
      <GoalCard goal={createGoal()} currentValue={3_000_000} />
    );
    expect(screen.getByText('老後資金')).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    render(
      <GoalCard goal={createGoal()} currentValue={3_000_000} />
    );
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('should display target amount formatted', () => {
    render(
      <GoalCard
        goal={createGoal({ targetAmount: 10_000_000 })}
        currentValue={3_000_000}
        baseCurrency="JPY"
      />
    );
    // Should contain the target amount text
    expect(screen.getByText(/10,000,000/)).toBeInTheDocument();
  });

  it('should display remaining amount', () => {
    render(
      <GoalCard goal={createGoal()} currentValue={3_000_000} baseCurrency="JPY" />
    );
    expect(screen.getByText(/7,000,000/)).toBeInTheDocument();
  });

  it('should show completed state at 100%', () => {
    render(
      <GoalCard goal={createGoal()} currentValue={10_000_000} />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByTestId('goal-card')).toHaveAttribute('data-completed', 'true');
  });

  it('should show monthly required when targetDate is set', () => {
    render(
      <GoalCard
        goal={createGoal({ targetDate: '2040-01-01' })}
        currentValue={3_000_000}
        baseCurrency="JPY"
      />
    );
    // Should have monthly required amount displayed
    expect(screen.getByTestId('monthly-required')).toBeInTheDocument();
  });

  it('should not show monthly required when targetDate is not set', () => {
    render(
      <GoalCard
        goal={createGoal({ targetDate: undefined })}
        currentValue={3_000_000}
      />
    );
    expect(screen.queryByTestId('monthly-required')).not.toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <GoalCard goal={createGoal()} currentValue={3_000_000} onEdit={onEdit} />
    );
    fireEvent.click(screen.getByTestId('goal-edit-button'));
    expect(onEdit).toHaveBeenCalledWith('goal-1');
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <GoalCard goal={createGoal()} currentValue={3_000_000} onDelete={onDelete} />
    );
    fireEvent.click(screen.getByTestId('goal-delete-button'));
    expect(onDelete).toHaveBeenCalledWith('goal-1');
  });

  it('should have data-testid="goal-card"', () => {
    render(
      <GoalCard goal={createGoal()} currentValue={0} />
    );
    expect(screen.getByTestId('goal-card')).toBeInTheDocument();
  });
});
