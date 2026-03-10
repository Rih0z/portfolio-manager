/**
 * PnL (損益) 計算ロジックの単体テスト
 *
 * @file __tests__/unit/utils/plCalculation.test.ts
 */

import { calculatePortfolioPnL } from '@/utils/plCalculation';
import type { PortfolioAsset, PortfolioPnL } from '@/utils/plCalculation';
import type { PriceHistoryResponse } from '@/services/priceHistoryService';

// ─── Helpers ─────────────────────────────────────────────────

function makeAsset(overrides: Partial<PortfolioAsset> = {}): PortfolioAsset {
  return {
    ticker: 'AAPL',
    name: 'Apple Inc',
    currency: 'USD',
    purchasePrice: 150,
    price: 175,
    holdings: 10,
    ...overrides,
  };
}

function makePriceHistory(ticker: string, dayAmount = 0, dayPercent = 0, ytdAmount = 0, ytdPercent = 0): Record<string, PriceHistoryResponse> {
  return {
    [ticker]: {
      ticker,
      currency: null as string | null,
      period: '1m',
      prices: [],
      change: {
        dayOverDay: { amount: dayAmount, percent: dayPercent },
        yearToDate: { amount: ytdAmount, percent: ytdPercent },
      },
    },
  };
}

// ─── 基本動作 ────────────────────────────────────────────────

