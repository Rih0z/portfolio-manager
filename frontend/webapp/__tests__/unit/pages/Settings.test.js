import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/settings/TickerSearch', () => () => <div>TickerSearch</div>);
jest.mock('@/components/settings/PopularTickers', () => () => <div>PopularTickers</div>);
jest.mock('@/components/settings/HoldingsEditor', () => () => <div>HoldingsEditor</div>);
jest.mock('@/components/settings/AllocationEditor', () => () => <div>AllocationEditor</div>);
jest.mock('@/components/settings/AiPromptSettings', () => () => <div>AiPromptSettings</div>);

import Settings from '@/pages/Settings';

describe('Settings page', () => {
  it('renders all setting sections', () => {
    render(<Settings />);

    expect(screen.getByText('TickerSearch')).toBeInTheDocument();
    expect(screen.getByText('PopularTickers')).toBeInTheDocument();
    expect(screen.getByText('HoldingsEditor')).toBeInTheDocument();
    expect(screen.getByText('AllocationEditor')).toBeInTheDocument();
    expect(screen.getByText('AiPromptSettings')).toBeInTheDocument();
  });
});
