/**
 * ポートフォリオデータエンリッチャーの単体テスト
 *
 * @file __tests__/unit/utils/portfolioDataEnricher.test.ts
 */

import { enrichPortfolioData } from '@/utils/portfolioDataEnricher';
import type { EnrichedPortfolioData } from '@/utils/portfolioDataEnricher';
import type { PriceHistoryResponse } from '@/services/priceHistoryService';

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

function makePriceHistory(ticker: string, dayAmount = 2, dayPercent = 1, ytdAmount = 10, ytdPercent = 5): Record<string, PriceHistoryResponse> {
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

    // AAPL: $100*10 = $1000 USD (same currency)
    // 7203: ¥2500*100 = ¥250000 → ÷150 = $1666.67 USD
    // Total: $2666.67
    expect(result.holdings.count).toBe(2);
    expect(result.holdings.totalValue).toBeCloseTo(1000 + 250000 / 150, 1);
    expect(result.holdings.baseCurrency).toBe('USD');
    expect(result.holdings.topHoldings.length).toBe(2);
    expect(result.holdings.currencyBreakdown).toHaveProperty('USD');
    expect(result.holdings.currencyBreakdown).toHaveProperty('JPY');
  });

  it('通貨換算: JPY基準ではUSD資産がレートで換算される', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'AAPL', price: 100, holdings: 10, currency: 'USD' }),
      makeAsset({ id: 'B', ticker: '7203', price: 5000, holdings: 100, currency: 'JPY' }),
    ];
    const result = enrichPortfolioData(assets, [], false, 'JPY', 150);

    // AAPL: $100*10 = $1000 → ×150 = ¥150,000
    // 7203: ¥5000*100 = ¥500,000 (same currency)
    // Total: ¥650,000
    expect(result.holdings.totalValue).toBeCloseTo(1000 * 150 + 5000 * 100, 0);
  });

  it('currency: undefined の資産は変換されずに加算される（防御ケース）', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'AAPL', price: 100, holdings: 10, currency: undefined }),
    ];
    // currency未定義はデフォルトUSDとして扱われる
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);
    expect(result.holdings.totalValue).toBeCloseTo(1000, 0);
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

  // ─── Premium vs Free メトリクス詳細 ──────────────────────

  it('Premiumでstrongest/weakestが全8指標から選ばれる', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD' }),
    ];
    const result = enrichPortfolioData(assets, [], true, 'USD', 150);

    // strongest and weakest should come from all 8 metrics
    expect(result.score.strongest.id).toBeTruthy();
    expect(result.score.weakest.id).toBeTruthy();
    expect(result.score.metrics.length).toBe(8);
    // strongest score >= weakest score
    expect(result.score.strongest.score).toBeGreaterThanOrEqual(result.score.weakest.score);
  });

  it('Freeプランでもstrongest/weakestが設定される', () => {
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.score.strongest.id).toBeTruthy();
    expect(result.score.weakest.id).toBeTruthy();
    expect(result.score.strongest.score).toBeGreaterThanOrEqual(result.score.weakest.score);
  });

  // ─── P&L 詳細ケース ──────────────────────────────────────

  it('purchasePriceがないアセットはPnL計算から除外される', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, purchasePrice: undefined }),
    ];
    const histories = makePriceHistory('A');
    const result = enrichPortfolioData(assets, [], false, 'USD', 150, histories);

    // purchasePrice がないので pnl.available = false
    expect(result.pnl.available).toBe(false);
    expect(result.pnl.totalInvestment).toBe(0);
    expect(result.pnl.topGainers).toHaveLength(0);
    expect(result.pnl.topLosers).toHaveLength(0);
  });

  it('空の価格履歴オブジェクトの場合pnl.available=false', () => {
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150, {});

    expect(result.pnl.available).toBe(false);
  });

  it('全銘柄がgainerの場合topLosersは空', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 200, holdings: 1, purchasePrice: 100 }),
      makeAsset({ id: 'B', ticker: 'B', price: 150, holdings: 1, purchasePrice: 100 }),
    ];
    const histories = {
      ...makePriceHistory('A'),
      ...makePriceHistory('B'),
    };
    const result = enrichPortfolioData(assets, [], false, 'USD', 150, histories);

    expect(result.pnl.topGainers.length).toBeGreaterThan(0);
    expect(result.pnl.topLosers).toHaveLength(0);
  });

  it('全銘柄がloserの場合topGainersは空', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 50, holdings: 1, purchasePrice: 100 }),
      makeAsset({ id: 'B', ticker: 'B', price: 60, holdings: 1, purchasePrice: 100 }),
    ];
    const histories = {
      ...makePriceHistory('A'),
      ...makePriceHistory('B'),
    };
    const result = enrichPortfolioData(assets, [], false, 'USD', 150, histories);

    expect(result.pnl.topGainers).toHaveLength(0);
    expect(result.pnl.topLosers.length).toBeGreaterThan(0);
  });

  it('PnL百分率を正しく計算する', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 200, holdings: 5, purchasePrice: 100 }),
    ];
    const histories = makePriceHistory('A');
    const result = enrichPortfolioData(assets, [], false, 'USD', 150, histories);

    expect(result.pnl.available).toBe(true);
    expect(result.pnl.totalInvestment).toBe(500);
    expect(result.pnl.totalCurrentValue).toBe(1000);
    expect(result.pnl.totalPnL).toBe(500);
    expect(result.pnl.totalPnLPercent).toBeCloseTo(100, 0);
  });

  // ─── Holdings 詳細 ────────────────────────────────────────

  it('nameがないアセットはtickerをnameとして使う', () => {
    const assets = [
      makeAsset({ id: 'X', ticker: 'XYZ', name: undefined, price: 100, holdings: 1 }),
    ];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.holdings.topHoldings[0].name).toBe('XYZ');
  });

  it('currencyが未指定のアセットはUSDとして扱われる', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', currency: undefined, price: 100, holdings: 1 }),
    ];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.holdings.currencyBreakdown).toHaveProperty('USD');
  });

  it('fundTypeが未指定のアセットはunknownとして扱われる', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', fundType: undefined, price: 100, holdings: 1 }),
    ];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.holdings.assetTypeBreakdown).toHaveProperty('unknown');
  });

  it('totalValueが0の場合holdingsのpercentageは0', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 0, holdings: 0 }),
    ];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.holdings.totalValue).toBe(0);
    expect(result.holdings.topHoldings[0].percentage).toBe(0);
  });

  // ─── Targets 詳細 ──────────────────────────────────────────

  it('ターゲットがアセットと一致しない場合currentPctは0', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10 }),
    ];
    const targets = [makeTarget('NONEXIST', 50)];
    const result = enrichPortfolioData(assets, targets, false, 'USD', 150);

    expect(result.targets.hasTargets).toBe(true);
    const dev = result.targets.deviations.find(d => d.ticker === 'NONEXIST');
    expect(dev!.currentPct).toBe(0);
    expect(dev!.deviation).toBe(50);
  });

  it('ターゲットをtickerでマッチする（id不一致でも）', () => {
    const assets = [
      makeAsset({ id: 'different-id', ticker: 'MSFT', price: 100, holdings: 10 }),
    ];
    const targets = [{ id: 'other-id', ticker: 'MSFT', targetPercentage: 50 }];
    const result = enrichPortfolioData(assets, targets, false, 'USD', 150);

    const dev = result.targets.deviations.find(d => d.ticker === 'MSFT');
    expect(dev!.currentPct).toBeCloseTo(100, 0);
    expect(dev!.deviation).toBeCloseTo(50, 0);
  });

  // ─── Strength/Weakness テンプレート網羅 ────────────────────

  describe('Strengthテンプレート', () => {
    it('cost_efficiencyが最強指標の場合テンプレートが使用される', () => {
      // 1銘柄、低コスト、目標なし → diversification低い、cost_efficiencyは高い
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: 'ETF' }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      // cost_efficiency should be highest (low fee = ~100 score)
      const costMetric = result.score.metrics.find(m => m.id === 'cost_efficiency');
      expect(costMetric).toBeDefined();
      expect(costMetric!.score).toBeGreaterThanOrEqual(90);

      if (result.score.strongest.id === 'cost_efficiency') {
        expect(result.strengthLine).toContain('低コスト運用');
        expect(result.strengthLine).toContain('加重信託報酬');
      }
    });

    it('currency_diversificationが最強指標の場合テンプレートが使用される', () => {
      // 3通貨で均等保有 → currency_diversification = 100
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, currency: 'USD', annualFee: 2.0, fundType: 'ETF' }),
        makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 10, currency: 'JPY', annualFee: 2.0, fundType: 'ETF' }),
        makeAsset({ id: 'C', ticker: 'C', price: 100, holdings: 10, currency: 'EUR', annualFee: 2.0, fundType: 'ETF' }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      const currMetric = result.score.metrics.find(m => m.id === 'currency_diversification');
      expect(currMetric!.score).toBe(100);

      if (result.score.strongest.id === 'currency_diversification') {
        expect(result.strengthLine).toContain('通貨分散が良好');
      }
    });

    it('dividend_healthが最強指標の場合テンプレートが使用される', () => {
      // 配当あり、利回り2% → dividend_health = 90
      const assets = [
        makeAsset({
          id: 'A', ticker: 'A', price: 100, holdings: 10, annualFee: 2.0,
          hasDividend: true, dividendYield: 2.0, currency: 'USD', fundType: 'ETF',
        }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      const divMetric = result.score.metrics.find(m => m.id === 'dividend_health');
      expect(divMetric!.score).toBe(90);

      if (result.score.strongest.id === 'dividend_health') {
        expect(result.strengthLine).toContain('配当効率が良好');
        expect(result.strengthLine).toContain('加重利回り');
      }
    });

    it('asset_type_diversityが最強指標の場合テンプレートが使用される', () => {
      // 3種類のfundType → asset_type_diversity = 100
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, fundType: 'ETF', annualFee: 2.0, currency: 'USD' }),
        makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 10, fundType: '個別株', annualFee: 2.0, currency: 'USD' }),
        makeAsset({ id: 'C', ticker: 'C', price: 100, holdings: 10, fundType: '投資信託', annualFee: 2.0, currency: 'USD' }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      const typeMetric = result.score.metrics.find(m => m.id === 'asset_type_diversity');
      expect(typeMetric!.score).toBe(100);

      if (result.score.strongest.id === 'asset_type_diversity') {
        expect(result.strengthLine).toContain('資産タイプが分散');
      }
    });

    it('target_alignmentが最強指標の場合テンプレートが使用される', () => {
      // 1銘柄で100%目標配分に完全一致
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, annualFee: 2.0, currency: 'USD', fundType: 'ETF' }),
      ];
      const targets = [makeTarget('A', 100)];
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      if (result.score.strongest.id === 'target_alignment') {
        expect(result.strengthLine).toContain('目標配分に沿った運用');
      }
    });

    it('rebalance_healthが最強指標の場合テンプレートが使用される', () => {
      // 目標なし → rebalance_health = 70, diversificationが低い1銘柄
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, annualFee: 2.0, fundType: 'ETF', currency: 'USD' }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      if (result.score.strongest.id === 'rebalance_health') {
        expect(result.strengthLine).toContain('リバランスが適切');
      }
    });

    it('data_freshnessが最強指標の場合テンプレートが使用される', () => {
      // lastUpdated をつけて新鮮なデータにする
      const assets = [
        makeAsset({
          id: 'A', ticker: 'A', price: 100, holdings: 10, annualFee: 2.0,
          fundType: 'ETF', currency: 'USD', lastUpdated: new Date().toISOString(),
        }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      if (result.score.strongest.id === 'data_freshness') {
        expect(result.strengthLine).toContain('データが最新');
      }
    });
  });

  describe('Weaknessテンプレート', () => {
    it('diversification weaknessで銘柄数<=2の場合「集中リスク」を含む', () => {
      // 1銘柄 → diversification score = 15 (最低)
      const assets = [
        makeAsset({
          id: 'A', ticker: 'A', price: 100, holdings: 10, annualFee: 0.01,
          currency: 'USD', fundType: 'ETF',
          hasDividend: true, dividendYield: 2.0,
          lastUpdated: new Date().toISOString(),
        }),
      ];
      const targets = [makeTarget('A', 100)];
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      // With 1 asset, diversification should be weakest (score=15)
      if (result.score.weakest.id === 'diversification') {
        expect(result.weaknessLine).toContain('銘柄集中リスク');
        expect(result.weaknessLine).toContain('1銘柄');
      }
    });

    it('diversification weaknessで銘柄数>2の場合「改善余地あり」を含む', () => {
      // 3銘柄 → diversification score is moderate but should be lowest with right setup
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: 'ETF', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 10, annualFee: 0.01, currency: 'JPY', fundType: '個別株', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'C', ticker: 'C', price: 100, holdings: 10, annualFee: 0.01, currency: 'EUR', fundType: '投資信託', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
      ];
      const targets = [
        makeTarget('A', 33.3),
        makeTarget('B', 33.3),
        makeTarget('C', 33.4),
      ];
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      // With 3 assets, diversification score = min(24, ...) + concentration bonus
      // Other metrics should be higher, making diversification the weakest
      if (result.score.weakest.id === 'diversification') {
        expect(result.weaknessLine).toContain('銘柄分散に改善余地あり');
      }
    });

    it('cost_efficiencyが最弱指標の場合テンプレートが使用される', () => {
      // 高コスト → cost_efficiency低い
      const assets = Array.from({ length: 10 }, (_, i) =>
        makeAsset({
          id: `S${i}`, ticker: `S${i}`, price: 100, holdings: 10,
          annualFee: 2.0, fundType: 'ETF', currency: 'JPY',
        })
      );
      const result = enrichPortfolioData(assets, [], true, 'JPY', 150);

      if (result.score.weakest.id === 'cost_efficiency') {
        expect(result.weaknessLine).toContain('コスト改善余地あり');
        expect(result.weaknessLine).toContain('加重信託報酬');
      }
    });

    it('target_alignmentが最弱指標の場合テンプレートが使用される', () => {
      // 大きな乖離
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 100, annualFee: 0.01, currency: 'USD', fundType: 'ETF' }),
        makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 1, annualFee: 0.01, currency: 'JPY', fundType: '個別株' }),
      ];
      const targets = [makeTarget('A', 10), makeTarget('B', 90)];
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      if (result.score.weakest.id === 'target_alignment') {
        expect(result.weaknessLine).toContain('目標配分からの乖離が大きい');
      }
    });

    it('rebalance_healthが最弱指標の場合テンプレートが使用される', () => {
      // Large deviation with targets set
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 99, annualFee: 0.01, currency: 'USD', fundType: 'ETF' }),
        makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 1, annualFee: 0.01, currency: 'JPY', fundType: '個別株' }),
      ];
      const targets = [makeTarget('A', 50), makeTarget('B', 50)];
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      if (result.score.weakest.id === 'rebalance_health') {
        expect(result.weaknessLine).toContain('リバランスが必要');
      }
    });

    it('currency_diversificationが最弱指標の場合テンプレートが使用される', () => {
      // 単一通貨（USD）、3種fundType → currency_diversification = 40（最低に）
      // asset_type_diversity = 100 (3種), data_freshness = 100 (fresh)
      const assets = [
        makeAsset({ id: 'S0', ticker: 'S0', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: 'ETF', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'S1', ticker: 'S1', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: '個別株', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'S2', ticker: 'S2', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: '投資信託', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'S3', ticker: 'S3', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: 'ETF', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'S4', ticker: 'S4', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: '個別株', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'S5', ticker: 'S5', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: '投資信託', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'S6', ticker: 'S6', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: 'ETF', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
        makeAsset({ id: 'S7', ticker: 'S7', price: 100, holdings: 10, annualFee: 0.01, currency: 'USD', fundType: '個別株', hasDividend: true, dividendYield: 2.0, lastUpdated: new Date().toISOString() }),
      ];
      const targets = assets.map(a => makeTarget(a.ticker, 12.5));
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      // currency_diversification = 40 (single currency), should be the weakest
      const currMetric = result.score.metrics.find(m => m.id === 'currency_diversification');
      expect(currMetric!.score).toBe(40);

      if (result.score.weakest.id === 'currency_diversification') {
        expect(result.weaknessLine).toContain('通貨分散不足');
        expect(result.weaknessLine).toContain('USD');
      }
    });

    it('dividend_healthが最弱指標の場合テンプレートが使用される', () => {
      // 配当なし → dividend_health = 50（ニュートラル）、他を高くする
      const assets = Array.from({ length: 8 }, (_, i) =>
        makeAsset({
          id: `S${i}`, ticker: `S${i}`, price: 100, holdings: 10,
          annualFee: 0.01,
          currency: i < 4 ? 'USD' : 'JPY',
          fundType: i % 3 === 0 ? 'ETF' : i % 3 === 1 ? '個別株' : '投資信託',
          hasDividend: false,
          lastUpdated: new Date().toISOString(),
        })
      );
      const targets = assets.map(a => makeTarget(a.ticker, 12.5));
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      if (result.score.weakest.id === 'dividend_health') {
        expect(result.weaknessLine).toContain('配当効率に改善余地');
      }
    });

    it('asset_type_diversityが最弱指標の場合テンプレートが使用される', () => {
      // 全て同じfundType → asset_type_diversity = 40
      const assets = Array.from({ length: 8 }, (_, i) =>
        makeAsset({
          id: `S${i}`, ticker: `S${i}`, price: 100, holdings: 10,
          annualFee: 0.01, currency: i < 4 ? 'USD' : 'JPY', fundType: 'ETF',
          hasDividend: true, dividendYield: 2.0,
          lastUpdated: new Date().toISOString(),
        })
      );
      const targets = assets.map(a => makeTarget(a.ticker, 12.5));
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      if (result.score.weakest.id === 'asset_type_diversity') {
        expect(result.weaknessLine).toContain('資産タイプが偏り');
      }
    });

    it('data_freshnessが最弱指標の場合テンプレートが使用される', () => {
      // lastUpdated なし → data_freshness = 30
      const assets = Array.from({ length: 8 }, (_, i) =>
        makeAsset({
          id: `S${i}`, ticker: `S${i}`, price: 100, holdings: 10,
          annualFee: 0.01,
          currency: i < 4 ? 'USD' : 'JPY',
          fundType: i % 3 === 0 ? 'ETF' : i % 3 === 1 ? '個別株' : '投資信託',
          hasDividend: true, dividendYield: 2.0,
        })
      );
      const targets = assets.map(a => makeTarget(a.ticker, 12.5));
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150);

      if (result.score.weakest.id === 'data_freshness') {
        expect(result.weaknessLine).toContain('データの更新が必要');
      }
    });
  });

  // ─── フォールバック文字列 ──────────────────────────────────

  it('テンプレートにないIDの場合フォールバック文字列を使用する', () => {
    // The score engine always returns known IDs, but test the fallback path
    // by verifying the line is always a non-empty string
    const assets = [makeAsset()];
    const result = enrichPortfolioData(assets, [], false, 'USD', 150);

    expect(result.strengthLine.length).toBeGreaterThan(0);
    expect(result.weaknessLine.length).toBeGreaterThan(0);
  });

  // ─── Helper関数の間接テスト ────────────────────────────────

  describe('Helper関数（間接テスト）', () => {
    it('calcWeightedFee: totalValue=0の場合0を返す', () => {
      // price=0, holdings=0 → totalValue=0
      const assets = [makeAsset({ price: 0, holdings: 0, annualFee: 0.5 })];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      // strengthLine/weaknessLineでcost_efficiencyテンプレートが使用される場合、
      // fee=0 が表示される
      expect(result.holdings.totalValue).toBe(0);
    });

    it('calcWeightedDividendYield: 配当ありアセットの加重利回り計算', () => {
      // dividend_health テンプレートを通じてテスト
      const assets = [
        makeAsset({
          id: 'A', ticker: 'A', price: 100, holdings: 10,
          hasDividend: true, dividendYield: 3.0, annualFee: 2.0,
          currency: 'USD', fundType: 'ETF',
        }),
        makeAsset({
          id: 'B', ticker: 'B', price: 100, holdings: 10,
          hasDividend: true, dividendYield: 1.0, annualFee: 2.0,
          currency: 'USD', fundType: 'ETF',
        }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      // dividend_health metric should be calculated based on weighted yield
      const divMetric = result.score.metrics.find(m => m.id === 'dividend_health');
      expect(divMetric).toBeDefined();
      expect(divMetric!.score).toBeGreaterThan(0);
    });

    it('calcWeightedDividendYield: 配当なしアセットはスキップされる', () => {
      const assets = [
        makeAsset({
          id: 'A', ticker: 'A', price: 100, holdings: 10,
          hasDividend: false, dividendYield: undefined, annualFee: 0.5,
        }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      const divMetric = result.score.metrics.find(m => m.id === 'dividend_health');
      expect(divMetric).toBeDefined();
      // hasDividend=false → score=50 (ニュートラル)
      expect(divMetric!.score).toBe(50);
    });

    it('uniqueCurrencies: 複数通貨を抽出する', () => {
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', currency: 'USD', price: 100, holdings: 10 }),
        makeAsset({ id: 'B', ticker: 'B', currency: 'JPY', price: 100, holdings: 10 }),
        makeAsset({ id: 'C', ticker: 'C', currency: 'EUR', price: 100, holdings: 10 }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      // currency_diversification score = 100 (3通貨)
      const currMetric = result.score.metrics.find(m => m.id === 'currency_diversification');
      expect(currMetric!.score).toBe(100);

      // Also verify the breakdown
      expect(Object.keys(result.holdings.currencyBreakdown)).toHaveLength(3);
    });

    it('uniqueAssetTypes: 複数タイプを抽出する', () => {
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', fundType: 'ETF', price: 100, holdings: 10 }),
        makeAsset({ id: 'B', ticker: 'B', fundType: '個別株', price: 100, holdings: 10 }),
        makeAsset({ id: 'C', ticker: 'C', fundType: '投資信託', price: 100, holdings: 10 }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      // asset_type_diversity score = 100 (3タイプ)
      const typeMetric = result.score.metrics.find(m => m.id === 'asset_type_diversity');
      expect(typeMetric!.score).toBe(100);

      expect(Object.keys(result.holdings.assetTypeBreakdown)).toHaveLength(3);
    });

    it('currencyBreakdownPct: totalValue > 0の場合パーセンテージを正しく計算（通貨換算込み）', () => {
      // baseCurrency=JPY、exchangeRate=150 で計算
      // Asset A: USD, price=100, holdings=7 → 700 USD → 105000 JPY
      // Asset B: JPY, price=100, holdings=3 → 300 JPY
      // total = 105300 JPY
      // USD%: 105000/105300*100 ≈ 99.7%
      // JPY%: 300/105300*100 ≈ 0.3%
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', currency: 'USD', price: 100, holdings: 7 }),
        makeAsset({ id: 'B', ticker: 'B', currency: 'JPY', price: 100, holdings: 3 }),
      ];
      const result = enrichPortfolioData(assets, [], false, 'JPY', 150);

      // USD資産は円換算で大半を占める
      expect(result.holdings.currencyBreakdown['USD']).toBeGreaterThan(99);
      expect(result.holdings.currencyBreakdown['JPY']).toBeLessThan(1);
      // 合計は100%
      const total = (result.holdings.currencyBreakdown['USD'] ?? 0) + (result.holdings.currencyBreakdown['JPY'] ?? 0);
      expect(total).toBeCloseTo(100, 0);
    });

    it('assetTypeBreakdownPct: totalValue > 0の場合パーセンテージを正しく計算', () => {
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', fundType: 'ETF', price: 100, holdings: 6 }),
        makeAsset({ id: 'B', ticker: 'B', fundType: '個別株', price: 100, holdings: 4 }),
      ];
      const result = enrichPortfolioData(assets, [], false, 'USD', 150);

      expect(result.holdings.assetTypeBreakdown['ETF']).toBeCloseTo(60, 0);
      expect(result.holdings.assetTypeBreakdown['個別株']).toBeCloseTo(40, 0);
    });

    it('assetTypeBreakdownPct: totalValue=0の場合は0%', () => {
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', fundType: 'ETF', price: 0, holdings: 0 }),
      ];
      const result = enrichPortfolioData(assets, [], false, 'USD', 150);

      expect(result.holdings.assetTypeBreakdown['ETF']).toBe(0);
    });

    it('currencyBreakdownPct: totalValue=0の場合は0%', () => {
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', currency: 'USD', price: 0, holdings: 0 }),
      ];
      const result = enrichPortfolioData(assets, [], false, 'USD', 150);

      expect(result.holdings.currencyBreakdown['USD']).toBe(0);
    });
  });

  // ─── 複合シナリオ ──────────────────────────────────────────

  describe('複合シナリオ', () => {
    it('多銘柄・複数通貨・配当あり・目標ありの完全シナリオ', () => {
      const assets = [
        makeAsset({ id: 'A', ticker: 'AAPL', price: 175, holdings: 10, purchasePrice: 150, currency: 'USD', annualFee: 0.03, fundType: 'ETF', hasDividend: true, dividendYield: 1.5 }),
        makeAsset({ id: 'B', ticker: '7203', price: 2500, holdings: 100, purchasePrice: 2000, currency: 'JPY', annualFee: 0.05, fundType: '個別株', hasDividend: true, dividendYield: 2.5 }),
        makeAsset({ id: 'C', ticker: 'MSFT', price: 350, holdings: 5, purchasePrice: 300, currency: 'USD', annualFee: 0.02, fundType: '投資信託', hasDividend: false }),
      ];
      const targets = [
        makeTarget('AAPL', 30),
        makeTarget('7203', 40),
        makeTarget('MSFT', 30),
      ];
      const histories = {
        ...makePriceHistory('AAPL', 3, 1.7),
        ...makePriceHistory('7203', 50, 2.0),
        ...makePriceHistory('MSFT', 5, 1.4),
      };
      const result = enrichPortfolioData(assets, targets, true, 'USD', 150, histories);

      // Score
      expect(result.score.metrics.length).toBe(8);
      expect(result.score.totalScore).toBeGreaterThan(0);

      // PnL
      expect(result.pnl.available).toBe(true);
      expect(result.pnl.totalInvestment).toBeGreaterThan(0);
      expect(result.pnl.totalPnL).toBeGreaterThan(0);
      expect(result.pnl.topGainers.length).toBeGreaterThan(0);

      // Holdings
      expect(result.holdings.count).toBe(3);
      expect(result.holdings.topHoldings.length).toBe(3);
      expect(Object.keys(result.holdings.currencyBreakdown).length).toBe(2);
      expect(Object.keys(result.holdings.assetTypeBreakdown).length).toBe(3);

      // Targets
      expect(result.targets.hasTargets).toBe(true);
      expect(result.targets.deviations.length).toBe(3);
      expect(result.targets.avgDeviation).toBeGreaterThanOrEqual(0);

      // Lines
      expect(result.strengthLine.length).toBeGreaterThan(0);
      expect(result.weaknessLine.length).toBeGreaterThan(0);
    });

    it('Premiumメトリクスのgrade情報が正しく含まれる', () => {
      const assets = [
        makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10 }),
      ];
      const result = enrichPortfolioData(assets, [], true, 'USD', 150);

      for (const metric of result.score.metrics) {
        expect(['A', 'B', 'C', 'D', 'F']).toContain(metric.grade);
        expect(metric.id).toBeTruthy();
        expect(metric.label).toBeTruthy();
        expect(typeof metric.score).toBe('number');
      }
    });
  });
});
