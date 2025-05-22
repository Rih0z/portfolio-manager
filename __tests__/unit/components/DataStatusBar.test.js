import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataStatusBar from '@/components/layout/DataStatusBar';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('DataStatusBar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows warning when data is not updated', () => {
    usePortfolioContext.mockReturnValue({
      lastUpdated: null,
      exchangeRate: null,
      baseCurrency: 'JPY',
      refreshMarketPrices: jest.fn(),
      isLoading: false
    });

    render(<DataStatusBar />);

    expect(screen.getByText('未取得')).toBeInTheDocument();
    expect(screen.getByText('データの更新が必要です')).toBeInTheDocument();
  });

  it('calls refreshMarketPrices on button click', async () => {
    const refreshMarketPrices = jest.fn();
    usePortfolioContext.mockReturnValue({
      lastUpdated: new Date().toISOString(),
      exchangeRate: { rate: 150, source: 'Test' },
      baseCurrency: 'JPY',
      refreshMarketPrices,
      isLoading: false
    });

    render(<DataStatusBar />);

    await userEvent.click(screen.getByText('更新'));
    expect(refreshMarketPrices).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    usePortfolioContext.mockReturnValue({
      lastUpdated: new Date().toISOString(),
      exchangeRate: { rate: 150, source: 'Test' },
      baseCurrency: 'JPY',
      refreshMarketPrices: jest.fn(),
      isLoading: true
    });

    render(<DataStatusBar />);

    expect(screen.getByText('更新中...')).toBeInTheDocument();
  });
});
