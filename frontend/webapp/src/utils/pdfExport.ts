/**
 * PDF エクスポート — Standard 専用機能
 *
 * ポートフォリオの保有資産・損益・スコアを PDF として出力する。
 * jsPDF + jspdf-autotable を lazy import し、初回使用時のみロードする。
 *
 * ⚠️ 9-BX 教訓: baseCurrency + exchangeRate を必須引数として設計し、
 *    PDF 内の全金額を baseCurrency に換算して表示する。
 *
 * 日本語対応: NotoSansJP フォントを public/fonts/ から動的フェッチし、
 * jsPDF に登録する。フォントはキャッシュされ、2回目以降は即座に使用可能。
 *
 * @file src/utils/pdfExport.ts
 */

import type { AssetPnL, PortfolioPnL } from './plCalculation';
import type { PortfolioScoreResult } from './portfolioScore';

// ─── Types ─────────────────────────────────────────────────

export interface PDFExportParams {
  pnl: PortfolioPnL;
  score: PortfolioScoreResult | null;
  baseCurrency: string;
  exchangeRate: number;
  generatedAt?: Date;
}

// ─── Currency Formatting ───────────────────────────────────

const formatCurrency = (amount: number, currency: string): string => {
  if (currency === 'JPY') {
    return `¥${Math.round(amount).toLocaleString('ja-JP')}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (value: number | null): string => {
  if (value === null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// ─── Font Cache ────────────────────────────────────────────

let fontCache: string | null = null;

/**
 * NotoSansJP フォントを動的にロードする。
 * public/fonts/ からフェッチし、メモリキャッシュで2回目以降は即座に返す。
 * フォント取得に失敗した場合は null を返す（helvetica フォールバック）。
 */
async function loadJapaneseFont(): Promise<string | null> {
  if (fontCache) return fontCache as string;
  try {
    const response = await fetch('/fonts/NotoSansJP-Regular.ttf');
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    // jsPDF addFileToVFS requires base64 string
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    fontCache = base64;
    return base64;
  } catch {
    return null;
  }
}

/** テスト用: フォントキャッシュをリセットする */
export function _resetFontCache(): void {
  fontCache = null;
}

// ─── PDF Generation ────────────────────────────────────────

export async function generatePortfolioPDF(
  params: PDFExportParams
): Promise<Blob> {
  const { pnl, score, baseCurrency, exchangeRate, generatedAt = new Date() } = params;

  // Lazy import jsPDF + autotable (メインバンドルに影響なし)
  const [{ jsPDF }, autotableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const autoTable = autotableModule.default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ─── 日本語フォント登録 ─────────────────────────────
  let fontFamily = 'helvetica';
  const fontData = await loadJapaneseFont();
  if (fontData) {
    const fontFileName = 'NotoSansJP-Regular.ttf';
    doc.addFileToVFS(fontFileName, fontData);
    doc.addFont(fontFileName, 'NotoSansJP', 'normal');
    fontFamily = 'NotoSansJP';
  }

  // ─── Header ───────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont(fontFamily, 'normal');
  doc.text('PortfolioWise', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(12);
  doc.text('\u30DD\u30FC\u30C8\u30D5\u30A9\u30EA\u30AA\u30EC\u30DD\u30FC\u30C8', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(10);
  const dateStr = generatedAt.toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const timeStr = generatedAt.toLocaleTimeString('ja-JP', {
    hour: '2-digit', minute: '2-digit',
  });
  doc.text(`${dateStr} ${timeStr}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  const rateDisplay = baseCurrency === 'JPY'
    ? `\u57FA\u6E96\u901A\u8CA8: JPY | \u70BA\u66FF\u30EC\u30FC\u30C8: \u00A5${exchangeRate}/USD`
    : `\u57FA\u6E96\u901A\u8CA8: USD | \u70BA\u66FF\u30EC\u30FC\u30C8: $1 = \u00A5${exchangeRate}`;
  doc.text(rateDisplay, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ─── 損益サマリー ───────────────────────────────────
  doc.setFontSize(13);
  doc.setFont(fontFamily, 'normal');
  doc.text('\u640D\u76CA\u30B5\u30DE\u30EA\u30FC', margin, y);
  y += 7;

  doc.setFontSize(10);

  const summaryRows = [
    ['\u6295\u8CC7\u7DCF\u984D', formatCurrency(pnl.totalInvestment, baseCurrency)],
    ['\u8A55\u4FA1\u7DCF\u984D', formatCurrency(pnl.totalCurrentValue, baseCurrency)],
    ['\u542B\u307F\u640D\u76CA', `${formatCurrency(pnl.totalPnL, baseCurrency)} (${formatPercent(pnl.totalPnLPercent)})`],
    ['\u53D6\u5F97\u5358\u4FA1\u3042\u308A\u8CC7\u7523\u6570', `${pnl.assetsWithPurchasePrice} / ${pnl.assetsTotal}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['\u9805\u76EE', '\u5024']],
    body: summaryRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 9, font: fontFamily },
    bodyStyles: { fontSize: 9, font: fontFamily },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 'auto', halign: 'right' } },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ─── 保有資産一覧 ───────────────────────────────────
  doc.setFontSize(13);
  doc.setFont(fontFamily, 'normal');
  doc.text('\u4FDD\u6709\u8CC7\u7523\u4E00\u89A7', margin, y);
  y += 7;

  const holdingsHead = [
    '\u9298\u67C4',
    '\u540D\u79F0',
    '\u6570\u91CF',
    '\u73FE\u5728\u5024',
    `\u8A55\u4FA1\u984D (${baseCurrency})`,
    `\u640D\u76CA (${baseCurrency})`,
    '\u640D\u76CA\u7387',
  ];

  const holdingsBody = pnl.assets.map((asset: AssetPnL) => [
    asset.ticker,
    truncateName(asset.name, 20),
    asset.holdings.toLocaleString(),
    formatCurrency(asset.currentPrice, asset.currency),
    formatCurrency(asset.currentValue, baseCurrency),
    asset.pnl !== null ? formatCurrency(asset.pnl, baseCurrency) : 'N/A',
    formatPercent(asset.pnlPercent),
  ]);

  autoTable(doc, {
    startY: y,
    head: [holdingsHead],
    body: holdingsBody,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8, font: fontFamily },
    bodyStyles: { fontSize: 8, font: fontFamily },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 35 },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ─── ポートフォリオスコア ───────────────────────────
  if (score) {
    if (y > 240) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(13);
    doc.setFont(fontFamily, 'normal');
    doc.text('\u30DD\u30FC\u30C8\u30D5\u30A9\u30EA\u30AA\u30B9\u30B3\u30A2', margin, y);
    y += 7;

    const scoreHead = ['\u6307\u6A19', '\u70B9\u6570', '\u8A55\u4FA1', '\u91CD\u307F'];
    const scoreBody = score.metrics
      .filter(m => !m.isPremium || score.metrics.length > 3)
      .map(m => [
        m.label,
        `${m.score}`,
        m.grade,
        `${Math.round(m.weight * 100)}%`,
      ]);

    scoreBody.push(['\u5408\u8A08', `${score.totalScore}`, score.grade, '100%']);

    autoTable(doc, {
      startY: y,
      head: [scoreHead],
      body: scoreBody,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, font: fontFamily },
      bodyStyles: { fontSize: 9, font: fontFamily },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
      },
      didParseCell: (data: any) => {
        if (data.row.index === scoreBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Footer ───────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setFont(fontFamily, 'normal');
  doc.setTextColor(150);
  doc.text('Generated by PortfolioWise \u2014 https://portfolio-wise.com', pageWidth / 2, footerY, { align: 'center' });
  doc.text('\u203B \u53C2\u8003\u5024\u3067\u3059\u3002\u6295\u8CC7\u52A9\u8A00\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002', pageWidth / 2, footerY + 4, { align: 'center' });

  return doc.output('blob');
}

// ─── Helpers ───────────────────────────────────────────────

function truncateName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 3) + '...';
}
