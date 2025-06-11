/**
 * ScreenshotAnalyzer.jsx のユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../mocks/i18n';
import ScreenshotAnalyzer from '../../../../components/ai/ScreenshotAnalyzer';

const renderWithProviders = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: 'data:image/png;base64,mockImageData',
  addEventListener: jest.fn((event, callback) => {
    if (event === 'load') {
      setTimeout(callback, 100);
    }
  })
};

Object.defineProperty(global, 'FileReader', {
  writable: true,
  value: jest.fn(() => mockFileReader)
});

describe('ScreenshotAnalyzer Component', () => {
  const mockOnAnalysisComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    expect(screen.getByText(/スクリーンショット分析|Screenshot Analysis/i)).toBeInTheDocument();
  });

  it('displays file upload area', () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    expect(screen.getByText(/ファイルを選択|Select File|ドラッグ|Drag/i)).toBeInTheDocument();
  });

  it('handles file input change', async () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    const fileInput = screen.getByRole('button', { hidden: true }) || 
                     document.querySelector('input[type="file"]');
    
    if (fileInput) {
      const file = new File(['test image'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
      });
    }
  });

  it('validates file types', () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    
    if (fileInput) {
      // 無効なファイルタイプをテスト
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      // エラーメッセージが表示されることを確認
      expect(screen.getByText(/サポートされていない|Not supported|形式|format/i)).toBeInTheDocument();
    }
  });

  it('handles drag and drop events', () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    const dropZone = screen.getByText(/ドラッグ|Drag/i).closest('div');
    
    if (dropZone) {
      const file = new File(['test image'], 'test.png', { type: 'image/png' });
      
      fireEvent.dragEnter(dropZone);
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          items: [{ kind: 'file', type: 'image/png' }]
        }
      });
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      expect(dropZone).toHaveClass(/drag-over|active|highlighted/i);
    }
  });

  it('displays image preview after upload', async () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    
    if (fileInput) {
      const file = new File(['test image'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        const preview = screen.getByAltText(/プレビュー|Preview/i);
        expect(preview).toBeInTheDocument();
        expect(preview).toHaveAttribute('src', mockFileReader.result);
      });
    }
  });

  it('handles analysis text input', () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    const textarea = screen.getByRole('textbox');
    
    fireEvent.change(textarea, {
      target: { value: 'Claude分析結果のテストテキスト' }
    });
    
    expect(textarea.value).toBe('Claude分析結果のテストテキスト');
  });

  it('enables submit button when both image and text are provided', async () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    // 画像をアップロード
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      const file = new File(['test image'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
    }
    
    // テキストを入力
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'テスト分析結果' }
    });
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /送信|Submit|分析|Analyze/i });
      expect(submitButton).toBeEnabled();
    });
  });

  it('calls onAnalysisComplete when form is submitted', async () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    // 画像をアップロード
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      const file = new File(['test image'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
    }
    
    // テキストを入力
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'テスト分析結果' }
    });
    
    await waitFor(async () => {
      const submitButton = screen.getByRole('button', { name: /送信|Submit|分析|Analyze/i });
      fireEvent.click(submitButton);
      
      expect(mockOnAnalysisComplete).toHaveBeenCalledWith({
        image: mockFileReader.result,
        analysisText: 'テスト分析結果'
      });
    });
  });

  it('shows file size limit warning for large files', () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    
    if (fileInput) {
      // 大きなファイルサイズをシミュレート（5MB超）
      const largeFile = new File(['x'.repeat(6000000)], 'large.png', { type: 'image/png' });
      Object.defineProperty(largeFile, 'size', { value: 6000000 });
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      expect(screen.getByText(/サイズが大きすぎ|Too large|制限|limit/i)).toBeInTheDocument();
    }
  });

  it('provides accessibility features', () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    // ラベルとコントロールの関連付け
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-label');
    
    // ファイル入力のアクセシビリティ
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      expect(fileInput).toHaveAttribute('aria-label');
    }
  });

  it('handles multiple file selection (first file only)', () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    const fileInput = document.querySelector('input[type="file"]');
    
    if (fileInput) {
      const file1 = new File(['test image 1'], 'test1.png', { type: 'image/png' });
      const file2 = new File(['test image 2'], 'test2.png', { type: 'image/png' });
      
      fireEvent.change(fileInput, { target: { files: [file1, file2] } });
      
      // 最初のファイルのみが処理されることを確認
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file1);
    }
  });

  it('clears form when reset button is clicked', async () => {
    renderWithProviders(
      <ScreenshotAnalyzer onAnalysisComplete={mockOnAnalysisComplete} />
    );
    
    // フォームに入力
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'テスト分析結果' }
    });
    
    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット|Reset|クリア|Clear/i });
    if (resetButton) {
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    }
  });

  it('handles missing onAnalysisComplete callback gracefully', () => {
    renderWithProviders(
      <ScreenshotAnalyzer />
    );
    
    expect(screen.getByText(/スクリーンショット分析|Screenshot Analysis/i)).toBeInTheDocument();
  });
});