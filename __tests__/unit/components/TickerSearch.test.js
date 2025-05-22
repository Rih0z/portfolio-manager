import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TickerSearch from '@/components/settings/TickerSearch';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('TickerSearch', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('validates empty input', async () => {
    usePortfolioContext.mockReturnValue({ addTicker: jest.fn() });
    render(<TickerSearch />);

    await userEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(screen.getByText('ティッカーシンボルを入力してください')).toBeInTheDocument();
  });

  it('validates ticker format', async () => {
    usePortfolioContext.mockReturnValue({ addTicker: jest.fn() });
    render(<TickerSearch />);

    const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
    await userEvent.type(input, 'invalid ticker');
    await userEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(screen.getByText('無効なティッカーシンボル形式です')).toBeInTheDocument();
  });

  it('calls addTicker and clears input on success', async () => {
    const addTicker = jest.fn().mockResolvedValue({ success: true, message: 'ok' });
    usePortfolioContext.mockReturnValue({ addTicker });
    render(<TickerSearch />);

    const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
    await userEvent.type(input, 'aapl');
    await userEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(addTicker).toHaveBeenCalledWith('AAPL');
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(input.value).toBe('');
  });
});
