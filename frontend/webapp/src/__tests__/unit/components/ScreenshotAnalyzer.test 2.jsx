/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/__tests__/unit/components/ScreenshotAnalyzer.test.jsx
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * ScreenshotAnalyzerコンポーネントのユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../mocks/i18n';
import ScreenshotAnalyzer from '../../../components/ai/ScreenshotAnalyzer';
import promptOrchestrationService from '../../../services/PromptOrchestrationService';

// プロンプトオーケストレーションサービスのモック
jest.mock('../../../services/PromptOrchestrationService', () => ({
  generateDataImportPrompt: jest.fn()
}));

// window.open をモック
global.open = jest.fn();

// navigator.clipboard をモック
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// FileReader をモック
global.FileReader = class {
  constructor() {
    this.onload = null;
    this.result = null;
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.result = 'data:image/png;base64,test-image-data';
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
};

// URL.createObjectURL をモック
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

describe('ScreenshotAnalyzer', () => {
  const mockOnDataExtracted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    promptOrchestrationService.generateDataImportPrompt.mockReturnValue({
      title: 'テスト分析プロンプト',
      content: 'この画像を分析してください...',
      type: 'screenshot_portfolio',
      language: 'ja'
    });
  });

  test('renders screenshot analyzer with title', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    expect(screen.getByText(/📸.*スクリーンショット分析/)).toBeInTheDocument();
  });

  test('displays analysis type selection', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    expect(screen.getByText('ステップ1: 分析タイプを選択')).toBeInTheDocument();
    expect(screen.getByText('ポートフォリオ画面')).toBeInTheDocument();
    expect(screen.getByText('株価・市場データ')).toBeInTheDocument();
    expect(screen.getByText('取引履歴')).toBeInTheDocument();
  });

  test('selects analysis type when clicked', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const marketDataButton = screen.getByText('株価・市場データ').closest('button');
    fireEvent.click(marketDataButton);

    expect(marketDataButton).toHaveClass('bg-primary-500/20');
  });

  test('displays image upload section', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    expect(screen.getByText('ステップ2: 画像をアップロード（オプション）')).toBeInTheDocument();
    expect(screen.getByText('スクリーンショットを選択（参考用）')).toBeInTheDocument();
  });

  test('handles image upload', async () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByText('スクリーンショットを選択（参考用）').closest('button');
    
    // Click the upload button to trigger file input
    fireEvent.click(input);
    
    // Find the hidden file input and simulate file selection
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
  });

  test('removes uploaded image when X is clicked', async () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = screen.getByText('スクリーンショットを選択（参考用）').closest('button');
    
    fireEvent.click(input);
    
    const fileInput = document.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });

    const removeButton = screen.getByText('✕');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('test.png')).not.toBeInTheDocument();
    });
  });

  test('displays additional instructions textarea', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    expect(screen.getByText('ステップ3: 追加指示（オプション）')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('特別な要求や注意点があれば入力してください...')).toBeInTheDocument();
  });

  test('handles user instructions input', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const textarea = screen.getByPlaceholderText('特別な要求や注意点があれば入力してください...');
    fireEvent.change(textarea, { target: { value: 'テスト指示' } });

    expect(textarea.value).toBe('テスト指示');
  });

  test('generates analysis prompt when button is clicked', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    expect(promptOrchestrationService.generateDataImportPrompt).toHaveBeenCalledWith(
      'screenshot_portfolio',
      ''
    );
    expect(screen.getByText('生成された分析プロンプト')).toBeInTheDocument();
    expect(screen.getByText('この画像を分析してください...')).toBeInTheDocument();
  });

  test('generates prompt with user instructions', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const textarea = screen.getByPlaceholderText('特別な要求や注意点があれば入力してください...');
    fireEvent.change(textarea, { target: { value: 'カスタム指示' } });

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    expect(promptOrchestrationService.generateDataImportPrompt).toHaveBeenCalledWith(
      'screenshot_portfolio',
      'カスタム指示'
    );
  });

  test('copies prompt to clipboard when copy button is clicked', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    const copyButton = screen.getByText('コピー');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('この画像を分析してください...');
  });

  test('displays AI selection buttons after prompt generation', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    expect(screen.getByText('ステップ5: AIで画像を分析')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('Gemini')).toBeInTheDocument();
    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
  });

  test('opens AI services when AI buttons are clicked', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    const claudeButton = screen.getByText('Claude').closest('button');
    fireEvent.click(claudeButton);
    expect(global.open).toHaveBeenCalledWith('https://claude.ai', '_blank');

    const geminiButton = screen.getByText('Gemini').closest('button');
    fireEvent.click(geminiButton);
    expect(global.open).toHaveBeenCalledWith('https://gemini.google.com', '_blank');

    const chatgptButton = screen.getByText('ChatGPT').closest('button');
    fireEvent.click(chatgptButton);
    expect(global.open).toHaveBeenCalledWith('https://chat.openai.com', '_blank');
  });

  test('displays AI response input section after prompt generation', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    expect(screen.getByText('ステップ6: AI応答を貼り付け')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('AIからの分析結果をここに貼り付けてください...')).toBeInTheDocument();
  });

  test('processes AI response with JSON data', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    const responseTextarea = screen.getByPlaceholderText('AIからの分析結果をここに貼り付けてください...');
    const jsonResponse = `分析結果です：
\`\`\`json
{
  "portfolioData": {
    "assets": [
      {
        "name": "テスト株式",
        "ticker": "TEST",
        "quantity": 100,
        "currentPrice": 1000
      }
    ],
    "totalValue": 100000
  }
}
\`\`\``;

    fireEvent.change(responseTextarea, { target: { value: jsonResponse } });

    const extractButton = screen.getByText('データを抽出');
    fireEvent.click(extractButton);

    expect(mockOnDataExtracted).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioData: expect.objectContaining({
          assets: expect.arrayContaining([
            expect.objectContaining({
              name: "テスト株式",
              ticker: "TEST"
            })
          ])
        })
      }),
      'screenshot_portfolio'
    );
  });

  test('displays extracted data after processing', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    const responseTextarea = screen.getByPlaceholderText('AIからの分析結果をここに貼り付けてください...');
    const jsonResponse = `\`\`\`json
{"portfolioData": {"assets": []}}
\`\`\``;

    fireEvent.change(responseTextarea, { target: { value: jsonResponse } });

    const extractButton = screen.getByText('データを抽出');
    fireEvent.click(extractButton);

    expect(screen.getByText('✅ 抽出されたデータ')).toBeInTheDocument();
    expect(screen.getByText('ダウンロード')).toBeInTheDocument();
  });

  test('downloads extracted data when download button is clicked', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    const responseTextarea = screen.getByPlaceholderText('AIからの分析結果をここに貼り付けてください...');
    fireEvent.change(responseTextarea, { target: { value: '```json\n{"test": "data"}\n```' } });

    const extractButton = screen.getByText('データを抽出');
    fireEvent.click(extractButton);

    // Mock document.createElement to track link creation
    const createElementSpy = jest.spyOn(document, 'createElement');
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn()
    };
    createElementSpy.mockReturnValue(mockLink);

    const downloadButton = screen.getByText('ダウンロード');
    fireEvent.click(downloadButton);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  test('clears all data when clear button is clicked', () => {
    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    // Generate prompt first
    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    // Add some AI response
    const responseTextarea = screen.getByPlaceholderText('AIからの分析結果をここに貼り付けてください...');
    fireEvent.change(responseTextarea, { target: { value: 'test response' } });

    // Clear all
    const clearButton = screen.getByText('クリア');
    fireEvent.click(clearButton);

    expect(screen.queryByText('生成された分析プロンプト')).not.toBeInTheDocument();
    expect(responseTextarea.value).toBe('');
  });

  test('applies custom className', () => {
    const { container } = render(
      <TestWrapper>
        <ScreenshotAnalyzer 
          onDataExtracted={mockOnDataExtracted}
          className="custom-class"
        />
      </TestWrapper>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('handles processing errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />
      </TestWrapper>
    );

    const generateButton = screen.getByText('分析プロンプトを生成');
    fireEvent.click(generateButton);

    const responseTextarea = screen.getByPlaceholderText('AIからの分析結果をここに貼り付けてください...');
    fireEvent.change(responseTextarea, { target: { value: 'invalid json response' } });

    const extractButton = screen.getByText('データを抽出');
    fireEvent.click(extractButton);

    expect(consoleSpy).toHaveBeenCalledWith('AI応答の解析エラー:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});