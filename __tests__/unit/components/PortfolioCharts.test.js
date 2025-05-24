import React from 'react';
import { render, screen } from '@testing-library/react';
import PortfolioCharts from '@/components/dashboard/PortfolioCharts';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

// Mock recharts similar to Chart tests
jest.mock('recharts', () => {
  const Original = jest.requireActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children }) => <div data-testid="pie">{children}</div>,
    Cell: ({ fill }) => <div data-testid="cell" style={{ backgroundColor: fill }}></div>,
    Tooltip: () => <div data-testid="tooltip"></div>,
    Legend: () => <div data-testid="legend"></div>,
  };
});

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('PortfolioCharts', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders two pie charts', () => {
    usePortfolioContext.mockReturnValue({
      currentAssets: [
        { ticker: 'AAPL', name: 'Apple', price: 100, holdings: 5, currency: 'USD' },
      ],
      targetPortfolio: [
        { ticker: 'AAPL', name: 'Apple', targetPercentage: 50 },
      ],
      baseCurrency: 'USD',
      totalAssets: 500,
      exchangeRate: { rate: 150 },
    });

    render(<PortfolioCharts />);

    expect(screen.getAllByTestId('pie-chart')).toHaveLength(2);
    expect(screen.getByText('理想配分')).toBeInTheDocument();
    expect(screen.getByText('現在配分')).toBeInTheDocument();
  });
});
