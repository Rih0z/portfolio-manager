import { setupServer } from 'msw/node';
import { handlers } from '../../mocks/handlers';
import { fetchMultipleStocks } from '@/services/marketDataService';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetchMultipleStocks retrieves data for multiple tickers', async () => {
  const result = await fetchMultipleStocks(['AAPL', '7203.T']);
  expect(result.success).toBe(true);
  expect(result.data).toHaveProperty('AAPL');
  expect(result.data).toHaveProperty('7203.T');
});
