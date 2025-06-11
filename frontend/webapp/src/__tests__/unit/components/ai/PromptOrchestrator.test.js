/**
 * PromptOrchestrator コンポーネントのユニットテスト
 * 
 * テスト対象:
 * - プロンプト生成機能
 * - AI選択と連携機能 
 * - フィードバック機能
 * - プロンプト履歴表示
 * - 国際化対応
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import PromptOrchestrator from '../../../../components/ai/PromptOrchestrator';

// i18nextのモック
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'ja' }
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

jest.mock('../../../../services/PromptOrchestrationService', () => ({
  __esModule: true,
  default: mockPromptOrchestrationService
}));

// navigator.clipboard のモック
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

// window.open のモック
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn()
});

describe('PromptOrchestrator', () => {
  const mockOnPromptGenerated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトのプロンプト履歴をセットアップ
    mockPromptOrchestrationService.promptHistory = [
      {
        id: '1',
        prompt: {
          title: 'テストプロンプト1',
          content: 'テスト内容1',
          metadata: { promptType: ['portfolio_analysis'] }
        },
        timestamp: '2025-01-01T00:00:00Z'
      },
      {
        id: '2',
        prompt: {
          title: 'テストプロンプト2',
          content: 'テスト内容2',
          metadata: { promptType: ['market_analysis'] }
        },
        timestamp: '2025-01-02T00:00:00Z'
      }
    ];
  });

  describe('基本レンダリング', () => {
    it('デフォルトプロパティで正常にレンダリングされる', () => {
      render(<PromptOrchestrator />);
      
      expect(screen.getByText('🎯 プロンプトオーケストレーター')).toBeInTheDocument();
      expect(screen.getByText('ポートフォリオ分析')).toBeInTheDocument();
      expect(screen.getByText('パーソナライズドプロンプトを生成')).toBeInTheDocument();
    });

    it('promptTypeに応じた表示名が正しく表示される', () => {
      render(<PromptOrchestrator promptType="market_analysis" />);
      
      expect(screen.getByText('市場分析')).toBeInTheDocument();
    });

    it('カスタムクラス名が適用される', () => {
      const { container } = render(<PromptOrchestrator className="custom-class" />);
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('ユーザーコンテキストの更新', () => {
    it('userContextが変更されたときにサービスが更新される', () => {
      const userContext = { age: 30, occupation: 'エンジニア' };
      
      render(<PromptOrchestrator userContext={userContext} />);
      
      expect(mockPromptOrchestrationService.updateUserContext).toHaveBeenCalledWith(userContext);
    });

    it('空のuserContextでは更新されない', () => {
      render(<PromptOrchestrator userContext={{}} />);
      
      expect(mockPromptOrchestrationService.updateUserContext).not.toHaveBeenCalled();
    });
  });

  describe('プロンプト生成機能', () => {
    it('プロンプト生成ボタンクリックで正常に動作する', async () => {
      const mockPrompt = {
        title: '生成されたプロンプト',
        content: 'プロンプトの内容です',
        metadata: { generatedAt: '2025-01-01T00:00:00Z' }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);
      mockPromptOrchestrationService.recordPrompt.mockReturnValue('new-prompt-id');

      render(<PromptOrchestrator onPromptGenerated={mockOnPromptGenerated} />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      
      await act(async () => {
        fireEvent.click(generateButton);
      });

      expect(mockPromptOrchestrationService.generatePersonalizedPrompt).toHaveBeenCalledWith(
        'portfolio_analysis',
        {}
      );
      expect(mockPromptOrchestrationService.recordPrompt).toHaveBeenCalledWith(mockPrompt);
      expect(mockOnPromptGenerated).toHaveBeenCalledWith({
        ...mockPrompt,
        id: 'new-prompt-id'
      });
    });

    it('生成中は適切な状態を表示する', async () => {
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      
      fireEvent.click(generateButton);
      
      expect(screen.getByText('生成中...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '生成中...' })).toBeDisabled();
    });

    it('プロンプト生成エラーを適切に処理する', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockRejectedValue(
        new Error('生成エラー')
      );

      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      
      await act(async () => {
        fireEvent.click(generateButton);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('プロンプト生成エラー:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('生成されたプロンプトの表示', () => {
    it('生成されたプロンプトが正しく表示される', async () => {
      const mockPrompt = {
        title: '生成されたプロンプト',
        content: 'これは生成されたプロンプトの内容です',
        metadata: { generatedAt: '2025-01-01T00:00:00Z' }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);
      mockPromptOrchestrationService.recordPrompt.mockReturnValue('prompt-id');

      render(<PromptOrchestrator />);
      
      const generateButton = screen.getByText('パーソナライズドプロンプトを生成');
      
      await act(async () => {
        fireEvent.click(generateButton);
      });

      expect(screen.getByText('生成されたプロンプト')).toBeInTheDocument();
      expect(screen.getByText('これは生成されたプロンプトの内容です')).toBeInTheDocument();
      expect(screen.getByText('コピー')).toBeInTheDocument();
    });

    it('コピーボタンが正常に動作する', async () => {
      const mockPrompt = {
        title: 'テストプロンプト',
        content: 'コピー対象の内容',
        metadata: { generatedAt: '2025-01-01T00:00:00Z' }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);

      render(<PromptOrchestrator />);
      
      // プロンプトを生成
      await act(async () => {
        fireEvent.click(screen.getByText('パーソナライズドプロンプトを生成'));
      });

      // コピーボタンをクリック
      await act(async () => {
        fireEvent.click(screen.getByText('コピー'));
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('コピー対象の内容');
    });

    it('コピー失敗時にエラーログが出力される', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      navigator.clipboard.writeText.mockRejectedValue(new Error('コピー失敗'));

      const mockPrompt = {
        content: 'テスト内容',
        metadata: { generatedAt: '2025-01-01T00:00:00Z' }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);

      render(<PromptOrchestrator />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('パーソナライズドプロンプトを生成'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('コピー'));
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('コピー失敗:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('AI選択機能', () => {
    beforeEach(async () => {
      const mockPrompt = {
        content: 'テスト内容',
        metadata: { generatedAt: '2025-01-01T00:00:00Z' }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);

      render(<PromptOrchestrator />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('パーソナライズドプロンプトを生成'));
      });
    });

    it('AI選択セクションが表示される', () => {
      expect(screen.getByText('AIを選んで相談')).toBeInTheDocument();
      expect(screen.getByText('Claude')).toBeInTheDocument();
      expect(screen.getByText('Gemini')).toBeInTheDocument();
      expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    });

    it('Claude選択時に正しいURLが開かれる', () => {
      fireEvent.click(screen.getByText('Claude'));
      
      expect(window.open).toHaveBeenCalledWith('https://claude.ai', '_blank');
    });

    it('Gemini選択時に正しいURLが開かれる', () => {
      fireEvent.click(screen.getByText('Gemini'));
      
      expect(window.open).toHaveBeenCalledWith('https://gemini.google.com', '_blank');
    });

    it('ChatGPT選択時に正しいURLが開かれる', () => {
      fireEvent.click(screen.getByText('ChatGPT'));
      
      expect(window.open).toHaveBeenCalledWith('https://chat.openai.com', '_blank');
    });
  });

  describe('フィードバック機能', () => {
    beforeEach(async () => {
      const mockPrompt = {
        title: 'テストプロンプト',
        content: 'テスト内容',
        metadata: { generatedAt: '2025-01-01T00:00:00Z' }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);
      mockPromptOrchestrationService.recordPrompt.mockReturnValue('test-prompt-id');

      render(<PromptOrchestrator />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('パーソナライズドプロンプトを生成'));
      });
    });

    it('評価セクションが表示される', () => {
      expect(screen.getByText('プロンプトの評価')).toBeInTheDocument();
      expect(screen.getByText('プロンプトの品質を評価してください（学習に活用されます）')).toBeInTheDocument();
      
      // 5つの星ボタンが表示される
      const starButtons = screen.getAllByText('⭐');
      expect(starButtons).toHaveLength(5);
    });

    it('評価ボタンクリックでフィードバックが送信される', async () => {
      // 4つ星をクリック
      const starButtons = screen.getAllByText('⭐');
      
      await act(async () => {
        fireEvent.click(starButtons[3]); // 4つ星（0-indexed）
      });

      expect(mockPromptOrchestrationService.learnFromResponse).toHaveBeenCalledWith(
        'test-prompt-id',
        { aiProvider: 'claude' },
        expect.objectContaining({
          rating: 4,
          comments: '',
          aiUsed: 'claude',
          timestamp: expect.any(String)
        })
      );
    });

    it('フィードバック送信後に成功メッセージが表示される', async () => {
      const starButtons = screen.getAllByText('⭐');
      
      await act(async () => {
        fireEvent.click(starButtons[4]); // 5つ星
      });

      expect(screen.getByText('フィードバックありがとうございます！')).toBeInTheDocument();
      
      // 評価セクションが非表示になる
      expect(screen.queryByText('プロンプトの評価')).not.toBeInTheDocument();
    });
  });

  describe('プロンプト履歴機能', () => {
    it('関連する履歴が表示される', () => {
      // portfolio_analysis タイプのプロンプトを含む履歴を設定
      mockPromptOrchestrationService.promptHistory = [
        {
          id: '1',
          prompt: {
            title: 'ポートフォリオ分析プロンプト',
            metadata: { promptType: ['portfolio_analysis'] }
          },
          timestamp: '2025-01-01T00:00:00Z'
        }
      ];

      render(<PromptOrchestrator promptType="portfolio_analysis" />);
      
      expect(screen.getByText('最近のプロンプト')).toBeInTheDocument();
      expect(screen.getByText('ポートフォリオ分析プロンプト')).toBeInTheDocument();
    });

    it('履歴アイテムクリックでプロンプトが選択される', async () => {
      mockPromptOrchestrationService.promptHistory = [
        {
          id: '1',
          prompt: {
            title: 'クリック可能なプロンプト',
            content: '履歴からの内容',
            metadata: { 
              promptType: ['portfolio_analysis'],
              generatedAt: '2025-01-01T00:00:00Z'
            }
          },
          timestamp: '2025-01-01T00:00:00Z'
        }
      ];

      render(<PromptOrchestrator promptType="portfolio_analysis" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('クリック可能なプロンプト'));
      });

      expect(screen.getByText('履歴からの内容')).toBeInTheDocument();
    });

    it('関連しない履歴は表示されない', () => {
      mockPromptOrchestrationService.promptHistory = [
        {
          id: '1',
          prompt: {
            title: '市場分析プロンプト',
            metadata: { promptType: ['market_analysis'] }
          },
          timestamp: '2025-01-01T00:00:00Z'
        }
      ];

      render(<PromptOrchestrator promptType="portfolio_analysis" />);
      
      expect(screen.queryByText('最近のプロンプト')).not.toBeInTheDocument();
      expect(screen.queryByText('市場分析プロンプト')).not.toBeInTheDocument();
    });
  });

  describe('使い方ガイド', () => {
    it('プロンプト生成後に使い方ガイドが表示される', async () => {
      const mockPrompt = {
        content: 'テスト内容',
        metadata: { generatedAt: '2025-01-01T00:00:00Z' }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);

      render(<PromptOrchestrator />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('パーソナライズドプロンプトを生成'));
      });

      expect(screen.getByText('💡 使い方')).toBeInTheDocument();
      expect(screen.getByText('1. 上記プロンプトをコピー')).toBeInTheDocument();
      expect(screen.getByText('2. お好みのAIサービスにアクセス')).toBeInTheDocument();
      expect(screen.getByText('3. プロンプトを貼り付けて送信')).toBeInTheDocument();
      expect(screen.getByText('4. AIからのアドバイスを受け取る')).toBeInTheDocument();
      expect(screen.getByText('5. 結果を評価して学習を改善')).toBeInTheDocument();
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
      render(<PromptOrchestrator promptType="portfolio_analysis" />);
      
      expect(screen.getByText('Prompt Orchestrator')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Analysis')).toBeInTheDocument();
      expect(screen.getByText('Generate Personalized Prompt')).toBeInTheDocument();
    });

    it('promptTypeの英語表示名が正しく表示される', () => {
      render(<PromptOrchestrator promptType="market_analysis" />);
      
      expect(screen.getByText('Market Analysis')).toBeInTheDocument();
    });
  });

  describe('プロンプトタイプの表示名', () => {
    const promptTypes = [
      { type: 'portfolio_analysis', ja: 'ポートフォリオ分析', en: 'Portfolio Analysis' },
      { type: 'data_import_screenshot', ja: 'データインポート', en: 'Data Import' },
      { type: 'market_analysis', ja: '市場分析', en: 'Market Analysis' },
      { type: 'goal_setting', ja: '目標設定', en: 'Goal Setting' },
      { type: 'emotional_support', ja: 'メンタルサポート', en: 'Emotional Support' }
    ];

    promptTypes.forEach(({ type, ja, en }) => {
      it(`${type}の日本語表示名が正しい`, () => {
        require('react-i18next').useTranslation.mockReturnValue({
          t: (key) => key,
          i18n: { language: 'ja' }
        });

        render(<PromptOrchestrator promptType={type} />);
        
        expect(screen.getByText(ja)).toBeInTheDocument();
      });

      it(`${type}の英語表示名が正しい`, () => {
        require('react-i18next').useTranslation.mockReturnValue({
          t: (key) => key,
          i18n: { language: 'en' }
        });

        render(<PromptOrchestrator promptType={type} />);
        
        expect(screen.getByText(en)).toBeInTheDocument();
      });
    });

    it('未知のプロンプトタイプは元の値を表示する', () => {
      render(<PromptOrchestrator promptType="unknown_type" />);
      
      expect(screen.getByText('unknown_type')).toBeInTheDocument();
    });
  });

  describe('プロパティのデフォルト値', () => {
    it('全てのプロパティがオプショナルで動作する', () => {
      render(<PromptOrchestrator />);
      
      expect(screen.getByText('🎯 プロンプトオーケストレーター')).toBeInTheDocument();
    });

    it('onPromptGeneratedが未指定でもエラーが発生しない', async () => {
      const mockPrompt = {
        content: 'テスト内容',
        metadata: { generatedAt: '2025-01-01T00:00:00Z' }
      };
      
      mockPromptOrchestrationService.generatePersonalizedPrompt.mockReturnValue(mockPrompt);

      render(<PromptOrchestrator />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('パーソナライズドプロンプトを生成'));
      });

      // エラーが発生しないことを確認（プロンプトが表示される）
      expect(screen.getByText('テスト内容')).toBeInTheDocument();
    });
  });
});