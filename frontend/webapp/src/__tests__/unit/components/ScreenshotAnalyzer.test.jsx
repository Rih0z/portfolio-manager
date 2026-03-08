import { vi } from "vitest";
/**
 * ScreenshotAnalyzerコンポーネントのユニットテスト
 * AI分析結果受け取り機能のテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import ScreenshotAnalyzer from '../../../components/ai/ScreenshotAnalyzer';

// loggerモジュールのモック
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));
vi.mock('../../../utils/logger', () => ({ default: mockLogger }));

// URL.createObjectURL と URL.revokeObjectURL のモック
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// window.open をモック
global.open = vi.fn();

// navigator.clipboard をモック
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('ScreenshotAnalyzer', () => {
  const mockOnDataExtracted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders screenshot analyzer with title', () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    expect(screen.getByText(/AI分析結果の受け取り/)).toBeInTheDocument();
  });

  test('displays privacy protection section', () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    expect(screen.getByText('プライバシー保護について')).toBeInTheDocument();
    expect(screen.getByText('🔒')).toBeInTheDocument();
  });

  test('displays AI response input textarea', () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    expect(screen.getByText('AI分析結果を貼り付け')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/)).toBeInTheDocument();
  });

  test('handles user input in textarea', () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
    fireEvent.change(textarea, { target: { value: 'テスト入力' } });

    expect(textarea.value).toBe('テスト入力');
  });

  test('shows extract button when text is entered', () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
    fireEvent.change(textarea, { target: { value: 'テストデータ' } });

    expect(screen.getByText('データを抽出')).toBeInTheDocument();
  });

  test('does not show extract button when textarea is empty', () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    expect(screen.queryByText('データを抽出')).not.toBeInTheDocument();
  });

  test('processes JSON response correctly', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    const jsonResponse = '```json\n{"portfolioData": {"assets": [{"name": "テスト株式", "ticker": "TEST"}], "totalValue": 100000}}\n```';

    const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
    fireEvent.change(textarea, { target: { value: jsonResponse } });

    await act(async () => {
      fireEvent.click(screen.getByText('データを抽出'));
    });

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
      'ai_analysis'
    );
  });

  test('displays extracted data after processing', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    const jsonResponse = '```json\n{"portfolioData": {"assets": []}}\n```';

    const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
    fireEvent.change(textarea, { target: { value: jsonResponse } });

    await act(async () => {
      fireEvent.click(screen.getByText('データを抽出'));
    });

    expect(screen.getByText('抽出されたデータ')).toBeInTheDocument();
    expect(screen.getByText('ダウンロード')).toBeInTheDocument();
  });

  test('clears all data when clear button is clicked', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
    fireEvent.change(textarea, { target: { value: '```json\n{"test": "data"}\n```' } });

    await act(async () => {
      fireEvent.click(screen.getByText('データを抽出'));
    });

    // クリアボタンをクリック
    fireEvent.click(screen.getByText('クリア'));

    expect(textarea.value).toBe('');
    expect(screen.queryByText('抽出されたデータ')).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <ScreenshotAnalyzer
        onDataExtracted={mockOnDataExtracted}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('handles processing errors gracefully', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
    fireEvent.change(textarea, { target: { value: '```json\n{ invalid json }\n```' } });

    await act(async () => {
      fireEvent.click(screen.getByText('データを抽出'));
    });

    expect(mockLogger.error).toHaveBeenCalledWith('AI応答の解析エラー:', expect.objectContaining({}));
  });

  test('handles text response (non-JSON)', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
    fireEvent.change(textarea, { target: { value: 'これは普通のテキストです\n銘柄: AAPL\n価格: 150円' } });

    await act(async () => {
      fireEvent.click(screen.getByText('データを抽出'));
    });

    expect(mockOnDataExtracted).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioData: expect.objectContaining({
          source: 'text_analysis'
        }),
        rawText: expect.any(String)
      }),
      'ai_analysis'
    );
  });

  test('displays usage tips section', () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    expect(screen.getByText('使い方のヒント')).toBeInTheDocument();
    expect(screen.getByText('• プロンプト生成は「AIアドバイザー」タブを使用してください')).toBeInTheDocument();
  });

  test('download button triggers file download', async () => {
    render(<ScreenshotAnalyzer onDataExtracted={mockOnDataExtracted} />);

    const textarea = screen.getByPlaceholderText(/AIからの分析結果をここに貼り付けてください/);
    fireEvent.change(textarea, { target: { value: '```json\n{"test": "data"}\n```' } });

    await act(async () => {
      fireEvent.click(screen.getByText('データを抽出'));
    });

    // render完了後にcreateElementをモックして、'a'タグの場合のみモックリンクを返す
    const mockLink = { href: '', download: '', click: vi.fn(), setAttribute: vi.fn(), style: {} };
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return originalCreateElement(tag);
    });

    fireEvent.click(screen.getByText('ダウンロード'));

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });
});
