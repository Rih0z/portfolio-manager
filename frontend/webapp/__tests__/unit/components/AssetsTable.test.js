import React from 'react';
import { render, screen } from '@testing-library/react';
import AssetsTable from '@/components/dashboard/AssetsTable';

vi.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('AssetsTable', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
