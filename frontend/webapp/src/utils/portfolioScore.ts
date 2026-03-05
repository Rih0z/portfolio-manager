/**
 * ポートフォリオスコアリングエンジン
 *
 * 8つの指標で100点満点のスコアを算出し、
 * ポートフォリオの健全性を多角的に評価する。
 *
 * @file src/utils/portfolioScore.ts
 */

// ─── Types ─────────────────────────────────────────────────

export interface ScoreMetric {
  id: string;
  label: string;
  score: number;       // 0-100
  weight: number;      // 0-1
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  description: string;
  isPremium: boolean;  // Standard 専用指標
}

export interface PortfolioScoreResult {
  totalScore: number;          // 0-100 (加重平均)
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: ScoreMetric[];
  summary: string;
}

interface Asset {
  id: string;
  ticker: string;
  name: string;
  price: number;
  holdings: number;
  currency: string;
  annualFee: number;
  fundType?: string;
  hasDividend?: boolean;
  dividendYield?: number;
}

interface TargetAllocation {
  id: string;
  ticker: string;
  targetPercentage: number;
}

// ─── Score Helpers ──────────────────────────────────────────

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function getOverallGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Individual Metric Calculators ─────────────────────────

/**
 * 1. 分散度スコア: 銘柄数と集中度を評価
 * - 1銘柄 = 0点, 5銘柄 = 60点, 10+ = 80点
 * - 最大保有比率が50%以上でペナルティ
 */
function calcDiversification(assets: Asset[], totalValue: number): number {
  if (assets.length === 0) return 0;
  if (assets.length === 1) return 15;

  // 銘柄数スコア (最大60点)
  const countScore = clamp(assets.length * 8, 0, 60);

  // HHI (Herfindahl-Hirschman Index) で集中度測定
  const weights = assets.map(a => {
    const val = a.price * a.holdings;
    return totalValue > 0 ? val / totalValue : 0;
  });
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  // 完全均等 = 1/N, 完全集中 = 1
  const idealHHI = 1 / assets.length;
  const hhiRatio = idealHHI > 0 ? hhi / 1 : 1; // 0 = 完全均等, 1 = 完全集中
  const concentrationScore = clamp((1 - hhiRatio) * 40, 0, 40);

  return Math.round(countScore + concentrationScore);
}

/**
 * 2. 目標適合度スコア: 現在配分と目標配分の乖離度
 * - 平均乖離 0% = 100点, 10%+ = 0点
 */
function calcTargetAlignment(
  assets: Asset[],
  targets: TargetAllocation[],
  totalValue: number
): number {
  if (targets.length === 0 || totalValue === 0) return 50; // 目標未設定は中間評価

  let totalDeviation = 0;
  let matched = 0;

  for (const target of targets) {
    const asset = assets.find(a => a.id === target.id || a.ticker === target.ticker);
    const currentPct = asset ? (asset.price * asset.holdings / totalValue) * 100 : 0;
    const deviation = Math.abs(currentPct - target.targetPercentage);
    totalDeviation += deviation;
    matched++;
  }

  if (matched === 0) return 50;

  const avgDeviation = totalDeviation / matched;
  return Math.round(clamp(100 - avgDeviation * 10, 0, 100));
}

/**
 * 3. コスト効率スコア: 加重平均信託報酬
 * - 0.1%以下 = 100点, 1%+ = 20点
 */
function calcCostEfficiency(assets: Asset[], totalValue: number): number {
  if (assets.length === 0 || totalValue === 0) return 50;

  let weightedFee = 0;
  for (const asset of assets) {
    const value = asset.price * asset.holdings;
    const weight = value / totalValue;
    weightedFee += (asset.annualFee || 0) * weight;
  }

  // 0% = 100, 0.2% = 85, 0.5% = 65, 1% = 40, 2%+ = 0
  return Math.round(clamp(100 - weightedFee * 50, 0, 100));
}

/**
 * 4. リバランス必要度（逆スコア）: リバランス不要 = 高スコア
 */
