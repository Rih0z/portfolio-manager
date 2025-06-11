/**
 * ExportOptions.jsx のテストファイル
 * ポートフォリオデータのエクスポート機能を提供するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportOptions from '../../../../components/data/ExportOptions';

// usePortfolioContextフックのモック
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// グローバルオブジェクトのモック
const mockClipboard = {
  writeText: jest.fn()
};

const mockShowSaveFilePicker = jest.fn();
const mockCreateWritable = jest.fn();
const mockWrite = jest.fn();
const mockClose = jest.fn();

// Blob のモック
global.Blob = jest.fn().mockImplementation((parts, options) => ({
  parts,
  options,
  type: options?.type || 'text/plain'
}));

// URL のモック
global.URL = {
  createObjectURL: jest.fn().mockReturnValue('mock-blob-url'),
  revokeObjectURL: jest.fn()
};

// Document のモック
const mockElement = {
  href: '',
  download: '',
  style: {},
  click: jest.fn()
};

Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockReturnValue(mockElement),
  writable: true
});

Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document.body, 'removeChild', {
  value: jest.fn(),
  writable: true
});

describe('ExportOptions Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  
  const defaultMockData = {
    currentAssets: [
      {
        id: '1',
        name: '米国株式ETF',
        ticker: 'VTI',
        exchangeMarket: 'NASDAQ',
        price: 100,
        currency: 'USD',
        holdings: 500,
        annualFee: 0.03,
        lastUpdated: '2025-01-01T00:00:00Z',
        source: 'manual'
      },
      {
        id: '2',
        name: '日本株式インデックス',
        ticker: '2557',
        exchangeMarket: 'TSE',
        price: 15000,
        currency: 'JPY',
        holdings: 300,
        annualFee: 0.15,
        lastUpdated: '2025-01-01T00:00:00Z',
        source: 'api'
      }
    ],
    targetPortfolio: [
      { id: '1', name: '米国株式ETF', ticker: 'VTI', targetPercentage: 60 },
      { id: '2', name: '日本株式インデックス', ticker: '2557', targetPercentage: 40 }
    ],
    baseCurrency: 'JPY',
    exchangeRate: { rate: 150, source: 'yahoo', lastUpdated: '2025-01-01T00:00:00Z' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePortfolioContext.mockReturnValue(defaultMockData);
    
    // Navigator clipboard API のモック
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true
    });
    
    // showSaveFilePicker API のモック
    mockCreateWritable.mockReturnValue({
      write: mockWrite,
      close: mockClose
    });
    
    mockShowSaveFilePicker.mockResolvedValue({
      createWritable: mockCreateWritable
    });
    
    Object.defineProperty(window, 'showSaveFilePicker', {
      value: mockShowSaveFilePicker,
      writable: true
    });
    
    // console.error のモック
    console.error = jest.fn();
    
    // setTimeout のクリア
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<ExportOptions />);
      
      expect(screen.getByText('データエクスポート')).toBeInTheDocument();
      expect(screen.getByText('エクスポート形式')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('ダウンロード')).toBeInTheDocument();
      expect(screen.getByText('クリップボードにコピー')).toBeInTheDocument();
    });

    test('デフォルトでJSON形式が選択されている', () => {
      render(<ExportOptions />);
      
      const jsonButton = screen.getByText('JSON');
      const csvButton = screen.getByText('CSV');
      
      expect(jsonButton).toHaveClass('bg-primary', 'text-white');
      expect(csvButton).toHaveClass('bg-gray-200');
    });

    test('形式選択ボタンの動作', () => {
      render(<ExportOptions />);
      
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);
      
      expect(csvButton).toHaveClass('bg-primary', 'text-white');
      expect(screen.getByText('JSON')).toHaveClass('bg-gray-200');
    });
  });

  describe('JSON変換機能', () => {
    test('JSONデータが正しく生成される', async () => {
      mockClipboard.writeText.mockResolvedValue();
      
      render(<ExportOptions />);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
      
      const callArgs = mockClipboard.writeText.mock.calls[0][0];
      const jsonData = JSON.parse(callArgs);
      
      expect(jsonData).toHaveProperty('baseCurrency', 'JPY');
      expect(jsonData).toHaveProperty('exchangeRate');
      expect(jsonData).toHaveProperty('lastUpdated');
      expect(jsonData).toHaveProperty('currentAssets');
      expect(jsonData).toHaveProperty('targetPortfolio');
      expect(jsonData.currentAssets).toHaveLength(2);
      expect(jsonData.targetPortfolio).toHaveLength(2);
    });
  });

  describe('CSV変換機能', () => {
    test('CSVデータが正しく生成される', async () => {
      mockClipboard.writeText.mockResolvedValue();
      
      render(<ExportOptions />);
      
      // CSV形式に切り替え
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
      
      const callArgs = mockClipboard.writeText.mock.calls[0][0];
      
      expect(callArgs).toContain('# 保有資産');
      expect(callArgs).toContain('# 目標配分');
      expect(callArgs).toContain('# 設定');
      expect(callArgs).toContain('id,name,ticker,exchangeMarket,price,currency,holdings,annualFee,lastUpdated,source');
      expect(callArgs).toContain('VTI');
      expect(callArgs).toContain('2557');
      expect(callArgs).toContain('baseCurrency,JPY');
      expect(callArgs).toContain('exchangeRate,150');
    });

    test('annualFeeが未定義の場合のCSV生成', async () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            annualFee: undefined
          }
        ]
      });
      
      mockClipboard.writeText.mockResolvedValue();
      
      render(<ExportOptions />);
      
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
      
      const callArgs = mockClipboard.writeText.mock.calls[0][0];
      expect(callArgs).toContain(',0,'); // デフォルト値0が使用される
    });
  });

  describe('ファイルダウンロード機能', () => {
    test('File System Access API対応ブラウザでのダウンロード', async () => {
      render(<ExportOptions />);
      
      const downloadButton = screen.getByText('ダウンロード');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockShowSaveFilePicker).toHaveBeenCalledWith({
          suggestedName: 'portfolio_data.json',
          types: [{
            description: 'JSON files',
            accept: {
              'application/json': ['.json']
            }
          }]
        });
      });
      
      expect(mockCreateWritable).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    test('CSV形式でのファイルダウンロード', async () => {
      render(<ExportOptions />);
      
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);
      
      const downloadButton = screen.getByText('ダウンロード');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockShowSaveFilePicker).toHaveBeenCalledWith({
          suggestedName: 'portfolio_data.csv',
          types: [{
            description: 'CSV files',
            accept: {
              'text/csv': ['.csv']
            }
          }]
        });
      });
    });

    test('File System Access API非対応ブラウザでのフォールバック', async () => {
      // showSaveFilePicker を削除
      delete window.showSaveFilePicker;
      
      render(<ExportOptions />);
      
      const downloadButton = screen.getByText('ダウンロード');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(global.Blob).toHaveBeenCalledWith(
          [expect.any(String)],
          { type: 'application/json' }
        );
      });
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockElement.click).toHaveBeenCalled();
      
      // setTimeout でクリーンアップが実行される
      jest.advanceTimersByTime(100);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
      expect(document.body.removeChild).toHaveBeenCalledWith(mockElement);
    });

    test('ダウンロード成功時のステータス表示', async () => {
      render(<ExportOptions />);
      
      const downloadButton = screen.getByText('ダウンロード');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(screen.getByText('データをJSON形式でダウンロードしました')).toBeInTheDocument();
      });
      
      // 3秒後にステータスがクリアされる
      jest.advanceTimersByTime(3000);
      await waitFor(() => {
        expect(screen.queryByText('データをJSON形式でダウンロードしました')).not.toBeInTheDocument();
      });
    });

    test('ダウンロードエラー時の処理', async () => {
      mockShowSaveFilePicker.mockRejectedValue(new Error('User cancelled'));
      
      render(<ExportOptions />);
      
      const downloadButton = screen.getByText('ダウンロード');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(screen.getByText('エクスポートに失敗しました')).toBeInTheDocument();
      });
      
      expect(console.error).toHaveBeenCalledWith('エクスポートエラー:', expect.any(Error));
    });
  });

  describe('クリップボードコピー機能', () => {
    test('クリップボードコピー成功', async () => {
      mockClipboard.writeText.mockResolvedValue();
      
      render(<ExportOptions />);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
        expect(screen.getByText('クリップボードにコピーしました')).toBeInTheDocument();
      });
      
      // 3秒後にステータスがクリアされる
      jest.advanceTimersByTime(3000);
      await waitFor(() => {
        expect(screen.queryByText('クリップボードにコピーしました')).not.toBeInTheDocument();
      });
    });

    test('クリップボードコピー失敗', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Permission denied'));
      
      render(<ExportOptions />);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('クリップボードへのコピーに失敗しました')).toBeInTheDocument();
      });
      
      expect(console.error).toHaveBeenCalledWith('クリップボードコピーエラー:', expect.any(Error));
    });

    test('データ生成エラー時の処理', async () => {
      // 不正なデータでエラーを発生させる
      usePortfolioContext.mockReturnValue({
        currentAssets: null,
        targetPortfolio: null,
        baseCurrency: null,
        exchangeRate: null
      });
      
      render(<ExportOptions />);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('データの生成に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('エクスポートステータス表示', () => {
    test('成功ステータスのスタイル', async () => {
      mockClipboard.writeText.mockResolvedValue();
      
      render(<ExportOptions />);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        const statusDiv = screen.getByText('クリップボードにコピーしました').parentElement;
        expect(statusDiv).toHaveClass('bg-green-100', 'text-green-800');
      });
    });

    test('エラーステータスのスタイル', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Error'));
      
      render(<ExportOptions />);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        const statusDiv = screen.getByText('クリップボードへのコピーに失敗しました').parentElement;
        expect(statusDiv).toHaveClass('bg-red-100', 'text-red-800');
      });
    });
  });

  describe('エッジケース', () => {
    test('空のデータでのエクスポート', async () => {
      usePortfolioContext.mockReturnValue({
        currentAssets: [],
        targetPortfolio: [],
        baseCurrency: 'USD',
        exchangeRate: { rate: 1, source: '', lastUpdated: new Date().toISOString() }
      });
      
      mockClipboard.writeText.mockResolvedValue();
      
      render(<ExportOptions />);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
      
      const callArgs = mockClipboard.writeText.mock.calls[0][0];
      const jsonData = JSON.parse(callArgs);
      
      expect(jsonData.currentAssets).toEqual([]);
      expect(jsonData.targetPortfolio).toEqual([]);
    });

    test('exchangeRateがnullの場合', async () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        exchangeRate: null
      });
      
      mockClipboard.writeText.mockResolvedValue();
      
      render(<ExportOptions />);
      
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
      
      const callArgs = mockClipboard.writeText.mock.calls[0][0];
      expect(callArgs).toContain('exchangeRate,1'); // デフォルト値
      expect(callArgs).toContain('exchangeRateSource,""'); // 空文字
    });

    test('lastUpdatedが未定義のassetがある場合', async () => {
      usePortfolioContext.mockReturnValue({
        ...defaultMockData,
        currentAssets: [
          {
            ...defaultMockData.currentAssets[0],
            lastUpdated: undefined,
            source: undefined
          }
        ]
      });
      
      mockClipboard.writeText.mockResolvedValue();
      
      render(<ExportOptions />);
      
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);
      
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
      
      const callArgs = mockClipboard.writeText.mock.calls[0][0];
      expect(callArgs).toContain(',"",""'); // 空文字で処理される
    });
  });

  describe('アクセシビリティ', () => {
    test('radiogroup の正しい実装', () => {
      render(<ExportOptions />);
      
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'export-format-label');
      
      const jsonRadio = screen.getByRole('radio', { name: 'JSON' });
      const csvRadio = screen.getByRole('radio', { name: 'CSV' });
      
      expect(jsonRadio).toHaveAttribute('aria-checked', 'true');
      expect(csvRadio).toHaveAttribute('aria-checked', 'false');
    });

    test('ラベルとコントロールの関連付け', () => {
      render(<ExportOptions />);
      
      expect(screen.getByText('エクスポート形式')).toHaveAttribute('id', 'export-format-label');
    });
  });
});