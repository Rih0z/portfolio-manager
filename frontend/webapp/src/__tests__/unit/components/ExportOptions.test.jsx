/**
 * ExportOptions コンポーネントのユニットテスト
 * データエクスポート機能のテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportOptions from '../../../components/data/ExportOptions';

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
jest.mock('../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: () => mockPortfolioContext
}));

// クリップボードAPIのモック
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn()
  }
});

// File System Access APIのモック
global.window = Object.assign(global.window || {}, {
  showSaveFilePicker: jest.fn()
});

// URL.createObjectURLのモック
global.URL = Object.assign(global.URL || {}, {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn()
});

describe('ExportOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('正常にレンダリングされる', () => {
    render(<ExportOptions />);
    
    expect(screen.getByText('データエクスポート')).toBeInTheDocument();
    expect(screen.getByText('エクスポート形式')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'JSON' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'CSV' })).toBeInTheDocument();
    expect(screen.getByText('ダウンロード')).toBeInTheDocument();
    expect(screen.getByText('クリップボードにコピー')).toBeInTheDocument();
  });

  it('初期状態でJSONが選択されている', () => {
    render(<ExportOptions />);
    
    const jsonButton = screen.getByRole('radio', { name: 'JSON' });
    const csvButton = screen.getByRole('radio', { name: 'CSV' });
    
    expect(jsonButton).toHaveAttribute('aria-checked', 'true');
    expect(csvButton).toHaveAttribute('aria-checked', 'false');
  });

  it('CSV形式を選択できる', () => {
    render(<ExportOptions />);
    
    const csvButton = screen.getByRole('radio', { name: 'CSV' });
    fireEvent.click(csvButton);
    
    expect(csvButton).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'JSON' })).toHaveAttribute('aria-checked', 'false');
  });

  it('クリップボードコピーが動作する', async () => {
    render(<ExportOptions />);
    
    navigator.clipboard.writeText.mockResolvedValue();
    
    const copyButton = screen.getByText('クリップボードにコピー');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('エラーハンドリングが動作する', async () => {
    render(<ExportOptions />);
    
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
    
    const copyButton = screen.getByText('クリップボードにコピー');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('クリップボードへのコピーに失敗しました')).toBeInTheDocument();
    });
  });

  it('JSONデータが正しい構造を持つ', () => {
    render(<ExportOptions />);
    
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
    render(<ExportOptions />);
    
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
    render(<ExportOptions />);
    
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveAttribute('aria-labelledby', 'export-format-label');
    
    const jsonRadio = screen.getByRole('radio', { name: 'JSON' });
    const csvRadio = screen.getByRole('radio', { name: 'CSV' });
    
    expect(jsonRadio).toHaveAttribute('aria-checked', 'true');
    expect(csvRadio).toHaveAttribute('aria-checked', 'false');
  });

  it('ボタンが正しいtype属性を持つ', () => {
    render(<ExportOptions />);
    
    const downloadButton = screen.getByText('ダウンロード');
    const copyButton = screen.getByText('クリップボードにコピー');
    
    expect(downloadButton).toHaveAttribute('type', 'button');
    expect(copyButton).toHaveAttribute('type', 'button');
  });

  it('適切なCSSクラスが適用されている', () => {
    render(<ExportOptions />);
    
    const container = screen.getByText('データエクスポート').closest('div');
    expect(container).toHaveClass('bg-white', 'rounded-lg', 'shadow', 'p-4', 'mb-6');
    
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveClass('flex', 'space-x-4');
    
    const buttonContainer = screen.getByText('ダウンロード').closest('div');
    expect(buttonContainer).toHaveClass('flex', 'space-x-4');
  });
});