function calcRebalanceHealth(
  assets: Asset[],
  targets: TargetAllocation[],
  totalValue: number
): number {
  if (targets.length === 0) return 70; // 目標未設定

  let maxDeviation = 0;
  for (const target of targets) {
    const asset = assets.find(a => a.id === target.id || a.ticker === target.ticker);
    const currentPct = asset ? (asset.price * asset.holdings / totalValue) * 100 : 0;
    const deviation = Math.abs(currentPct - target.targetPercentage);
    maxDeviation = Math.max(maxDeviation, deviation);
  }

  // 最大乖離 0% = 100, 5% = 70, 15%+ = 0
  return Math.round(clamp(100 - maxDeviation * 6.67, 0, 100));
}

/**
 * 5. 通貨分散スコア: 複数通貨保有
 */
function calcCurrencyDiversification(assets: Asset[], totalValue: number): number {
  if (assets.length === 0) return 0;

  const currencyWeights: Record<string, number> = {};
  for (const asset of assets) {
    const value = asset.price * asset.holdings;
    const weight = totalValue > 0 ? value / totalValue : 0;
    currencyWeights[asset.currency] = (currencyWeights[asset.currency] || 0) + weight;
  }

  const currencies = Object.keys(currencyWeights);
  if (currencies.length === 1) return 40; // 単一通貨
  if (currencies.length >= 3) return 100;

  // 2通貨: 比率の偏りで評価
  const maxWeight = Math.max(...Object.values(currencyWeights));
  return Math.round(clamp(40 + (1 - maxWeight) * 120, 40, 100));
}

/**
 * 6. 配当効率スコア: 配当利回りの分布
 */
function calcDividendHealth(assets: Asset[], totalValue: number): number {
  if (assets.length === 0) return 50;

  let weightedYield = 0;
  let dividendAssets = 0;
  for (const asset of assets) {
    if (asset.hasDividend && asset.dividendYield) {
      const value = asset.price * asset.holdings;
      const weight = totalValue > 0 ? value / totalValue : 0;
      weightedYield += asset.dividendYield * weight;
      dividendAssets++;
    }
  }

  // 配当なし = 50 (ニュートラル), 1-3% = 高得点, 5%+ = やや減点（リスク）
  if (dividendAssets === 0) return 50;
  if (weightedYield >= 1 && weightedYield <= 3) return 90;
  if (weightedYield > 3 && weightedYield <= 5) return 75;
  if (weightedYield > 5) return 60; // 高配当 = ややリスク
  return Math.round(clamp(50 + weightedYield * 20, 50, 90));
}

/**
 * 7. アセットタイプ分散スコア: 株式/ETF/投資信託の混在度
 */
function calcAssetTypeDiversification(assets: Asset[]): number {
  if (assets.length === 0) return 0;

  const types = new Set(assets.map(a => a.fundType || 'unknown'));
  if (types.size >= 3) return 100;
  if (types.size === 2) return 70;
  return 40; // 単一タイプ
}

/**
 * 8. データ鮮度スコア: 資産データの更新状況
 */
function calcDataFreshness(assets: Asset[]): number {
  if (assets.length === 0) return 0;

  const now = Date.now();
  let totalAge = 0;
  let count = 0;

  for (const asset of assets) {
    if ((asset as any).lastUpdated) {
      const age = now - new Date((asset as any).lastUpdated).getTime();
      totalAge += age;
      count++;
    }
  }

  if (count === 0) return 30;

  const avgAgeHours = totalAge / count / (1000 * 60 * 60);

  // 1時間以内 = 100, 24時間 = 70, 7日 = 30, 30日+ = 0
  if (avgAgeHours <= 1) return 100;
  if (avgAgeHours <= 24) return 85;
  if (avgAgeHours <= 168) return 60;
  if (avgAgeHours <= 720) return 30;
  return 10;
}

// ─── Main Calculator ───────────────────────────────────────

/**
 * ポートフォリオスコアを計算する
 *
 * @param assets    現在の保有資産
 * @param targets   目標配分
 * @param isPremium Standard プランか
 */
