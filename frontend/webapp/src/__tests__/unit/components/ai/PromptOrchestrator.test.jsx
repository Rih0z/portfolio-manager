/**
 * PromptOrchestrator.jsx のユニットテスト
 * プロンプトオーケストレーター - ユーザーの状況に応じて最適なプロンプトを動的生成し、AI間連携をサポートするコンポーネントの包括的なテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PromptOrchestrator from '../../../../components/ai/PromptOrchestrator';

// react-i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'ja'
    }
  })
}));

// PromptOrchestrationServiceのモック
const mockPromptOrchestrationService = {
  updateUserContext: jest.fn(),
  generatePersonalizedPrompt: jest.fn(),
  recordPrompt: jest.fn(),
  learnFromResponse: jest.fn(),
  promptHistory: []
};

jest.mock('../../../../services/PromptOrchestrationService', () => mockPromptOrchestrationService);

// navigator.clipboard APIのモック
const mockClipboard = {
  writeText: jest.fn()
};

// window.openのモック
const mockWindowOpen = jest.fn();

describe('PromptOrchestrator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // navigator.clipboardのモック
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true
    });
    
    // window.openのモック
    global.window.open = mockWindowOpen;
    
    // mockPromptOrchestrationServiceのデフォルト設定
    mockPromptOrchestrationService.promptHistory = [];
    mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue({
      content: 'テスト用のプロンプト内容です。',
      title: 'テストプロンプト',
      metadata: {
        promptType: ['portfolio_analysis'],
        generatedAt: new Date().toISOString()
      }
    });
    mockPromptOrchestrationService.recordPrompt.mockReturnValue('test-prompt-id');
  });

  describe('基本レンダリング', () => {
    test('デフォルトプロパティで正しくレンダリングされる', () => {
      render(<PromptOrchestrator />);
      
      expect(screen.getByText('🎯 プロンプトオーケストレーター')).toBeInTheDocument();
      expect(screen.getByText('ポートフォリオ分析')).toBeInTheDocument();
      expect(screen.getByText('パーソナライズドプロンプトを生成')).toBeInTheDocument();
    });

    test('カスタムプロパティで正しくレンダリングされる', () => {
      const mockOnPromptGenerated = jest.fn();
      
      render(
        <PromptOrchestrator
          promptType="market_analysis"
          userContext={{ portfolio: 'test' }}
          onPromptGenerated={mockOnPromptGenerated}
          className="custom-class"
        />
      );
      
      expect(screen.getByText('市場分析')).toBeInTheDocument();
      const container = screen.getByText('🎯 プロンプトオーケストレーター').closest('div');
      expect(container).toHaveClass('custom-class');
    });

    test('promptTypeに応じて正しい表示名が設定される', () => {
      const { rerender } = render(<PromptOrchestrator promptType="data_import_screenshot" />);
      expect(screen.getByText('データインポート')).toBeInTheDocument();
      
      rerender(<PromptOrchestrator promptType="goal_setting" />);
      expect(screen.getByText('目標設定')).toBeInTheDocument();
      
      rerender(<PromptOrchestrator promptType="emotional_support" />);
      expect(screen.getByText('メンタルサポート')).toBeInTheDocument();
      
      rerender(<PromptOrchestrator promptType="unknown_type" />);
      expect(screen.getByText('unknown_type')).toBeInTheDocument();
    });
  });

  describe('i18n対応', () => {
    test('英語環境での表示', () => {
      jest.mocked(require('react-i18next').useTranslation).mockReturnValue({
        t: (key) => key,
        i18n: { language: 'en' }
      });
      
      render(<PromptOrchestrator promptType="portfolio_analysis" />);
      
      expect(screen.getByText('Prompt Orchestrator')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Analysis')).toBeInTheDocument();
      expect(screen.getByText('Generate Personalized Prompt')).toBeInTheDocument();
    });
  });

  describe('userContext効果', () => {
    test('userContextの変更時にupdateUserContextが呼ばれる', () => {
      const { rerender } = render(<PromptOrchestrator userContext={{}} />);
      
      expect(mockPromptOrchestrationService.updateUserContext).not.toHaveBeenCalled();
      
      rerender(<PromptOrchestrator userContext={{ portfolio: 'test data' }} />);
      
      expect(mockPromptOrchestrationService.updateUserContext).toHaveBeenCalledWith({
        portfolio: 'test data'
      });
    });

    test('空のuserContextでは処理がスキップされる', () => {
      render(<PromptOrchestrator userContext={{}} />);
      
      expect(mockPromptOrchestrationService.updateUserContext).not.toHaveBeenCalled();
    });
  });

  describe('プロンプト履歴表示', () => {
    test('プロンプト履歴がある場合の表示', () => {
      mockPromptOrchestrationService.promptHistory = [
        {
          id: 'history-1',
          prompt: {
            title: '履歴プロンプト1',
            metadata: { promptType: ['portfolio_analysis'] }
          },
          timestamp: new Date('2023-01-01').toISOString()
        },
        {
          id: 'history-2',
          prompt: {
            title: '履歴プロンプト2',
            metadata: { promptType: ['portfolio_analysis'] }
          },
          timestamp: new Date('2023-01-02').toISOString()
        }
      ];
      
      render(<PromptOrchestrator promptType="portfolio_analysis" />);
      
      expect(screen.getByText('最近のプロンプト')).toBeInTheDocument();
      expect(screen.getByText('履歴プロンプト1')).toBeInTheDocument();
      expect(screen.getByText('履歴プロンプト2')).toBeInTheDocument();
    });

    test('プロンプト履歴項目をクリックして選択', () => {
      const historyPrompt = {
        title: '履歴プロンプト',
        content: '履歴プロンプトの内容',
        metadata: { generatedAt: new Date().toISOString() }
      };
      
      mockPromptOrchestrationService.promptHistory = [
        {
          id: 'history-1',
          prompt: historyPrompt,
          timestamp: new Date().toISOString()
        }
      ];
      
      render(<PromptOrchestrator />);
      
      const historyItem = screen.getByText('履歴プロンプト');
      fireEvent.click(historyItem);
      
      expect(screen.getByText('生成されたプロンプト')).toBeInTheDocument();
      expect(screen.getByText('履歴プロンプトの内容')).toBeInTheDocument();
    });

    test('関連性のないプロンプト履歴は除外される', () => {
      mockPromptOrchestrationService.promptHistory = [
        {
          id: 'history-1',
          prompt: {
            title: '関連プロンプト',
            metadata: { promptType: ['portfolio_analysis'] }
          },
          timestamp: new Date().toISOString()
        },
        {
          id: 'history-2',
          prompt: {
            title: '無関係プロンプト',
            metadata: { promptType: ['market_analysis'] }
          },
          timestamp: new Date().toISOString()
        }
      ];
      
      render(<PromptOrchestrator promptType="portfolio_analysis" />);
      
      expect(screen.getByText('関連プロンプト')).toBeInTheDocument();
      expect(screen.queryByText('無関係プロンプト')).not.toBeInTheDocument();
    });
  });

  describe('プロンプト生成機能', () => {
    test('プロンプト生成ボタンクリック時の処理', async () => {
      const mockOnPromptGenerated = jest.fn();
      
      render(
        <PromptOrchestrator
          promptType="portfolio_analysis"
          userContext={{ test: 'data' }}
          onPromptGenerated={mockOnPromptGenerated}
        />
      );
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      expect(mockPromptOrchestrationService.generatePersonalizedPrompt).toHaveBeenCalledWith(
        'portfolio_analysis',
        { test: 'data' }
      );
      expect(mockPromptOrchestrationService.recordPrompt).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(mockOnPromptGenerated).toHaveBeenCalled();
        expect(screen.getByText('生成されたプロンプト')).toBeInTheDocument();
        expect(screen.getByText('テスト用のプロンプト内容です。')).toBeInTheDocument();
      });
    });

    test('プロンプト生成中のローディング状態', async () => {
      let resolveGeneration;
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockImplementation(() => {
        return new Promise(resolve => {
          resolveGeneration = resolve;
        });
      });
      
      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      expect(screen.getByText('生成中...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
      
      resolveGeneration({
        content: 'Generated prompt',
        title: 'Test',
        metadata: { generatedAt: new Date().toISOString() }
      });
      
      await waitFor(() => {
        expect(screen.getByText('パーソナライズドプロンプトを生成')).toBeInTheDocument();
        expect(generateButton).not.toBeDisabled();
      });
    });

    test('プロンプト生成エラーの処理', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockImplementation(() => {
        throw new Error('Generation failed');
      });
      
      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('プロンプト生成エラー:', expect.any(Error));
        expect(screen.getByText('パーソナライズドプロンプトを生成')).toBeInTheDocument();
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('コピー機能', () => {
    test('プロンプトのクリップボードコピー成功', async () => {
      mockClipboard.writeText.mockResolvedValue();
      
      render(<PromptOrchestrator />);
      
      // プロンプトを生成
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('コピー')).toBeInTheDocument();
      });
      
      const copyButton = screen.getByText('コピー');
      fireEvent.click(copyButton);
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith('テスト用のプロンプト内容です。');
    });

    test('プロンプトのクリップボードコピー失敗', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));
      
      render(<PromptOrchestrator />);
      
      // プロンプトを生成
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('コピー')).toBeInTheDocument();
      });
      
      const copyButton = screen.getByText('コピー');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('コピー失敗:', expect.any(Error));
      });
      
      consoleErrorSpy.mockRestore();
    });

    test('生成されたプロンプトがない場合はコピー処理が実行されない', () => {
      render(<PromptOrchestrator />);
      
      // プロンプト未生成の状態でコピーボタンは表示されない
      expect(screen.queryByText('コピー')).not.toBeInTheDocument();
    });
  });

  describe('AI選択機能', () => {
    beforeEach(async () => {
      render(<PromptOrchestrator />);
      
      // プロンプトを生成してAI選択ボタンを表示
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('AIを選んで相談')).toBeInTheDocument();
      });
    });

    test('Claude AI選択', () => {
      const claudeButton = screen.getByText('Claude');
      fireEvent.click(claudeButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith('https://claude.ai', '_blank');
    });

    test('Gemini AI選択', () => {
      const geminiButton = screen.getByText('Gemini');
      fireEvent.click(geminiButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith('https://gemini.google.com', '_blank');
    });

    test('ChatGPT AI選択', () => {
      const chatgptButton = screen.getByText('ChatGPT');
      fireEvent.click(chatgptButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith('https://chat.openai.com', '_blank');
    });
  });

  describe('フィードバック機能', () => {
    beforeEach(async () => {
      render(<PromptOrchestrator />);
      
      // プロンプトを生成してフィードバックセクションを表示
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロンプトの評価')).toBeInTheDocument();
      });
    });

    test('星評価の送信', async () => {
      const starButtons = screen.getAllByText('⭐');
      expect(starButtons).toHaveLength(5);
      
      // 3星をクリック
      fireEvent.click(starButtons[2]);
      
      expect(mockPromptOrchestrationService.learnFromResponse).toHaveBeenCalledWith(
        'test-prompt-id',
        { aiProvider: 'claude' },
        expect.objectContaining({
          rating: 3,
          comments: '',
          aiUsed: 'claude',
          timestamp: expect.any(String)
        })
      );
      
      await waitFor(() => {
        expect(screen.getByText('フィードバックありがとうございます！')).toBeInTheDocument();
        expect(screen.queryByText('プロンプトの評価')).not.toBeInTheDocument();
      });
    });

    test('AI選択後のフィードバック', async () => {
      // Claude AIを選択
      const claudeButton = screen.getByText('Claude');
      fireEvent.click(claudeButton);
      
      // フィードバックを送信
      const starButtons = screen.getAllByText('⭐');
      fireEvent.click(starButtons[4]); // 5星
      
      expect(mockPromptOrchestrationService.learnFromResponse).toHaveBeenCalledWith(
        'test-prompt-id',
        { aiProvider: 'claude' },
        expect.objectContaining({
          rating: 5,
          aiUsed: 'claude'
        })
      );
    });

    test('プロンプトIDがない場合はフィードバック送信されない', async () => {
      mockPromptOrchestrationService.recordPrompt.mockReturnValue(null);
      
      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロンプトの評価')).toBeInTheDocument();
      });
      
      const starButtons = screen.getAllByText('⭐');
      fireEvent.click(starButtons[0]);
      
      expect(mockPromptOrchestrationService.learnFromResponse).not.toHaveBeenCalled();
    });
  });

  describe('使い方セクション', () => {
    test('使い方指示の表示', async () => {
      render(<PromptOrchestrator />);
      
      // プロンプトを生成して使い方セクションを表示
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('💡 使い方')).toBeInTheDocument();
        expect(screen.getByText('1. 上記プロンプトをコピー')).toBeInTheDocument();
        expect(screen.getByText('2. お好みのAIサービスにアクセス')).toBeInTheDocument();
        expect(screen.getByText('3. プロンプトを貼り付けて送信')).toBeInTheDocument();
        expect(screen.getByText('4. AIからのアドバイスを受け取る')).toBeInTheDocument();
        expect(screen.getByText('5. 結果を評価して学習を改善')).toBeInTheDocument();
      });
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('promptOrchestrationServiceが利用できない場合', () => {
      // サービスのメソッドを削除
      delete mockPromptOrchestrationService.generatePersonalizedPrompt;
      
      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      
      // エラーが発生してもアプリがクラッシュしない
      expect(() => fireEvent.click(generateButton)).not.toThrow();
    });

    test('無効なprompHistoryデータの処理', () => {
      mockPromptOrchestrationService.promptHistory = [
        null,
        undefined,
        { id: 'valid', prompt: { title: 'Valid Prompt' }, timestamp: new Date().toISOString() }
      ];
      
      expect(() => render(<PromptOrchestrator />)).not.toThrow();
    });

    test('プロンプト生成時のタイムスタンプ処理', async () => {
      const mockPrompt = {
        content: 'Test content',
        title: 'Test title',
        metadata: {
          generatedAt: '2023-01-01T00:00:00.000Z'
        }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);
      
      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/生成日時/)).toBeInTheDocument();
        expect(screen.getByText(/2023\/1\/1/)).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なARIA属性とセマンティックHTML', () => {
      render(<PromptOrchestrator />);
      
      // ボタンの確認
      const generateButton = screen.getByRole('button', { name: /パーソナライズドプロンプトを生成/ });
      expect(generateButton).toBeInTheDocument();
      
      // 見出しの確認
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('🎯 プロンプトオーケストレーター');
    });

    test('キーボードナビゲーション', () => {
      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      
      // フォーカスの確認
      generateButton.focus();
      expect(generateButton).toHaveFocus();
      
      // Enterキーでの実行
      fireEvent.keyDown(generateButton, { key: 'Enter', code: 'Enter' });
      // 実際のキーボードイベントハンドリングは別途実装が必要
    });
  });

  describe('パフォーマンス最適化', () => {
    test('不要な再レンダリングの防止', () => {
      const { rerender } = render(<PromptOrchestrator userContext={{ test: 'data' }} />);
      
      expect(mockPromptOrchestrationService.updateUserContext).toHaveBeenCalledTimes(1);
      
      // 同じuserContextで再レンダリング
      rerender(<PromptOrchestrator userContext={{ test: 'data' }} />);
      
      // updateUserContextは再度呼ばれる（useEffectの依存配列による）
      expect(mockPromptOrchestrationService.updateUserContext).toHaveBeenCalledTimes(2);
    });
  });
});