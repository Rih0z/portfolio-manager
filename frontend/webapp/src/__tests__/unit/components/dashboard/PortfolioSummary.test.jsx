/**
 * PortfolioSummary.jsx のユニットテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import PortfolioSummary from '../../../../components/dashboard/PortfolioSummary';

const renderWithProviders = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

const mockPortfolioData = {
  currentAssets: [
    { ticker: 'AAPL', shares: 10, currentPrice: 150, value: 1500, currency: 'USD' },
    { ticker: 'GOOGL', shares: 5, currentPrice: 2500, value: 12500, currency: 'USD' },
    { ticker: '7203.T', shares: 100, currentPrice: 2800, value: 280000, currency: 'JPY' }
  ],
  targetPortfolio: [
    { ticker: 'AAPL', allocation: 30 },
    { ticker: 'GOOGL', allocation: 40 },
    { ticker: '7203.T', allocation: 30 }
  ],
  settings: {
    baseCurrency: 'JPY',
    exchangeRate: 150
  }
};

describe('PortfolioSummary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing with empty data', () => {
    renderWithProviders(<PortfolioSummary />);
    expect(screen.getByText(/ポートフォリオ概要|Portfolio Summary/i)).toBeInTheDocument();
  });

  it('displays portfolio data correctly', () => {
    renderWithProviders(
      <PortfolioSummary 
        currentAssets={mockPortfolioData.currentAssets}
        targetPortfolio={mockPortfolioData.targetPortfolio}
        settings={mockPortfolioData.settings}
      />
    );
    
    // ポートフォリオ概要が表示されることを確認
    expect(screen.getByText(/ポートフォリオ概要|Portfolio Summary/i)).toBeInTheDocument();
  });

  it('calculates total value correctly', () => {
    renderWithProviders(
      <PortfolioSummary 
        currentAssets={mockPortfolioData.currentAssets}
        targetPortfolio={mockPortfolioData.targetPortfolio}
        settings={mockPortfolioData.settings}
      />
    );
    
    // 合計値の計算結果が表示されることを期待
    // USD資産: $14,000 = ¥2,100,000
    // JPY資産: ¥280,000
    // 合計: ¥2,380,000
    expect(screen.getByText(/2,380,000|¥2,380,000/)).toBeInTheDocument();
  });

  it('displays currency information', () => {
    renderWithProviders(
      <PortfolioSummary 
        currentAssets={mockPortfolioData.currentAssets}
        targetPortfolio={mockPortfolioData.targetPortfolio}
        settings={mockPortfolioData.settings}
      />
    );
    
    // 通貨情報が表示されることを確認
    expect(screen.getByText(/JPY|¥/)).toBeInTheDocument();
  });

  it('handles different currencies', () => {
    const usdSettings = { ...mockPortfolioData.settings, baseCurrency: 'USD' };
    renderWithProviders(
      <PortfolioSummary 
        currentAssets={mockPortfolioData.currentAssets}
        targetPortfolio={mockPortfolioData.targetPortfolio}
        settings={usdSettings}
      />
    );
    
    // USD表示の場合の動作を確認
    expect(screen.getByText(/\$|USD/)).toBeInTheDocument();
  });

  it('shows allocation percentages', () => {
    renderWithProviders(
      <PortfolioSummary 
        currentAssets={mockPortfolioData.currentAssets}
        targetPortfolio={mockPortfolioData.targetPortfolio}
        settings={mockPortfolioData.settings}
      />
    );
    
    // アロケーション比率が表示されることを確認
    expect(screen.getByText(/30%/)).toBeInTheDocument();
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });

  it('handles empty portfolio data gracefully', () => {
    renderWithProviders(
      <PortfolioSummary 
        currentAssets={[]}
        targetPortfolio={[]}
        settings={{}}
      />
    );
    
    // 空のデータでもエラーが発生しないことを確認
    expect(screen.getByText(/ポートフォリオ概要|Portfolio Summary/i)).toBeInTheDocument();
  });

  it('provides accessibility features', () => {
    renderWithProviders(
      <PortfolioSummary 
        currentAssets={mockPortfolioData.currentAssets}
        targetPortfolio={mockPortfolioData.targetPortfolio}
        settings={mockPortfolioData.settings}
      />
    );
    
    // セクション要素が適切に設定されていることを確認
    const summarySection = screen.getByRole('region');
    expect(summarySection).toBeInTheDocument();
  });
});