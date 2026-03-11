/**
 * PortfolioDataEnricher
 *
 * portfolioScore.ts の 8 指標、plCalculation.ts の P&L、portfolioStore の
 * 保有データを統合し、プロンプト生成や UI 表示に必要な構造化データを返す。
 *
 * @file src/utils/portfolioDataEnricher.ts
 */

import {
  calculatePortfolioScore,
  type PortfolioScoreResult,
  type ScoreMetric,
} from './portfolioScore';
import { calculatePortfolioPnL, type PortfolioPnL } from './plCalculation';
import type { PriceHistoryResponse } from '../services/priceHistoryService';

// ─── Public Types ───────────────────────────────────────

export interface EnrichedPortfolioData {
  score: {
    totalScore: number;
    grade: string;
    strongest: { id: string; label: string; score: number };
    weakest: { id: string; label: string; score: number };
    metrics: Array<{ id: string; label: string; score: number; grade: string }>;
  };
  pnl: {
    available: boolean;
    totalInvestment: number;
    totalCurrentValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    topGainers: Array<{ ticker: string; name: string; pnlPercent: number }>;
    topLosers: Array<{ ticker: string; name: string; pnlPercent: number }>;
  };
  holdings: {
    count: number;
    totalValue: number;
    baseCurrency: string;
    topHoldings: Array<{ ticker: string; name: string; percentage: number }>;
    currencyBreakdown: Record<string, number>;
    assetTypeBreakdown: Record<string, number>;
  };
  targets: {
    hasTargets: boolean;
    deviations: Array<{
      ticker: string;
      currentPct: number;
      targetPct: number;
      deviation: number;
    }>;
    avgDeviation: number;
  };
  strengthLine: string;
  weaknessLine: string;
}

// ─── Internal Types ─────────────────────────────────────

interface EnricherAsset {
  id?: string;
  ticker: string;
  name?: string;
  currency?: string;
  price?: number;
  holdings?: number;
  purchasePrice?: number;
  annualFee?: number;
  hasDividend?: boolean;
  dividendYield?: number;
  fundType?: string;
}

interface TargetAllocation {
  id?: string;
  ticker: string;
  targetPercentage: number;
}

// ─── Strength / Weakness Line Templates ─────────────────

interface LineTemplate {
  generate: (ctx: LineContext) => string;
}

interface LineContext {
  assets: EnricherAsset[];
  totalValue: number;
  targets: TargetAllocation[];
  baseCurrency: string;
  assetValues: number[];
}

const STRENGTH_TEMPLATES: Record<string, LineTemplate> = {
  diversification: {
    generate: (ctx) => {
      const count = ctx.assets.length;
      return `銘柄分散が良好（${count}銘柄保有）`;
    },
  },
  target_alignment: {
    generate: () => '目標配分に沿った運用ができています',
  },
  cost_efficiency: {
    generate: (ctx) => {
      const fee = calcWeightedFee(ctx.assets, ctx.totalValue, ctx.assetValues);
      return `低コスト運用（加重信託報酬 ${fee.toFixed(2)}%）`;
    },
  },
  rebalance_health: {
    generate: () => 'リバランスが適切に行われています',
  },
  currency_diversification: {
    generate: (ctx) => {
      const currencies = uniqueCurrencies(ctx.assets);
      return `通貨分散が良好（${currencies.length}通貨）`;
    },
  },
  dividend_health: {
    generate: (ctx) => {
      const yld = calcWeightedDividendYield(ctx.assets, ctx.totalValue, ctx.assetValues);
      return `配当効率が良好（加重利回り ${yld.toFixed(1)}%）`;
    },
  },
  asset_type_diversity: {
    generate: (ctx) => {
      const types = uniqueAssetTypes(ctx.assets);
      return `資産タイプが分散（${types.join('・')}）`;
    },
  },
  data_freshness: {
    generate: () => 'データが最新の状態です',
  },
};

