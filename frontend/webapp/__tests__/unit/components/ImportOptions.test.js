import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportOptions from '@/components/data/ImportOptions';

vi.mock('papaparse', () => ({
  parse: jest.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');
const Papa = require('papaparse');

describe('ImportOptions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('imports data from text input', async () => {
    const importPortfolioData = vi.fn();
    usePortfolioContext.mockReturnValue({ importPortfolioData });

    render(<ImportOptions />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: 'テキスト入力' }));
    const textarea = screen.getByLabelText('データを貼り付け');
    await user.type(textarea, '{"currentAssets":[],"targetPortfolio":[]}');
    await user.click(screen.getByRole('button', { name: 'インポート' }));

    expect(importPortfolioData).toHaveBeenCalled();
    expect(Papa.parse).not.toHaveBeenCalled();
  });
});
