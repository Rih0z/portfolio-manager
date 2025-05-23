import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortfolioProvider } from '@/context/PortfolioContext';
import TickerSearch from '@/components/settings/TickerSearch';
import * as api from '@/services/api';

jest.mock('@/services/api');

beforeEach(() => {
  jest.resetAllMocks();
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
});

const wrapper = ({ children }) => <PortfolioProvider>{children}</PortfolioProvider>;

test('user can add ticker via form', async () => {
  render(<TickerSearch />, { wrapper });
  const input = screen.getByPlaceholderText(/例: AAPL/i);
  await userEvent.type(input, 'AAPL');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(await screen.findByText('銘柄を追加しました')).toBeInTheDocument();
});
