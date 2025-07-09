/**
 * ScreenshotAnalyzer.jsx のユニットテスト
 * AIで分析されたデータの受け取り・処理機能をテストする
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScreenshotAnalyzer from '../../../../components/ai/ScreenshotAnalyzer';

// react-i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'ja'
    }
  })
}));

describe('ScreenshotAnalyzer Component', () => {
  const mockOnDataExtracted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('基本レンダリング', () => {
    render(<ScreenshotAnalyzer />);
    
    expect(screen.getByText('📄 AI Analysis Result Input')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Enter AI Analysis Result:')).toBeInTheDocument();
  });

  test('カスタムプロパティでレンダリング', () => {
    render(
      <ScreenshotAnalyzer
        onDataExtracted={mockOnDataExtracted}
        className="custom-class"
      />
    );
    
    const container = screen.getByText('📄 AI Analysis Result Input').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  test('AIレスポンスの入力と処理', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
    
    const textarea = screen.getByRole('textbox');
    const processButton = screen.getByText('Process Analysis');
    
    fireEvent.change(textarea, { 
      target: { value: 'AI分析結果のテキスト' } 
    });
    
    expect(textarea.value).toBe('AI分析結果のテキスト');
    expect(processButton).not.toBeDisabled();
  });

  test('空の入力では処理ボタンが無効', () => {
    render(<ScreenshotAnalyzer />);
    
    const processButton = screen.getByText('Process Analysis');
    expect(processButton).toBeDisabled();
  });

  test('JSON形式の応答を正しく処理する', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
    
    const textarea = screen.getByRole('textbox');
    const processButton = screen.getByText('Process Analysis');
    
    const jsonResponse = `
\`\`\`json
{
  "portfolioData": {
    "assets": [
      { "symbol": "AAPL", "quantity": 10, "price": 150 }
    ],
    "totalValue": 1500
  }
}
\`\`\`
    `;
    
    fireEvent.change(textarea, { target: { value: jsonResponse } });
    fireEvent.click(processButton);
    
    await waitFor(() => {
      expect(mockOnDataExtracted).toHaveBeenCalledWith(expect.objectContaining({
        portfolioData: expect.objectContaining({
          assets: expect.arrayContaining([
            expect.objectContaining({
              symbol: 'AAPL',
              quantity: 10,
              price: 150
            })
          ]),
          totalValue: 1500
        })
      }));
    });
  });

  test('テキスト形式の応答をフォールバック処理する', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);
    
    const textarea = screen.getByRole('textbox');
    const processButton = screen.getByText('Process Analysis');
    
    const textResponse = "資産: AAPL 10株\n価格: $150";
    
    fireEvent.change(textarea, { target: { value: textResponse } });
    fireEvent.click(processButton);
    
    await waitFor(() => {
      expect(mockOnDataExtracted).toHaveBeenCalledWith(expect.objectContaining({
        rawText: textResponse,
        extractedAssets: expect.any(Array)
      }));
    });
  });

  test('Clearボタンで入力がクリアされる', () => {
    render(<ScreenshotAnalyzer />);
    
    const textarea = screen.getByRole('textbox');
    const clearButton = screen.getByText('Clear');
    
    fireEvent.change(textarea, { target: { value: 'テスト入力' } });
    expect(textarea.value).toBe('テスト入力');
    
    fireEvent.click(clearButton);
    expect(textarea.value).toBe('');
  });

  test('処理中のローディング状態', async () => {
    render(<ScreenshotAnalyzer />);
    
    const textarea = screen.getByRole('textbox');
    const processButton = screen.getByText('Process Analysis');
    
    fireEvent.change(textarea, { target: { value: 'テスト' } });
    fireEvent.click(processButton);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Process Analysis')).toBeInTheDocument();
    });
  });

  test('エラーハンドリング', async () => {
    render(<ScreenshotAnalyzer />);
    
    const textarea = screen.getByRole('textbox');
    const processButton = screen.getByText('Process Analysis');
    
    // 無効なJSONを入力
    fireEvent.change(textarea, { target: { value: '{ invalid json }' } });
    fireEvent.click(processButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Error processing/)).toBeInTheDocument();
    });
  });

  test('多言語対応 - 英語', () => {
    // 英語環境のモック
    jest.mocked(require('react-i18next').useTranslation).mockReturnValue({
      t: (key) => key,
      i18n: { language: 'en' }
    });
    
    render(<ScreenshotAnalyzer />);
    
    expect(screen.getByText('AI Analysis Result Input')).toBeInTheDocument();
    expect(screen.getByText('Enter AI Analysis Result:')).toBeInTheDocument();
  });

  test('プライバシー保護メッセージの表示', () => {
    render(<ScreenshotAnalyzer />);
    
    expect(screen.getByText(/Privacy Protected/)).toBeInTheDocument();
    expect(screen.getByText(/Screenshots are processed externally/)).toBeInTheDocument();
  });

  test('検出結果のプレビュー表示', async () => {
    render(<ScreenshotAnalyzer />);
    
    const textarea = screen.getByRole('textbox');
    const processButton = screen.getByText('Process Analysis');
    
    const jsonData = `{"assets": [{"symbol": "MSFT", "quantity": 5}]}`;
    
    fireEvent.change(textarea, { target: { value: jsonData } });
    fireEvent.click(processButton);
    
    await waitFor(() => {
      expect(screen.getByText('Detected Data:')).toBeInTheDocument();
      expect(screen.getByText(/MSFT/)).toBeInTheDocument();
    });
  });

  test('アクセシビリティ対応', () => {
    render(<ScreenshotAnalyzer />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-label', expect.stringContaining('AI'));
    
    const processButton = screen.getByRole('button', { name: /Process Analysis/ });
    expect(processButton).toBeInTheDocument();
  });
});