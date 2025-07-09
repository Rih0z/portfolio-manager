/**
 * ScreenshotAnalyzer.jsx の実際の実装に基づくテストファイル
 * AI分析結果受け取りコンポーネントの包括的テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import ScreenshotAnalyzer from '../../../../components/ai/ScreenshotAnalyzer';

const renderWithProviders = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

// URL.createObjectURL のモック
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// document.createElement('a') のモック
const mockLink = {
  href: '',
  download: '',
  click: jest.fn()
};

Object.defineProperty(document, 'createElement', {
  value: jest.fn((tagName) => {
    if (tagName === 'a') {
      return mockLink;
    }
    return document.createElement(tagName);
  }),
  writable: true
});

describe('ScreenshotAnalyzer Real Implementation', () => {
  const mockOnDataExtracted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL.mockClear();
    global.URL.revokeObjectURL.mockClear();
    mockLink.click.mockClear();
  });

  describe('基本レンダリング', () => {
    test('コンポーネントが正しく表示される', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      expect(screen.getByText(/AI分析結果の受け取り|AI Analysis Result Input/)).toBeInTheDocument();
      expect(screen.getByText(/クリア|Clear/)).toBeInTheDocument();
    });

    test('プライバシー保護セクションが表示される', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      expect(screen.getByText(/プライバシー保護について|Privacy Protection/)).toBeInTheDocument();
      expect(screen.getByText(/スクリーンショットのアップロードは一切行いません|does not upload any screenshots/)).toBeInTheDocument();
    });

    test('テキストエリアが表示される', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('AI'));
    });

    test('使い方のヒントが表示される', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      expect(screen.getByText(/使い方のヒント|Usage Tips/)).toBeInTheDocument();
      expect(screen.getByText(/AIアドバイザー|AI Advisor/)).toBeInTheDocument();
    });
  });

  describe('AI応答の入力と処理', () => {
    test('テキストエリアに入力できる', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Test AI response' } });
      
      expect(textarea.value).toBe('Test AI response');
    });

    test('テキスト入力後にデータ抽出ボタンが表示される', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Test AI response' } });
      
      expect(screen.getByText(/データを抽出|Extract Data/)).toBeInTheDocument();
    });

    test('JSON形式の応答を正しく処理する', async () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const jsonResponse = `
```json
{
  "portfolioData": {
    "assets": [
      { "symbol": "AAPL", "quantity": 10, "price": 150 }
    ],
    "totalValue": 1500
  }
}
```
      `;
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: jsonResponse } });
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      fireEvent.click(extractButton);
      
      await waitFor(() => {
        expect(mockOnDataExtracted).toHaveBeenCalledWith(
          expect.objectContaining({
            portfolioData: expect.objectContaining({
              assets: expect.arrayContaining([
                expect.objectContaining({ symbol: 'AAPL' })
              ])
            })
          }),
          'ai_analysis'
        );
      });
    });

    test('テキスト形式の応答をフォールバック処理する', async () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textResponse = 'Plain text AI analysis result';
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: textResponse } });
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      fireEvent.click(extractButton);
      
      await waitFor(() => {
        expect(mockOnDataExtracted).toHaveBeenCalledWith(
          expect.objectContaining({
            portfolioData: expect.objectContaining({
              source: 'text_analysis'
            }),
            rawText: textResponse
          }),
          'ai_analysis'
        );
      });
    });

    test('処理中状態が正しく表示される', async () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Test response' } });
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      fireEvent.click(extractButton);
      
      // 処理中状態を確認
      expect(screen.getByText(/処理中|Processing/)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText(/処理中|Processing/)).not.toBeInTheDocument();
      });
    });
  });

  describe('抽出されたデータの表示', () => {
    test('データ抽出後に結果が表示される', async () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const jsonResponse = '```json\n{"test": "data"}\n```';
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: jsonResponse } });
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      fireEvent.click(extractButton);
      
      await waitFor(() => {
        expect(screen.getByText(/抽出されたデータ|Extracted Data/)).toBeInTheDocument();
        expect(screen.getByText(/ダウンロード|Download/)).toBeInTheDocument();
      });
    });

    test('ダウンロードボタンが機能する', async () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const jsonResponse = '```json\n{"test": "data"}\n```';
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: jsonResponse } });
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      fireEvent.click(extractButton);
      
      await waitFor(() => {
        const downloadButton = screen.getByText(/ダウンロード|Download/);
        fireEvent.click(downloadButton);
        
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(mockLink.click).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なJSON形式のエラーハンドリング', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const invalidJson = '```json\n{invalid json}\n```';
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: invalidJson } });
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      fireEvent.click(extractButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('AI応答の解析エラー:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    test('空の入力では処理が実行されない', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '   ' } }); // 空白のみ
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      fireEvent.click(extractButton);
      
      expect(mockOnDataExtracted).not.toHaveBeenCalled();
    });
  });

  describe('UI操作', () => {
    test('クリアボタンがすべてをリセットする', async () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      // データを入力して処理
      const jsonResponse = '```json\n{"test": "data"}\n```';
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: jsonResponse } });
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      fireEvent.click(extractButton);
      
      await waitFor(() => {
        expect(screen.getByText(/抽出されたデータ|Extracted Data/)).toBeInTheDocument();
      });
      
      // クリアボタンをクリック
      const clearButton = screen.getByText(/クリア|Clear/);
      fireEvent.click(clearButton);
      
      expect(textarea.value).toBe('');
      expect(screen.queryByText(/抽出されたデータ|Extracted Data/)).not.toBeInTheDocument();
    });

    test('カスタムCSSクラスが適用される', () => {
      const { container } = renderWithProviders(
        <ScreenshotAnalyzer 
          onDataExtracted={mockOnDataExtracted} 
          className="custom-class" 
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('コールバック関数', () => {
    test('onDataExtractedが未定義でもエラーが発生しない', () => {
      expect(() => {
        renderWithProviders(<ScreenshotAnalyzer />);
      }).not.toThrow();
    });

    test('デフォルトのonDataExtractedが呼び出される', async () => {
      renderWithProviders(<ScreenshotAnalyzer />);
      
      const jsonResponse = '```json\n{"test": "data"}\n```';
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: jsonResponse } });
      
      const extractButton = screen.getByText(/データを抽出|Extract Data/);
      
      expect(() => {
        fireEvent.click(extractButton);
      }).not.toThrow();
    });
  });

  describe('国際化対応', () => {
    test('日本語表示が正しく動作する', () => {
      // i18nで日本語に設定
      i18n.changeLanguage('ja');
      
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      expect(screen.getByText('AI分析結果の受け取り')).toBeInTheDocument();
      expect(screen.getByText('クリア')).toBeInTheDocument();
      expect(screen.getByText('プライバシー保護について')).toBeInTheDocument();
    });

    test('英語表示が正しく動作する', () => {
      // i18nで英語に設定
      i18n.changeLanguage('en');
      
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      expect(screen.getByText('AI Analysis Result Input')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('Privacy Protection')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なARIA属性が設定されている', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    test('キーボードナビゲーションが可能', () => {
      renderWithProviders(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
      
      const textarea = screen.getByRole('textbox');
      textarea.focus();
      expect(document.activeElement).toBe(textarea);
      
      const clearButton = screen.getByText(/クリア|Clear/);
      clearButton.focus();
      expect(document.activeElement).toBe(clearButton);
    });
  });
});