describe('calculatePortfolioPnL', () => {
  it('基本的な損益を計算する', () => {
    const assets = [makeAsset()];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.totalCurrentValue).toBe(1750); // 175 * 10
    expect(result.totalInvestment).toBe(1500); // 150 * 10
    expect(result.totalPnL).toBe(250); // 1750 - 1500
    expect(result.totalPnLPercent).toBeCloseTo(16.67, 1);
    expect(result.assetsWithPurchasePrice).toBe(1);
    expect(result.assetsTotal).toBe(1);
    expect(result.isReferenceValue).toBe(true);
  });

  it('空の資産配列は全て0を返す', () => {
    const result = calculatePortfolioPnL([], {}, 'USD', 150);

    expect(result.totalCurrentValue).toBe(0);
    expect(result.totalInvestment).toBe(0);
    expect(result.totalPnL).toBe(0);
    expect(result.totalPnLPercent).toBe(0);
    expect(result.assets).toHaveLength(0);
  });

  // ─── purchasePrice 有無 ──────────────────────────────────

  it('purchasePriceがない資産はPnL計算から除外', () => {
    const assets = [
      makeAsset({ ticker: 'AAPL', purchasePrice: 150, price: 175, holdings: 10 }),
      makeAsset({ ticker: 'GOOG', purchasePrice: undefined, price: 140, holdings: 5 }),
    ];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.assetsWithPurchasePrice).toBe(1);
    expect(result.assetsTotal).toBe(2);
    expect(result.totalInvestment).toBe(1500); // AAPLのみ

    const googAsset = result.assets.find(a => a.ticker === 'GOOG');
    expect(googAsset!.pnl).toBeNull();
    expect(googAsset!.pnlPercent).toBeNull();
    expect(googAsset!.hasPurchasePrice).toBe(false);
  });

  it('purchasePriceが0の資産はhasPurchasePrice=false', () => {
    const assets = [makeAsset({ purchasePrice: 0 })];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.assets[0].hasPurchasePrice).toBe(false);
    expect(result.assets[0].pnl).toBeNull();
  });

  // ─── 通貨変換 ─────────────────────────────────────────

  it('USD→JPY変換が正しく行われる', () => {
    const assets = [makeAsset({ currency: 'USD', price: 100, holdings: 1, purchasePrice: 80 })];
    const exchangeRate = 150;
    const result = calculatePortfolioPnL(assets, {}, 'JPY', exchangeRate);

    expect(result.totalCurrentValue).toBe(15000); // 100 * 1 * 150
    expect(result.totalInvestment).toBe(12000); // 80 * 1 * 150
    expect(result.totalPnL).toBe(3000);
  });

  it('JPY→USD変換が正しく行われる', () => {
    const assets = [makeAsset({ currency: 'JPY', price: 15000, holdings: 1, purchasePrice: 12000 })];
    const exchangeRate = 150;
    const result = calculatePortfolioPnL(assets, {}, 'USD', exchangeRate);

    expect(result.totalCurrentValue).toBe(100); // 15000 / 150
    expect(result.totalInvestment).toBe(80); // 12000 / 150
    expect(result.totalPnL).toBe(20);
  });

  it('同一通貨は変換しない', () => {
    const assets = [makeAsset({ currency: 'USD', price: 100, holdings: 1, purchasePrice: 80 })];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.totalCurrentValue).toBe(100);
    expect(result.totalInvestment).toBe(80);
  });

  // ─── 前日比・年初来 ──────────────────────────────────────

  it('前日比を正しく計算する', () => {
    const assets = [makeAsset({ ticker: 'AAPL', holdings: 10 })];
    const histories = makePriceHistory('AAPL', 2.5, 1.5, 0, 0);
    const result = calculatePortfolioPnL(assets, histories, 'USD', 150);

    expect(result.totalDayChange).toBe(25); // 2.5 * 10
    expect(result.assets[0].dayChange).toBe(25);
    expect(result.assets[0].dayChangePercent).toBe(1.5);
  });

  it('年初来を正しく計算する', () => {
    const assets = [makeAsset({ ticker: 'AAPL', holdings: 10 })];
    const histories = makePriceHistory('AAPL', 0, 0, 15, 10);
    const result = calculatePortfolioPnL(assets, histories, 'USD', 150);

    expect(result.totalYtdChange).toBe(150); // 15 * 10
    expect(result.assets[0].ytdChange).toBe(150);
    expect(result.assets[0].ytdChangePercent).toBe(10);
  });

  it('価格履歴がない場合はnullを返す', () => {
    const assets = [makeAsset({ ticker: 'AAPL' })];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.assets[0].dayChange).toBeNull();
    expect(result.assets[0].dayChangePercent).toBeNull();
    expect(result.assets[0].ytdChange).toBeNull();
    expect(result.assets[0].ytdChangePercent).toBeNull();
  });

  it('前日比の通貨変換が正しく行われる', () => {
    const assets = [makeAsset({ ticker: 'AAPL', currency: 'USD', holdings: 10 })];
    const histories = makePriceHistory('AAPL', 2, 1, 0, 0);
    const result = calculatePortfolioPnL(assets, histories, 'JPY', 150);

    expect(result.totalDayChange).toBe(3000); // 2 * 10 * 150
  });

  // ─── 複数資産 ─────────────────────────────────────────

  it('複数資産の合計を正しく計算する', () => {
    const assets = [
      makeAsset({ ticker: 'AAPL', price: 175, holdings: 10, purchasePrice: 150 }),
      makeAsset({ ticker: 'GOOG', price: 140, holdings: 5, purchasePrice: 120 }),
    ];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.totalCurrentValue).toBe(2450); // 1750 + 700
    expect(result.totalInvestment).toBe(2100); // 1500 + 600
    expect(result.totalPnL).toBe(350);
    expect(result.assetsWithPurchasePrice).toBe(2);
  });

  // ─── エッジケース ─────────────────────────────────────

  it('holdingsが0の場合', () => {
    const assets = [makeAsset({ holdings: 0 })];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.totalCurrentValue).toBe(0);
  });

  it('priceが0の場合', () => {
    const assets = [makeAsset({ price: 0 })];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.totalCurrentValue).toBe(0);
  });

  it('nameがない場合tickerをnameとして使用', () => {
    const assets = [makeAsset({ name: undefined })];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.assets[0].name).toBe('AAPL');
  });

  it('currencyがない場合USDをデフォルトとする', () => {
    const assets = [makeAsset({ currency: undefined })];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.assets[0].currency).toBe('USD');
  });

  // ─── 損失ケース ────────────────────────────────────────

  it('含み損の計算が正しい', () => {
    const assets = [makeAsset({ purchasePrice: 200, price: 150, holdings: 10 })];
    const result = calculatePortfolioPnL(assets, {}, 'USD', 150);

    expect(result.totalPnL).toBe(-500); // (150 - 200) * 10
    expect(result.totalPnLPercent).toBeLessThan(0);
  });
});
