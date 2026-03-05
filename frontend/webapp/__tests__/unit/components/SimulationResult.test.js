import React from 'react';
import { render, screen } from '@testing-library/react';
import SimulationResult from '@/components/simulation/SimulationResult';

vi.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('SimulationResult', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders message when no results', () => {
    usePortfolioContext.mockReturnValue({
      baseCurrency: 'USD',
      exchangeRate: { rate: 150 },
      calculateSimulation: () => [],
      executePurchase: vi.fn(),
    });

    render(<SimulationResult />);

    expect(screen.getByText('シミュレーション結果がありません')).toBeInTheDocument();
  });

  it('renders table when results exist', () => {
    usePortfolioContext.mockReturnValue({
      baseCurrency: 'USD',
      exchangeRate: { rate: 150 },
      calculateSimulation: () => [
        {
          id: '1',
          ticker: 'AAPL',
          name: 'Apple',
          price: 100,
          currency: 'USD',
          currentValue: 100,
          currentAllocation: 50,
          targetAllocation: 60,
          diff: 10,
          purchaseShares: 1,
          purchaseAmount: 100,
        },
      ],
      executePurchase: vi.fn(),
    });

    render(<SimulationResult />);

    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });
});
