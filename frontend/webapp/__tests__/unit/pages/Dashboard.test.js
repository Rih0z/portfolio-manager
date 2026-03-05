import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock hooks and child components
vi.mock('@/hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

vi.mock('@/components/layout/DataStatusBar', () => () => <div>DataStatusBar</div>);
vi.mock('@/components/dashboard/PortfolioSummary', () => () => <div>PortfolioSummary</div>);
vi.mock('@/components/dashboard/PortfolioCharts', () => () => <div>PortfolioCharts</div>);
vi.mock('@/components/dashboard/DifferenceChart', () => () => <div>DifferenceChart</div>);
vi.mock('@/components/dashboard/AssetsTable', () => () => <div>AssetsTable</div>);

const { usePortfolioContext } = require('@/hooks/usePortfolioContext');

import Dashboard from '@/pages/Dashboard';

describe('Dashboard page', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
