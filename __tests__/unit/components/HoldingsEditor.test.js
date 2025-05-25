import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HoldingsEditor from '@/components/settings/HoldingsEditor';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

jest.mock('@/utils/formatters', () => ({
  formatCurrency: (v) => `¥${v}`,
  formatPercent: (v) => `${v}%`,
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('HoldingsEditor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders message when no assets', () => {
    usePortfolioContext.mockReturnValue({
      currentAssets: [],
      baseCurrency: 'JPY',
      exchangeRate: { rate: 150 },
    });

    render(<HoldingsEditor />);

    expect(
      screen.getByText('保有資産が設定されていません。上部の「銘柄の追加」セクションから銘柄を追加してください。')
    ).toBeInTheDocument();
  });

  it('increments holdings via button', async () => {
    const update = jest.fn();
    usePortfolioContext.mockReturnValue({
      currentAssets: [
        {
          id: '1',
          name: 'AAPL',
          ticker: 'AAPL',
          holdings: 0,
          price: 100,
          currency: 'USD',
          fundType: 'STOCK',
          annualFee: 0,
          dividendYield: 0,
          hasDividend: false,
        },
      ],
      baseCurrency: 'USD',
      exchangeRate: { rate: 150 },
      updateHoldings: update,
      removeTicker: jest.fn(),
    });

    render(<HoldingsEditor />);

    await userEvent.click(screen.getByText('+'));

    expect(update).toHaveBeenCalledWith('1', 1);
  });

  it('saves edited holdings', async () => {
    const update = jest.fn();
    usePortfolioContext.mockReturnValue({
      currentAssets: [
        {
          id: '1',
          name: 'AAPL',
          ticker: 'AAPL',
          holdings: 2,
          price: 100,
          currency: 'USD',
          fundType: 'STOCK',
          annualFee: 0,
          dividendYield: 0,
          hasDividend: false,
        },
      ],
      baseCurrency: 'USD',
      exchangeRate: { rate: 150 },
      updateHoldings: update,
      removeTicker: jest.fn(),
    });

    render(<HoldingsEditor />);

    await userEvent.click(screen.getByText('編集'));
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '3.5');
    await userEvent.click(screen.getByText('保存'));

    expect(update).toHaveBeenCalledWith('1', 3.5);
  });
});
