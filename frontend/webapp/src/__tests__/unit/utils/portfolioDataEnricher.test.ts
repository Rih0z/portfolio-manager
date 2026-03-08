/**
 * ポートフォリオデータエンリッチャーの単体テスト
 *
 * @file __tests__/unit/utils/portfolioDataEnricher.test.ts
 */

import { enrichPortfolioData } from '@/utils/portfolioDataEnricher';
import type { EnrichedPortfolioData } from '@/utils/portfolioDataEnricher';

// ─── Helpers ─────────────────────────────────────────────────

function makeAsset(overrides: Record<string, any> = {}) {
  return {
    id: 'AAPL',
    ticker: 'AAPL',
    name: 'Apple Inc',
    currency: 'USD',
    price: 175,
    holdings: 10,
    purchasePrice: 150,
    annualFee: 0.03,
    fundType: 'ETF/個別株',
    ...overrides,
  };
}

function makeTarget(ticker: string, targetPercentage: number) {
  return { id: ticker, ticker, targetPercentage };
}

function makePriceHistory(ticker: string, dayAmount = 2, dayPercent = 1, ytdAmount = 10, ytdPercent = 5) {
  return {
    [ticker]: {
      ticker,
      prices: [],
      change: {
        dayOverDay: { amount: dayAmount, percent: dayPercent },
        yearToDate: { amount: ytdAmount, percent: ytdPercent },
      },
    },
  };
}

// ─── 基本動作 ────────────────────────────────────────────────

