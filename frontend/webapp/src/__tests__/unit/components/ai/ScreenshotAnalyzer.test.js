/**
 * ScreenshotAnalyzer コンポーネントのユニットテスト
 * 
 * テスト対象:
 * - AI分析結果の入力処理
 * - JSON形式データの抽出
 * - テキスト形式データの解析
 * - データダウンロード機能
 * - 国際化対応
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import ScreenshotAnalyzer from '../../../../components/ai/ScreenshotAnalyzer';

// i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
  })
}));

// URL.createObjectURL と URL.revokeObjectURL のモック
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mock-blob-url')
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn()
});

// document.createElement と link.click のモック
const mockClick = jest.fn();
const mockLink = {
  href: '',
  download: '',
  click: mockClick
};

// document.createElement をモック
const originalCreateElement = document.createElement;
Object.defineProperty(document, 'createElement', {
  writable: true,
  value: jest.fn((tagName) => {
    if (tagName === 'a') {
      return mockLink;
    }
    return originalCreateElement.call(document, tagName);
  })
});

afterAll(() => {
  document.createElement = originalCreateElement;
});

describe('ScreenshotAnalyzer', () => {
  const mockOnDataExtracted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('デフォルトプロパティで正常にレンダリングされる', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.getByText('📄 AI分析結果の受け取り')).toBeInTheDocument();
      expect(screen.getByText('プライバシー保護について')).toBeInTheDocument();
      expect(screen.getByText('AI分析結果を貼り付け')).toBeInTheDocument();
    });

    it('カスタムクラス名が適用される', () => {
      const { container } = render(<ScreenshotAnalyzer className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('クリアボタンが表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.getByText('クリア')).toBeInTheDocument();
    });
  });

  describe('プライバシー保護セクション', () => {
    it('プライバシー保護の説明が表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.getByText('このアプリではプライバシー保護のため、スクリーンショットのアップロードは一切行いません。')).toBeInTheDocument();
      expect(screen.getByText('スクリーンショット分析プロンプトの生成は「AIアドバイザー」タブで行えます。')).toBeInTheDocument();
      expect(screen.getByText('外部AIで分析された結果をこちらに貼り付けてください。')).toBeInTheDocument();
    });

    it('プライバシー保護アイコンが表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.getByText('🔒')).toBeInTheDocument();
    });
  });

  describe('AI応答入力機能', () => {
    it('テキストエリアが正常に動作する', () => {
      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: 'テストテキスト' } });
      
      expect(textarea.value).toBe('テストテキスト');
    });

    it('テキスト入力時にデータ抽出ボタンが表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: 'テストテキスト' } });
      
      expect(screen.getByText('データを抽出')).toBeInTheDocument();
    });

    it('空のテキストではデータ抽出ボタンが表示されない', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.queryByText('データを抽出')).not.toBeInTheDocument();
    });
  });

  describe('JSON形式データの処理', () => {
    it('正しいJSON形式のデータを処理できる', async () => {
      const jsonData = {
        portfolioData: {
          assets: [
            {
              name: 'Apple Inc.',
              ticker: 'AAPL',
              quantity: 10,
              currentPrice: 150.0
            }
          ],
          totalValue: 1500.0
        }
      };

      const aiResponse = '```json\n' + JSON.stringify(jsonData) + '\n```';

      render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: aiResponse } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      expect(mockOnDataExtracted).toHaveBeenCalledWith(jsonData, 'ai_analysis');
      expect(screen.getByText('✅ 抽出されたデータ')).toBeInTheDocument();
    });

    it('JSON形式のデータが視覚的に表示される', async () => {
      const jsonData = { test: 'data' };
      const aiResponse = '```json\n' + JSON.stringify(jsonData) + '\n```';

      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: aiResponse } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      // JSONデータが表示されることを確認
      expect(screen.getByText(/"test"/)).toBeInTheDocument();
      expect(screen.getByText(/"data"/)).toBeInTheDocument();
    });

    it('不正なJSON形式の場合はテキスト解析にフォールバックする', async () => {
      const invalidJson = '```json\n{ invalid json }\n```';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: invalidJson } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('AI応答の解析エラー:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('テキスト形式データの処理', () => {
    it('JSON形式でないテキストをテキスト解析で処理する', async () => {
      const plainText = 'これは普通のテキストです\n銘柄: AAPL\n価格: 150円';

      render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: plainText } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      expect(mockOnDataExtracted).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolioData: expect.objectContaining({
            assets: [],
            totalValue: 0,
            source: 'text_analysis'
          }),
          rawText: plainText,
          source: 'text_analysis'
        }),
        'ai_analysis'
      );
    });

    it('テキスト解析結果に元のテキストが含まれる', async () => {
      const plainText = 'テスト用のテキストデータ';

      render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: plainText } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      const callArgs = mockOnDataExtracted.mock.calls[0][0];
      expect(callArgs.rawText).toBe(plainText);
    });
  });

  describe('処理状態の表示', () => {
    it('処理中は適切な状態を表示する', async () => {
      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: 'テストデータ' } });
      
      // 処理開始
      fireEvent.click(screen.getByText('データを抽出'));
      
      expect(screen.getByText('処理中...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '処理中...' })).toBeDisabled();
      
      // 処理完了まで待機
      await waitFor(() => {
        expect(screen.queryByText('処理中...')).not.toBeInTheDocument();
      });
    });
  });

  describe('データダウンロード機能', () => {
    it('抽出されたデータをダウンロードできる', async () => {
      const jsonData = { test: 'download data' };
      const aiResponse = '```json\n' + JSON.stringify(jsonData) + '\n```';

      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: aiResponse } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      // ダウンロードボタンをクリック
      fireEvent.click(screen.getByText('ダウンロード'));

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
    });

    it('ダウンロードファイル名にタイムスタンプが含まれる', async () => {
      const jsonData = { test: 'data' };
      const aiResponse = '```json\n' + JSON.stringify(jsonData) + '\n```';

      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: aiResponse } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      fireEvent.click(screen.getByText('ダウンロード'));

      // モックリンクからファイル名を確認
      expect(mockLink.download).toMatch(/^extracted-data-\d+\.json$/);
    });

    it('データが抽出されていない場合はダウンロードボタンが表示されない', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.queryByText('ダウンロード')).not.toBeInTheDocument();
    });
  });

  describe('クリア機能', () => {
    it('クリアボタンで全てがリセットされる', async () => {
      const jsonData = { test: 'data' };
      const aiResponse = '```json\n' + JSON.stringify(jsonData) + '\n```';

      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      // データを入力して処理
      fireEvent.change(textarea, { target: { value: aiResponse } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      // 抽出されたデータが表示されることを確認
      expect(screen.getByText('✅ 抽出されたデータ')).toBeInTheDocument();

      // クリアボタンをクリック
      fireEvent.click(screen.getByText('クリア'));

      // 全てがクリアされることを確認
      expect(textarea.value).toBe('');
      expect(screen.queryByText('✅ 抽出されたデータ')).not.toBeInTheDocument();
      expect(screen.queryByText('データを抽出')).not.toBeInTheDocument();
    });
  });

  describe('使い方ヒントセクション', () => {
    it('使い方ヒントが表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.getByText('💡 使い方のヒント')).toBeInTheDocument();
      expect(screen.getByText('• プロンプト生成は「AIアドバイザー」タブを使用してください')).toBeInTheDocument();
      expect(screen.getByText('• JSON形式（```json ... ```）または通常のテキスト形式の結果を貼り付けてください')).toBeInTheDocument();
      expect(screen.getByText('• データは自動的にポートフォリオに統合されます')).toBeInTheDocument();
    });
  });

  describe('国際化対応', () => {
    beforeEach(() => {
      // 英語環境をモック
      jest.clearAllMocks();
      require('react-i18next').useTranslation.mockReturnValue({
        t: (key) => key,
        i18n: { language: 'en' }
      });
    });

    it('英語表示時に適切なラベルが表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.getByText('AI Analysis Result Input')).toBeInTheDocument();
      expect(screen.getByText('Privacy Protection')).toBeInTheDocument();
      expect(screen.getByText('Paste AI Analysis Result')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('英語のプレースホルダーテキストが表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.getByPlaceholderText(/Paste AI analysis result here/)).toBeInTheDocument();
    });

    it('英語の使い方ヒントが表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      expect(screen.getByText('Usage Tips')).toBeInTheDocument();
      expect(screen.getByText('• Use the "AI Advisor" tab for prompt generation')).toBeInTheDocument();
      expect(screen.getByText('• Paste results in JSON format (```json ... ```) or plain text')).toBeInTheDocument();
      expect(screen.getByText('• Data will be automatically integrated into your portfolio')).toBeInTheDocument();
    });

    it('英語でデータ抽出ボタンが表示される', () => {
      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/Paste AI analysis result here/);
      
      fireEvent.change(textarea, { target: { value: 'test text' } });
      
      expect(screen.getByText('Extract Data')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('空白のみの入力では処理されない', () => {
      render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: '   \n  \t  ' } });
      
      // 空白のみなのでボタンは表示されない
      expect(screen.queryByText('データを抽出')).not.toBeInTheDocument();
    });

    it('onDataExtractedが未指定でもエラーが発生しない', async () => {
      const jsonData = { test: 'data' };
      const aiResponse = '```json\n' + JSON.stringify(jsonData) + '\n```';

      render(<ScreenshotAnalyzer />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: aiResponse } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      // エラーが発生しないことを確認（データが表示される）
      expect(screen.getByText('✅ 抽出されたデータ')).toBeInTheDocument();
    });
  });

  describe('parseTextResponse 関数', () => {
    it('複数行のテキストを正しく処理する', async () => {
      const multiLineText = `銘柄データ:
      AAPL: 150円
      GOOGL: 2500円
      合計: 2650円`;

      render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
      
      fireEvent.change(textarea, { target: { value: multiLineText } });
      
      await act(async () => {
        fireEvent.click(screen.getByText('データを抽出'));
      });

      const callArgs = mockOnDataExtracted.mock.calls[0][0];
      expect(callArgs.portfolioData.source).toBe('text_analysis');
      expect(callArgs.rawText).toBe(multiLineText);
      expect(callArgs.portfolioData.extractedAt).toBeDefined();
    });
  });
});