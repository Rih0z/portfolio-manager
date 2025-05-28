import React from 'react';
import { render, screen } from '@testing-library/react';
import DifferenceChart from '@/components/dashboard/DifferenceChart';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

jest.mock('recharts', () => {
  const Original = jest.requireActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar"></div>,
    CartesianGrid: () => <div data-testid="grid"></div>,
    XAxis: () => <div data-testid="x"></div>,
    YAxis: () => <div data-testid="y"></div>,
    Tooltip: () => <div data-testid="tooltip"></div>,
  };
});

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('DifferenceChart', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders placeholder when no data', () => {
    usePortfolioContext.mockReturnValue({
      currentAssets: [],
      targetPortfolio: [],
      baseCurrency: 'USD',
      totalAssets: 0,
      exchangeRate: { rate: 150 },
    });

    render(<DifferenceChart />);

    expect(screen.getByText('表示するデータがありません。目標配分を設定してください。')).toBeInTheDocument();
  });

  it('renders chart when data exists', () => {
    usePortfolioContext.mockReturnValue({
      currentAssets: [
        { id: 1, ticker: 'AAPL', name: 'Apple', price: 100, holdings: 5, currency: 'USD' },
      ],
      targetPortfolio: [
        { id: 1, ticker: 'AAPL', name: 'Apple', targetPercentage: 60 },
      ],
      baseCurrency: 'USD',
      totalAssets: 500,
      exchangeRate: { rate: 150 },
    });

    render(<DifferenceChart />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
