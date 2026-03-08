/**
 * PopularTickers smoke render tests
 *
 * 人気銘柄コンポーネントの基本レンダリングを検証する。
 * @file src/__tests__/unit/components/settings/PopularTickers.test.tsx
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
      '0331418A': 'eMAXIS Slim 全世界株式',
      '03311187': 'eMAXIS Slim 米国株式',
      '0331119A': 'eMAXIS Slim 先進国株式',
      '9C31116A': 'SBI・V・S&P500',
      '89311199': 'SBI・V・全世界株式',
      '9I311179': '楽天・全米株式',
      '7203': 'トヨタ自動車',
      '9984': 'ソフトバンクグループ',
      '6758': 'ソニーグループ',
      '8306': '三菱UFJフィナンシャル',
      '9433': 'KDDI',
      '6861': 'キーエンス',
      '9432': 'NTT',
      '7974': '任天堂',
      '6501': '日立製作所',
      '4502': '武田薬品工業',
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

import PopularTickers from '../../../../components/settings/PopularTickers';

describe('PopularTickers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioContext.addTicker = vi.fn().mockResolvedValue({
      success: true,
      message: '追加しました',
    });
  });

  it('should render category tabs', () => {
    render(<PopularTickers />);
    expect(screen.getByText('日本投資信託')).toBeInTheDocument();
    expect(screen.getByText('米国ETF')).toBeInTheDocument();
    expect(screen.getByText('米国個別株')).toBeInTheDocument();
    expect(screen.getByText('日本個別株')).toBeInTheDocument();
  });

  it('should display Japanese mutual funds by default', () => {
    render(<PopularTickers />);
    expect(screen.getByText('0331418A')).toBeInTheDocument();
  });

  it('should switch to US ETFs category', () => {
    render(<PopularTickers />);
    fireEvent.click(screen.getByText('米国ETF'));
    expect(screen.getByText('VOO')).toBeInTheDocument();
    expect(screen.getByText('Vanguard S&P 500 ETF')).toBeInTheDocument();
  });

  it('should switch to US stocks category', () => {
    render(<PopularTickers />);
    fireEvent.click(screen.getByText('米国個別株'));
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('アップル')).toBeInTheDocument();
  });

  it('should switch to Japanese stocks category', () => {
    render(<PopularTickers />);
    fireEvent.click(screen.getByText('日本個別株'));
    expect(screen.getByText('7203.T')).toBeInTheDocument();
  });
});
