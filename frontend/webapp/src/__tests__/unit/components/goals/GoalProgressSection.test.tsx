/**
 * GoalProgressSection unit tests (TDD — テストファースト)
 *
 * ダッシュボード用ゴール進捗セクションを検証する。
 * @file src/__tests__/unit/components/goals/GoalProgressSection.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// Mock goalStore
const mockGoals: any[] = [];
const mockAddGoal = vi.fn(() => ({ success: true }));
const mockRemoveGoal = vi.fn();
const mockGetMaxGoals = vi.fn(() => 1);

vi.mock('../../../../stores/goalStore', () => ({
  useGoalStore: vi.fn((selector: any) => {
    const state = {
      goals: mockGoals,
      addGoal: mockAddGoal,
      removeGoal: mockRemoveGoal,
      getMaxGoals: mockGetMaxGoals,
      getGoalCount: () => mockGoals.length,
      updateGoal: vi.fn(),
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

vi.mock('../../../../stores/subscriptionStore', () => ({
  useSubscriptionStore: vi.fn((selector: any) => {
    const state = { isPremium: () => false, planType: 'free' };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

import GoalProgressSection from '../../../../components/goals/GoalProgressSection';

describe('GoalProgressSection', () => {
  beforeEach(() => {
    mockGoals.length = 0;
    vi.clearAllMocks();
  });

  it('should render empty state when no goals', () => {
    render(
      <MemoryRouter>
        <GoalProgressSection totalValue={5_000_000} baseCurrency="JPY" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('goal-progress-section')).toBeInTheDocument();
    expect(screen.getByText(/進捗を追跡/)).toBeInTheDocument();
  });

  it('should render goal cards when goals exist', () => {
    mockGoals.push({
      id: 'goal-1',
      name: '老後資金',
      type: 'amount',
      targetAmount: 10_000_000,
      targetDate: '2040-01-01',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    });

    render(
      <MemoryRouter>
        <GoalProgressSection totalValue={3_000_000} baseCurrency="JPY" />
      </MemoryRouter>
    );
    expect(screen.getByText('老後資金')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('should have add goal button', () => {
    render(
      <MemoryRouter>
        <GoalProgressSection totalValue={0} baseCurrency="JPY" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('add-goal-button')).toBeInTheDocument();
  });

  it('should open dialog when add goal button is clicked', () => {
    render(
      <MemoryRouter>
        <GoalProgressSection totalValue={0} baseCurrency="JPY" />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId('add-goal-button'));
    expect(screen.getByTestId('goal-dialog')).toBeInTheDocument();
  });

  it('should have data-testid="goal-progress-section"', () => {
    render(
      <MemoryRouter>
        <GoalProgressSection totalValue={0} baseCurrency="JPY" />
      </MemoryRouter>
    );
    expect(screen.getByTestId('goal-progress-section')).toBeInTheDocument();
  });

  it('should show section title', () => {
    render(
      <MemoryRouter>
        <GoalProgressSection totalValue={0} baseCurrency="JPY" />
      </MemoryRouter>
    );
    // CardTitle contains "投資目標"
    const section = screen.getByTestId('goal-progress-section');
    expect(section).toBeInTheDocument();
    expect(section.textContent).toContain('投資目標');
  });
});