const WEAKNESS_TEMPLATES: Record<string, LineTemplate> = {
  diversification: {
    generate: (ctx) => {
      const count = ctx.assets.length;
      if (count <= 2) return `銘柄集中リスク（${count}銘柄のみ）`;
      return `銘柄分散に改善余地あり（${count}銘柄）`;
    },
  },
  target_alignment: {
    generate: () => '目標配分からの乖離が大きい',
  },
  cost_efficiency: {
    generate: (ctx) => {
      const fee = calcWeightedFee(ctx.assets, ctx.totalValue, ctx.assetValues);
      return `コスト改善余地あり（加重信託報酬 ${fee.toFixed(2)}%）`;
    },
  },
  rebalance_health: {
    generate: () => 'リバランスが必要な状態です',
  },
  currency_diversification: {
    generate: (ctx) => {
      const breakdown = currencyBreakdownPct(ctx.assets, ctx.totalValue, ctx.assetValues);
      const dominant = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0];
      if (dominant) return `通貨分散不足（${dominant[0]} ${Math.round(dominant[1])}%）`;
      return '通貨分散が不十分です';
    },
  },
  dividend_health: {
    generate: () => '配当効率に改善余地があります',
  },
  asset_type_diversity: {
    generate: (ctx) => {
      const types = uniqueAssetTypes(ctx.assets);
      return `資産タイプが偏り気味（${types[0] || '不明'}のみ）`;
    },
  },
  data_freshness: {
    generate: () => 'データの更新が必要です',
  },
};

// ─── Helpers ────────────────────────────────────────────

function calcWeightedFee(assets: EnricherAsset[], totalValue: number, assetValues: number[]): number {
  if (totalValue === 0) return 0;
  return assets.reduce((sum, a, i) => {
    return sum + (a.annualFee || 0) * (assetValues[i] / totalValue);
  }, 0);
}

function calcWeightedDividendYield(assets: EnricherAsset[], totalValue: number, assetValues: number[]): number {
  if (totalValue === 0) return 0;
  return assets.reduce((sum, a, i) => {
    if (!a.hasDividend || !a.dividendYield) return sum;
    return sum + a.dividendYield * (assetValues[i] / totalValue);
  }, 0);
}

function uniqueCurrencies(assets: EnricherAsset[]): string[] {
  return [...new Set(assets.map((a) => a.currency || 'USD'))];
}

function uniqueAssetTypes(assets: EnricherAsset[]): string[] {
  return [...new Set(assets.map((a) => a.fundType || '不明'))];
}

function currencyBreakdownPct(
  assets: EnricherAsset[],
  totalValue: number,
  assetValues: number[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < assets.length; i++) {
    const cur = assets[i].currency || 'USD';
    const pct = totalValue > 0 ? (assetValues[i] / totalValue) * 100 : 0;
    map[cur] = (map[cur] || 0) + pct;
  }
  return map;
}

function assetTypeBreakdownPct(
  assets: EnricherAsset[],
  totalValue: number,
  assetValues: number[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < assets.length; i++) {
    const t = assets[i].fundType || 'unknown';
    const pct = totalValue > 0 ? (assetValues[i] / totalValue) * 100 : 0;
    map[t] = (map[t] || 0) + pct;
  }
  return map;
}

// ─── Main Function ──────────────────────────────────────