describe('enrichPortfolioData', () => {
  it('全フィールドを含むEnrichedPortfolioDataを返す', () => {
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('pnl');
    expect(result).toHaveProperty('holdings');
    expect(result).toHaveProperty('targets');
    expect(result).toHaveProperty('strengthLine');
    expect(result).toHaveProperty('weaknessLine');
  });

  it('null/undefinedの引数を安全に処理する', () => {
    const result = enrichPortfolioData(null as any, null as any, false, 'USD', 150);

    expect(result.holdings.count).toBe(0);
    expect(result.score.totalScore).toBeLessThan(50);
  });

  // ─── Score ──────────────────────────────────────────────

  it('スコア情報を含む', () => {
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.score.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.score.totalScore).toBeLessThanOrEqual(100);
    expect(typeof result.score.grade).toBe('string');
    expect(result.score.strongest).toHaveProperty('id');
    expect(result.score.weakest).toHaveProperty('id');
    expect(result.score.metrics.length).toBeGreaterThan(0);
  });

  it('Freeプランではメトリクスが3つに制限される', () => {
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.score.metrics.length).toBe(3);
  });

  it('Premiumプランでは全8メトリクスを含む', () => {
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], true, 'USD', 150);

    expect(result.score.metrics.length).toBe(8);
  });

  // ─── PnL ────────────────────────────────────────────────

  it('価格履歴がない場合pnl.available=false', () => {
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.pnl.available).toBe(false);
  });

  it('価格履歴がある場合PnLを計算する', () => {
    const assets = [makeAsset({ ticker: 'AAPL' })];
    const histories = makePriceHistory('AAPL');
    const result = enrichPortfolioData(assets, [], false, 'USD', 150, histories);

    expect(result.pnl.available).toBe(true);
    expect(result.pnl.totalInvestment).toBe(1500);
    expect(result.pnl.totalCurrentValue).toBe(1750);
    expect(result.pnl.totalPnL).toBe(250);
  });

  it('topGainersとtopLosersを正しくソートする', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 200, holdings: 1, purchasePrice: 100 }),
      makeAsset({ id: 'B', ticker: 'B', price: 50, holdings: 1, purchasePrice: 100 }),
      makeAsset({ id: 'C', ticker: 'C', price: 120, holdings: 1, purchasePrice: 100 }),
    ];
    const histories = {
      ...makePriceHistory('A'),
      ...makePriceHistory('B'),
      ...makePriceHistory('C'),
    };
    const result = enrichPortfolioData(assets, [], false, 'USD', 150, histories);

    expect(result.pnl.topGainers.length).toBeGreaterThan(0);
    expect(result.pnl.topGainers[0].pnlPercent).toBeGreaterThan(0);
    expect(result.pnl.topLosers.length).toBeGreaterThan(0);
    expect(result.pnl.topLosers[0].pnlPercent).toBeLessThan(0);
  });

  // ─── Holdings ───────────────────────────────────────────

  it('保有情報を正しく集計する', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' }),
      makeAsset({ id: 'B', ticker: '7203', price: 2500, holdings: 100, currency: 'JPY' }),
    ];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.holdings.count).toBe(2);
    expect(result.holdings.totalValue).toBeGreaterThan(0);
    expect(result.holdings.baseCurrency).toBe('USD');
    expect(result.holdings.topHoldings.length).toBe(2);
    expect(result.holdings.currencyBreakdown).toHaveProperty('USD');
    expect(result.holdings.currencyBreakdown).toHaveProperty('JPY');
  });

  it('topHoldingsは保有割合でソートされる', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 10, holdings: 1 }),
      makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 10 }),
    ];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.holdings.topHoldings[0].ticker).toBe('B');
    expect(result.holdings.topHoldings[0].percentage).toBeGreaterThan(
      result.holdings.topHoldings[1].percentage
    );
  });

  it('assetTypeBreakdownを計算する', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', fundType: 'ETF', price: 100, holdings: 5 }),
      makeAsset({ id: 'B', ticker: 'B', fundType: '個別株', price: 100, holdings: 5 }),
    ];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.holdings.assetTypeBreakdown).toHaveProperty('ETF');
    expect(result.holdings.assetTypeBreakdown).toHaveProperty('個別株');
    expect(result.holdings.assetTypeBreakdown['ETF']).toBeCloseTo(50, 0);
  });

  // ─── Targets ────────────────────────────────────────────

  it('目標未設定の場合', () => {
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.targets.hasTargets).toBe(false);
    expect(result.targets.deviations).toHaveLength(0);
    expect(result.targets.avgDeviation).toBe(0);
  });

  it('目標設定時に乖離度を計算する', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 7 }),
      makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 3 }),
    ];
    const targets = [makeTarget('A', 50), makeTarget('B', 50)];
    const result = enrichPortfolioData(assets, targets, false, 'USD', 150);

    expect(result.targets.hasTargets).toBe(true);
    expect(result.targets.deviations).toHaveLength(2);
    expect(result.targets.avgDeviation).toBeGreaterThan(0);

    const devA = result.targets.deviations.find(d => d.ticker === 'A');
    expect(devA!.currentPct).toBeCloseTo(70, 0);
    expect(devA!.targetPct).toBe(50);
    expect(devA!.deviation).toBeCloseTo(20, 0);
  });

  // ─── Strength/Weakness Lines ────────────────────────────

  it('strengthLineとweaknessLineが文字列を返す', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A' }),
      makeAsset({ id: 'B', ticker: 'B' }),
    ];
    const result = enrichPortfolioData(assets, [], true, 'USD', 150);

    expect(typeof result.strengthLine).toBe('string');
    expect(result.strengthLine.length).toBeGreaterThan(0);
    expect(typeof result.weaknessLine).toBe('string');
    expect(result.weaknessLine.length).toBeGreaterThan(0);
  });

  it('分散度が最強指標の場合テンプレートが使用される', () => {
    const assets = Array.from({ length: 10 }, (_, i) =>
      makeAsset({
        id: `S${i}`,
        ticker: `S${i}`,
        price: 100,
        holdings: 10,
        annualFee: 2.0, // cost will be weak
        fundType: 'ETF',
        currency: 'JPY',
      })
    );
    const result = enrichPortfolioData(assets, [], true, 'JPY', 150);

    expect(result.strengthLine).toContain('銘柄分散');
  });

  // ─── 空配列のエッジケース ────────────────────────────────

  it('空の資産配列でクラッシュしない', () => {
    const result = enrichPortfolioData([], [], false, 'JPY', 150);

    expect(result.holdings.count).toBe(0);
    expect(result.holdings.totalValue).toBe(0);
    expect(result.pnl.available).toBe(false);
    expect(result.targets.hasTargets).toBe(false);
  });

  // ─── topHoldings上限 ────────────────────────────────────

  it('topHoldingsは最大5件まで', () => {
    const assets = Array.from({ length: 10 }, (_, i) =>
      makeAsset({ id: `S${i}`, ticker: `S${i}`, price: 100, holdings: i + 1 })
    );
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.holdings.topHoldings).toHaveLength(5);
  });
});
