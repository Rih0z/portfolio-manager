/**
 * PDF エクスポート テスト
 *
 * 9-BX 教訓: 通貨換算テスト先行（TDD）
 * - USD/JPY 混在シナリオ必須
 * - 精確な値でアサート（toBeGreaterThan(0) 禁止）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePortfolioPDF, _resetFontCache, type PDFExportParams } from '../../../utils/pdfExport';
import type { PortfolioPnL, AssetPnL } from '../../../utils/plCalculation';
import type { PortfolioScoreResult } from '../../../utils/portfolioScore';

// ─── Mock jsPDF ────────────────────────────────────────────

const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFont = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetTextColor = vi.fn();
const mockLine = vi.fn();
const mockAddPage = vi.fn();
const mockAddFileToVFS = vi.fn();
const mockAddFont = vi.fn();
const mockOutputBlob = vi.fn().mockReturnValue(new Blob(['pdf-content'], { type: 'application/pdf' }));

const mockDoc = {
  text: mockText,
  setFontSize: mockSetFontSize,
  setFont: mockSetFont,
  setDrawColor: mockSetDrawColor,
  setTextColor: mockSetTextColor,
  line: mockLine,
  addPage: mockAddPage,
  addFileToVFS: mockAddFileToVFS,
  addFont: mockAddFont,
  output: mockOutputBlob,
  internal: {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297,
    },
  },
  lastAutoTable: { finalY: 100 },
};

vi.mock('jspdf', () => {
  return {
    jsPDF: function() { return mockDoc; },
  };
});

const mockAutoTable = vi.fn().mockImplementation((_doc: any, _options: any) => {
  _doc.lastAutoTable = { finalY: (_options.startY || 0) + 30 };
});

vi.mock('jspdf-autotable', () => ({
  default: mockAutoTable,
}));

// Mock fetch for font loading (returns a fake ArrayBuffer)
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Test Data Factories ───────────────────────────────────

function createAssetPnL(overrides: Partial<AssetPnL> = {}): AssetPnL {
  return {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    currency: 'USD',
    purchasePrice: 150,
    currentPrice: 185,
    holdings: 10,
    investment: 1500,
    currentValue: 1850,
    pnl: 350,
    pnlPercent: 23.33,
    dayChange: 20,
    dayChangePercent: 1.09,
    ytdChange: null,
    ytdChangePercent: null,
    hasPurchasePrice: true,
    ...overrides,
  };
}

function createJPYAssetPnL(overrides: Partial<AssetPnL> = {}): AssetPnL {
  return createAssetPnL({
    ticker: '7203',
    name: 'Toyota Motor',
    currency: 'JPY',
    purchasePrice: 2500,
    currentPrice: 2800,
    holdings: 100,
    investment: 250000,
    currentValue: 280000,
    pnl: 30000,
    pnlPercent: 12.0,
    dayChange: -5000,
    dayChangePercent: -1.75,
    ...overrides,
  });
}

function createPnL(assets: AssetPnL[], overrides: Partial<PortfolioPnL> = {}): PortfolioPnL {
  const totalInvestment = assets.reduce((s, a) => s + (a.investment || 0), 0);
  const totalCurrentValue = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalPnL = totalCurrentValue - totalInvestment;
  return {
    totalInvestment,
    totalCurrentValue,
    totalPnL,
    totalPnLPercent: totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0,
    totalDayChange: assets.reduce((s, a) => s + (a.dayChange || 0), 0),
    totalDayChangePercent: 0.5,
    totalYtdChange: 0,
    totalYtdChangePercent: 0,
    assets,
    assetsWithPurchasePrice: assets.filter(a => a.hasPurchasePrice).length,
    assetsTotal: assets.length,
    isReferenceValue: true as const,
    ...overrides,
  };
}

function createScore(overrides: Partial<PortfolioScoreResult> = {}): PortfolioScoreResult {
  return {
    totalScore: 82,
    grade: 'A',
    metrics: [
      { id: 'diversification', label: '分散度', score: 75, weight: 0.2, grade: 'B', description: '', isPremium: false },
      { id: 'targetAlignment', label: '目標適合度', score: 88, weight: 0.2, grade: 'A', description: '', isPremium: false },
      { id: 'costEfficiency', label: 'コスト効率', score: 90, weight: 0.15, grade: 'A', description: '', isPremium: false },
    ],
    summary: 'Good portfolio',
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────

describe('generatePortfolioPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetFontCache();
    mockDoc.lastAutoTable = { finalY: 100 };
    // Default: font fetch succeeds
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
  });

  // ── Smoke Test ────────────────────────────────────────
  it('generates a PDF blob without errors', async () => {
    const assets = [createAssetPnL()];
    const params: PDFExportParams = {
      pnl: createPnL(assets),
      score: createScore(),
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    const blob = await generatePortfolioPDF(params);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  // ── 日本語ラベル ──────────────────────────────────────
  it('uses Japanese labels for section headers and table headers', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: createScore(),
      baseCurrency: 'JPY',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    // Section headers (via doc.text)
    const textCalls = mockText.mock.calls.map((c: any[]) => c[0]);
    expect(textCalls).toContain('ポートフォリオレポート');
    expect(textCalls).toContain('損益サマリー');
    expect(textCalls).toContain('保有資産一覧');
    expect(textCalls).toContain('ポートフォリオスコア');

    // PnL summary table headers (Japanese)
    const summaryCall = mockAutoTable.mock.calls[0][1];
    expect(summaryCall.head[0]).toEqual(['項目', '値']);
    expect(summaryCall.body[0][0]).toBe('投資総額');
    expect(summaryCall.body[1][0]).toBe('評価総額');
    expect(summaryCall.body[2][0]).toBe('含み損益');
    expect(summaryCall.body[3][0]).toBe('取得単価あり資産数');

    // Holdings table headers (Japanese)
    const holdingsCall = mockAutoTable.mock.calls[1][1];
    expect(holdingsCall.head[0][0]).toBe('銘柄');
    expect(holdingsCall.head[0][1]).toBe('名称');
    expect(holdingsCall.head[0][2]).toBe('数量');
    expect(holdingsCall.head[0][3]).toBe('現在値');

    // Score table headers (Japanese)
    const scoreCall = mockAutoTable.mock.calls[2][1];
    expect(scoreCall.head[0]).toEqual(['指標', '点数', '評価', '重み']);
    // Total row in Japanese
    expect(scoreCall.body[3][0]).toBe('合計');
  });

  // ── Day Change 除去（Critical #3）─────────────────────
  it('does not include Day Change row in PnL summary', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    const summaryCall = mockAutoTable.mock.calls[0][1];
    // PnL summary should have 4 rows (no Day Change)
    expect(summaryCall.body).toHaveLength(4);
    const labels = summaryCall.body.map((r: string[]) => r[0]);
    expect(labels).not.toContain('Day Change');
    expect(labels).not.toContain('前日比');
  });

  // ── JPY Base Currency ─────────────────────────────────
  it('renders JPY formatted values when baseCurrency=JPY', async () => {
    // AAPL: $185 * 10 = $1,850 → ¥277,500 (×150)
    // 7203: ¥2,800 * 100 = ¥280,000
    const usdAsset = createAssetPnL({ currentValue: 277500 });
    const jpyAsset = createJPYAssetPnL();
    const pnl = createPnL([usdAsset, jpyAsset], {
      totalCurrentValue: 277500 + 280000, // ¥557,500
      totalInvestment: 225000 + 250000,    // ¥475,000
      totalPnL: 82500,
    });

    const params: PDFExportParams = {
      pnl,
      score: createScore(),
      baseCurrency: 'JPY',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    expect(mockAutoTable).toHaveBeenCalledTimes(3);

    const summaryCall = mockAutoTable.mock.calls[0][1];
    expect(summaryCall.body[0][0]).toBe('投資総額');
    expect(summaryCall.body[0][1]).toBe('¥475,000');
    expect(summaryCall.body[1][0]).toBe('評価総額');
    expect(summaryCall.body[1][1]).toBe('¥557,500');
  });

  // ── USD Base Currency ─────────────────────────────────
  it('renders USD formatted values when baseCurrency=USD', async () => {
    const usdAsset = createAssetPnL({ currentValue: 1850 });
    const jpyAsset = createJPYAssetPnL({ currentValue: 1866.67 });
    const pnl = createPnL([usdAsset, jpyAsset], {
      totalCurrentValue: 3716.67,
      totalInvestment: 3166.67,
      totalPnL: 550,
    });

    const params: PDFExportParams = {
      pnl,
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    const summaryCall = mockAutoTable.mock.calls[0][1];
    expect(summaryCall.body[0][1]).toBe('$3,166.67');
    expect(summaryCall.body[1][1]).toBe('$3,716.67');
  });

  // ── Empty Portfolio ───────────────────────────────────
  it('handles empty portfolio (0 assets) without errors', async () => {
    const pnl = createPnL([], {
      totalInvestment: 0,
      totalCurrentValue: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
    });

    const params: PDFExportParams = {
      pnl,
      score: null,
      baseCurrency: 'JPY',
      exchangeRate: 150,
    };

    const blob = await generatePortfolioPDF(params);
    expect(blob).toBeInstanceOf(Blob);

    const holdingsCall = mockAutoTable.mock.calls[1][1];
    expect(holdingsCall.body).toHaveLength(0);
  });

  // ── Assets Without Purchase Price ─────────────────────
  it('shows N/A for assets without purchase price', async () => {
    const noPriceAsset = createAssetPnL({
      purchasePrice: null,
      investment: null,
      pnl: null,
      pnlPercent: null,
      hasPurchasePrice: false,
    });
    const pnl = createPnL([noPriceAsset]);

    const params: PDFExportParams = {
      pnl,
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    const holdingsCall = mockAutoTable.mock.calls[1][1];
    const row = holdingsCall.body[0];
    expect(row[5]).toBe('N/A');
    expect(row[6]).toBe('N/A');
  });

  // ── Score Section ─────────────────────────────────────
  it('renders portfolio score section when score is provided', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: createScore(),
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    expect(mockAutoTable).toHaveBeenCalledTimes(3);

    const scoreCall = mockAutoTable.mock.calls[2][1];
    expect(scoreCall.body).toHaveLength(4); // 3 metrics + total
    expect(scoreCall.body[3][0]).toBe('合計');
    expect(scoreCall.body[3][1]).toBe('82');
    expect(scoreCall.body[3][2]).toBe('A');
  });

  it('skips score section when score is null', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    expect(mockAutoTable).toHaveBeenCalledTimes(2);
  });

  // ── Exchange Rate Display ─────────────────────────────
  it('displays correct exchange rate info for JPY base', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'JPY',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    const textCalls = mockText.mock.calls;
    const rateText = textCalls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('¥150/USD')
    );
    expect(rateText).toBeTruthy();
    expect(rateText![0]).toContain('基準通貨: JPY');
  });

  it('displays correct exchange rate info for USD base', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    const textCalls = mockText.mock.calls;
    const rateText = textCalls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('$1 = ¥150')
    );
    expect(rateText).toBeTruthy();
  });

  // ── Mixed Currency Holdings ───────────────────────────
  it('renders holdings table with mixed USD/JPY assets correctly', async () => {
    const usdAsset = createAssetPnL({
      ticker: 'AAPL',
      name: 'Apple Inc.',
      currency: 'USD',
      currentPrice: 185,
      holdings: 10,
      currentValue: 277500,
      pnl: 52500,
      pnlPercent: 23.33,
    });
    const jpyAsset = createJPYAssetPnL();

    const pnl = createPnL([usdAsset, jpyAsset]);

    const params: PDFExportParams = {
      pnl,
      score: null,
      baseCurrency: 'JPY',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    const holdingsCall = mockAutoTable.mock.calls[1][1];
    expect(holdingsCall.body).toHaveLength(2);

    expect(holdingsCall.body[0][0]).toBe('AAPL');
    expect(holdingsCall.body[0][3]).toBe('$185.00');
    expect(holdingsCall.body[1][0]).toBe('7203');
    expect(holdingsCall.body[1][3]).toBe('¥2,800');

    expect(holdingsCall.body[0][4]).toBe('¥277,500');
    expect(holdingsCall.body[1][4]).toBe('¥280,000');
  });

  // ── Name Truncation ───────────────────────────────────
  it('truncates long asset names', async () => {
    const longNameAsset = createAssetPnL({
      name: 'iShares Core S&P 500 UCITS ETF USD (Acc)',
    });
    const pnl = createPnL([longNameAsset]);

    const params: PDFExportParams = {
      pnl,
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    const holdingsCall = mockAutoTable.mock.calls[1][1];
    const name = holdingsCall.body[0][1];
    expect(name.length).toBeLessThanOrEqual(20);
    expect(name).toContain('...');
  });

  // ── Custom Generation Date ────────────────────────────
  it('uses provided generatedAt date', async () => {
    const customDate = new Date('2026-03-12T10:30:00');
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
      generatedAt: customDate,
    };

    await generatePortfolioPDF(params);

    const textCalls = mockText.mock.calls;
    const dateText = textCalls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('2026')
    );
    expect(dateText).toBeTruthy();
  });

  // ── Footer ────────────────────────────────────────────
  it('renders Japanese footer with portfolio-wise.com URL and disclaimer', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    const textCalls = mockText.mock.calls;
    const footerUrl = textCalls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('portfolio-wise.com')
    );
    expect(footerUrl).toBeTruthy();

    const disclaimer = textCalls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('参考値')
    );
    expect(disclaimer).toBeTruthy();
  });

  // ── Page Break ────────────────────────────────────────
  it('adds new page when content exceeds page height', async () => {
    mockAutoTable.mockImplementation((_doc: any, _options: any) => {
      _doc.lastAutoTable = { finalY: 250 };
    });

    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: createScore(),
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    expect(mockAddPage).toHaveBeenCalled();
  });

  // ── Font Loading ──────────────────────────────────────
  it('registers NotoSansJP font when fetch succeeds', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    expect(mockFetch).toHaveBeenCalledWith('/fonts/NotoSansJP-Regular.ttf');
    expect(mockAddFileToVFS).toHaveBeenCalledWith('NotoSansJP-Regular.ttf', expect.any(ArrayBuffer));
    expect(mockAddFont).toHaveBeenCalledWith('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    // Font should be used in autoTable
    const summaryCall = mockAutoTable.mock.calls[0][1];
    expect(summaryCall.headStyles.font).toBe('NotoSansJP');
  });

  it('falls back to helvetica when font fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);

    expect(mockAddFileToVFS).not.toHaveBeenCalled();
    const summaryCall = mockAutoTable.mock.calls[0][1];
    expect(summaryCall.headStyles.font).toBe('helvetica');
  });

  it('caches font data after first load', async () => {
    const params: PDFExportParams = {
      pnl: createPnL([createAssetPnL()]),
      score: null,
      baseCurrency: 'USD',
      exchangeRate: 150,
    };

    await generatePortfolioPDF(params);
    await generatePortfolioPDF(params);

    // fetch called only once (cached)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
