/**
 * StreakBadge unit tests
 *
 * 連続アクセスバッジの検証:
 * - 表示/非表示条件（streak < 2 で非表示）
 * - recordVisit に isPremium を渡すこと
 * - 最長記録表示
 *
 * @file src/__tests__/unit/components/dashboard/StreakBadge.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import StreakBadge from '../../../../components/dashboard/StreakBadge';

const mockRecordVisit = vi.fn();
let mockState = {
  currentStreak: 0,
  longestStreak: 0,
  recordVisit: mockRecordVisit,
};

vi.mock('../../../../stores/engagementStore', () => ({
  useEngagementStore: vi.fn(() => mockState),
}));

let mockIsPremium = false;
vi.mock('../../../../hooks/queries', () => ({
  useIsPremium: () => mockIsPremium,
}));

describe('StreakBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      currentStreak: 0,
      longestStreak: 0,
      recordVisit: mockRecordVisit,
    };
    mockIsPremium = false;
  });

  it('should return null when streak is 0', () => {
    mockState.currentStreak = 0;
    const { container } = render(<StreakBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null when streak is 1', () => {
    mockState.currentStreak = 1;
    const { container } = render(<StreakBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('should show badge when streak >= 2', () => {
    mockState.currentStreak = 3;
    mockState.longestStreak = 3;
    render(<StreakBadge />);
    expect(screen.getByTestId('streak-badge')).toBeInTheDocument();
    expect(screen.getByText(/3日連続/)).toBeInTheDocument();
  });

  it('should call recordVisit on mount', () => {
    mockState.currentStreak = 5;
    render(<StreakBadge />);
    expect(mockRecordVisit).toHaveBeenCalled();
  });

  it('should pass isPremium to recordVisit for free users', () => {
    mockIsPremium = false;
    mockState.currentStreak = 5;
    render(<StreakBadge />);
    expect(mockRecordVisit).toHaveBeenCalledWith(false);
  });

  it('should pass isPremium=true to recordVisit for premium users', () => {
    mockIsPremium = true;
    mockState.currentStreak = 5;
    render(<StreakBadge />);
    expect(mockRecordVisit).toHaveBeenCalledWith(true);
  });

  it('should show longest streak when different from current', () => {
    mockState.currentStreak = 3;
    mockState.longestStreak = 10;
    render(<StreakBadge />);
    expect(screen.getByText(/最長 10日/)).toBeInTheDocument();
  });

  it('should not show longest streak when equal to current', () => {
    mockState.currentStreak = 5;
    mockState.longestStreak = 5;
    render(<StreakBadge />);
    expect(screen.queryByText(/最長/)).not.toBeInTheDocument();
  });

  it('should only call recordVisit once even if isPremium changes (hasRecorded ref)', () => {
    mockState.currentStreak = 5;
    mockIsPremium = false;
    const { rerender } = render(<StreakBadge />);

    // isPremium が false → true に変わっても再呼び出しされない
    mockIsPremium = true;
    rerender(<StreakBadge />);

    expect(mockRecordVisit).toHaveBeenCalledTimes(1);
  });
});
