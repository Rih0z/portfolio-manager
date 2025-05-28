import React from 'react';
import { render, screen } from '@testing-library/react';
import PortfolioSummary from '@/components/dashboard/PortfolioSummary';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('PortfolioSummary', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders summary information', () => {
    usePortfolioContext.mockReturnValue({
      baseCurrency: 'USD',
      totalAssets: 1000,
      annualFees: 10,
      annualDividends: 20,
      currentAssets: [
        { id: 1, ticker: 'AAPL', name: 'Apple', price: 100, holdings: 5, annualFee: 0.5, dividendYield: 1, hasDividend: true, fundType: 'STOCK', currency: 'USD' },
      ],
      targetPortfolio: [
        { id: 1, ticker: 'AAPL', name: 'Apple', targetPercentage: 50 },
      ],
    });

    render(<PortfolioSummary />);

    expect(screen.getByText('ポートフォリオサマリー')).toBeInTheDocument();
    expect(screen.getByText('総資産')).toBeInTheDocument();
    expect(screen.getByText('設定銘柄数')).toBeInTheDocument();
  });
});
