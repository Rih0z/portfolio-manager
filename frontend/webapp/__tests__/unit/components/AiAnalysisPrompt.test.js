import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiAnalysisPrompt from '@/components/simulation/AiAnalysisPrompt';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('AiAnalysisPrompt', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue() },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('copies prompt to clipboard', async () => {
    usePortfolioContext.mockReturnValue({
      currentAssets: [],
      targetPortfolio: [],
      additionalBudget: { amount: 0, currency: 'USD' },
      baseCurrency: 'USD',
      exchangeRate: { rate: 150 },
      totalAssets: 0,
    });

    render(<AiAnalysisPrompt />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'プロンプトをコピー' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(screen.getByText('コピー完了')).toBeInTheDocument();
  });
});
