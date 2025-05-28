import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import App from '@/App';
import * as api from '@/services/api';

jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => <div>{children}</div>,
  GoogleLogin: ({ onSuccess }) => (
    <button onClick={() => onSuccess({ code: 'abc' })}>GoogleLogin</button>
  )
}));

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

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('user can add ticker after login', async () => {
  render(<App />);

  await userEvent.click(screen.getByText('GoogleLogin'));
  expect(await screen.findByText('テストユーザー')).toBeInTheDocument();

  await userEvent.click(screen.getByText('設定'));
  const input = await screen.findByPlaceholderText(/例: AAPL/i);
  await userEvent.type(input, 'AAPL');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));

  expect(await screen.findByText('銘柄を追加しました')).toBeInTheDocument();
});
