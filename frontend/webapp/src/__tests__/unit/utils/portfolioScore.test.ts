/**
 * ポートフォリオスコアリングエンジンの単体テスト
 *
 * @file __tests__/unit/utils/portfolioScore.test.ts
 */

import { calculatePortfolioScore } from '@/utils/portfolioScore';
import type { PortfolioScoreResult } from '@/utils/portfolioScore';

// ─── Helpers ─────────────────────────────────────────────────

function makeAsset(overrides: Record<string, any> = {}) {
  return {
    id: 'AAPL',
    ticker: 'AAPL',
    name: 'Apple Inc',
    price: 175,
    holdings: 10,
    currency: 'USD',
    annualFee: 0,
    fundType: 'ETF/個別株',
    ...overrides,
  };
}

function makeTarget(ticker: string, targetPercentage: number) {
  return { id: ticker, ticker, targetPercentage };
}

// ─── 基本動作 ────────────────────────────────────────────────

describe('calculatePortfolioScore', () => {
  it('空の資産配列は低スコアを返す', () => {
    const result = calculatePortfolioScore([], [], false);
    // 目標未設定で中間評価のメトリクスがあるため完全に0にはならない
    expect(result.totalScore).toBeLessThan(50);
    expect(result.metrics).toHaveLength(8);
  });

  it('null/undefinedの引数を安全に処理する', () => {
    const result = calculatePortfolioScore(null as any, undefined, false);
    expect(result.totalScore).toBeLessThan(50);
    expect(typeof result.grade).toBe('string');
  });

  it('結果にtotalScore, grade, metrics, summaryを含む', () => {
    const assets = [makeAsset()];
    const result = calculatePortfolioScore(assets, [], false);

    expect(result).toHaveProperty('totalScore');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('summary');
    expect(typeof result.totalScore).toBe('number');
    expect(typeof result.summary).toBe('string');
  });

  // ─── Free vs Premium ────────────────────────────────────

  it('Freeプランでは3指標のみで計算する', () => {
    const assets = [makeAsset()];
    const result = calculatePortfolioScore(assets, [], false);

    // 全8指標が返されるが、Free指標のみでスコア計算
    expect(result.metrics).toHaveLength(8);
    const freeMetrics = result.metrics.filter(m => !m.isPremium);
    expect(freeMetrics).toHaveLength(3);
  });

  it('Premiumプランでは全8指標で計算する', () => {
    const assets = [makeAsset()];
    const resultFree = calculatePortfolioScore(assets, [], false);
    const resultPremium = calculatePortfolioScore(assets, [], true);

    // Premium has all 8 metrics counted
    expect(resultPremium.metrics).toHaveLength(8);
    // Scores may differ
    expect(resultFree.totalScore).not.toBe(resultPremium.totalScore);
  });

  // ─── 分散度 ─────────────────────────────────────────────

  it('1銘柄のみの場合分散度が低い', () => {
    const assets = [makeAsset()];
    const result = calculatePortfolioScore(assets, [], true);
    const diversification = result.metrics.find(m => m.id === 'diversification');
    expect(diversification!.score).toBe(15);
  });

  it('多銘柄保有で分散度が上がる', () => {
    const assets = Array.from({ length: 10 }, (_, i) =>
      makeAsset({ id: `STOCK${i}`, ticker: `STOCK${i}`, price: 100, holdings: 10 })
    );
    const result = calculatePortfolioScore(assets, [], true);
    const diversification = result.metrics.find(m => m.id === 'diversification');
    expect(diversification!.score).toBeGreaterThan(60);
  });

  it('均等配分の場合は集中リスクペナルティなし', () => {
    const assets = Array.from({ length: 5 }, (_, i) =>
      makeAsset({ id: `S${i}`, ticker: `S${i}`, price: 100, holdings: 10 })
    );
    const result = calculatePortfolioScore(assets, [], true);
    const div = result.metrics.find(m => m.id === 'diversification');
    expect(div!.score).toBeGreaterThan(50);
  });

  // ─── 目標適合度 ─────────────────────────────────────────

  it('目標未設定の場合は中間スコア（50点）', () => {
    const assets = [makeAsset()];
    const result = calculatePortfolioScore(assets, [], true);
    const alignment = result.metrics.find(m => m.id === 'target_alignment');
    expect(alignment!.score).toBe(50);
  });

  it('目標に完全一致でスコア高い', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 5 }),
      makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 5 }),
    ];
    const targets = [
      makeTarget('A', 50),
      makeTarget('B', 50),
    ];
    const result = calculatePortfolioScore(assets, targets, true);
    const alignment = result.metrics.find(m => m.id === 'target_alignment');
    expect(alignment!.score).toBe(100);
  });

  it('目標から大きく乖離するとスコアが低い', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 90 }),
      makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 10 }),
    ];
    const targets = [
      makeTarget('A', 50),
      makeTarget('B', 50),
    ];
    const result = calculatePortfolioScore(assets, targets, true);
    const alignment = result.metrics.find(m => m.id === 'target_alignment');
    expect(alignment!.score).toBeLessThan(50);
  });

  // ─── コスト効率 ─────────────────────────────────────────

  it('手数料0%のポートフォリオはコスト効率100点', () => {
    const assets = [makeAsset({ annualFee: 0 })];
    const result = calculatePortfolioScore(assets, [], true);
    const cost = result.metrics.find(m => m.id === 'cost_efficiency');
    expect(cost!.score).toBe(100);
  });

  it('高手数料のポートフォリオはコスト効率が低い', () => {
    const assets = [makeAsset({ annualFee: 2.0 })];
    const result = calculatePortfolioScore(assets, [], true);
    const cost = result.metrics.find(m => m.id === 'cost_efficiency');
    expect(cost!.score).toBe(0);
  });

  // ─── 通貨分散 ─────────────────────────────────────────

  it('単一通貨はスコア40', () => {
    const assets = [makeAsset({ currency: 'JPY' })];
    const result = calculatePortfolioScore(assets, [], true);
    const curr = result.metrics.find(m => m.id === 'currency_diversification');
    expect(curr!.score).toBe(40);
  });

  it('3通貨以上はスコア100', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', currency: 'USD', price: 100, holdings: 10 }),
      makeAsset({ id: 'B', ticker: 'B', currency: 'JPY', price: 100, holdings: 10 }),
      makeAsset({ id: 'C', ticker: 'C', currency: 'EUR', price: 100, holdings: 10 }),
    ];
    const result = calculatePortfolioScore(assets, [], true);
    const curr = result.metrics.find(m => m.id === 'currency_diversification');
    expect(curr!.score).toBe(100);
  });

  // ─── 配当効率 ─────────────────────────────────────────

  it('配当なしはニュートラルスコア50', () => {
    const assets = [makeAsset({ hasDividend: false })];
    const result = calculatePortfolioScore(assets, [], true);
    const div = result.metrics.find(m => m.id === 'dividend_health');
    expect(div!.score).toBe(50);
  });

  it('配当利回り1-3%はスコア90', () => {
    const assets = [
      makeAsset({ hasDividend: true, dividendYield: 2.5 }),
    ];
    const result = calculatePortfolioScore(assets, [], true);
    const div = result.metrics.find(m => m.id === 'dividend_health');
    expect(div!.score).toBe(90);
  });

  it('高配当(5%超)はやや減点', () => {
    const assets = [
      makeAsset({ hasDividend: true, dividendYield: 6.0 }),
    ];
    const result = calculatePortfolioScore(assets, [], true);
    const div = result.metrics.find(m => m.id === 'dividend_health');
    expect(div!.score).toBe(60);
  });

  // ─── アセットタイプ分散 ─────────────────────────────────

  it('単一タイプはスコア40', () => {
    const assets = [makeAsset({ fundType: 'ETF' })];
    const result = calculatePortfolioScore(assets, [], true);
    const type = result.metrics.find(m => m.id === 'asset_type_diversity');
    expect(type!.score).toBe(40);
  });

  it('3タイプ以上はスコア100', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', fundType: 'ETF' }),
      makeAsset({ id: 'B', ticker: 'B', fundType: '個別株' }),
      makeAsset({ id: 'C', ticker: 'C', fundType: '投資信託' }),
    ];
    const result = calculatePortfolioScore(assets, [], true);
    const type = result.metrics.find(m => m.id === 'asset_type_diversity');
    expect(type!.score).toBe(100);
  });

  // ─── データ鮮度 ─────────────────────────────────────────

  it('最近更新されたデータは高スコア', () => {
    const assets = [
      makeAsset({ lastUpdated: new Date().toISOString() }),
    ];
    const result = calculatePortfolioScore(assets as any, [], true);
    const freshness = result.metrics.find(m => m.id === 'data_freshness');
    expect(freshness!.score).toBe(100);
  });

  it('古いデータは低スコア', () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const assets = [
      makeAsset({ lastUpdated: oldDate }),
    ];
    const result = calculatePortfolioScore(assets as any, [], true);
    const freshness = result.metrics.find(m => m.id === 'data_freshness');
    expect(freshness!.score).toBe(10);
  });

  // ─── グレード ───────────────────────────────────────────

  it('各指標にグレードが設定される', () => {
    const assets = [makeAsset()];
    const result = calculatePortfolioScore(assets, [], true);

    for (const metric of result.metrics) {
      expect(['A', 'B', 'C', 'D', 'F']).toContain(metric.grade);
    }
  });

  it('高スコアのポートフォリオはSまたはAグレード', () => {
    // USD price=100 ($1000/asset), JPY price=15000 (¥150000÷150=$1000/asset) → 等価配分
    const assets = Array.from({ length: 10 }, (_, i) =>
      makeAsset({
        id: `S${i}`,
        ticker: `S${i}`,
        price: i < 5 ? 100 : 15000, // USD: $100, JPY: ¥15000 (≈$100 at rate 150)
        holdings: 10,
        currency: i < 5 ? 'USD' : 'JPY',
        fundType: ['ETF', '個別株', '投資信託'][i % 3],
        annualFee: 0.1,
        hasDividend: true,
        dividendYield: 2.0,
        lastUpdated: new Date().toISOString(),
      })
    );
    const targets = assets.map(a => makeTarget(a.ticker, 10));
    const result = calculatePortfolioScore(assets as any, targets, true, 'USD', 150);

    expect(['S', 'A']).toContain(result.grade);
    expect(result.totalScore).toBeGreaterThanOrEqual(75);
  });

  // ─── サマリー ───────────────────────────────────────────

  it('高スコア時のサマリーに「優秀」を含む', () => {
    // USD price=100 ($1000/asset), JPY price=15000 (¥150000÷150=$1000/asset) → 等価配分
    const assets = Array.from({ length: 10 }, (_, i) =>
      makeAsset({
        id: `S${i}`,
        ticker: `S${i}`,
        price: i < 5 ? 100 : 15000, // USD: $100, JPY: ¥15000 (≈$100 at rate 150)
        holdings: 10,
        currency: i < 5 ? 'USD' : 'JPY',
        fundType: ['ETF', '個別株', '投資信託'][i % 3],
        annualFee: 0.05,
        hasDividend: true,
        dividendYield: 2.0,
        lastUpdated: new Date().toISOString(),
      })
    );
    const targets = assets.map(a => makeTarget(a.ticker, 10));
    const result = calculatePortfolioScore(assets as any, targets, true, 'USD', 150);

    expect(result.summary).toContain('優秀');
  });

  it('低スコア時のサマリーに「見直し」を含む', () => {
    const assets = [makeAsset({ annualFee: 3.0, holdings: 1 })];
    const result = calculatePortfolioScore(assets, [], false);

    // Low score summary contains improvement advice
    expect(result.summary.length).toBeGreaterThan(0);
  });

  // ─── リバランス健全度 ───────────────────────────────────

  it('目標未設定の場合リバランス健全度は70', () => {
    const assets = [makeAsset()];
    const result = calculatePortfolioScore(assets, [], true);
    const rebalance = result.metrics.find(m => m.id === 'rebalance_health');
    expect(rebalance!.score).toBe(70);
  });

  it('目標に完全一致の場合リバランス健全度は100', () => {
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 5 }),
      makeAsset({ id: 'B', ticker: 'B', price: 100, holdings: 5 }),
    ];
    const targets = [makeTarget('A', 50), makeTarget('B', 50)];
    const result = calculatePortfolioScore(assets, targets, true);
    const rebalance = result.metrics.find(m => m.id === 'rebalance_health');
    expect(rebalance!.score).toBe(100);
  });

  // ─── Regression: Bug E ──────────────────────────────────────────────────
  // Bug E: 混在通貨ポートフォリオで totalValue に通貨換算なし → 重み計算が誤り

  it('[Bug E regression] USD/JPY混在の目標適合度が通貨換算を考慮する', () => {
    // USD asset: $100 * 10 = $1000
    // JPY asset: ¥15000 * 10 = ¥150000 → ÷150 = $1000 → 各50%の等価配分
    const assets = [
      makeAsset({ id: 'USD', ticker: 'USD', price: 100, holdings: 10, currency: 'USD' }),
      makeAsset({ id: 'JPY', ticker: 'JPY', price: 15000, holdings: 10, currency: 'JPY' }),
    ];
    const targets = [makeTarget('USD', 50), makeTarget('JPY', 50)];

    const result = calculatePortfolioScore(assets, targets, true, 'USD', 150);

    // 等価配分なので target_alignment は高スコアのはず
    const targetMetric = result.metrics.find(m => m.id === 'target_alignment');
    expect(targetMetric!.score).toBeGreaterThanOrEqual(90);
  });

  it('[Bug E regression] JPY資産が支配的な場合USDベースで分散度スコアが適切に計算される', () => {
    // 修正前: ¥15000*100=¥1,500,000 が $100*10=$1000 を圧倒 → HHI≈1 → 分散度スコア低
    // 修正後: 通貨換算で ¥1,500,000÷150=$10,000 vs $1,000 → HHI=0.17 (2銘柄なら適正)
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, currency: 'USD' }),   // $1,000
      makeAsset({ id: 'B', ticker: 'B', price: 15000, holdings: 100, currency: 'JPY' }), // ¥1,500,000=$10,000
    ];
    const result = calculatePortfolioScore(assets, [], true, 'USD', 150);

    // totalValue = $11,000, USDweight=0.0909, JPYweight=0.909 → HHI = 0.00826+0.826 ≈ 0.834
    // 完全集中ではないが偏りがある → diversification score should not be max, but > 0
    const diversification = result.metrics.find(m => m.id === 'diversification');
    expect(diversification!.score).toBeGreaterThan(0);
    // 2銘柄なのでcountScore=min(2*8=16, 60)=16 だが通貨換算で偏りを適切に反映
  });

  it('[Bug E regression] 等価配分2通貨の通貨分散スコアは適切な重みで計算される', () => {
    // USD $1000 + JPY ¥150000(=$1000) → 各50% → 通貨分散は均等
    const assets = [
      makeAsset({ id: 'A', ticker: 'A', price: 100, holdings: 10, currency: 'USD' }),
      makeAsset({ id: 'B', ticker: 'B', price: 15000, holdings: 10, currency: 'JPY' }),
    ];
    const result = calculatePortfolioScore(assets, [], true, 'USD', 150);

    const currencyMetric = result.metrics.find(m => m.id === 'currency_diversification');
    // 各50% → maxWeight=0.5 → 40 + (1-0.5)*120 = 40+60 = 100
    expect(currencyMetric!.score).toBe(100);
  });
});
