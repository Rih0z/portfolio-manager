/**
 * AllocationEditor smoke render tests
 *
 * 目標配分エディタの基本レンダリングと操作を検証する。
 * @file src/__tests__/unit/components/settings/AllocationEditor.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
const mockPortfolioContext: Record<string, any> = {
  targetPortfolio: [],
  updateTargetAllocation: vi.fn(),
};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

import AllocationEditor from '../../../../components/settings/AllocationEditor';

describe('AllocationEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioContext.targetPortfolio = [];
    mockPortfolioContext.updateTargetAllocation = vi.fn();
  });

  it('should render empty state when no target portfolio items', () => {
    render(<AllocationEditor />);
    expect(
      screen.getByText(/目標配分を設定する銘柄がありません/)
    ).toBeInTheDocument();
  });

  it('should render allocation items when portfolio has entries', () => {
    mockPortfolioContext.targetPortfolio = [
      { id: 'item-1', name: 'Vanguard S&P 500 ETF', ticker: 'VOO', targetPercentage: 60 },
      { id: 'item-2', name: 'Vanguard Total Stock Market', ticker: 'VTI', targetPercentage: 40 },
    ];

    render(<AllocationEditor />);
    expect(screen.getByText('Vanguard S&P 500 ETF')).toBeInTheDocument();
    expect(screen.getByText('Vanguard Total Stock Market')).toBeInTheDocument();
  });

  it('should display total allocation percentage', () => {
    mockPortfolioContext.targetPortfolio = [
      { id: 'item-1', name: 'VOO', ticker: 'VOO', targetPercentage: 60 },
      { id: 'item-2', name: 'VTI', ticker: 'VTI', targetPercentage: 40 },
    ];

    render(<AllocationEditor />);
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('should render auto-adjust button', () => {
    mockPortfolioContext.targetPortfolio = [
      { id: 'item-1', name: 'VOO', ticker: 'VOO', targetPercentage: 50 },
    ];

    render(<AllocationEditor />);
    expect(screen.getByText('配分を自動調整')).toBeInTheDocument();
  });

  it('should call updateTargetAllocation when input value changes', () => {
    mockPortfolioContext.targetPortfolio = [
      { id: 'item-1', name: 'VOO', ticker: 'VOO', targetPercentage: 50 },
    ];

    render(<AllocationEditor />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '75' } });
    expect(mockPortfolioContext.updateTargetAllocation).toHaveBeenCalledWith(
      'item-1',
      75
    );
  });

  it('should show message when auto-adjust is clicked and already at 100%', () => {
    mockPortfolioContext.targetPortfolio = [
      { id: 'item-1', name: 'VOO', ticker: 'VOO', targetPercentage: 100 },
    ];

    render(<AllocationEditor />);
    fireEvent.click(screen.getByText('配分を自動調整'));
    expect(screen.getByText('既に100%になっています')).toBeInTheDocument();
  });
});
