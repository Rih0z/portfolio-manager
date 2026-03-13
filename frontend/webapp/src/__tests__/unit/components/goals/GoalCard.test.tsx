/**
 * GoalCard unit tests (TDD — テストファースト)
 *
 * 個別ゴール表示カード: 進捗バー、達成率、月々必要額を検証する。
 * @file src/__tests__/unit/components/goals/GoalCard.test.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import GoalCard from '../../../../components/goals/GoalCard';
import type { InvestmentGoal } from '../../../../utils/goalCalculations';
import { useEngagementStore } from '../../../../stores/engagementStore';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ja' },
  }),
}));

// Mock engagementStore
const mockAddMilestoneEvent = vi.fn();
vi.mock('../../../../stores/engagementStore', () => ({
  useEngagementStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ addMilestoneEvent: mockAddMilestoneEvent });
    }
    return { addMilestoneEvent: mockAddMilestoneEvent };
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

  // =========================================================================
  // マイルストーン検知テスト（9-BY追加）
  // =========================================================================
  describe('milestone detection', () => {
    it('should fire goal_milestone event when progress crosses 25%', () => {
      const goal = createGoal({ targetAmount: 100 });

      // 初回レンダー: 20%
      const { rerender } = render(
        <GoalCard goal={goal} currentValue={20} baseCurrency="JPY" />
      );

      // 再レンダー: 30% → 25%境界を越える
      rerender(
        <GoalCard goal={goal} currentValue={30} baseCurrency="JPY" />
      );

      expect(mockAddMilestoneEvent).toHaveBeenCalledWith(
        'goal_milestone',
        expect.stringContaining('25%')
      );
    });

    it('should fire goal_achieved event when progress reaches 100%', () => {
      const goal = createGoal({ targetAmount: 100 });

      const { rerender } = render(
        <GoalCard goal={goal} currentValue={90} baseCurrency="JPY" />
      );

      rerender(
        <GoalCard goal={goal} currentValue={100} baseCurrency="JPY" />
      );

      expect(mockAddMilestoneEvent).toHaveBeenCalledWith(
        'goal_achieved',
        expect.stringContaining('目標達成')
      );
    });

    it('should not fire milestone on initial render', () => {
      render(
        <GoalCard goal={createGoal({ targetAmount: 100 })} currentValue={50} baseCurrency="JPY" />
      );

      // 初回レンダーではprevPercentRefがnullなのでイベント不発火
      expect(mockAddMilestoneEvent).not.toHaveBeenCalled();
    });

    it('should not fire milestone when staying above threshold', () => {
      const goal = createGoal({ targetAmount: 100 });

      const { rerender } = render(
        <GoalCard goal={goal} currentValue={30} baseCurrency="JPY" />
      );

      // 30% → 35%: 25%は既に超えており、50%にはまだ到達していない
      rerender(
        <GoalCard goal={goal} currentValue={35} baseCurrency="JPY" />
      );

      expect(mockAddMilestoneEvent).not.toHaveBeenCalled();
    });

    it('should cleanup setTimeout on unmount', () => {
      const goal = createGoal({ targetAmount: 100 });

      const { rerender, unmount } = render(
        <GoalCard goal={goal} currentValue={90} baseCurrency="JPY" />
      );

      // 100%到達 → セレブレーション開始
      rerender(
        <GoalCard goal={goal} currentValue={100} baseCurrency="JPY" />
      );

      // アンマウント時にsetTimeoutがクリーンアップされることを検証
      expect(() => unmount()).not.toThrow();

      // 3秒経過後もエラーなし
      act(() => {
        vi.advanceTimersByTime(3000);
      });
    });

    it('should show celebration UI when reaching 100%', () => {
      const goal = createGoal({ targetAmount: 100 });

      const { rerender } = render(
        <GoalCard goal={goal} currentValue={90} baseCurrency="JPY" />
      );

      rerender(
        <GoalCard goal={goal} currentValue={100} baseCurrency="JPY" />
      );

      // セレブレーション表示（ring-2クラスが付与される）
      const card = screen.getByTestId('goal-card');
      expect(card.className).toContain('ring-2');
    });

    it('should fire highest milestone when jumping across multiple thresholds (20% → 80%)', () => {
      const goal = createGoal({ targetAmount: 100 });

      const { rerender } = render(
        <GoalCard goal={goal} currentValue={20} baseCurrency="JPY" />
      );

      // 20% → 80%: 25%, 50%, 75% を跨ぐが最高値の 75% のみ発火
      rerender(
        <GoalCard goal={goal} currentValue={80} baseCurrency="JPY" />
      );

      expect(mockAddMilestoneEvent).toHaveBeenCalledTimes(1);
      expect(mockAddMilestoneEvent).toHaveBeenCalledWith(
        'goal_milestone',
        expect.stringContaining('75%')
      );
    });
  });
});
