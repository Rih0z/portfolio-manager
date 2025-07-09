/**
 * ImportOptions.jsx のテストファイル
 * ポートフォリオデータのインポート機能を提供するコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImportOptions from '../../../../components/data/ImportOptions';

// Papa Parse のモック
jest.mock('papaparse', () => ({
  parse: jest.fn()
}));

// usePortfolioContextフックのモック
const mockImportData = jest.fn();
jest.mock('../../../../hooks/usePortfolioContext', () => ({
  usePortfolioContext: jest.fn()
}));

// FileReader のモック
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  onload: null,
  onerror: null,
  result: null
}));

// Navigator clipboard API のモック
const mockClipboard = {
  readText: jest.fn()
};

describe('ImportOptions Component', () => {
  const { usePortfolioContext } = require('../../../../hooks/usePortfolioContext');
  let mockFileReader;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // FileReader のモックをセットアップ
    mockFileReader = {
      readAsText: jest.fn(),
      onload: null,
      onerror: null,
      result: null
    };
    global.FileReader = jest.fn(() => mockFileReader);
    
    // Navigator clipboard のモック
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true
    });
    
    // Papa Parse のモック
    const Papa = require('papaparse');
    Papa.parse.mockReturnValue({
      data: [
        { id: '1', name: 'テスト', ticker: 'TEST', price: '100', holdings: '10', annualFee: '0.1' }
      ]
    });
    
    // usePortfolioContext のモック設定
    usePortfolioContext.mockReturnValue({
      importData: mockImportData
    });
    
    // importData のモックデフォルト動作
    mockImportData.mockResolvedValue({ success: true, message: 'インポート成功' });
  });

  describe('レンダリング', () => {
    test('基本コンポーネントが正しく表示される', () => {
      render(<ImportOptions />);
      
      expect(screen.getByText('データインポート')).toBeInTheDocument();
      expect(screen.getByText('インポート形式')).toBeInTheDocument();
      expect(screen.getByText('インポート方法')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('ファイル')).toBeInTheDocument();
      expect(screen.getByText('クリップボード')).toBeInTheDocument();
      expect(screen.getByText('テキスト入力')).toBeInTheDocument();
    });

    test('デフォルトでJSON形式とファイル方法が選択されている', () => {
      render(<ImportOptions />);
      
      const jsonButton = screen.getByRole('radio', { name: 'JSON' });
      const csvButton = screen.getByRole('radio', { name: 'CSV' });
      const fileButton = screen.getByRole('radio', { name: 'ファイル' });
      const clipboardButton = screen.getByRole('radio', { name: 'クリップボード' });
      
      expect(jsonButton).toHaveAttribute('aria-checked', 'true');
      expect(csvButton).toHaveAttribute('aria-checked', 'false');
      expect(fileButton).toHaveAttribute('aria-checked', 'true');
      expect(clipboardButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('形式選択', () => {
    test('CSV形式への切り替え', () => {
      render(<ImportOptions />);
      
      const csvButton = screen.getByRole('radio', { name: 'CSV' });
      fireEvent.click(csvButton);
      
      expect(csvButton).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('radio', { name: 'JSON' })).toHaveAttribute('aria-checked', 'false');
    });

    test('ファイル入力のaccept属性が変更される', () => {
      render(<ImportOptions />);
      
      const fileInput = screen.getByLabelText('ファイルをアップロード');
      expect(fileInput).toHaveAttribute('accept', '.json');
      
      const csvButton = screen.getByRole('radio', { name: 'CSV' });
      fireEvent.click(csvButton);
      
      expect(fileInput).toHaveAttribute('accept', '.csv');
    });
  });

  describe('インポート方法選択', () => {
    test('クリップボード方法への切り替え', () => {
      render(<ImportOptions />);
      
      const clipboardButton = screen.getByRole('radio', { name: 'クリップボード' });
      fireEvent.click(clipboardButton);
      
      expect(clipboardButton).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByText('クリップボードから貼り付け')).toBeInTheDocument();
      expect(screen.queryByLabelText('ファイルをアップロード')).not.toBeInTheDocument();
    });

    test('テキスト入力方法への切り替え', () => {
      render(<ImportOptions />);
      
      const textButton = screen.getByRole('radio', { name: 'テキスト入力' });
      fireEvent.click(textButton);
      
      expect(textButton).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByLabelText('データを貼り付け')).toBeInTheDocument();
      expect(screen.getByText('インポート')).toBeInTheDocument();
    });
  });

  describe('ファイルインポート機能', () => {
    test('JSONファイルの成功インポート', async () => {
      render(<ImportOptions />);
      
      const fileInput = screen.getByLabelText('ファイルをアップロード');
      const file = new File(['{"currentAssets": []}'], 'test.json', { type: 'application/json' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // FileReader.onload をトリガー
      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file);
      
      // onload イベントをシミュレート
      mockFileReader.result = '{"currentAssets": [], "targetPortfolio": []}';
      await waitFor(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: mockFileReader.result } });
        }
      });
      
      await waitFor(() => {
        expect(mockImportData).toHaveBeenCalledWith(expect.objectContaining({
          currentAssets: [],
          targetPortfolio: [],
          additionalBudget: { amount: 0, currency: 'JPY' }
        }));
      });
    });

    test('CSVファイルの成功インポート', async () => {
      render(<ImportOptions />);
      
      // CSV形式に切り替え
      const csvButton = screen.getByRole('radio', { name: 'CSV' });
      fireEvent.click(csvButton);
      
      const fileInput = screen.getByLabelText('ファイルをアップロード');
      const file = new File(['# 保有資産\nid,name\n1,test'], 'test.csv', { type: 'text/csv' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      mockFileReader.result = '# 保有資産\nid,name,ticker,price,holdings\n1,テスト,TEST,100,10';
      await waitFor(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: mockFileReader.result } });
        }
      });
      
      await waitFor(() => {
        expect(mockImportData).toHaveBeenCalled();
      });
    });

    test('ファイル読み込みエラーの処理', async () => {
      render(<ImportOptions />);
      
      const fileInput = screen.getByLabelText('ファイルをアップロード');
      const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // onload で無効なJSONを設定
      mockFileReader.result = 'invalid json';
      await waitFor(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: mockFileReader.result } });
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText(/インポートに失敗しました/)).toBeInTheDocument();
      });
    });

    test('FileReader onerror の処理', async () => {
      render(<ImportOptions />);
      
      const fileInput = screen.getByLabelText('ファイルをアップロード');
      const file = new File(['test'], 'test.json', { type: 'application/json' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      // onerror をトリガー
      await waitFor(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror();
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('ファイルの読み込みに失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('クリップボードインポート機能', () => {
    test('クリップボードからのJSONインポート成功', async () => {
      mockClipboard.readText.mockResolvedValue('{"currentAssets": [], "targetPortfolio": []}');
      
      render(<ImportOptions />);
      
      const clipboardButton = screen.getByRole('radio', { name: 'クリップボード' });
      fireEvent.click(clipboardButton);
      
      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);
      
      await waitFor(() => {
        expect(mockClipboard.readText).toHaveBeenCalled();
        expect(mockImportData).toHaveBeenCalled();
      });
    });

    test('クリップボードからのCSVインポート成功', async () => {
      mockClipboard.readText.mockResolvedValue('# 保有資産\nid,name\n1,test');
      
      render(<ImportOptions />);
      
      const csvButton = screen.getByRole('radio', { name: 'CSV' });
      fireEvent.click(csvButton);
      
      const clipboardButton = screen.getByRole('radio', { name: 'クリップボード' });
      fireEvent.click(clipboardButton);
      
      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);
      
      await waitFor(() => {
        expect(mockImportData).toHaveBeenCalled();
      });
    });

    test('空のクリップボードエラー処理', async () => {
      mockClipboard.readText.mockResolvedValue('');
      
      render(<ImportOptions />);
      
      const clipboardButton = screen.getByRole('radio', { name: 'クリップボード' });
      fireEvent.click(clipboardButton);
      
      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);
      
      await waitFor(() => {
        expect(screen.getByText(/クリップボードが空です/)).toBeInTheDocument();
      });
    });

    test('importData関数が利用不可の場合のエラー', async () => {
      mockClipboard.readText.mockResolvedValue('{"test": "data"}');
      mockImportData.mockImplementation(() => {
        throw new Error('function not available');
      });
      
      render(<ImportOptions />);
      
      const clipboardButton = screen.getByRole('radio', { name: 'クリップボード' });
      fireEvent.click(clipboardButton);
      
      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);
      
      await waitFor(() => {
        expect(screen.getByText(/インポートに失敗しました/)).toBeInTheDocument();
      });
    });
  });

  describe('テキスト入力インポート機能', () => {
    test('テキスト入力からのJSONインポート成功', async () => {
      render(<ImportOptions />);
      
      const textButton = screen.getByRole('radio', { name: 'テキスト入力' });
      fireEvent.click(textButton);
      
      const textArea = screen.getByLabelText('データを貼り付け');
      const importButton = screen.getByText('インポート');
      
      fireEvent.change(textArea, { target: { value: '{"currentAssets": [], "targetPortfolio": []}' } });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(mockImportData).toHaveBeenCalled();
      });
      
      // 成功後にテキストエリアがクリアされることを確認
      await waitFor(() => {
        expect(textArea.value).toBe('');
      });
    });

    test('空のテキスト入力エラー処理', async () => {
      render(<ImportOptions />);
      
      const textButton = screen.getByRole('radio', { name: 'テキスト入力' });
      fireEvent.click(textButton);
      
      // テキストエリアが表示されることを確認
      await waitFor(() => {
        expect(screen.getByLabelText('データを貼り付け')).toBeInTheDocument();
      });
      
      const importButton = screen.getByText('インポート');
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(screen.getByText('インポートするデータを入力してください')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('無効なJSONデータのエラー処理', async () => {
      render(<ImportOptions />);
      
      const textButton = screen.getByRole('radio', { name: 'テキスト入力' });
      fireEvent.click(textButton);
      
      const textArea = screen.getByLabelText('データを貼り付け');
      const importButton = screen.getByText('インポート');
      
      fireEvent.change(textArea, { target: { value: 'invalid json' } });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(screen.getByText(/インポートに失敗しました/)).toBeInTheDocument();
      });
    });
  });

  describe('データ正規化機能', () => {
    test('additionalBudgetのデフォルト値設定', async () => {
      render(<ImportOptions />);
      
      const textButton = screen.getByRole('radio', { name: 'テキスト入力' });
      fireEvent.click(textButton);
      
      const textArea = screen.getByLabelText('データを貼り付け');
      const importButton = screen.getByText('インポート');
      
      fireEvent.change(textArea, { target: { value: '{"currentAssets": []}' } });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(mockImportData).toHaveBeenCalledWith(expect.objectContaining({
          additionalBudget: { amount: 0, currency: 'JPY' }
        }));
      });
    });

    test('アセットのID/ticker正規化', async () => {
      render(<ImportOptions />);
      
      const textButton = screen.getByRole('radio', { name: 'テキスト入力' });
      fireEvent.click(textButton);
      
      const textArea = screen.getByLabelText('データを貼り付け');
      const importButton = screen.getByText('インポート');
      
      const testData = {
        currentAssets: [{ ticker: 'TEST1' }, { id: 'TEST2' }],
        targetPortfolio: [{ ticker: 'TARGET1' }, { id: 'TARGET2' }]
      };
      
      fireEvent.change(textArea, { target: { value: JSON.stringify(testData) } });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(mockImportData).toHaveBeenCalledWith(expect.objectContaining({
          currentAssets: [
            { ticker: 'TEST1', id: 'TEST1' },
            { id: 'TEST2', ticker: 'TEST2' }
          ],
          targetPortfolio: [
            { ticker: 'TARGET1', id: 'TARGET1' },
            { id: 'TARGET2', ticker: 'TARGET2' }
          ]
        }));
      });
    });
  });

  describe('CSV解析機能', () => {
    test('複数セクションのCSV解析', () => {
      const Papa = require('papaparse');
      Papa.parse.mockImplementation((content, options) => {
        if (content.includes('id,name,ticker')) {
          return {
            data: [
              { id: '1', name: 'テスト', ticker: 'TEST', price: '100', holdings: '10', annualFee: '0.1' }
            ]
          };
        }
        if (content.includes('key,value')) {
          return {
            data: [
              { key: 'baseCurrency', value: 'USD' },
              { key: 'exchangeRate', value: '110' }
            ]
          };
        }
        return { data: [] };
      });
      
      render(<ImportOptions />);
      
      const csvButton = screen.getByRole('radio', { name: 'CSV' });
      fireEvent.click(csvButton);
      
      const textButton = screen.getByRole('radio', { name: 'テキスト入力' });
      fireEvent.click(textButton);
      
      const textArea = screen.getByLabelText('データを貼り付け');
      const importButton = screen.getByText('インポート');
      
      const csvData = `# 保有資産
id,name,ticker,price,holdings,annualFee
1,テスト,TEST,100,10,0.1

# 設定
key,value
baseCurrency,USD
exchangeRate,110`;
      
      fireEvent.change(textArea, { target: { value: csvData } });
      fireEvent.click(importButton);
      
      // Papa.parse が適切に呼ばれることを確認
      expect(Papa.parse).toHaveBeenCalled();
    });
  });

  describe('ローディング状態', () => {
    test('インポート中のローディング表示', async () => {
      // importData を遅延させる
      mockImportData.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ success: true }), 100)
      ));
      
      render(<ImportOptions />);
      
      const clipboardButton = screen.getByRole('radio', { name: 'クリップボード' });
      fireEvent.click(clipboardButton);
      
      mockClipboard.readText.mockResolvedValue('{"test": "data"}');
      
      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);
      
      // ローディング中の表示を確認
      expect(screen.getByText('処理中...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('処理中...')).not.toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    test('ラジオグループの適切な実装', () => {
      render(<ImportOptions />);
      
      const formatRadioGroup = screen.getAllByRole('radiogroup')[0];
      const methodRadioGroup = screen.getAllByRole('radiogroup')[1];
      
      expect(formatRadioGroup).toHaveAttribute('aria-labelledby', 'import-format-label');
      expect(methodRadioGroup).toHaveAttribute('aria-labelledby', 'import-method-label');
    });

    test('ラベルとコントロールの関連付け', () => {
      render(<ImportOptions />);
      
      expect(screen.getByText('インポート形式')).toHaveAttribute('id', 'import-format-label');
      expect(screen.getByText('インポート方法')).toHaveAttribute('id', 'import-method-label');
      
      const fileInput = screen.getByLabelText('ファイルをアップロード');
      expect(fileInput).toHaveAttribute('id', 'file-upload');
    });
  });
});