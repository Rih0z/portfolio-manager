import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetInput from '@/components/simulation/BudgetInput';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('BudgetInput', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates amount when increase and decrease buttons clicked', async () => {
    const setAdditionalBudget = jest.fn();
    usePortfolioContext.mockReturnValue({
      additionalBudget: { amount: 1000, currency: 'USD' },
      setAdditionalBudget,
      baseCurrency: 'USD',
    });

    render(<BudgetInput />);
    const input = screen.getByLabelText('追加予算');
    const incButton = screen.getByLabelText('予算を増やす');
    const decButton = screen.getByLabelText('予算を減らす');

    const user = userEvent.setup();
    await user.click(incButton);
    expect(input.value).toBe('1100');
    await user.click(decButton);
    expect(input.value).toBe('1000');

    await user.click(screen.getByText('適用'));
    expect(setAdditionalBudget).toHaveBeenCalledWith(1000, 'USD');
  });
});
