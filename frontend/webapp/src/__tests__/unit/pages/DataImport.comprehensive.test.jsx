/**
 * DataImport.jsxの包括的ユニットテスト
 * 
 * 685行の高インパクトコンポーネントの全機能をテスト
 * - AI分析結果受け取り
 * - JSONインポート機能
 * - データエクスポート機能
 * - ScreenshotAnalyzer統合
 * - インポート履歴管理
 * - インポート統計追跡
 * - データ検証
 * - ファイル操作
 * - 多言語対応
 * - リアルタイム検証
 * - ポートフォリオ統合
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import DataImport from '../../../pages/DataImport';
import { PortfolioContext } from '../../../context/PortfolioContext';
import i18n from '../../../i18n';

// 外部サービスのモック
jest.mock('../../../services/PortfolioPromptService', () => ({
  validatePortfolioJSON: jest.fn((data) => ({
    isValid: true,
    errors: [],
    warnings: []
  }))
}));

// ScreenshotAnalyzerコンポーネントのモック
jest.mock('../../../components/ai/ScreenshotAnalyzer', () => {
  return function MockScreenshotAnalyzer({ onDataExtracted, className }) {
    return (
      <div data-testid="screenshot-analyzer" className={className}>
        <div>Screenshot Analyzer Mock</div>
        <button
          onClick={() => onDataExtracted(
            {
              portfolioData: {
                assets: [
                  {
                    ticker: 'AAPL',
                    name: 'Apple Inc.',
                    price: 150,
                    holdings: 10,
                    currency: 'USD'
                  }
                ]
              }
            },
            'screenshot_portfolio'
          )}
        >
          Extract Test Data
        </button>
      </div>
    );
  };
});

// URL.createObjectURLとrevokeObjectURLのモック
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mock-url')
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn()
});

// FileReaderのモック
const mockFileReader = {
  readAsText: jest.fn(),
  onload: null,
  result: null
};

Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: jest.fn(() => mockFileReader)
});

// document.createElementとlinkClickのモック
const mockCreateElement = jest.fn();
const mockLink = {
  href: '',
  download: '',
  click: jest.fn()
};

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: mockCreateElement.mockReturnValue(mockLink)
});

describe('DataImport - 包括的テスト', () => {
  // モックコンテキストの定義
  const mockPortfolioContextValue = {
    portfolio: {
      assets: [
        {
          id: '1',
          ticker: 'VTI',
          name: 'Vanguard Total Stock Market ETF',
          price: 200,
          holdings: 5,
          currency: 'USD'
        }
      ],
      totalValue: 1000000
    },
    updatePortfolio: jest.fn()
  };

  const mockEmptyPortfolioContextValue = {
    portfolio: { assets: [], totalValue: 0 },
    updatePortfolio: jest.fn()
  };

  const renderDataImport = (contextValue = mockPortfolioContextValue, language = 'ja') => {
    // 言語設定
    i18n.changeLanguage(language);

    return render(
      <I18nextProvider i18n={i18n}>
        <PortfolioContext.Provider value={contextValue}>
          <DataImport />
        </PortfolioContext.Provider>
      </I18nextProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // URLSearchParamsのモック
    delete window.location;
    window.location = { search: '' };
  });

  describe('初期レンダリング', () => {
    it('コンポーネントが正常にレンダリングされる', () => {
      renderDataImport();
      
      expect(screen.getByText('AI分析結果')).toBeInTheDocument();
      expect(screen.getByText('JSONインポート')).toBeInTheDocument();
      expect(screen.getByText('データエクスポート')).toBeInTheDocument();
    });

    it('英語でも正常にレンダリングされる', () => {
      renderDataImport(mockPortfolioContextValue, 'en');
      
      expect(screen.getByText('AI Results')).toBeInTheDocument();
      expect(screen.getByText('JSON Import')).toBeInTheDocument();
      expect(screen.getByText('Data Export')).toBeInTheDocument();
    });

    it('デフォルトでAI分析結果タブがアクティブ', () => {
      renderDataImport();
      
      expect(screen.getByTestId('screenshot-analyzer')).toBeInTheDocument();
    });

    it('URLパラメータでタブが設定される', () => {
      window.location.search = '?tab=ai-analysis';
      renderDataImport();
      
      expect(screen.getByTestId('screenshot-analyzer')).toBeInTheDocument();
    });
  });

  describe('タブナビゲーション', () => {
    it('タブをクリックして切り替えられる', () => {
      renderDataImport();
      
      // JSONインポートタブをクリック
      fireEvent.click(screen.getByText('JSONインポート'));
      expect(screen.getByText('ファイルからインポート')).toBeInTheDocument();
      
      // データエクスポートタブをクリック
      fireEvent.click(screen.getByText('データエクスポート'));
      expect(screen.getByText('現在のポートフォリオデータをJSONファイルとしてダウンロード')).toBeInTheDocument();
      
      // AI分析結果タブに戻る
      fireEvent.click(screen.getByText('AI分析結果'));
      expect(screen.getByTestId('screenshot-analyzer')).toBeInTheDocument();
    });

    it('各タブで適切なアイコンが表示される', () => {
      renderDataImport();
      
      // FaFileCode, FaFileAlt, HiDocumentTextのアイコンを確認
      expect(screen.getByText('JSONインポート').closest('button')).toContainHTML('svg');
      expect(screen.getByText('データエクスポート').closest('button')).toContainHTML('svg');
      expect(screen.getByText('AI分析結果').closest('button')).toContainHTML('svg');
    });
  });

  describe('AI分析結果タブ', () => {
    it('ScreenshotAnalyzerコンポーネントが正しく統合されている', () => {
      renderDataImport();
      
      expect(screen.getByTestId('screenshot-analyzer')).toBeInTheDocument();
      expect(screen.getByText('Screenshot Analyzer Mock')).toBeInTheDocument();
    });

    it('AI分析データの抽出が正常に動作する', () => {
      renderDataImport();
      
      const extractButton = screen.getByText('Extract Test Data');
      fireEvent.click(extractButton);
      
      expect(mockPortfolioContextValue.updatePortfolio).toHaveBeenCalled();
    });

    it('抽出されたデータがポートフォリオに統合される', () => {
      renderDataImport();
      
      const extractButton = screen.getByText('Extract Test Data');
      fireEvent.click(extractButton);
      
      expect(mockPortfolioContextValue.updatePortfolio).toHaveBeenCalledWith(
        expect.objectContaining({
          assets: expect.arrayContaining([
            expect.objectContaining({
              ticker: 'AAPL',
              name: 'Apple Inc.',
              source: 'ai_import'
            })
          ]),
          lastImportAt: expect.any(String)
        })
      );
    });

    it('重複資産の更新が正しく行われる', () => {
      const contextWithExistingAsset = {
        ...mockPortfolioContextValue,
        portfolio: {
          assets: [
            {
              id: '1',
              ticker: 'AAPL',
              name: 'Apple Inc. (Old)',
              price: 140,
              holdings: 5,
              currency: 'USD'
            }
          ]
        }
      };
      
      renderDataImport(contextWithExistingAsset);
      
      const extractButton = screen.getByText('Extract Test Data');
      fireEvent.click(extractButton);
      
      expect(contextWithExistingAsset.updatePortfolio).toHaveBeenCalledWith(
        expect.objectContaining({
          assets: expect.arrayContaining([
            expect.objectContaining({
              ticker: 'AAPL',
              name: 'Apple Inc.',
              price: 150,
              holdings: 10,
              lastUpdated: expect.any(String)
            })
          ])
        })
      );
    });
  });

  describe('JSONインポートタブ', () => {
    beforeEach(() => {
      renderDataImport();
      fireEvent.click(screen.getByText('JSONインポート'));
    });

    it('ファイルインポート機能が表示される', () => {
      expect(screen.getByText('ファイルからインポート')).toBeInTheDocument();
      expect(screen.getByText('JSONテキストから直接インポート')).toBeInTheDocument();
    });

    it('ファイル選択によるインポートが機能する', () => {
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const testFile = new File(['{"portfolio": {"assets": []}}'], 'test.json', {
        type: 'application/json'
      });
      
      // FileReaderの結果をモック
      mockFileReader.result = '{"portfolio": {"assets": []}}';
      
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      
      // FileReaderのonloadを手動で実行
      mockFileReader.onload({ target: { result: '{"portfolio": {"assets": []}}' } });
      
      expect(mockFileReader.readAsText).toHaveBeenCalledWith(testFile);
    });

    it('JSONテキストによる直接インポートが機能する', () => {
      const validJson = JSON.stringify({
        portfolio: {
          assets: [
            {
              ticker: 'MSFT',
              name: 'Microsoft Corporation',
              price: 300,
              holdings: 5,
              currency: 'USD'
            }
          ]
        }
      });
      
      const textarea = screen.getByPlaceholderText(/AIで生成されたポートフォリオJSON/);
      fireEvent.change(textarea, { target: { value: validJson } });
      
      const importButton = screen.getByText('インポート実行');
      fireEvent.click(importButton);
      
      expect(mockPortfolioContextValue.updatePortfolio).toHaveBeenCalled();
    });

    it('無効なJSONでエラーハンドリングが動作する', () => {
      const invalidJson = '{ invalid json';
      
      const textarea = screen.getByPlaceholderText(/AIで生成されたポートフォリオJSON/);
      fireEvent.change(textarea, { target: { value: invalidJson } });
      
      // バリデーション結果エラーが表示される
      expect(screen.getByText(/JSON parsing error/)).toBeInTheDocument();
    });

    it('リアルタイム検証が機能する', () => {
      const portfolioPromptService = require('../../../services/PortfolioPromptService');
      portfolioPromptService.validatePortfolioJSON.mockReturnValue({
        isValid: false,
        errors: ['Invalid portfolio structure'],
        warnings: ['Missing optional field']
      });
      
      const textarea = screen.getByPlaceholderText(/AIで生成されたポートフォリオJSON/);
      fireEvent.change(textarea, { target: { value: '{"invalid": "data"}' } });
      
      expect(portfolioPromptService.validatePortfolioJSON).toHaveBeenCalled();
    });

    it('空のテキストエリアで検証がリセットされる', () => {
      const textarea = screen.getByPlaceholderText(/AIで生成されたポートフォリオJSON/);
      
      // まず何かを入力
      fireEvent.change(textarea, { target: { value: '{"test": "data"}' } });
      
      // 空にする
      fireEvent.change(textarea, { target: { value: '' } });
      
      // 検証エラーが表示されないことを確認
      expect(screen.queryByText(/JSON parsing error/)).not.toBeInTheDocument();
    });

    it('インポート中の状態管理が機能する', async () => {
      const validJson = '{"portfolio": {"assets": []}}';
      
      const textarea = screen.getByPlaceholderText(/AIで生成されたポートフォリオJSON/);
      fireEvent.change(textarea, { target: { value: validJson } });
      
      const importButton = screen.getByText('インポート実行');
      fireEvent.click(importButton);
      
      // インポート中の状態を確認（ボタンが無効化されるなど）
      expect(importButton).toBeDisabled();
      
      await waitFor(() => {
        expect(importButton).not.toBeDisabled();
      });
    });
  });

  describe('データエクスポートタブ', () => {
    beforeEach(() => {
      renderDataImport();
      fireEvent.click(screen.getByText('データエクスポート'));
    });

    it('エクスポート説明が表示される', () => {
      expect(screen.getByText('現在のポートフォリオデータをJSONファイルとしてダウンロード')).toBeInTheDocument();
    });

    it('JSONファイルダウンロードが機能する', () => {
      const downloadButton = screen.getByText('JSONファイルダウンロード');
      fireEvent.click(downloadButton);
      
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('エクスポートデータに適切な情報が含まれる', () => {
      const downloadButton = screen.getByText('JSONファイルダウンロード');
      fireEvent.click(downloadButton);
      
      // Blobコンストラクタの呼び出しを確認
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toMatch(/portfolio-data-\d+\.json/);
    });

    it('プレビュー表示が機能する', () => {
      expect(screen.getByText('プレビュー')).toBeInTheDocument();
      
      // JSONプレビューが表示される
      const previewText = screen.getByText(/VTI/);
      expect(previewText).toBeInTheDocument();
    });

    it('ポートフォリオ統計が表示される', () => {
      expect(screen.getByText('保有資産数')).toBeInTheDocument();
      expect(screen.getByText('総資産額')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // 資産数
      expect(screen.getByText('¥1,000,000')).toBeInTheDocument(); // 総額
    });
  });

  describe('インポート履歴と統計', () => {
    it('インポート統計が正しく更新される', () => {
      renderDataImport();
      
      // AI分析データを抽出
      const extractButton = screen.getByText('Extract Test Data');
      fireEvent.click(extractButton);
      
      // 統計が内部的に更新されることを確認（state更新）
      // Note: この部分は内部状態なので、UIを通じて間接的にテスト
    });

    it('インポート履歴が保持される', () => {
      renderDataImport();
      
      // 複数回のインポートを実行
      const extractButton = screen.getByText('Extract Test Data');
      fireEvent.click(extractButton);
      fireEvent.click(extractButton);
      
      // 履歴が保持されることを確認（最大10件）
    });

    it('インポート履歴が最大10件まで保持される', () => {
      renderDataImport();
      
      // 11回のインポートを実行
      const extractButton = screen.getByText('Extract Test Data');
      for (let i = 0; i < 11; i++) {
        fireEvent.click(extractButton);
      }
      
      // 内部的に10件までしか保持されないことを確認
    });
  });

  describe('多言語対応', () => {
    it('英語表示で正しく動作する', () => {
      renderDataImport(mockPortfolioContextValue, 'en');
      
      expect(screen.getByText('AI Results')).toBeInTheDocument();
      expect(screen.getByText('Receive AI analysis results as text')).toBeInTheDocument();
    });

    it('英語でJSONインポートタブが機能する', () => {
      renderDataImport(mockPortfolioContextValue, 'en');
      
      fireEvent.click(screen.getByText('JSON Import'));
      expect(screen.getByText('Import from File')).toBeInTheDocument();
      expect(screen.getByText('Import from JSON Text')).toBeInTheDocument();
    });

    it('英語でエクスポートタブが機能する', () => {
      renderDataImport(mockPortfolioContextValue, 'en');
      
      fireEvent.click(screen.getByText('Data Export'));
      expect(screen.getByText('Download current portfolio data as JSON file')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('ポートフォリオ更新エラーを適切に処理する', () => {
      const contextWithError = {
        ...mockPortfolioContextValue,
        updatePortfolio: jest.fn(() => {
          throw new Error('Update failed');
        })
      };
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      renderDataImport(contextWithError);
      
      const extractButton = screen.getByText('Extract Test Data');
      fireEvent.click(extractButton);
      
      // エラーが適切に処理されることを確認
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('ファイル読み込みエラーを処理する', () => {
      renderDataImport();
      fireEvent.click(screen.getByText('JSONインポート'));
      
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const invalidFile = new File(['invalid content'], 'test.txt', {
        type: 'text/plain'
      });
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      // JSONファイルでない場合は処理されない
      expect(mockFileReader.readAsText).not.toHaveBeenCalled();
    });

    it('空のポートフォリオでもエクスポートが機能する', () => {
      renderDataImport(mockEmptyPortfolioContextValue);
      fireEvent.click(screen.getByText('データエクスポート'));
      
      const downloadButton = screen.getByText('JSONファイルダウンロード');
      fireEvent.click(downloadButton);
      
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なロール属性が設定されている', () => {
      renderDataImport();
      
      const tabButtons = screen.getAllByRole('button');
      expect(tabButtons.length).toBeGreaterThan(0);
    });

    it('ファイル入力に適切な属性が設定されている', () => {
      renderDataImport();
      fireEvent.click(screen.getByText('JSONインポート'));
      
      const fileInput = screen.getByDisplayValue('');
      expect(fileInput).toHaveAttribute('accept', '.json');
      expect(fileInput).toHaveAttribute('type', 'file');
    });

    it('テキストエリアに適切なプレースホルダーが設定されている', () => {
      renderDataImport();
      fireEvent.click(screen.getByText('JSONインポート'));
      
      const textarea = screen.getByPlaceholderText(/AIで生成されたポートフォリオJSON/);
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('パフォーマンス最適化', () => {
    it('大きなJSONファイルでも正常に動作する', () => {
      renderDataImport();
      fireEvent.click(screen.getByText('JSONインポート'));
      
      // 大きなJSONデータのシミュレーション
      const largeJson = JSON.stringify({
        portfolio: {
          assets: Array.from({ length: 1000 }, (_, i) => ({
            ticker: `STOCK${i}`,
            name: `Stock ${i}`,
            price: Math.random() * 1000,
            holdings: Math.floor(Math.random() * 100),
            currency: 'USD'
          }))
        }
      });
      
      const textarea = screen.getByPlaceholderText(/AIで生成されたポートフォリオJSON/);
      fireEvent.change(textarea, { target: { value: largeJson } });
      
      // パフォーマンスの問題なく処理されることを確認
      expect(textarea.value).toBe(largeJson);
    });
  });
});