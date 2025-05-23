import React from 'react';
import { render, screen } from '@testing-library/react';
import AssetsTable from '@/components/dashboard/AssetsTable';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('AssetsTable', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders message when there are no assets', () => {
    usePortfolioContext.mockReturnValue({
      currentAssets: [],
      targetPortfolio: [],
      baseCurrency: 'JPY',
      totalAssets: 0,
      exchangeRate: { rate: 150 },
    });

    render(<AssetsTable />);

    expect(
      screen.getByText('保有資産が設定されていません。')
    ).toBeInTheDocument();
  });
});
