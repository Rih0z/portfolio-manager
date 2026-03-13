/**
 * ScoreChangeIndicator unit tests
 *
 * スコア変動通知コンポーネントの検証:
 * - 表示/非表示の条件
 * - 5秒自動消去
 * - 手動消去
 * - イベントタイプ別スタイル
 *
 * @file src/__tests__/unit/components/dashboard/ScoreChangeIndicator.test.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import ScoreChangeIndicator from '../../../../components/dashboard/ScoreChangeIndicator';

// Mock engagementStore
const mockDismissEvent = vi.fn();
let mockPendingEvents: any[] = [];

vi.mock('../../../../stores/engagementStore', () => ({
  useEngagementStore: vi.fn((selector) => {
    const state = {
      pendingEvents: mockPendingEvents,
      dismissEvent: mockDismissEvent,
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  }),
}));

describe('ScoreChangeIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockPendingEvents = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null when no events', () => {
    const { container } = render(<ScoreChangeIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('should show score_up event', () => {
    mockPendingEvents = [
      { id: 'e1', type: 'score_up', message: 'スコアが 60 → 75 に上昇', timestamp: Date.now(), dismissed: false },
    ];
    render(<ScoreChangeIndicator />);
    expect(screen.getByText(/スコアが 60 → 75/)).toBeInTheDocument();
  });

  it('should show rank_up event', () => {
    mockPendingEvents = [
      { id: 'e2', type: 'rank_up', message: 'ランクが C → A にアップ', timestamp: Date.now(), dismissed: false },
    ];
    render(<ScoreChangeIndicator />);
    expect(screen.getByText(/ランクが C → A/)).toBeInTheDocument();
  });

  it('should show streak event', () => {
    mockPendingEvents = [
      { id: 'e3', type: 'streak', message: '7日連続アクセス達成！', timestamp: Date.now(), dismissed: false },
    ];
    render(<ScoreChangeIndicator />);
    expect(screen.getByText(/7日連続/)).toBeInTheDocument();
  });

  it('should not show goal_milestone events (filtered out)', () => {
    mockPendingEvents = [
      { id: 'e4', type: 'goal_milestone', message: '25%に到達', timestamp: Date.now(), dismissed: false },
    ];
    const { container } = render(<ScoreChangeIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('should not show events after they are dismissed (empty array)', () => {
    // dismissEvent は配列からイベントを完全除去するため、dismiss 後は空配列
    mockPendingEvents = [];
    const { container } = render(<ScoreChangeIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('should auto-dismiss after 5 seconds', () => {
    mockPendingEvents = [
      { id: 'e6', type: 'score_up', message: '上昇', timestamp: Date.now(), dismissed: false },
    ];
    render(<ScoreChangeIndicator />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockDismissEvent).toHaveBeenCalledWith('e6');
  });

  it('should dismiss on close button click', () => {
    mockPendingEvents = [
      { id: 'e7', type: 'score_up', message: '上昇', timestamp: Date.now(), dismissed: false },
    ];
    render(<ScoreChangeIndicator />);

    const closeBtn = screen.getByLabelText('閉じる');
    fireEvent.click(closeBtn);

    expect(mockDismissEvent).toHaveBeenCalledWith('e7');
  });

  it('should show multiple events simultaneously', () => {
    mockPendingEvents = [
      { id: 'e8', type: 'score_up', message: 'スコア上昇', timestamp: Date.now(), dismissed: false },
      { id: 'e9', type: 'rank_up', message: 'ランクアップ', timestamp: Date.now(), dismissed: false },
    ];
    render(<ScoreChangeIndicator />);
    expect(screen.getByText(/スコア上昇/)).toBeInTheDocument();
    expect(screen.getByText(/ランクアップ/)).toBeInTheDocument();
  });

  it('should have accessible role="status" and aria-live', () => {
    mockPendingEvents = [
      { id: 'e10', type: 'score_up', message: 'テスト', timestamp: Date.now(), dismissed: false },
    ];
    render(<ScoreChangeIndicator />);
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('should not dismiss after unmount (cleanup timer)', () => {
    mockPendingEvents = [
      { id: 'e11', type: 'score_up', message: 'テスト', timestamp: Date.now(), dismissed: false },
    ];
    const { unmount } = render(<ScoreChangeIndicator />);

    // 5秒経過前にアンマウント
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    unmount();

    // 残り3秒経過後もdismissEventが呼ばれない（タイマークリア済み）
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockDismissEvent).not.toHaveBeenCalled();
  });
});
