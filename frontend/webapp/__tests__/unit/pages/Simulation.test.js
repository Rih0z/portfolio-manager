import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn(),
}));

vi.mock('@/components/simulation/BudgetInput', () => ({ default: () => <div>BudgetInput</div> }));
vi.mock('@/components/simulation/SimulationResult', () => ({ default: () => <div>SimulationResult</div> }));
vi.mock('@/components/simulation/AiAnalysisPrompt', () => ({ default: () => <div>AiAnalysisPrompt</div> }));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

import Simulation from '@/pages/Simulation';

describe('Simulation page', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('displays formatted asset values and handles batch purchase', async () => {
    const calculateSimulation = vi.fn().mockReturnValue([{ id: 1 }]);
    const executeBatchPurchase = vi.fn();

    usePortfolioContext.mockReturnValue({
      totalAssets: 1000,
      additionalBudget: { amount: 500, currency: 'USD' },
      calculateSimulation,
      executeBatchPurchase,
      baseCurrency: 'USD'
    });

    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();

    const user = userEvent.setup();

    render(<Simulation />);

    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();

    await user.click(screen.getByText('一括購入実行'));

    expect(executeBatchPurchase).toHaveBeenCalledWith(calculateSimulation());
  });
});
