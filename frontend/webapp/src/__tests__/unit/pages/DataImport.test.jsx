import { vi } from "vitest";
/**
 * DataImport.tsx のユニットテスト
 * データ取り込みページコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataImport from '../../../pages/DataImport';

// i18n モック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// usePortfolioContextのモック
vi.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: vi.fn()
}));

import { usePortfolioContext } from '../../../hooks/usePortfolioContext';

// モックコンポーネント
vi.mock('../../../components/ai/ScreenshotAnalyzer', () => ({
  default: function MockScreenshotAnalyzer({ onDataExtracted }) {
    return (
      <div data-testid="screenshot-analyzer">
        <button onClick={() => onDataExtracted({
          portfolioData: {
            assets: [{
              name: 'Test Asset',
              ticker: 'TEST',
              quantity: 100,
              currentPrice: 1000,
              totalValue: 100000
            }]
          }
        }, 'screenshot_portfolio')}>
          Mock Extract Data
        </button>
      </div>
    );
  },
}));

describe('DataImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    usePortfolioContext.mockReturnValue({
      portfolio: { assets: [], totalValue: 0 },
      updatePortfolio: vi.fn()
    });
  });

  test('renders data import page with title and description', () => {
    render(<DataImport />);

    expect(screen.getByText(/データ取り込み/)).toBeInTheDocument();
    expect(screen.getByText(/外部AIで分析されたデータの受け取り/)).toBeInTheDocument();
  });

  test('displays import statistics dashboard', () => {
    render(<DataImport />);

    expect(screen.getByText('インポート回数')).toBeInTheDocument();
    expect(screen.getByText('成功インポート')).toBeInTheDocument();
    expect(screen.getByText('追加された資産')).toBeInTheDocument();
  });

  test('displays tab navigation with all tabs', () => {
    render(<DataImport />);

    expect(screen.getByText('AI分析結果')).toBeInTheDocument();
    expect(screen.getByText('JSONインポート')).toBeInTheDocument();
    expect(screen.getByText('データエクスポート')).toBeInTheDocument();
  });

  test('shows ScreenshotAnalyzer on default tab', () => {
    render(<DataImport />);

    expect(screen.getByTestId('screenshot-analyzer')).toBeInTheDocument();
  });

  test('switches to JSON import tab', () => {
    render(<DataImport />);

    fireEvent.click(screen.getByText('JSONインポート'));

    expect(screen.getByText('ファイルからインポート')).toBeInTheDocument();
    expect(screen.getByText('JSONテキストから直接インポート')).toBeInTheDocument();
    expect(screen.queryByTestId('screenshot-analyzer')).not.toBeInTheDocument();
  });

  test('switches to export tab', () => {
    render(<DataImport />);

    fireEvent.click(screen.getByText('データエクスポート'));

    expect(screen.getByText('現在のポートフォリオ')).toBeInTheDocument();
    expect(screen.getByText('JSONファイルとしてエクスポート')).toBeInTheDocument();
  });

  test('handles data extraction from screenshot analyzer', () => {
    const mockUpdatePortfolio = vi.fn();

    usePortfolioContext.mockReturnValue({
      portfolio: { assets: [], totalValue: 0 },
      updatePortfolio: mockUpdatePortfolio
    });

    render(<DataImport />);

    const extractButton = screen.getByText('Mock Extract Data');
    fireEvent.click(extractButton);

    // portfolio should be updated
    expect(mockUpdatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Asset',
            ticker: 'TEST',
            source: 'ai_import'
          })
        ])
      })
    );
  });

  test('displays import history after successful import', () => {
    render(<DataImport />);

    const extractButton = screen.getByText('Mock Extract Data');
    fireEvent.click(extractButton);

    expect(screen.getByText(/インポート履歴/)).toBeInTheDocument();
    expect(screen.getByText('ポートフォリオ')).toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText(/1\s*件の資産/)).toBeInTheDocument();
  });

  test('updates import stats after extraction', () => {
    render(<DataImport />);

    const extractButton = screen.getByText('Mock Extract Data');
    fireEvent.click(extractButton);

    // Stats should be updated to 1
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(3); // totalImports, successfulImports, assetsAdded
  });

  test('does not display import history when no imports have been made', () => {
    render(<DataImport />);

    expect(screen.queryByText(/インポート履歴/)).not.toBeInTheDocument();
  });

  test('updates portfolio with existing assets correctly', () => {
    const existingPortfolio = {
      assets: [{
        id: 'existing-1',
        ticker: 'TEST',
        name: 'Existing Test Asset',
        quantity: 50,
        currentPrice: 800
      }],
      totalValue: 40000
    };

    const mockUpdatePortfolio = vi.fn();

    usePortfolioContext.mockReturnValue({
      portfolio: existingPortfolio,
      updatePortfolio: mockUpdatePortfolio
    });

    render(<DataImport />);

    const extractButton = screen.getByText('Mock Extract Data');
    fireEvent.click(extractButton);

    // Should update existing asset instead of adding new one
    expect(mockUpdatePortfolio).toHaveBeenCalledWith(
      expect.objectContaining({
        assets: expect.arrayContaining([
          expect.objectContaining({
            ticker: 'TEST',
            name: 'Test Asset',
            quantity: 100,
            currentPrice: 1000
          })
        ])
      })
    );
  });

  test('displays usage tips section', () => {
    render(<DataImport />);

    expect(screen.getByText(/使い方のヒント/)).toBeInTheDocument();
    expect(screen.getByText(/複数の証券会社のデータを統合して管理できます/)).toBeInTheDocument();
  });

  test('shows tab descriptions correctly', () => {
    render(<DataImport />);

    expect(screen.getByText('外部AIで分析された結果をテキストで受け取り')).toBeInTheDocument();

    fireEvent.click(screen.getByText('JSONインポート'));
    expect(screen.getByText('JSONファイルからポートフォリオデータを読み込み')).toBeInTheDocument();

    fireEvent.click(screen.getByText('データエクスポート'));
    expect(screen.getByText('現在のポートフォリオデータをエクスポート')).toBeInTheDocument();
  });

  test('handles multiple imports and updates statistics correctly', () => {
    render(<DataImport />);

    const extractButton = screen.getByText('Mock Extract Data');

    // First import
    fireEvent.click(extractButton);

    // Second import
    fireEvent.click(extractButton);

    // Total imports should be 2
    const statsElements = screen.getAllByText('2');
    expect(statsElements.length).toBeGreaterThanOrEqual(2);
  });

  test('maintains import history with proper ordering', () => {
    render(<DataImport />);

    const extractButton = screen.getByText('Mock Extract Data');

    // First import
    fireEvent.click(extractButton);

    // Second import
    fireEvent.click(extractButton);

    // Should show history items
    const historyItems = screen.getAllByText('ポートフォリオ');
    expect(historyItems).toHaveLength(2);
  });
});
