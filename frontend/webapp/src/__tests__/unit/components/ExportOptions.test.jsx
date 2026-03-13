import { vi } from "vitest";
/**
 * ExportOptions コンポーネントのユニットテスト
 * データエクスポート機能のテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ExportOptions from '../../../components/data/ExportOptions';

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// PortfolioContextのモック
const mockPortfolioContext = {
  currentAssets: [
    {
      id: 1,
      name: 'Test Asset 1',
      ticker: 'TEST1',
      exchangeMarket: 'NYSE',
      price: 100,
      currency: 'USD',
      holdings: 10,
      annualFee: 0.5,
      lastUpdated: '2024-01-01T00:00:00Z',
      source: 'test'
    }
  ],
  targetPortfolio: [
    {
      id: 1,
      name: 'Test Asset 1',
      ticker: 'TEST1',
      targetPercentage: 60
    }
  ],
  baseCurrency: 'JPY',
  exchangeRate: {
    rate: 150,
    source: 'test-source',
    lastUpdated: '2024-01-01T00:00:00Z'
  }
};

// usePortfolioContextのモック
vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext
}));

// サブスクリプションフックのモック
let mockCanExportPDF = false;
let mockIsPremium = false;
vi.mock('../../../hooks/queries/useSubscription', () => ({
  useCanUseFeature: (feature) => {
    if (feature === 'pdfExport') return mockCanExportPDF;
    return true;
  },
  useIsPremium: () => mockIsPremium,
}));

// portfolioScore / plCalculation のモック
vi.mock('../../../utils/plCalculation', () => ({
  calculatePortfolioPnL: vi.fn().mockReturnValue({
    totalInvestment: 150000,
    totalCurrentValue: 160000,
    totalPnL: 10000,
    totalPnLPercent: 6.67,
    totalDayChange: 500,
    totalDayChangePercent: 0.31,
    totalYtdChange: 0,
    totalYtdChangePercent: 0,
    assets: [],
    assetsWithPurchasePrice: 1,
    assetsTotal: 1,
    isReferenceValue: true,
  }),
}));

vi.mock('../../../utils/portfolioScore', () => ({
  calculatePortfolioScore: vi.fn().mockReturnValue({
    totalScore: 75,
    grade: 'A',
    metrics: [],
    summary: 'Good',
  }),
}));

// PDF エクスポートのモック（lazy import 用）
vi.mock('../../../utils/pdfExport', () => ({
  generatePortfolioPDF: vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
}));

// クリップボードAPIのモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn()
  }
});

// File System Access APIのモック
global.window = Object.assign(global.window || {}, {
  showSaveFilePicker: vi.fn()
});

// URL.createObjectURLのモック
global.URL = Object.assign(global.URL || {}, {
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn()
});

describe('ExportOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('正常にレンダリングされる', () => {
    renderWithRouter(<ExportOptions />);
    
    expect(screen.getByText('データエクスポート')).toBeInTheDocument();
    expect(screen.getByText('エクスポート形式')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'JSON' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'CSV' })).toBeInTheDocument();
    expect(screen.getByText('ダウンロード')).toBeInTheDocument();
    expect(screen.getByText('クリップボードにコピー')).toBeInTheDocument();
  });

  it('初期状態でJSONが選択されている', () => {
    renderWithRouter(<ExportOptions />);
    
    const jsonButton = screen.getByRole('radio', { name: 'JSON' });
    const csvButton = screen.getByRole('radio', { name: 'CSV' });
    
    expect(jsonButton).toHaveAttribute('aria-checked', 'true');
    expect(csvButton).toHaveAttribute('aria-checked', 'false');
  });

  it('CSV形式を選択できる', () => {
    renderWithRouter(<ExportOptions />);
    
    const csvButton = screen.getByRole('radio', { name: 'CSV' });
    fireEvent.click(csvButton);
    
    expect(csvButton).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'JSON' })).toHaveAttribute('aria-checked', 'false');
  });

  it.skip('クリップボードコピーが動作する', async () => {
    renderWithRouter(<ExportOptions />);
    
    navigator.clipboard.writeText.mockResolvedValue();
    
    const copyButton = screen.getByText('クリップボードにコピー');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it.skip('エラーハンドリングが動作する', async () => {
    renderWithRouter(<ExportOptions />);
    
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
    
    const copyButton = screen.getByText('クリップボードにコピー');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('クリップボードへのコピーに失敗しました')).toBeInTheDocument();
    });
  });

  it('JSONデータが正しい構造を持つ', () => {
    renderWithRouter(<ExportOptions />);
    
    navigator.clipboard.writeText.mockResolvedValue();
    
    const copyButton = screen.getByText('クリップボードにコピー');
    fireEvent.click(copyButton);
    
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0];
    const data = JSON.parse(calledWith);
    
    expect(data).toHaveProperty('baseCurrency', 'JPY');
    expect(data).toHaveProperty('exchangeRate');
    expect(data).toHaveProperty('lastUpdated');
    expect(data).toHaveProperty('currentAssets');
    expect(data).toHaveProperty('targetPortfolio');
    expect(data.currentAssets).toHaveLength(1);
    expect(data.targetPortfolio).toHaveLength(1);
  });

  it('CSVデータが正しい形式を持つ', () => {
    renderWithRouter(<ExportOptions />);
    
    // CSV形式を選択
    const csvButton = screen.getByRole('radio', { name: 'CSV' });
    fireEvent.click(csvButton);
    
    navigator.clipboard.writeText.mockResolvedValue();
    
    const copyButton = screen.getByText('クリップボードにコピー');
    fireEvent.click(copyButton);
    
    const calledWith = navigator.clipboard.writeText.mock.calls[0][0];
    
    expect(calledWith).toContain('# 保有資産');
    expect(calledWith).toContain('id,name,ticker,exchangeMarket,price,currency,holdings,annualFee,lastUpdated,source');
    expect(calledWith).toContain('1,"Test Asset 1",TEST1,NYSE,100,USD,10,0.5');
    expect(calledWith).toContain('# 目標配分');
    expect(calledWith).toContain('id,name,ticker,targetPercentage');
    expect(calledWith).toContain('# 設定');
    expect(calledWith).toContain('baseCurrency,JPY');
  });

  it('アクセシビリティ属性が正しく設定されている', () => {
    renderWithRouter(<ExportOptions />);
    
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveAttribute('aria-labelledby', 'export-format-label');
    
    const jsonRadio = screen.getByRole('radio', { name: 'JSON' });
    const csvRadio = screen.getByRole('radio', { name: 'CSV' });
    
    expect(jsonRadio).toHaveAttribute('aria-checked', 'true');
    expect(csvRadio).toHaveAttribute('aria-checked', 'false');
  });

  it('ボタンが正しいtype属性を持つ', () => {
    renderWithRouter(<ExportOptions />);
    
    const downloadButton = screen.getByText('ダウンロード');
    const copyButton = screen.getByText('クリップボードにコピー');
    
    expect(downloadButton).toHaveAttribute('type', 'button');
    expect(copyButton).toHaveAttribute('type', 'button');
  });

  it('適切なCSSクラスが適用されている', () => {
    renderWithRouter(<ExportOptions />);

    const container = screen.getByText('データエクスポート').closest('div');
    expect(container).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-4', 'mb-6');

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveClass('flex', 'space-x-4');

    const buttonContainer = screen.getByText('ダウンロード').closest('div');
    expect(buttonContainer).toHaveClass('flex', 'space-x-4');
  });

  // ── PDF エクスポート テスト ────────────────────────────

  describe('PDF エクスポート', () => {
    it('Free ユーザーには PDF ボタンがロック表示される', () => {
      mockCanExportPDF = false;
      mockIsPremium = false;
      renderWithRouter(<ExportOptions />);

      expect(screen.getByTestId('pdf-export-locked')).toBeInTheDocument();
      expect(screen.getByTestId('pdf-export-locked')).toBeDisabled();
      // UpgradePrompt が表示される
      expect(screen.getByText('PDF レポート')).toBeInTheDocument();
    });

    it('Standard ユーザーには PDF ボタンが有効表示される', () => {
      mockCanExportPDF = true;
      mockIsPremium = true;
      renderWithRouter(<ExportOptions />);

      const pdfButton = screen.getByTestId('pdf-export-button');
      expect(pdfButton).toBeInTheDocument();
      expect(pdfButton).not.toBeDisabled();
      expect(pdfButton).toHaveTextContent('PDF でエクスポート');
    });

    it('Standard ユーザーが PDF ボタンをクリックするとダウンロードが開始される', async () => {
      mockCanExportPDF = true;
      mockIsPremium = true;
      vi.useRealTimers();

      renderWithRouter(<ExportOptions />);
      const pdfButton = screen.getByTestId('pdf-export-button');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(screen.getByText('PDF レポートをダウンロードしました')).toBeInTheDocument();
      });
    });

    it('PDF 生成失敗時にエラーメッセージと再試行ボタンが表示される', async () => {
      mockCanExportPDF = true;
      mockIsPremium = true;
      vi.useRealTimers();

      // generatePortfolioPDF を reject させる
      const { generatePortfolioPDF } = await import('../../../utils/pdfExport');
      generatePortfolioPDF.mockRejectedValueOnce(new Error('PDF generation failed'));

      renderWithRouter(<ExportOptions />);
      const pdfButton = screen.getByTestId('pdf-export-button');
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(screen.getByText('PDF の生成に失敗しました')).toBeInTheDocument();
        expect(screen.getByTestId('pdf-retry-button')).toBeInTheDocument();
        expect(screen.getByText('再試行')).toBeInTheDocument();
      });
    });

    it('Free ユーザーには PDF プレビュー（blur）が表示される', () => {
      mockCanExportPDF = false;
      mockIsPremium = false;
      renderWithRouter(<ExportOptions />);

      expect(screen.getByTestId('pdf-preview')).toBeInTheDocument();
      expect(screen.getByText('Standard プランで利用可能')).toBeInTheDocument();
    });
  });
});