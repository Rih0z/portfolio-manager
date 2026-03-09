import { vi } from "vitest";
/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/__tests__/unit/components/MarketSelectionWizard.test.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * MarketSelectionWizardコンポーネントのユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../mocks/i18n';
import MarketSelectionWizard, { INVESTMENT_MARKETS } from '../../../components/settings/MarketSelectionWizard';

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

describe('MarketSelectionWizard', () => {
  const mockOnMarketsChange = vi.fn();

  beforeEach(() => {
    mockOnMarketsChange.mockClear();
  });

  test('renders market selection cards', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    // 各市場のカードが表示されることを確認
    expect(screen.getByText('米国市場')).toBeInTheDocument();
    expect(screen.getByText('日本市場')).toBeInTheDocument();
    expect(screen.getByText('全世界')).toBeInTheDocument();
    expect(screen.getByText('REIT')).toBeInTheDocument();
    expect(screen.getByText('仮想通貨')).toBeInTheDocument();
    expect(screen.getByText('債券')).toBeInTheDocument();
  });

  test('displays title when showTitle is true', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
          showTitle={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('どの市場に投資したいですか？')).toBeInTheDocument();
  });

  test('hides title when showTitle is false', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
          showTitle={false}
        />
      </TestWrapper>
    );

    expect(screen.queryByText('どの市場に投資したいですか？')).not.toBeInTheDocument();
  });

  test('shows popular combinations when showPopularCombinations is true', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
          showPopularCombinations={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('人気の組み合わせ:')).toBeInTheDocument();
    expect(screen.getByText('米国 + 日本')).toBeInTheDocument();
  });

  test('handles market selection correctly', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    // 米国市場を選択
    const usMarketButton = screen.getByText('米国市場').closest('button');
    fireEvent.click(usMarketButton);

    expect(mockOnMarketsChange).toHaveBeenCalledWith(['US']);
  });

  test('handles market deselection correctly', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard
          selectedMarkets={['US']}
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    // 既に選択されている米国市場を再度クリックして選択解除
    // selectedMarkets={['US']}の場合、米国市場は市場カードと選択サマリーの両方に表示される
    const usMarketButtons = screen.getAllByText('米国市場');
    const usMarketButton = usMarketButtons[0].closest('button');
    fireEvent.click(usMarketButton);

    expect(mockOnMarketsChange).toHaveBeenCalledWith([]);
  });

  test('handles multiple market selection correctly', () => {
    const { rerender } = render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    // 米国市場を選択
    const usMarketButton = screen.getByText('米国市場').closest('button');
    fireEvent.click(usMarketButton);

    expect(mockOnMarketsChange).toHaveBeenCalledWith(['US']);

    // コンポーネントを再レンダリングして状態を更新
    rerender(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={['US']} 
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    // 日本市場を追加選択
    const japanMarketButton = screen.getByText('日本市場').closest('button');
    fireEvent.click(japanMarketButton);

    expect(mockOnMarketsChange).toHaveBeenCalledWith(['US', 'JAPAN']);
  });

  test('handles popular combination selection correctly', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    // 人気の組み合わせ「米国 + 日本」を選択
    const popularComboButton = screen.getByText('米国 + 日本').closest('button');
    fireEvent.click(popularComboButton);

    expect(mockOnMarketsChange).toHaveBeenCalledWith(['US', 'JAPAN']);
  });

  test('displays selection summary when markets are selected', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard
          selectedMarkets={['US', 'JAPAN']}
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    expect(screen.getByText('選択された市場:')).toBeInTheDocument();
    // 米国市場・日本市場は市場カードと選択サマリーの両方に表示される
    expect(screen.getAllByText('米国市場').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('日本市場').length).toBeGreaterThanOrEqual(2);
  });

  test('shows selected state for markets', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard
          selectedMarkets={['US']}
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    // selectedMarkets={['US']}の場合、米国市場は市場カードと選択サマリーの両方に表示される
    const usMarketElements = screen.getAllByText('米国市場');
    const usMarketButton = usMarketElements[0].closest('button');
    expect(usMarketButton).toHaveClass('scale-105');
  });

  test('displays market examples correctly', () => {
    render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
        />
      </TestWrapper>
    );

    // 米国市場の例が表示されることを確認
    expect(screen.getByText('S&P500')).toBeInTheDocument();
    expect(screen.getByText('NASDAQ')).toBeInTheDocument();
    expect(screen.getByText('個別米国株')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <TestWrapper>
        <MarketSelectionWizard 
          selectedMarkets={[]} 
          onMarketsChange={mockOnMarketsChange}
          className="custom-class"
        />
      </TestWrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('INVESTMENT_MARKETS constant has correct structure', () => {
    // 全ての市場が必要なプロパティを持っていることを確認
    Object.values(INVESTMENT_MARKETS).forEach(market => {
      expect(market).toHaveProperty('id');
      expect(market).toHaveProperty('name');
      expect(market).toHaveProperty('nameEn');
      expect(market).toHaveProperty('iconKey');
      expect(market).toHaveProperty('examples');
      expect(market).toHaveProperty('examplesEn');
      expect(market).toHaveProperty('japanAvailable');
      expect(market).toHaveProperty('color');
    });
  });

  test('all markets are available in Japan', () => {
    Object.values(INVESTMENT_MARKETS).forEach(market => {
      expect(market.japanAvailable).toBe(true);
    });
  });
});