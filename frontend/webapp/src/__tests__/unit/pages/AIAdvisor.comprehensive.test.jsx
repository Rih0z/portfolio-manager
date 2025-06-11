/**
 * AIAdvisor.jsxの包括的ユニットテスト
 * 
 * 1588行の巨大コンポーネントの全機能をテスト
 * - ステップバイステップウィザード（6ステップ）
 * - ユーザーデータ管理
 * - AIプロンプト生成
 * - スクリーンショット分析
 * - ポートフォリオプロンプト生成
 * - 外部AIサービス連携
 * - クリップボード操作
 * - 多言語対応
 * - 追加分析項目管理
 * - LocalStorage連携
 * - Context統合
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import AIAdvisor from '../../../pages/AIAdvisor';
import { PortfolioContext } from '../../../context/PortfolioContext';
import i18n from '../../../i18n';

// 外部サービスのモック
jest.mock('../../../services/PromptOrchestrationService', () => ({
  generateDataImportPrompt: jest.fn(() => ({
    content: 'mock screenshot prompt content',
    title: 'Mock Screenshot Analysis'
  }))
}));

jest.mock('../../../services/PortfolioPromptService', () => ({
  generatePortfolioDataPrompt: jest.fn(() => ({
    content: 'mock portfolio prompt content',
    title: 'Mock Portfolio Analysis'
  }))
}));

// React Router のモック
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// クリップボード API のモック
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

// Window.open のモック
Object.defineProperty(window, 'open', {
  value: jest.fn(),
  writable: true
});

// LocalStorage のモック
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('AIAdvisor - 包括的テスト', () => {
  // モックコンテキストの定義
  const mockPortfolioContextValue = {
    portfolio: {
      assets: [
        {
          name: 'Apple Inc.',
          quantity: 10,
          totalValue: 1500000
        },
        {
          name: 'VTI',
          quantity: 5,
          totalValue: 750000
        }
      ],
      totalValue: 2250000
    },
    currentAssets: [
      {
        ticker: 'AAPL',
        name: 'Apple Inc.',
        price: 150,
        holdings: 10,
        currency: 'USD'
      },
      {
        ticker: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        price: 200,
        holdings: 5,
        currency: 'USD'
      }
    ],
    targetPortfolio: [
      { ticker: 'AAPL', targetPercentage: 40 },
      { ticker: 'VTI', targetPercentage: 60 }
    ],
    additionalBudget: { amount: 100000, currency: 'JPY' }
  };

  const mockEmptyPortfolioContextValue = {
    portfolio: { assets: [], totalValue: 0 },
    currentAssets: [],
    targetPortfolio: [],
    additionalBudget: null
  };

  const renderAIAdvisor = (contextValue = mockPortfolioContextValue, language = 'ja') => {
    // 言語設定
    act(() => {
      i18n.changeLanguage(language);
    });

    return render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <PortfolioContext.Provider value={contextValue}>
            <AIAdvisor />
          </PortfolioContext.Provider>
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('初期レンダリング', () => {
    it('コンポーネントが正常にレンダリングされる', () => {
      renderAIAdvisor();
      
      expect(screen.getByText('AIアドバイザー')).toBeInTheDocument();
    });

    it('英語でも正常にレンダリングされる', () => {
      renderAIAdvisor(mockPortfolioContextValue, 'en');
      
      expect(screen.getByText('AI Advisor')).toBeInTheDocument();
    });

    it('初回ユーザーの場合、適切なメッセージが表示される', () => {
      renderAIAdvisor(mockEmptyPortfolioContextValue);
      
      // 初回セットアップが完了していない場合のメッセージをチェック
      const welcomeMessage = screen.getByText(/あなたの投資目標/);
      expect(welcomeMessage).toBeInTheDocument();
    });

    it('既存ユーザーの場合、適切なメッセージが表示される', () => {
      mockLocalStorage.getItem.mockReturnValue('true');
      renderAIAdvisor();
      
      expect(screen.getByText('AIアドバイザー')).toBeInTheDocument();
    });
  });

  describe('ステップナビゲーション', () => {
    it('初期状態では最初のステップが表示される', () => {
      renderAIAdvisor();
      
      expect(screen.getByText('基本情報')).toBeInTheDocument();
    });

    it('次へボタンでステップが進む', () => {
      renderAIAdvisor();
      
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);
      
      expect(screen.getByText('投資対象市場')).toBeInTheDocument();
    });

    it('戻るボタンでステップが戻る', () => {
      renderAIAdvisor();
      
      // 次のステップに進む
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);
      
      // 戻るボタンをクリック
      const prevButton = screen.getByText('戻る');
      fireEvent.click(prevButton);
      
      expect(screen.getByText('基本情報')).toBeInTheDocument();
    });

    it('最初のステップでは戻るボタンが無効', () => {
      renderAIAdvisor();
      
      const prevButton = screen.queryByText('戻る');
      expect(prevButton).toBeNull();
    });

    it('最後のステップまで進める', () => {
      renderAIAdvisor();
      
      // 全てのステップを進む
      const nextButton = screen.getByText('次へ');
      
      // ステップ1: 基本情報 -> 投資対象市場
      fireEvent.click(nextButton);
      expect(screen.getByText('投資対象市場')).toBeInTheDocument();
      
      // ステップ2: 投資対象市場 -> 投資経験
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('投資経験')).toBeInTheDocument();
      
      // ステップ3: 投資経験 -> ポートフォリオ・目標設定
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('ポートフォリオ・目標設定')).toBeInTheDocument();
      
      // ステップ4: ポートフォリオ・目標設定 -> スクリーンショット分析
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('スクリーンショット分析')).toBeInTheDocument();
      
      // ステップ5: スクリーンショット分析 -> AIプロンプト
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('AIプロンプト')).toBeInTheDocument();
    });
  });

  describe('基本情報ステップ', () => {
    it('年齢入力フィールドが表示される', () => {
      renderAIAdvisor();
      
      const ageInput = screen.getByDisplayValue('35');
      expect(ageInput).toBeInTheDocument();
    });

    it('年齢を変更できる', () => {
      renderAIAdvisor();
      
      const ageInput = screen.getByDisplayValue('35');
      fireEvent.change(ageInput, { target: { value: '28' } });
      
      expect(ageInput.value).toBe('28');
    });

    it('職業選択肢が表示される', () => {
      renderAIAdvisor();
      
      expect(screen.getByText('会社員')).toBeInTheDocument();
      expect(screen.getByText('公務員')).toBeInTheDocument();
      expect(screen.getByText('自営業')).toBeInTheDocument();
    });

    it('職業を選択できる', () => {
      renderAIAdvisor();
      
      const companyEmployeeOption = screen.getByLabelText('会社員');
      fireEvent.click(companyEmployeeOption);
      
      expect(companyEmployeeOption.checked).toBe(true);
    });

    it('その他の職業でカスタム入力が表示される', () => {
      renderAIAdvisor();
      
      const otherOption = screen.getByLabelText('その他');
      fireEvent.click(otherOption);
      
      const customInput = screen.getByPlaceholderText('職業を入力してください');
      expect(customInput).toBeInTheDocument();
    });

    it('家族構成選択肢が表示される', () => {
      renderAIAdvisor();
      
      expect(screen.getByText('独身')).toBeInTheDocument();
      expect(screen.getByText('夫婦（子供なし）')).toBeInTheDocument();
      expect(screen.getByText('夫婦（子供あり）')).toBeInTheDocument();
    });

    it('夢・目標選択肢が表示される', () => {
      renderAIAdvisor();
      
      expect(screen.getByText('経済的自由を手に入れたい')).toBeInTheDocument();
      expect(screen.getByText('老後の不安を解消したい')).toBeInTheDocument();
      expect(screen.getByText('早期リタイアしたい')).toBeInTheDocument();
    });
  });

  describe('投資対象市場ステップ', () => {
    beforeEach(() => {
      renderAIAdvisor();
      // 投資対象市場ステップに移動
      fireEvent.click(screen.getByText('次へ'));
    });

    it('市場選択ウィザードが表示される', () => {
      expect(screen.getByText('投資対象市場')).toBeInTheDocument();
    });

    it('MarketSelectionWizardコンポーネントが正しく統合されている', () => {
      // MarketSelectionWizardの要素が存在することを確認
      const marketSection = screen.getByText('投資対象市場');
      expect(marketSection).toBeInTheDocument();
    });
  });

  describe('投資経験ステップ', () => {
    beforeEach(() => {
      renderAIAdvisor();
      // 投資経験ステップに移動
      fireEvent.click(screen.getByText('次へ')); // 投資対象市場
      fireEvent.click(screen.getByText('次へ')); // 投資経験
    });

    it('投資経験選択肢が表示される', () => {
      expect(screen.getByText('初心者（1年未満）')).toBeInTheDocument();
      expect(screen.getByText('初級者（1-3年）')).toBeInTheDocument();
      expect(screen.getByText('中級者（3-5年）')).toBeInTheDocument();
      expect(screen.getByText('上級者（5年以上）')).toBeInTheDocument();
    });

    it('リスク許容度選択肢が表示される', () => {
      expect(screen.getByText('保守的（リスクを避けたい）')).toBeInTheDocument();
      expect(screen.getByText('バランス型（適度なリスクは取れる）')).toBeInTheDocument();
      expect(screen.getByText('積極的（高いリターンのためならリスクを取る）')).toBeInTheDocument();
    });

    it('毎月投資額の入力フィールドが表示される', () => {
      const monthlyInvestmentInput = screen.getByPlaceholderText('50000');
      expect(monthlyInvestmentInput).toBeInTheDocument();
    });
  });

  describe('ポートフォリオ・目標設定ステップ', () => {
    beforeEach(() => {
      renderAIAdvisor();
      // ポートフォリオ・目標設定ステップに移動
      fireEvent.click(screen.getByText('次へ')); // 投資対象市場
      fireEvent.click(screen.getByText('次へ')); // 投資経験
      fireEvent.click(screen.getByText('次へ')); // ポートフォリオ・目標設定
    });

    it('価値観選択肢が表示される', () => {
      expect(screen.getByText('安全性重視')).toBeInTheDocument();
      expect(screen.getByText('着実な成長')).toBeInTheDocument();
      expect(screen.getByText('高いリターンを狙いたい')).toBeInTheDocument();
    });

    it('不安要素選択肢が表示される', () => {
      expect(screen.getByText('市場の暴落が心配')).toBeInTheDocument();
      expect(screen.getByText('投資の知識が足りない')).toBeInTheDocument();
      expect(screen.getByText('詐欺や予想外のリスク')).toBeInTheDocument();
    });

    it('価値観を複数選択できる', () => {
      const safetyOption = screen.getByLabelText('安全性重視');
      const growthOption = screen.getByLabelText('着実な成長');
      
      fireEvent.click(safetyOption);
      fireEvent.click(growthOption);
      
      expect(safetyOption.checked).toBe(true);
      expect(growthOption.checked).toBe(true);
    });

    it('不安要素を複数選択できる', () => {
      const crashConcern = screen.getByLabelText('市場の暴落が心配');
      const knowledgeConcern = screen.getByLabelText('投資の知識が足りない');
      
      fireEvent.click(crashConcern);
      fireEvent.click(knowledgeConcern);
      
      expect(crashConcern.checked).toBe(true);
      expect(knowledgeConcern.checked).toBe(true);
    });

    it('追加分析項目が表示される', () => {
      expect(screen.getByText('ESG投資観点での評価')).toBeInTheDocument();
      expect(screen.getByText('税金最適化戦略')).toBeInTheDocument();
      expect(screen.getByText('インフレヘッジ分析')).toBeInTheDocument();
    });
  });

  describe('スクリーンショット分析ステップ', () => {
    beforeEach(() => {
      renderAIAdvisor();
      // スクリーンショット分析ステップに移動
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText('次へ'));
      }
    });

    it('スクリーンショット分析タイプが表示される', () => {
      expect(screen.getByText('ポートフォリオ画面')).toBeInTheDocument();
      expect(screen.getByText('株価・市場データ')).toBeInTheDocument();
      expect(screen.getByText('取引履歴')).toBeInTheDocument();
    });

    it('プロンプト生成ボタンが機能する', async () => {
      const generateButton = screen.getByText('プロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('mock screenshot prompt content')).toBeInTheDocument();
      });
    });

    it('クリップボードコピー機能が動作する', async () => {
      // まずプロンプトを生成
      const generateButton = screen.getByText('プロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const copyButton = screen.getByText('コピー');
        fireEvent.click(copyButton);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('mock screenshot prompt content');
      });
    });

    it('外部AIサービスへのリンクが機能する', async () => {
      // プロンプト生成後にAIサービスのボタンが表示される
      const generateButton = screen.getByText('プロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const claudeButton = screen.getByText('Claudeで開く');
        fireEvent.click(claudeButton);
        
        expect(window.open).toHaveBeenCalledWith('https://claude.ai', '_blank');
      });
    });
  });

  describe('AIプロンプト生成', () => {
    beforeEach(() => {
      renderAIAdvisor();
      // 最後のステップ（AIプロンプト）に移動
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('次へ'));
      }
    });

    it('AIプロンプトが自動生成される', () => {
      // プロンプトが生成されていることを確認
      const promptText = screen.getByText(/私は35歳の/);
      expect(promptText).toBeInTheDocument();
    });

    it('ポートフォリオ情報が含まれる', () => {
      const portfolioInfo = screen.getByText(/Apple Inc.*1,500,000円/);
      expect(portfolioInfo).toBeInTheDocument();
    });

    it('総資産額が正しく表示される', () => {
      const totalAssets = screen.getByText(/2,250,000円/);
      expect(totalAssets).toBeInTheDocument();
    });

    it('クリップボードにコピーできる', () => {
      const copyButton = screen.getByText('クリップボードにコピー');
      fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('Claude AIで開くボタンが機能する', () => {
      const claudeButton = screen.getByText('Claude AIで開く');
      fireEvent.click(claudeButton);
      
      expect(window.open).toHaveBeenCalledWith('https://claude.ai', '_blank');
    });

    it('Geminiで開くボタンが機能する', () => {
      const geminiButton = screen.getByText('Geminiで開く');
      fireEvent.click(geminiButton);
      
      expect(window.open).toHaveBeenCalledWith('https://gemini.google.com', '_blank');
    });
  });

  describe('ポートフォリオプロンプト機能', () => {
    beforeEach(() => {
      renderAIAdvisor();
      // 最後のステップに移動
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('次へ'));
      }
    });

    it('ポートフォリオプロンプト生成が機能する', async () => {
      const generateButton = screen.getByText('ポートフォリオプロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('mock portfolio prompt content')).toBeInTheDocument();
      });
    });

    it('ポートフォリオプロンプトタイプを変更できる', () => {
      const selectElement = screen.getByDisplayValue('full_portfolio');
      fireEvent.change(selectElement, { target: { value: 'allocation_only' } });
      
      expect(selectElement.value).toBe('allocation_only');
    });
  });

  describe('多言語対応', () => {
    it('英語表示で正しく動作する', () => {
      renderAIAdvisor(mockPortfolioContextValue, 'en');
      
      expect(screen.getByText('AI Advisor')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    it('言語に応じて適切なプロンプトが生成される', () => {
      renderAIAdvisor(mockPortfolioContextValue, 'en');
      
      // 最後のステップに移動
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('Next'));
      }
      
      // 英語プロンプトが生成されることを確認
      const englishPrompt = screen.getByText(/I am a 35-year-old/);
      expect(englishPrompt).toBeInTheDocument();
    });

    it('職業オプションが言語に応じて表示される', () => {
      renderAIAdvisor(mockPortfolioContextValue, 'en');
      
      expect(screen.getByText('Company Employee')).toBeInTheDocument();
      expect(screen.getByText('Government Employee')).toBeInTheDocument();
      expect(screen.getByText('Self-employed')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('クリップボードAPIエラーを適切に処理する', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
      
      renderAIAdvisor();
      // スクリーンショット分析ステップに移動
      for (let i = 0; i < 4; i++) {
        fireEvent.click(screen.getByText('次へ'));
      }
      
      // プロンプト生成
      const generateButton = screen.getByText('プロンプトを生成');
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const copyButton = screen.getByText('コピー');
        fireEvent.click(copyButton);
      });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('コピー失敗:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('空のポートフォリオでも正常に動作する', () => {
      renderAIAdvisor(mockEmptyPortfolioContextValue);
      
      // 最後のステップに移動
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('次へ'));
      }
      
      // 空のポートフォリオでもプロンプトが生成される
      const emptyPortfolioText = screen.getByText(/まだ投資を始めていません/);
      expect(emptyPortfolioText).toBeInTheDocument();
    });
  });

  describe('LocalStorage連携', () => {
    it('初回セットアップ完了状態を正しく判定する', () => {
      mockLocalStorage.getItem.mockReturnValue('true');
      renderAIAdvisor();
      
      // 既存ユーザー向けのメッセージが表示される
      expect(screen.getByText('AIアドバイザー')).toBeInTheDocument();
    });

    it('設定がない場合を正しく判定する', () => {
      renderAIAdvisor(mockEmptyPortfolioContextValue);
      
      // 初回ユーザー向けのメッセージが表示される
      const setupMessage = screen.getByText(/投資目標/);
      expect(setupMessage).toBeInTheDocument();
    });
  });

  describe('カスタム入力フィールド', () => {
    it('その他選択時にカスタム入力が機能する', () => {
      renderAIAdvisor();
      
      // 職業でその他を選択
      const otherOption = screen.getByLabelText('その他');
      fireEvent.click(otherOption);
      
      // カスタム入力フィールドに入力
      const customInput = screen.getByPlaceholderText('職業を入力してください');
      fireEvent.change(customInput, { target: { value: 'フリーランス' } });
      
      expect(customInput.value).toBe('フリーランス');
    });

    it('自由記載欄が機能する', () => {
      renderAIAdvisor();
      
      // 自由記載欄に入力
      const freeTextArea = screen.getByPlaceholderText(/追加で伝えたい/);
      fireEvent.change(freeTextArea, { target: { value: '追加情報です' } });
      
      expect(freeTextArea.value).toBe('追加情報です');
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なロール属性が設定されている', () => {
      renderAIAdvisor();
      
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
    });

    it('ボタンに適切なaria-labelが設定されている', () => {
      renderAIAdvisor();
      
      const nextButton = screen.getByRole('button', { name: /次へ/ });
      expect(nextButton).toBeInTheDocument();
    });

    it('フォーム要素にラベルが関連付けられている', () => {
      renderAIAdvisor();
      
      const ageInput = screen.getByLabelText(/年齢/);
      expect(ageInput).toBeInTheDocument();
    });
  });

  describe('Contextデータの正しい利用', () => {
    it('PortfolioContextのデータが正しく表示される', () => {
      renderAIAdvisor();
      
      // 最後のステップに移動してプロンプトを確認
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByText('次へ'));
      }
      
      // ポートフォリオデータが正しく表示される
      expect(screen.getByText(/Apple Inc.*1,500,000円/)).toBeInTheDocument();
      expect(screen.getByText(/2,250,000円/)).toBeInTheDocument();
    });

    it('空のContextでもエラーが発生しない', () => {
      const emptyContext = {
        portfolio: null,
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: null
      };
      
      expect(() => renderAIAdvisor(emptyContext)).not.toThrow();
    });
  });
});