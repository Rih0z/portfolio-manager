import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortfolioContext } from '@/context/PortfolioContext';

jest.mock('@/components/simulation/BudgetInput', () => () => <div>BudgetInput</div>);
jest.mock('@/components/simulation/SimulationResult', () => () => <div>SimulationResult</div>);
jest.mock('@/components/simulation/AiAnalysisPrompt', () => () => <div>AiAnalysisPrompt</div>);

import Simulation from '@/pages/Simulation';

describe('Simulation page', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays formatted asset values and handles batch purchase', async () => {
    const calculateSimulation = jest.fn().mockReturnValue([{ id: 1 }]);
    const executeBatchPurchase = jest.fn();
    const contextValue = {
      totalAssets: 1000,
      additionalBudget: { amount: 500, currency: 'USD' },
      calculateSimulation,
      executeBatchPurchase,
      baseCurrency: 'USD'
    };

    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();

    const user = userEvent.setup();

    render(
      <PortfolioContext.Provider value={contextValue}>
        <Simulation />
      </PortfolioContext.Provider>
    );

    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();

    await user.click(screen.getByText('一括購入実行'));

    expect(executeBatchPurchase).toHaveBeenCalledWith(calculateSimulation());
  });
});