export function calculatePortfolioScore(
  assets: Asset[],
  targets: TargetAllocation[] | undefined | null,
  isPremium: boolean = false
): PortfolioScoreResult {
  const safeAssets = assets || [];
  const safeTargets = targets || [];
  const totalValue = safeAssets.reduce((sum, a) => sum + a.price * a.holdings, 0);

  // Free = 基本3指標, Standard = 全8指標
  const allMetrics: ScoreMetric[] = [
    // 基本3指標（Free + Standard）
    {
      id: 'diversification',
      label: '分散度',
      score: calcDiversification(safeAssets, totalValue),
      weight: 0.2,
      grade: 'A',
      description: '保有銘柄数と集中度',
      isPremium: false,
    },
    {
      id: 'target_alignment',
      label: '目標適合度',
      score: calcTargetAlignment(safeAssets, safeTargets, totalValue),
      weight: 0.2,
      grade: 'A',
      description: '目標配分との乖離',
      isPremium: false,
    },
    {
      id: 'cost_efficiency',
      label: 'コスト効率',
      score: calcCostEfficiency(safeAssets, totalValue),
      weight: 0.15,
      grade: 'A',
      description: '加重平均信託報酬',
      isPremium: false,
    },
    // Standard 専用指標
    {
      id: 'rebalance_health',
      label: 'リバランス健全度',
      score: calcRebalanceHealth(safeAssets, safeTargets, totalValue),
      weight: 0.1,
      grade: 'A',
      description: 'リバランスの必要性',
      isPremium: true,
    },
    {
      id: 'currency_diversification',
      label: '通貨分散',
      score: calcCurrencyDiversification(safeAssets, totalValue),
      weight: 0.1,
      grade: 'A',
      description: '複数通貨での保有',
      isPremium: true,
    },
    {
      id: 'dividend_health',
      label: '配当効率',
      score: calcDividendHealth(safeAssets, totalValue),
      weight: 0.1,
      grade: 'A',
      description: '配当利回りの質',
      isPremium: true,
    },
    {
      id: 'asset_type_diversity',
      label: 'タイプ分散',
      score: calcAssetTypeDiversification(safeAssets),
      weight: 0.08,
      grade: 'A',
      description: '株式/ETF/投信の混在',
      isPremium: true,
    },
    {
      id: 'data_freshness',
      label: 'データ鮮度',
      score: calcDataFreshness(safeAssets),
      weight: 0.07,
      grade: 'A',
      description: '市場データの更新度',
      isPremium: true,
    },
  ];

  // グレード設定
  allMetrics.forEach(m => {
    m.grade = getGrade(m.score);
  });

  // 利用可能な指標でフィルタ
  const availableMetrics = isPremium
    ? allMetrics
    : allMetrics.filter(m => !m.isPremium);

  // 加重平均スコア
  const totalWeight = availableMetrics.reduce((sum, m) => sum + m.weight, 0);
  const totalScore = totalWeight > 0
    ? Math.round(availableMetrics.reduce((sum, m) => sum + m.score * m.weight, 0) / totalWeight)
    : 0;

  const grade = getOverallGrade(totalScore);

  // サマリー生成
  const summary = generateSummary(totalScore, grade, availableMetrics);

  return {
    totalScore,
    grade,
    metrics: allMetrics, // 全指標を返す（Premium以外はロック表示用）
    summary,
  };
}

function generateSummary(
  score: number,
  grade: string,
  metrics: ScoreMetric[]
): string {
  const weakest = [...metrics].sort((a, b) => a.score - b.score)[0];
  const strongest = [...metrics].sort((a, b) => b.score - a.score)[0];

  if (score >= 80) {
    return `優秀なポートフォリオです。${strongest?.label}が特に高評価。`;
  }
  if (score >= 60) {
    return `概ね良好です。${weakest?.label}の改善で更にスコアアップが見込めます。`;
  }
  if (score >= 40) {
    return `改善の余地があります。${weakest?.label}の見直しを検討してください。`;
  }
  return `ポートフォリオの見直しを推奨します。${weakest?.label}を優先的に改善してください。`;
}
