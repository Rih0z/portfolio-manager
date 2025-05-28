import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllocationEditor from '@/components/settings/AllocationEditor';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('AllocationEditor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders message when no target portfolio', () => {
    usePortfolioContext.mockReturnValue({
      targetPortfolio: [],
      updateTargetAllocation: jest.fn(),
    });

    render(<AllocationEditor />);

    expect(
      screen.getByText('目標配分を設定する銘柄がありません。上部の「銘柄の追加」セクションから銘柄を追加してください。')
    ).toBeInTheDocument();
  });

  it('updates allocation on input change', async () => {
    const update = jest.fn();
    usePortfolioContext.mockReturnValue({
      targetPortfolio: [
        { id: '1', name: 'Apple', ticker: 'AAPL', targetPercentage: 30 },
      ],
      updateTargetAllocation: update,
    });

    render(<AllocationEditor />);

    const input = screen.getByDisplayValue('30');
    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, '40');

    expect(update).toHaveBeenCalledWith('1', 40);
    expect(screen.getByText('40.0%')).toBeInTheDocument();
  });

  it('auto adjusts allocations', async () => {
    const update = jest.fn();
    usePortfolioContext.mockReturnValue({
      targetPortfolio: [
        { id: '1', name: 'AAPL', ticker: 'AAPL', targetPercentage: 50 },
        { id: '2', name: 'MSFT', ticker: 'MSFT', targetPercentage: 25 },
      ],
      updateTargetAllocation: update,
    });

    render(<AllocationEditor />);

    await userEvent.click(screen.getByText('配分を自動調整'));

    expect(update).toHaveBeenCalled();
    expect(
      screen.getByText('配分比率を保持したまま調整しました')
    ).toBeInTheDocument();
  });
});