export function enrichPortfolioData(
  assets: EnricherAsset[],
  targets: TargetAllocation[],
  isPremium: boolean,
  baseCurrency: string,
  exchangeRate: number,
  priceHistories?: Record<string, PriceHistoryResponse>
): EnrichedPortfolioData {
  const safeAssets = assets || [];
  const safeTargets = targets || [];

  // ─ Score
  // EnricherAsset is a superset of the score engine's Asset type;
  // optional `id` is safe because the engine falls back to ticker matching.
  const scoreResult: PortfolioScoreResult = calculatePortfolioScore(
    safeAssets as any,
    safeTargets as any,
    isPremium,
    baseCurrency,
    exchangeRate
  );

  const availableMetrics = isPremium
    ? scoreResult.metrics
    : scoreResult.metrics.filter((m) => !m.isPremium);

  const sorted = [...availableMetrics].sort((a, b) => b.score - a.score);
  const strongest = sorted[0] || { id: '', label: '', score: 0 };
  const weakest = sorted[sorted.length - 1] || { id: '', label: '', score: 0 };

  // ─ P&L
  const hasPriceHistories =
    priceHistories && Object.keys(priceHistories).length > 0;
  const pnlResult: PortfolioPnL | null = hasPriceHistories
    ? calculatePortfolioPnL(
        safeAssets,
        priceHistories!,
        baseCurrency,
        exchangeRate
      )
    : null;

  const pnlAvailable = !!(
    pnlResult && pnlResult.assetsWithPurchasePrice > 0
  );

  const assetPnLs = pnlResult?.assets || [];
  const withPnL = assetPnLs
    .filter((a) => a.hasPurchasePrice && a.pnlPercent !== null)
    .sort((a, b) => (b.pnlPercent || 0) - (a.pnlPercent || 0));

  const topGainers = withPnL
    .filter((a) => (a.pnlPercent || 0) > 0)
    .slice(0, 3)
    .map((a) => ({
      ticker: a.ticker,
      name: a.name,
      pnlPercent: a.pnlPercent || 0,
    }));

  const topLosers = withPnL
    .filter((a) => (a.pnlPercent || 0) < 0)
    .slice(-3)
    .reverse()
    .map((a) => ({
      ticker: a.ticker,
      name: a.name,
      pnlPercent: a.pnlPercent || 0,
    }));

  // ─ Pre-compute per-asset converted values (in baseCurrency)
  const assetConvertedValues: number[] = safeAssets.map((a) => {
    const raw = (a.price || 0) * (a.holdings || 0);
    const c = a.currency || 'USD';
    if (c === baseCurrency) return raw;
    if (baseCurrency === 'JPY' && c === 'USD') return raw * exchangeRate;
    if (baseCurrency === 'USD' && c === 'JPY') return raw / exchangeRate;
    return raw;
  });

  // ─ Holdings
  const totalValue = assetConvertedValues.reduce((sum, v) => sum + v, 0);

  const holdingsSorted = [...safeAssets]
    .map((a, i) => ({
      ticker: a.ticker,
      name: a.name || a.ticker,
      percentage: totalValue > 0 ? (assetConvertedValues[i] / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // ─ Targets
  const deviations = safeTargets.map((t) => {
    const idx = safeAssets.findIndex(
      (a) => a.id === t.id || a.ticker === t.ticker
    );
    const convertedValue = idx >= 0 ? assetConvertedValues[idx] : 0;
    const currentPct = totalValue > 0 ? (convertedValue / totalValue) * 100 : 0;
    return {
      ticker: t.ticker,
      currentPct,
      targetPct: t.targetPercentage,
      deviation: Math.abs(currentPct - t.targetPercentage),
    };
  });

  const avgDeviation =
    deviations.length > 0
      ? deviations.reduce((s, d) => s + d.deviation, 0) / deviations.length
      : 0;

  // ─ Strength / Weakness lines
  const lineCtx: LineContext = {
    assets: safeAssets,
    totalValue,
    targets: safeTargets,
    baseCurrency,
    assetValues: assetConvertedValues,
  };

  const strengthLine =
    STRENGTH_TEMPLATES[strongest.id]?.generate(lineCtx) ||
    `${strongest.label}が高評価`;
  const weaknessLine =
    WEAKNESS_TEMPLATES[weakest.id]?.generate(lineCtx) ||
    `${weakest.label}に改善余地`;

  return {
    score: {
      totalScore: scoreResult.totalScore,
      grade: scoreResult.grade,
      strongest: {
        id: strongest.id,
        label: strongest.label,
        score: strongest.score,
      },
      weakest: {
        id: weakest.id,
        label: weakest.label,
        score: weakest.score,
      },
      metrics: availableMetrics.map((m) => ({
        id: m.id,
        label: m.label,
        score: m.score,
        grade: m.grade,
      })),
    },
    pnl: {
      available: pnlAvailable,
      totalInvestment: pnlResult?.totalInvestment || 0,
      totalCurrentValue: pnlResult?.totalCurrentValue || 0,
      totalPnL: pnlResult?.totalPnL || 0,
      totalPnLPercent: pnlResult?.totalPnLPercent || 0,
      topGainers,
      topLosers,
    },
    holdings: {
      count: safeAssets.length,
      totalValue,
      baseCurrency,
      topHoldings: holdingsSorted.slice(0, 5),
      currencyBreakdown: currencyBreakdownPct(safeAssets, totalValue, assetConvertedValues),
      assetTypeBreakdown: assetTypeBreakdownPct(safeAssets, totalValue, assetConvertedValues),
    },
    targets: {
      hasTargets: safeTargets.length > 0,
      deviations,
      avgDeviation,
    },
    strengthLine,
    weaknessLine,
  };
}
