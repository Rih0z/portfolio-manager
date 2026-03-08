/**
 * TickerSearch smoke render tests
 *
 * ティッカー検索コンポーネントの基本レンダリングと操作を検証する。
 * @file src/__tests__/unit/components/settings/TickerSearch.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// --- Mock dependencies ---
const mockPortfolioContext: Record<string, any> = {
  addTicker: vi.fn(),
};

vi.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext,
}));

vi.mock('../../../../utils/japaneseStockNames', () => ({
  getJapaneseStockName: (code: string) => {
    const names: Record<string, string> = {
      '7203': 'トヨタ自動車',
      '9984': 'ソフトバンクグループ',
      '0331418A': 'eMAXIS Slim 全世界株式',
      '03311187': 'eMAXIS Slim 米国株式',
    };
    return names[code] || code;
  },
}));

vi.mock('../../../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import TickerSearch from '../../../../components/settings/TickerSearch';

describe('TickerSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioContext.addTicker = vi.fn().mockResolvedValue({
      success: true,
      message: '銘柄を追加しました',
    });
  });

  it('should render input and submit button', () => {
    render(<TickerSearch />);
    expect(
      screen.getByPlaceholderText('例: AAPL, 7203.T')
    ).toBeInTheDocument();
    expect(screen.getByText('追加')).toBeInTheDocument();
  });

  it('should render example tickers', () => {
    render(<TickerSearch />);
    expect(screen.getByText(/米国株:/)).toBeInTheDocument();
    expect(screen.getByText(/日本株:/)).toBeInTheDocument();
    expect(screen.getByText(/投資信託:/)).toBeInTheDocument();
  });

  it('should show error when empty ticker is submitted', () => {
    render(<TickerSearch />);
    fireEvent.submit(screen.getByText('追加').closest('form')!);
    expect(
      screen.getByText('ティッカーシンボルを入力してください')
    ).toBeInTheDocument();
  });

  it('should show error for invalid ticker format', () => {
    render(<TickerSearch />);
    const input = screen.getByPlaceholderText('例: AAPL, 7203.T');
    fireEvent.change(input, { target: { value: '!!!invalid!!!' } });
    fireEvent.submit(screen.getByText('追加').closest('form')!);
    expect(
      screen.getByText('無効なティッカーシンボル形式です')
    ).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<TickerSearch />);
    const input = screen.getByLabelText('ティッカーシンボルを入力');
    expect(input).toBeInTheDocument();
  });
});
