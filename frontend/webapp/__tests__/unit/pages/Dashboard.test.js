import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock hooks and child components
jest.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

jest.mock('@/components/layout/DataStatusBar', () => () => <div>DataStatusBar</div>);
jest.mock('@/components/dashboard/PortfolioSummary', () => () => <div>PortfolioSummary</div>);
jest.mock('@/components/dashboard/PortfolioCharts', () => () => <div>PortfolioCharts</div>);
jest.mock('@/components/dashboard/DifferenceChart', () => () => <div>DifferenceChart</div>);
jest.mock('@/components/dashboard/AssetsTable', () => () => <div>AssetsTable</div>);

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

import Dashboard from '@/pages/Dashboard';

describe('Dashboard page', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows empty state when there are no assets', () => {
    usePortfolioContext.mockReturnValue({ currentAssets: [] });

    render(<Dashboard />);

    expect(
      screen.getByText('ポートフォリオが設定されていません')
    ).toBeInTheDocument();
  });

  it('renders dashboard components when assets exist', () => {
    usePortfolioContext.mockReturnValue({ currentAssets: [{}] });

    render(<Dashboard />);

    expect(screen.getByText('DataStatusBar')).toBeInTheDocument();
    expect(screen.getByText('PortfolioSummary')).toBeInTheDocument();
    expect(screen.getByText('PortfolioCharts')).toBeInTheDocument();
    expect(screen.getByText('DifferenceChart')).toBeInTheDocument();
    expect(screen.getByText('AssetsTable')).toBeInTheDocument();
  });
});
