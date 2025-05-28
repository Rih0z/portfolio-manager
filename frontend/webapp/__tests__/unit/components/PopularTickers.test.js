import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PopularTickers from '@/components/settings/PopularTickers';

jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn(),
}));

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

describe('PopularTickers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('changes category when tab clicked', async () => {
    usePortfolioContext.mockReturnValue({ addTicker: jest.fn() });
    render(<PopularTickers />);

    expect(
      screen.getByText('eMAXIS Slim 全世界株式（オール・カントリー）')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText('人気個別株'));
    expect(screen.getByText('アップル')).toBeInTheDocument();
  });

  it('calls addTicker and shows message', async () => {
    const addTicker = jest
      .fn()
      .mockResolvedValue({ success: true, message: 'ok' });
    usePortfolioContext.mockReturnValue({ addTicker });
    render(<PopularTickers />);

    await userEvent.click(
      screen.getByText('eMAXIS Slim 全世界株式（オール・カントリー）')
    );

    expect(addTicker).toHaveBeenCalled();
    expect(await screen.findByText('ok')).toBeInTheDocument();
  });
});
