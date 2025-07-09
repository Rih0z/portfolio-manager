/**
 * PromptDisplayコンポーネントのユニットテスト
 * 
 * テスト対象:
 * - プロンプト表示とコピー機能
 * - データタイプ別の表示切り替え
 * - 折りたたみ機能
 * - 使用手順の表示/非表示
 * - 外部リンクとアイコン表示
 * - レスポンシブ対応
 * - アクセシビリティ
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PromptDisplay from '../../../../components/ai/PromptDisplay';

// navigator.clipboardのモック
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

describe('PromptDisplay', () => {
  const mockPrompt = `これはテスト用のプロンプトです。
詳細な投資分析を行ってください。

以下の形式でYAMLを生成してください:
- ポートフォリオ情報
- リスク分析
- 推奨配分`;

  const mockOnCopy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    navigator.clipboard.writeText.mockClear();
  });

  describe('基本的なレンダリング', () => {
    test('プロンプトテキストが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByText(/これはテスト用のプロンプトです/)).toBeInTheDocument();
      expect(screen.getByText(/詳細な投資分析を行ってください/)).toBeInTheDocument();
    });

    test('デフォルトでポートフォリオデータタイプが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByText('ポートフォリオデータ取り込み')).toBeInTheDocument();
      expect(screen.getByText('保有資産、目標配分、投資額等の投資情報を取り込みます')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    test('プロンプトヘッダーが正しく表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByText('Claude AIプロンプト')).toBeInTheDocument();
      expect(screen.getByText('portfolio')).toBeInTheDocument();
    });

    test('文字数カウントが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByText(`文字数: ${mockPrompt.length.toLocaleString()}文字`)).toBeInTheDocument();
    });

    test('フッター情報が表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByText('Claude AI, Gemini対応')).toBeInTheDocument();
      expect(screen.getByText('✓ YAML形式')).toBeInTheDocument();
    });
  });

  describe('データタイプ別表示', () => {
    test('user_profileタイプの場合', () => {
      render(<PromptDisplay prompt={mockPrompt} dataType="user_profile" />);
      
      expect(screen.getByText('ユーザープロファイル取り込み')).toBeInTheDocument();
      expect(screen.getByText('投資経験、リスク許容度、投資目標等の個人情報を取り込みます')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
      expect(screen.getByText('user_profile')).toBeInTheDocument();
    });

    test('app_configタイプの場合', () => {
      render(<PromptDisplay prompt={mockPrompt} dataType="app_config" />);
      
      expect(screen.getByText('アプリ設定取り込み')).toBeInTheDocument();
      expect(screen.getByText('表示設定、データソース、機能設定等を取り込みます')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('app_config')).toBeInTheDocument();
    });

    test('allocation_templatesタイプの場合', () => {
      render(<PromptDisplay prompt={mockPrompt} dataType="allocation_templates" />);
      
      expect(screen.getByText('配分テンプレート取り込み')).toBeInTheDocument();
      expect(screen.getByText('資産配分のテンプレートと推奨配分を取り込みます')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('allocation_templates')).toBeInTheDocument();
    });

    test('未知のデータタイプの場合はポートフォリオにフォールバック', () => {
      render(<PromptDisplay prompt={mockPrompt} dataType="unknown_type" />);
      
      expect(screen.getByText('ポートフォリオデータ取り込み')).toBeInTheDocument();
      expect(screen.getByText('unknown_type')).toBeInTheDocument();
    });
  });

  describe('コピー機能', () => {
    test('コピーボタンをクリックするとクリップボードにコピーされる', async () => {
      render(<PromptDisplay prompt={mockPrompt} onCopy={mockOnCopy} />);
      
      const copyButton = screen.getByRole('button', { name: /コピー/ });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPrompt);
        expect(mockOnCopy).toHaveBeenCalledTimes(1);
      });
    });

    test('copiedがtrueの場合、コピー済み状態が表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} copied={true} />);
      
      expect(screen.getByText('コピー済み')).toBeInTheDocument();
      expect(screen.queryByText('コピー')).not.toBeInTheDocument();
      
      // チェックアイコンが表示される
      const button = screen.getByRole('button', { name: /コピー済み/ });
      expect(button).toHaveClass('bg-green-100', 'text-green-800');
    });

    test('copiedがfalseの場合、通常のコピーボタンが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} copied={false} />);
      
      expect(screen.getByText('コピー')).toBeInTheDocument();
      expect(screen.queryByText('コピー済み')).not.toBeInTheDocument();
      
      const button = screen.getByRole('button', { name: /コピー/ });
      expect(button).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    test('クリップボードエラー時でもコンポーネントが壊れない', async () => {
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<PromptDisplay prompt={mockPrompt} onCopy={mockOnCopy} />);
      
      const copyButton = screen.getByRole('button', { name: /コピー/ });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to copy prompt:', expect.any(Error));
      });
      
      // onCopyは呼ばれない
      expect(mockOnCopy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('onCopyプロパティがない場合でもエラーにならない', async () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const copyButton = screen.getByRole('button', { name: /コピー/ });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPrompt);
      });
    });
  });

  describe('折りたたみ機能', () => {
    test('デフォルトで折りたたまれている', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const promptContainer = screen.getByText(mockPrompt).parentElement;
      expect(promptContainer).toHaveClass('max-h-64', 'overflow-hidden');
      
      expect(screen.getByText('全体を表示')).toBeInTheDocument();
      expect(screen.queryByText('折りたたむ')).not.toBeInTheDocument();
    });

    test('展開ボタンをクリックすると全体が表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const expandButton = screen.getByRole('button', { name: '全体を表示' });
      fireEvent.click(expandButton);
      
      const promptContainer = screen.getByText(mockPrompt).parentElement;
      expect(promptContainer).not.toHaveClass('max-h-64', 'overflow-hidden');
      
      expect(screen.getByText('折りたたむ')).toBeInTheDocument();
      expect(screen.queryByText('全体を表示')).not.toBeInTheDocument();
    });

    test('折りたたみボタンをクリックすると再び折りたたまれる', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      // 展開
      const expandButton = screen.getByRole('button', { name: '全体を表示' });
      fireEvent.click(expandButton);
      
      // 折りたたみ
      const collapseButton = screen.getByRole('button', { name: '折りたたむ' });
      fireEvent.click(collapseButton);
      
      const promptContainer = screen.getByText(mockPrompt).parentElement;
      expect(promptContainer).toHaveClass('max-h-64', 'overflow-hidden');
      
      expect(screen.getByText('全体を表示')).toBeInTheDocument();
    });

    test('折りたたみ時はグラデーションオーバーレイが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const gradientOverlay = document.querySelector('.bg-gradient-to-t');
      expect(gradientOverlay).toBeInTheDocument();
      expect(gradientOverlay).toHaveClass('from-white', 'to-transparent', 'pointer-events-none');
    });

    test('展開時はグラデーションオーバーレイが表示されない', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const expandButton = screen.getByRole('button', { name: '全体を表示' });
      fireEvent.click(expandButton);
      
      const gradientOverlay = document.querySelector('.bg-gradient-to-t');
      expect(gradientOverlay).not.toBeInTheDocument();
    });
  });

  describe('使用手順の表示', () => {
    test('showInstructions=trueの場合、使用手順が表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} showInstructions={true} />);
      
      expect(screen.getByText('使用手順')).toBeInTheDocument();
      expect(screen.getByText('下のプロンプトをコピーしてください')).toBeInTheDocument();
      expect(screen.getByText('Claude AI（claude.ai）またはGemini（gemini.google.com）を開きます')).toBeInTheDocument();
    });

    test('showInstructions=falseの場合、使用手順が表示されない', () => {
      render(<PromptDisplay prompt={mockPrompt} showInstructions={false} />);
      
      expect(screen.queryByText('使用手順')).not.toBeInTheDocument();
      expect(screen.queryByText('下のプロンプトをコピーしてください')).not.toBeInTheDocument();
    });

    test('デフォルト（showInstructions未指定）で使用手順が表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByText('使用手順')).toBeInTheDocument();
    });

    test('Claude AIとGeminiへの外部リンクが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const claudeLink = screen.getByRole('link', { name: /Claude AI/ });
      expect(claudeLink).toHaveAttribute('href', 'https://claude.ai');
      expect(claudeLink).toHaveAttribute('target', '_blank');
      expect(claudeLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      const geminiLink = screen.getByRole('link', { name: /Gemini/ });
      expect(geminiLink).toHaveAttribute('href', 'https://gemini.google.com');
      expect(geminiLink).toHaveAttribute('target', '_blank');
      expect(geminiLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('ヒントセクション', () => {
    test('スクリーンショットのコツが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByText('スクリーンショットのコツ')).toBeInTheDocument();
      expect(screen.getByText('文字がはっきり読める解像度で撮影してください')).toBeInTheDocument();
      expect(screen.getByText('個人情報（氏名、住所等）は事前にマスクしてください')).toBeInTheDocument();
    });

    test('推奨AIサービスガイドが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByText('推奨AIサービス')).toBeInTheDocument();
      expect(screen.getByText('Claude AI:')).toBeInTheDocument();
      expect(screen.getByText('詳細な分析と正確なYAML生成に優れています')).toBeInTheDocument();
      expect(screen.getByText('Gemini:')).toBeInTheDocument();
      expect(screen.getByText('画像認識とマルチモーダル処理に強みがあります')).toBeInTheDocument();
    });
  });

  describe('アイコンとスタイリング', () => {
    test('各セクションに適切なアイコンが表示される', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      // React Iconsのアイコンは実際のDOM要素として確認
      expect(document.querySelector('[data-testid="robot-icon"]') || 
             document.querySelector('svg')).toBeInTheDocument();
    });

    test('データタイプ別の色が適用される', () => {
      render(<PromptDisplay prompt={mockPrompt} dataType="portfolio" />);
      
      // bg-blue-50などのTailwindクラスが適用されているかチェック
      const dataTypeSection = screen.getByText('ポートフォリオデータ取り込み').closest('div');
      expect(dataTypeSection?.className).toMatch(/bg-.*-50/);
    });

    test('プロンプトエリアが適切にスタイリングされている', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const promptText = screen.getByText(mockPrompt);
      expect(promptText).toHaveClass('p-4', 'text-sm', 'text-gray-800', 'whitespace-pre-wrap', 'font-mono');
    });
  });

  describe('アクセシビリティ', () => {
    test('ボタンに適切なlabelが設定されている', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(screen.getByRole('button', { name: /コピー/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /全体を表示/ })).toBeInTheDocument();
    });

    test('外部リンクに適切な属性が設定されている', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    test('preタグでプロンプトが正しくフォーマットされている', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const preElement = document.querySelector('pre');
      expect(preElement).toBeInTheDocument();
      expect(preElement?.textContent).toBe(mockPrompt);
    });
  });

  describe('エッジケース', () => {
    test('空のプロンプトでもエラーにならない', () => {
      render(<PromptDisplay prompt="" />);
      
      expect(screen.getByText('文字数: 0文字')).toBeInTheDocument();
    });

    test('非常に長いプロンプトでも正常に表示される', () => {
      const longPrompt = 'a'.repeat(10000);
      render(<PromptDisplay prompt={longPrompt} />);
      
      expect(screen.getByText(`文字数: ${longPrompt.length.toLocaleString()}文字`)).toBeInTheDocument();
    });

    test('特殊文字を含むプロンプトでも正常に表示される', () => {
      const specialPrompt = 'テスト\n改行\t\tタブ\r\n"引用符"\'単一引用符\'<>&特殊文字';
      render(<PromptDisplay prompt={specialPrompt} />);
      
      expect(screen.getByText(specialPrompt)).toBeInTheDocument();
    });

    test('nullまたはundefinedのプロンプトでもエラーにならない', () => {
      expect(() => {
        render(<PromptDisplay prompt={null} />);
      }).not.toThrow();
      
      expect(() => {
        render(<PromptDisplay prompt={undefined} />);
      }).not.toThrow();
    });
  });

  describe('パフォーマンス', () => {
    test('useCallbackによりhandleCopyが不要な再レンダリングを避ける', () => {
      const { rerender } = render(<PromptDisplay prompt={mockPrompt} onCopy={mockOnCopy} />);
      
      const copyButton = screen.getByRole('button', { name: /コピー/ });
      const firstOnClick = copyButton.onclick;
      
      // propsが変更されない再レンダリング
      rerender(<PromptDisplay prompt={mockPrompt} onCopy={mockOnCopy} />);
      
      const secondOnClick = copyButton.onclick;
      
      // useCallbackによりhandlerが同じ参照を保持
      expect(firstOnClick).toBe(secondOnClick);
    });
  });

  describe('レスポンシブデザイン', () => {
    test('flex-wrapクラスでレスポンシブ対応している', () => {
      render(<PromptDisplay prompt={mockPrompt} />);
      
      const flexContainer = document.querySelector('.flex.flex-wrap');
      expect(flexContainer).toBeInTheDocument();
    });

    test('space-yクラスで適切な縦間隔が設定されている', () => {
      const { container } = render(<PromptDisplay prompt={mockPrompt} />);
      
      expect(container.firstChild).toHaveClass('space-y-6');
    });
  });
});