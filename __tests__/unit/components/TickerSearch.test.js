import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('ティッカーシンボルを入力してください')).toBeInTheDocument();
  });

  it('validates ticker format', async () => {
    usePortfolioContext.mockReturnValue({ addTicker: jest.fn() });
    render(<TickerSearch />);

    const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
    const user = userEvent.setup();
    await user.type(input, 'invalid ticker');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('無効なティッカーシンボル形式です')).toBeInTheDocument();
  });

  it('calls addTicker and clears input on success', async () => {
    const addTicker = jest.fn().mockResolvedValue({ success: true, message: 'ok' });
    usePortfolioContext.mockReturnValue({ addTicker });
    render(<TickerSearch />);

    const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
    const user = userEvent.setup();
    await user.type(input, 'aapl');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(addTicker).toHaveBeenCalledWith('AAPL');
    expect(await screen.findByText('ok')).toBeInTheDocument();
    await screen.findByRole('button', { name: '追加' });
    expect(input.value).toBe('');
  });
});
