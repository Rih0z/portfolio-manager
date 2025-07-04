/**
 * スクリーンショット解析とプロンプト生成のテスト
 * 実際の証券会社画面からClaude用プロンプトを生成するテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortfolioPromptGenerator from '../../../components/simulation/PortfolioPromptGenerator';

// スクリーンショットから抽出された分析用データ
const SCREENSHOT_ANALYSIS_CONTEXT = {
  // IMG_4627.PNGから抽出された情報
  screenshot1: {
    account_info: {
      type: "Individual Cash",
      platform: "Charles Schwab",
      total_value: 39875.46,
      currency: "USD"
    },
    holdings: [
      { symbol: "EIDO", value: 2966.50, pnl: -62.55, pnl_pct: -2.07 },
      { symbol: "AAPL", value: 38.65, pnl: -5.43, pnl_pct: -12.33 },
      { symbol: "SBUX", value: 2.47, pnl: -0.57, pnl_pct: -18.65 },
      { symbol: "IEF", value: 1140.12, pnl: 0.00, pnl_pct: 0.00 },
      { symbol: "SPOT", value: 36.21, pnl: 5.20, pnl_pct: 16.77 },
      { symbol: "VNQ", value: 900.10, pnl: 8.07, pnl_pct: 0.90 },
      { symbol: "F", value: 52.43, pnl: 9.85, pnl_pct: 23.14 },
      { symbol: "LQD", value: 2624.64, pnl: 71.82, pnl_pct: 2.81 },
      { symbol: "VWO", value: 893.70, pnl: 74.04, pnl_pct: 9.03 }
    ],
    performance_summary: {
      total_gains: 159.97,
      total_losses: -68.55,
      net_performance: 91.42,
      winning_positions: 6,
      losing_positions: 3
    }
  },
  
  // IMG_4628.PNGから抽出された情報
  screenshot2: {
    holdings: [
      { symbol: "VXUS", value: 1800.50, pnl: 143.87, pnl_pct: 8.68 },
      { symbol: "IBIT", value: 1673.19, pnl: 240.14, pnl_pct: 16.76 },
      { symbol: "INDA", value: 2890.68, pnl: 254.30, pnl_pct: 9.65 },
      { symbol: "GLD", value: 3086.60, pnl: 472.22, pnl_pct: 18.06 },
      { symbol: "QQQ", value: 6059.24, pnl: 552.97, pnl_pct: 10.04 },
      { symbol: "VOO", value: 17112.30, pnl: 857.17, pnl_pct: 5.27 }
    ],
    performance_summary: {
      total_gains: 2520.67,
      all_positive: true,
      best_performer: { symbol: "VOO", gain: 857.17 },
      highest_return: { symbol: "GLD", return: 18.06 }
    }
  }
};

// 期待されるプロンプト内容のパターン
const EXPECTED_PROMPT_PATTERNS = {
  schwab_account_detection: /schwab|charles schwab|individual cash/i,
  portfolio_value_analysis: /39,?875\.46|約40,000|4万ドル/i,
  diversification_analysis: /diversif|分散|asset class|アセットクラス/i,
  performance_analysis: /performance|パフォーマンス|収益|損益/i,
  risk_assessment: /risk|リスク|volatility|ボラティリティ/i,
  rebalancing_advice: /rebalanc|リバランス|配分調整/i,
  specific_holdings: /VOO|QQQ|GLD|IBIT|VXUS|AAPL/i,
  market_exposure: /US|米国|international|国際|emerging|新興国/i,
  bond_allocation: /IEF|LQD|bond|債券/i,
  alternative_assets: /IBIT|GLD|bitcoin|ビットコイン|gold|ゴールド/i
};

describe('スクリーンショット解析プロンプト生成テスト', () => {
  const mockUserData = {
    age: 35,
    occupation: 'ソフトウェアエンジニア',
    familyStatus: '独身',
    primaryGoal: '資産成長を重視',
    targetMarkets: ['US', 'JP'],
    investmentExperience: '中級者',
    riskTolerance: 'バランス重視',
    monthlyBudget: 100000,
    values: ['ESG投資'],
    concerns: ['インフレリスク', '市場暴落'],
    portfolio: SCREENSHOT_ANALYSIS_CONTEXT.screenshot1,
    currentAssetsDescription: 'Schwab口座での分散投資',
    idealPortfolio: '米国株中心、国際分散、一部代替資産'
  };

  const defaultProps = {
    userContext: mockUserData,
    onPromptGenerated: jest.fn(),
    className: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('スクリーンショット1ベースのプロンプト生成', () => {
    it('Schwab口座の基本情報を正確に認識する', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          {...defaultProps} 
          onPromptGenerated={onPromptGenerated}
        />
      );

      // プロンプト生成を実行
      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // Schwab口座の検出
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.schwab_account_detection);
      
      // ポートフォリオ価値の正確な認識
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.portfolio_value_analysis);
      
      // 個別銘柄の言及
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.specific_holdings);
    });

    it('マイナス運用成績銘柄の分析を含む', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          {...defaultProps} 
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // マイナス運用銘柄の分析
      expect(generatedPrompt).toMatch(/EIDO.*-2\.07%|AAPL.*-12\.33%|SBUX.*-18\.65%/i);
      
      // パフォーマンス分析の言及
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.performance_analysis);
      
      // リスク評価の言及
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.risk_assessment);
    });

    it('セクター分散の分析を含む', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          {...defaultProps} 
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // 分散投資の分析
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.diversification_analysis);
      
      // 市場エクスポージャーの言及
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.market_exposure);
      
      // 債券配分の言及
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.bond_allocation);
    });
  });

  describe('スクリーンショット2ベースのプロンプト生成', () => {
    it('大型ETF中心ポートフォリオを正確に分析する', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const portfolioWithScreenshot2 = {
        ...mockUserData,
        portfolio: SCREENSHOT_ANALYSIS_CONTEXT.screenshot2,
        currentAssetsDescription: 'VOO・QQQ中心の大型ETFポートフォリオ'
      };
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          userContext={portfolioWithScreenshot2}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // 大型ETFの言及
      expect(generatedPrompt).toMatch(/VOO.*S&P 500|QQQ.*NASDAQ/i);
      
      // 全ポジションプラスの分析
      expect(generatedPrompt).toMatch(/全て利益|all positive|全ポジション黒字/i);
      
      // パフォーマンス分析
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.performance_analysis);
    });

    it('代替資産投資の分析を含む', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const portfolioWithAlternatives = {
        ...mockUserData,
        portfolio: SCREENSHOT_ANALYSIS_CONTEXT.screenshot2,
        idealPortfolio: 'ETF中心＋ビットコイン・ゴールドでインフレヘッジ'
      };
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          userContext={portfolioWithAlternatives}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // 代替資産の言及
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.alternative_assets);
      
      // インフレヘッジの分析
      expect(generatedPrompt).toMatch(/inflation|インフレ|hedge|ヘッジ/i);
      
      // ビットコインETFの言及
      expect(generatedPrompt).toMatch(/IBIT.*bitcoin|ビットコイン.*ETF/i);
    });

    it('リバランシング推奨を含む', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          {...defaultProps}
          userContext={{
            ...mockUserData,
            portfolio: SCREENSHOT_ANALYSIS_CONTEXT.screenshot2,
            concerns: ['過度の米国株集中', 'リバランシング必要']
          }}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // リバランシング分析
      expect(generatedPrompt).toMatch(EXPECTED_PROMPT_PATTERNS.rebalancing_advice);
      
      // 地域分散の分析
      expect(generatedPrompt).toMatch(/geographic|地域.*分散|米国.*集中/i);
      
      // 国際分散の推奨
      expect(generatedPrompt).toMatch(/VXUS.*international|国際.*分散.*VXUS/i);
    });
  });

  describe('複合スクリーンショット分析', () => {
    it('両方のスクリーンショットデータを統合分析する', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const combinedPortfolio = {
        ...mockUserData,
        portfolio: {
          ...SCREENSHOT_ANALYSIS_CONTEXT.screenshot1,
          extended_holdings: SCREENSHOT_ANALYSIS_CONTEXT.screenshot2.holdings,
          total_value: 79750.92,
          combined_analysis: true
        },
        currentAssetsDescription: 'Schwab口座での包括的分散投資ポートフォリオ'
      };
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          userContext={combinedPortfolio}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // 包括的ポートフォリオ分析
      expect(generatedPrompt).toMatch(/comprehensive|包括的|total.*15.*holdings|15銘柄/i);
      
      // 全セクターの言及
      expect(generatedPrompt).toMatch(/US stocks.*international.*emerging.*bonds.*alternative/i);
      
      // 総合的なパフォーマンス分析
      expect(generatedPrompt).toMatch(/overall.*performance|総合.*パフォーマンス/i);
    });

    it('投資目標とポートフォリオの整合性を分析する', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const goalAlignedPortfolio = {
        ...mockUserData,
        primaryGoal: '長期的な資産成長とインフレ保護',
        values: ['ESG投資', '持続可能な投資'],
        idealPortfolio: 'ESG重視のグローバル分散投資',
        portfolio: {
          ...SCREENSHOT_ANALYSIS_CONTEXT.screenshot2,
          esg_analysis: {
            esg_holdings: ['VXUS', 'VOO'],
            non_esg_holdings: ['IBIT', 'GLD'],
            esg_percentage: 65
          }
        }
      };
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          userContext={goalAlignedPortfolio}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // ESG投資の分析
      expect(generatedPrompt).toMatch(/ESG|sustainable|持続可能|環境.*社会.*ガバナンス/i);
      
      // 目標整合性の分析
      expect(generatedPrompt).toMatch(/align.*goal|目標.*整合|investment.*objective/i);
      
      // 長期投資戦略の言及
      expect(generatedPrompt).toMatch(/long.term|長期.*投資|asset.*growth/i);
    });
  });

  describe('プロンプト品質とフォーマット', () => {
    it('適切なYAML出力指示を含む', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          {...defaultProps} 
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // YAML出力指示
      expect(generatedPrompt).toMatch(/YAML.*format|YAML.*形式/i);
      
      // 構造化された指示
      expect(generatedPrompt).toMatch(/portfolio_data:|user_profile:|app_config:/i);
      
      // 具体的な分析要求
      expect(generatedPrompt).toMatch(/analyz|分析|evaluat|評価|recommend|推奨/i);
    });

    it('ユーザー固有のコンテキストを反映する', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const specificUserContext = {
        ...mockUserData,
        age: 28,
        occupation: 'スタートアップCTO',
        familyStatus: '既婚・子供なし',
        riskTolerance: '成長重視',
        concerns: ['早期リタイア', 'テック株集中リスク'],
        monthlyBudget: 200000
      };
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          userContext={specificUserContext}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // 年齢とキャリアステージ
      expect(generatedPrompt).toMatch(/28.*year|CTO|startup|スタートアップ/i);
      
      // 早期リタイア目標
      expect(generatedPrompt).toMatch(/early.*retirement|早期.*リタイア|FIRE/i);
      
      // テック株リスク
      expect(generatedPrompt).toMatch(/tech.*concentration|テック.*集中.*リスク/i);
      
      // 投資予算
      expect(generatedPrompt).toMatch(/200,?000|20万|monthly.*budget/i);
    });

    it('日本語ユーザー向けの適切なフォーマット', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const japaneseUserContext = {
        ...mockUserData,
        language: 'ja',
        targetMarkets: ['JP', 'US'],
        concerns: ['円安リスク', '日本株比率'],
        idealPortfolio: '日本株30% + 米国株50% + 債券20%'
      };
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          userContext={japaneseUserContext}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // 日本固有の投資課題
      expect(generatedPrompt).toMatch(/円安|為替|JPY.*USD|日本株/i);
      
      // 適切な日本語表現
      expect(generatedPrompt).toMatch(/分析してください|推奨事項|投資戦略/i);
      
      // 日本市場の考慮
      expect(generatedPrompt).toMatch(/日本.*市場|TOPIX|日経/i);
    });
  });

  describe('エラーハンドリング', () => {
    it('不完全なポートフォリオデータでも動作する', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const incompletePortfolio = {
        ...mockUserData,
        portfolio: {
          // 最小限のデータ
          account_info: { type: "Individual" },
          holdings: [
            { symbol: "AAPL", value: 1000 }
          ]
        }
      };
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          userContext={incompletePortfolio}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // 最小限のデータでもプロンプト生成
      expect(generatedPrompt).toMatch(/AAPL|limited.*data|データ.*不足/i);
      
      // 分析の制限事項
      expect(generatedPrompt).toMatch(/limited.*analysis|分析.*制限|incomplete.*information/i);
    });

    it('ポートフォリオデータなしでも基本プロンプトを生成', async () => {
      const user = userEvent.setup();
      let generatedPrompt = '';
      
      const noPortfolioContext = {
        ...mockUserData,
        portfolio: null,
        currentAssetsDescription: '投資初心者、ポートフォリオなし'
      };
      
      const onPromptGenerated = (prompt) => {
        generatedPrompt = prompt.content;
      };

      render(
        <PortfolioPromptGenerator 
          userContext={noPortfolioContext}
          onPromptGenerated={onPromptGenerated}
        />
      );

      const generateButton = screen.getByText(/プロンプト生成|Generate Prompt/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(generatedPrompt).toBeTruthy();
      });

      // 初心者向けプロンプト
      expect(generatedPrompt).toMatch(/beginner|初心者|first.*portfolio|初回.*投資/i);
      
      // 基本的な投資アドバイス要求
      expect(generatedPrompt).toMatch(/basic.*recommendation|基本.*推奨|getting.*started/i);
    });
  });
});