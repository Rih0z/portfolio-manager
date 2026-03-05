import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TickerSearch from '@/components/settings/TickerSearch';
import * as api from '@/services/api';

vi.mock('@/services/api');

vi.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

beforeEach(() => {
  vi.resetAllMocks();
  api.fetchTickerData.mockResolvedValue({
    success: true,
    data: {
      id: '1',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      price: 100,
      currency: 'USD',
      fundType: 'STOCK',
      hasDividend: true,
      dividendYield: 0.5,
      dividendFrequency: 'quarterly',
      dividendIsEstimated: false,
      source: 'Market Data API'
    }
  });
  api.fetchFundInfo.mockResolvedValue({ success: true, annualFee: 0 });
  api.fetchDividendData.mockResolvedValue({
    success: true,
    data: {
      hasDividend: true,
      dividendYield: 0.5,
      dividendFrequency: 'quarterly',
      dividendIsEstimated: false
    }
  });

  // Mock usePortfolioContext to provide addTicker
  usePortfolioContext.mockReturnValue({
    addTicker: vi.fn().mockResolvedValue({ success: true, message: '銘柄を追加しました' }),
  });
});

// Zustand移行後: PortfolioProvider不要。フックをモックして直接レンダリング。
test('user can add ticker via form', async () => {
  render(<TickerSearch />);
  const input = screen.getByPlaceholderText(/例: AAPL/i);
  await userEvent.type(input, 'AAPL');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(await screen.findByText('銘柄を追加しました')).toBeInTheDocument();
});
