/**
 * PromptOrchestrationService 包括的ユニットテスト
 *
 * 既存の .js テストで未カバーの分岐・メソッドを集中的にテストする。
 * - loadPromptHistory / loadAIPreferences のパース成功・失敗
 * - getBasePrompt の全テンプレートタイプ + フォールバック
 * - customizePrompt の感情調整パス (needsSupport / low confidence)
 * - generatePerspectivePrompt (日本語 / 英語、全 3 観点)
 * - generateDataImportPrompt の英語パス + 追加指示 + 未知タイプ
 * - learnFromResponse の存在しない ID パス
 * - importUserProfile の localStorage 保存確認
 * - addSupportiveElements / addConfidenceBuildingElements 直接テスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnrichedPortfolioData } from '@/utils/portfolioDataEnricher';

// INVESTMENT_MARKETS をモック（実モジュールはReactコンポーネント含むため）
vi.mock('@/components/settings/MarketSelectionWizard', () => ({
  INVESTMENT_MARKETS: {
    US: { id: 'US', name: '米国市場', nameEn: 'US Market' },
    JAPAN: { id: 'JAPAN', name: '日本市場', nameEn: 'Japan Market' },
    GLOBAL: { id: 'GLOBAL', name: '全世界', nameEn: 'Global Markets' },
    REIT: { id: 'REIT', name: 'REIT', nameEn: 'REIT' },
    CRYPTO: { id: 'CRYPTO', name: '仮想通貨', nameEn: 'Cryptocurrency' },
    BONDS: { id: 'BONDS', name: '債券', nameEn: 'Bonds' },
  },
}));

// ---------- ヘルパー ----------

/** EnrichedPortfolioData の最小フィクスチャ */
function createMockEnrichedData(overrides: Partial<EnrichedPortfolioData> = {}): EnrichedPortfolioData {
  return {
    score: {
      totalScore: 72,
      grade: 'B',
      strongest: { id: 'diversification', label: '分散度', score: 85 },
      weakest: { id: 'cost_efficiency', label: 'コスト効率', score: 40 },
      metrics: [
        { id: 'diversification', label: '分散度', score: 85, grade: 'A' },
        { id: 'currency_diversification', label: '通貨分散', score: 60, grade: 'C' },
        { id: 'cost_efficiency', label: 'コスト効率', score: 40, grade: 'D' },
        { id: 'dividend_health', label: '配当効率', score: 55, grade: 'C' },
        { id: 'target_alignment', label: '目標適合度', score: 70, grade: 'B' },
        { id: 'rebalance_health', label: 'リバランス健全度', score: 65, grade: 'B' },
      ],
    },
    pnl: {
      available: true,
      totalInvestment: 1000000,
      totalCurrentValue: 1200000,
      totalPnL: 200000,
      totalPnLPercent: 20.0,
      topGainers: [{ ticker: 'AAPL', name: 'Apple', pnlPercent: 35.2 }],
      topLosers: [{ ticker: 'TSLA', name: 'Tesla', pnlPercent: -12.5 }],
    },
    holdings: {
      count: 5,
      totalValue: 1200000,
      baseCurrency: 'JPY',
      topHoldings: [
        { ticker: 'AAPL', name: 'Apple', percentage: 30.0 },
        { ticker: 'VTI', name: 'Vanguard Total', percentage: 25.0 },
        { ticker: '7203.T', name: 'トヨタ', percentage: 20.0 },
      ],
      currencyBreakdown: { USD: 55, JPY: 45 },
      assetTypeBreakdown: { stock: 60, etf: 40 },
    },
    targets: {
      hasTargets: true,
      deviations: [
        { ticker: 'AAPL', currentPct: 30, targetPct: 25, deviation: 5 },
        { ticker: 'VTI', currentPct: 25, targetPct: 30, deviation: 5 },
      ],
      avgDeviation: 5.0,
    },
    strengthLine: '分散度が高い',
    weaknessLine: 'コスト効率に改善余地',
    ...overrides,
  };
}

// ---------- テスト ----------

describe('PromptOrchestrationService（包括テスト）', () => {
  // 各テストで新しいインスタンスを取得するため、動的インポートを使う
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // localStorage をリセット
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (localStorage.setItem as ReturnType<typeof vi.fn>).mockClear();
    (localStorage.removeItem as ReturnType<typeof vi.fn>).mockClear();

    // モジュールキャッシュをクリアして新しいインスタンスを得る
    vi.resetModules();
    const mod = await import('@/services/PromptOrchestrationService');
    service = mod.default;
    service.reset();
  });

  // ─── loadPromptHistory ────────────────────────────────

  describe('loadPromptHistory', () => {
    it('保存済みデータがある場合、パースして返す', () => {
      const stored = [{ id: '1', prompt: {}, result: null as any, timestamp: '2025-01-01', userContext: {} }];
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(stored));

      const history = service.loadPromptHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('1');
    });

    it('不正な JSON の場合、空配列を返し localStorage をクリアする', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('{{invalid json');

      const history = service.loadPromptHistory();
      expect(history).toEqual([]);
      expect(localStorage.removeItem).toHaveBeenCalledWith('promptHistory');
    });
  });

  // ─── loadAIPreferences ───────────────────────────────

  describe('loadAIPreferences', () => {
    it('保存済みデータがある場合、パースして返す', () => {
      const prefs = { preferredAI: 'gemini', communicationStyle: 'directive', detailLevel: 'brief', languagePreference: 'en' };
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(prefs));

      const result = service.loadAIPreferences();
      expect(result.preferredAI).toBe('gemini');
      expect(result.languagePreference).toBe('en');
    });

    it('不正な JSON の場合、デフォルトを返し localStorage をクリアする', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('not-json');

      const result = service.loadAIPreferences();
      expect(result.preferredAI).toBe('claude');
      expect(localStorage.removeItem).toHaveBeenCalledWith('aiPreferences');
    });
  });

  // ─── loadUserContext エラーパス ────────────────────────

  describe('loadUserContext', () => {
    it('不正な JSON の場合、デフォルトを返し localStorage をクリアする', () => {
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('{bad');

      const ctx = service.loadUserContext();
      expect(ctx.age).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('userContext');
    });
  });

  // ─── getBasePrompt ────────────────────────────────────

  describe('getBasePrompt', () => {
    it.each([
      ['portfolio_analysis', 'ポートフォリオ分析とアドバイス'],
      ['data_import_screenshot', 'スクリーンショット分析によるデータ取り込み'],
      ['market_analysis', '市場分析とタイミング判断'],
      ['goal_setting', '目標設定と戦略立案'],
      ['emotional_support', '投資不安の解消とメンタルサポート'],
    ])('テンプレート "%s" を正しく返す', (type, expectedTitle) => {
      const template = service.getBasePrompt(type);
      expect(template.title).toBe(expectedTitle);
      expect(template.structure).toBeDefined();
      expect(Array.isArray(template.structure)).toBe(true);
    });

    it('未知のタイプの場合、portfolio_analysis にフォールバックする', () => {
      const template = service.getBasePrompt('unknown_type');
      expect(template.title).toBe('ポートフォリオ分析とアドバイス');
    });
  });

  // ─── analyzeEmotionalContext 追加パス ─────────────────

  describe('analyzeEmotionalContext（追加パス）', () => {
    it('高モチベーション（>7）で urgency と optimism が上がる', () => {
      service.updateUserContext({ motivationLevel: 9, anxietyLevel: 3 });
      const e = service.analyzeEmotionalContext();
      expect(e.urgency).toBeGreaterThanOrEqual(7);
      expect(e.optimism).toBeGreaterThanOrEqual(6);
      expect(e.needsSupport).toBe(false);
    });

    it('不安レベルが低い場合 needsSupport は false', () => {
      service.updateUserContext({ anxietyLevel: 4, motivationLevel: 5 });
      const e = service.analyzeEmotionalContext();
      expect(e.needsSupport).toBe(false);
    });

    it('過去の成功がない場合 confidence はデフォルト', () => {
      service.updateUserContext({ anxietyLevel: 5, motivationLevel: 5, previousResults: [] });
      const e = service.analyzeEmotionalContext();
      expect(e.confidence).toBe(5);
    });

    it('古い成功結果（30日以上前）は confidence に影響しない', () => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      service.updateUserContext({
        anxietyLevel: 5,
        motivationLevel: 5,
        previousResults: [{ outcome: 'positive', date: oldDate }],
      });
      const e = service.analyzeEmotionalContext();
      expect(e.confidence).toBe(5);
    });
  });

  // ─── customizePrompt 感情パス ─────────────────────────

  describe('customizePrompt（感情調整）', () => {
    it('needsSupport=true の場合、サポート要素が先頭に追加される（日本語）', () => {
      service.aiPreferences.languagePreference = 'ja';
      service.updateUserContext({
        age: 30, occupation: 'テスト', primaryGoal: '目標',
        anxietyLevel: 9, motivationLevel: 3,
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.content).toContain('不安を感じている');
    });

    it('confidence < 4 の場合、初心者向け要素が追加される（日本語）', () => {
      service.aiPreferences.languagePreference = 'ja';
      service.updateUserContext({
        age: 25, occupation: '学生', primaryGoal: '貯蓄',
        anxietyLevel: 9, motivationLevel: 2,
        previousResults: [],
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      // anxietyLevel > 7 → needsSupport=true, confidence=3 (<4)
      expect(prompt.content).toContain('投資初心者');
    });

    it('英語でサポート要素が追加される', () => {
      service.aiPreferences.languagePreference = 'en';
      service.updateUserContext({
        age: 28, occupation: 'Student', primaryGoal: 'Save',
        anxietyLevel: 9, motivationLevel: 2,
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.content).toContain('anxious about investing');
      expect(prompt.content).toContain('new to investing');
    });
  });

  // ─── generateJapanesePrompt / generateEnglishPrompt ───

  describe('プロンプト生成（日本語 / 英語）', () => {
    it('familyStatus が空の場合、家族構成行が省略される（日本語）', () => {
      service.aiPreferences.languagePreference = 'ja';
      service.updateUserContext({
        age: 40, occupation: 'Manager', primaryGoal: '資産形成',
        familyStatus: '', targetMarkets: [], monthlyBudget: 0,
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.content).not.toContain('家族構成は');
    });

    it('familyStatus が設定されている場合、家族構成行が含まれる（日本語）', () => {
      service.aiPreferences.languagePreference = 'ja';
      service.updateUserContext({
        age: 35, occupation: 'Engineer', primaryGoal: '住宅購入',
        familyStatus: '妻と子供2人',
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.content).toContain('家族構成は妻と子供2人で');
    });

    it('targetMarkets が空の場合、市場セクションが省略される', () => {
      service.aiPreferences.languagePreference = 'ja';
      service.updateUserContext({
        age: 30, occupation: 'Dev', primaryGoal: 'test',
        targetMarkets: [], monthlyBudget: 0,
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.content).not.toContain('投資対象への関心');
    });

    it('monthlyBudget が 0 の場合、予算セクションが省略される', () => {
      service.aiPreferences.languagePreference = 'ja';
      service.updateUserContext({
        age: 30, occupation: 'Dev', primaryGoal: 'test',
        monthlyBudget: 0,
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.content).not.toContain('投資予算');
    });

    it('英語プロンプトで familyStatus が含まれる', () => {
      service.aiPreferences.languagePreference = 'en';
      service.updateUserContext({
        age: 30, occupation: 'Dev', primaryGoal: 'Retire early',
        familyStatus: 'Married',
        targetMarkets: ['US'],
        monthlyBudget: 50000,
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.content).toContain('My family status is Married');
      expect(prompt.content).toContain('US Market');
      expect(prompt.content).toContain('¥50,000');
    });

    it('英語プロンプトで familyStatus が空の場合省略される', () => {
      service.aiPreferences.languagePreference = 'en';
      service.updateUserContext({
        age: 30, occupation: 'Dev', primaryGoal: 'test',
        familyStatus: '',
      });
      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.content).not.toContain('My family status');
    });
  });

  // ─── generateDataImportPrompt 追加パス ────────────────

  describe('generateDataImportPrompt（追加パス）', () => {
    it('英語で screenshot_portfolio プロンプトを生成する', () => {
      service.aiPreferences.languagePreference = 'en';
      const prompt = service.generateDataImportPrompt('screenshot_portfolio');
      expect(prompt.language).toBe('en');
      expect(prompt.content).toContain('investment portfolio');
    });

    it('transaction_history タイプのプロンプトを生成する（日本語）', () => {
      service.aiPreferences.languagePreference = 'ja';
      const prompt = service.generateDataImportPrompt('transaction_history');
      expect(prompt.type).toBe('transaction_history');
      expect(prompt.content).toContain('取引履歴');
    });

    it('transaction_history タイプのプロンプトを生成する（英語）', () => {
      service.aiPreferences.languagePreference = 'en';
      const prompt = service.generateDataImportPrompt('transaction_history');
      expect(prompt.content).toContain('transaction history');
    });

    it('未知のタイプは screenshot_portfolio にフォールバックする', () => {
      service.aiPreferences.languagePreference = 'ja';
      const prompt = service.generateDataImportPrompt('unknown_type');
      expect(prompt.content).toContain('ポートフォリオ');
    });

    it('英語で追加指示が追加される', () => {
      service.aiPreferences.languagePreference = 'en';
      const prompt = service.generateDataImportPrompt('screenshot_portfolio', 'Please focus on ETFs');
      expect(prompt.content).toContain('Additional Instructions');
      expect(prompt.content).toContain('Please focus on ETFs');
    });

    it('market_data_screenshot タイプを英語で生成する', () => {
      service.aiPreferences.languagePreference = 'en';
      const prompt = service.generateDataImportPrompt('market_data_screenshot');
      expect(prompt.content).toContain('stock prices');
    });
  });

  // ─── generatePerspectivePrompt ────────────────────────

  describe('generatePerspectivePrompt', () => {
    const userCtx = { age: 35, occupation: 'Engineer', familyStatus: '既婚' };

    describe('日本語', () => {
      beforeEach(() => {
        service.aiPreferences.languagePreference = 'ja';
      });

      it('リスク分析プロンプトを生成する', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.title).toBe('リスク分析');
        expect(result.content).toContain('リスク分析の依頼');
        expect(result.content).toContain('分散度スコア');
        expect(result.content).toContain('通貨分散スコア');
        expect(result.content).toContain('通貨配分');
        expect(result.content).toContain('ドローダウンリスク');
        expect(result.metadata.promptType).toEqual(['risk_analysis']);
      });

      it('コスト最適化プロンプトを生成する', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('cost_optimization', data, userCtx);

        expect(result.title).toBe('コスト最適化');
        expect(result.content).toContain('コスト最適化の依頼');
        expect(result.content).toContain('コスト効率スコア');
        expect(result.content).toContain('配当効率スコア');
        expect(result.content).toContain('信託報酬');
      });

      it('成長戦略プロンプトを生成する', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('growth_strategy', data, userCtx);

        expect(result.title).toBe('成長戦略');
        expect(result.content).toContain('成長戦略の依頼');
        expect(result.content).toContain('目標適合度スコア');
        expect(result.content).toContain('リバランス健全度');
        expect(result.content).toContain('目標配分平均乖離');
        expect(result.content).toContain('乖離状況');
      });

      it('ポートフォリオコンテキストにユーザー情報が含まれる', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.content).toContain('年齢: 35歳');
        expect(result.content).toContain('職業: Engineer');
        expect(result.content).toContain('家族構成: 既婚');
      });

      it('P&L が利用不可の場合、P&L セクションが省略される', () => {
        const data = createMockEnrichedData({ pnl: { available: false, totalInvestment: 0, totalCurrentValue: 0, totalPnL: 0, totalPnLPercent: 0, topGainers: [], topLosers: [] } });
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.content).not.toContain('参考損益');
      });

      it('topHoldings が空の場合、上位保有セクションが省略される', () => {
        const data = createMockEnrichedData();
        data.holdings.topHoldings = [];
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.content).not.toContain('上位保有:');
      });

      it('targets.hasTargets が false の場合、乖離セクションが省略される', () => {
        const data = createMockEnrichedData();
        data.targets.hasTargets = false;
        const result = service.generatePerspectivePrompt('growth_strategy', data, userCtx);

        expect(result.content).not.toContain('目標配分平均乖離');
      });

      it('USD ベースの場合、ドル記号でフォーマットされる', () => {
        const data = createMockEnrichedData();
        data.holdings.baseCurrency = 'USD';
        data.holdings.totalValue = 10000;
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.content).toContain('$');
      });
    });

    describe('英語', () => {
      beforeEach(() => {
        service.aiPreferences.languagePreference = 'en';
      });

      it('リスク分析プロンプトを英語で生成する', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.title).toBe('Risk Analysis');
        expect(result.content).toContain('Risk Analysis Request');
        expect(result.content).toContain('Diversification Score');
        expect(result.content).toContain('Drawdown Risk');
      });

      it('コスト最適化プロンプトを英語で生成する', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('cost_optimization', data, userCtx);

        expect(result.title).toBe('Cost Optimization');
        expect(result.content).toContain('Cost Optimization Request');
        expect(result.content).toContain('Cost Efficiency Score');
      });

      it('成長戦略プロンプトを英語で生成する', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('growth_strategy', data, userCtx);

        expect(result.title).toBe('Growth Strategy');
        expect(result.content).toContain('Growth Strategy Request');
        expect(result.content).toContain('Target Alignment Score');
      });

      it('英語ポートフォリオコンテキストにユーザー情報が含まれる', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.content).toContain('Age: 35');
        expect(result.content).toContain('Occupation: Engineer');
        expect(result.content).toContain('Portfolio Overview');
        expect(result.content).toContain('Portfolio Score');
      });

      it('P&L が利用可能な場合、Reference P&L セクションが表示される', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.content).toContain('Reference P&L');
        expect(result.content).toContain('+20.0%');
      });

      it('P&L が利用不可の場合、Reference P&L が省略される', () => {
        const data = createMockEnrichedData({
          pnl: { available: false, totalInvestment: 0, totalCurrentValue: 0, totalPnL: 0, totalPnLPercent: 0, topGainers: [], topLosers: [] },
        });
        const result = service.generatePerspectivePrompt('risk_analysis', data, userCtx);

        expect(result.content).not.toContain('Reference P&L');
      });

      it('targets.hasTargets=true の場合、英語成長戦略にAvg Target Deviationが含まれる', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('growth_strategy', data, userCtx);

        expect(result.content).toContain('Avg Target Deviation: 5.0%');
      });

      it('ユーザーコンテキストが部分的（age のみ）の場合もエラーにならない', () => {
        const data = createMockEnrichedData();
        const result = service.generatePerspectivePrompt('risk_analysis', data, { age: 50 });

        expect(result.content).toContain('Age: 50');
        expect(result.content).not.toContain('Occupation');
      });
    });
  });

  // ─── learnFromResponse 追加パス ───────────────────────

  describe('learnFromResponse（追加パス）', () => {
    it('存在しない promptId の場合、何も起こらない', () => {
      // エラーを投げないことを確認
      expect(() => {
        service.learnFromResponse('nonexistent-id', { aiProvider: 'claude' }, { rating: 5 });
      }).not.toThrow();
    });

    it('rating が 4 の場合、成功パターンが追加される（境界値）', () => {
      const promptId = service.recordPrompt({ title: 'Test', metadata: { promptType: ['test'] } });
      service.learnFromResponse(
        promptId,
        { aiProvider: 'gemini' },
        { rating: 4, successFactors: ['accurate'] },
      );
      expect(service.userContext.successPatterns).toHaveLength(1);
      expect(service.userContext.successPatterns[0].aiUsed).toBe('gemini');
    });

    it('rating が 3 の場合、成功パターンは追加されない', () => {
      const promptId = service.recordPrompt({ title: 'Test' });
      service.learnFromResponse(promptId, { aiProvider: 'chatgpt' }, { rating: 3 });
      expect(service.userContext.successPatterns).toHaveLength(0);
    });
  });

  // ─── importUserProfile localStorage 保存 ──────────────

  describe('importUserProfile（localStorage保存確認）', () => {
    it('バージョン 1.0 のプロフィールインポート時に aiPreferences が localStorage に保存される', () => {
      const profile = {
        version: '1.0' as const,
        userContext: { age: 45 },
        aiPreferences: { preferredAI: 'chatgpt' as const },
        successPatterns: [] as any[],
        timestamp: new Date().toISOString(),
      };

      const result = service.importUserProfile(profile);
      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'aiPreferences',
        expect.stringContaining('chatgpt'),
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'userContext',
        expect.any(String),
      );
    });
  });

  // ─── addSupportiveElements / addConfidenceBuildingElements ─

  describe('addSupportiveElements', () => {
    it('日本語でサポートプレフィックスを追加する', () => {
      const result = service.addSupportiveElements('元のプロンプト', true);
      expect(result).toContain('不安を感じている');
      expect(result).toContain('元のプロンプト');
    });

    it('英語でサポートプレフィックスを追加する', () => {
      const result = service.addSupportiveElements('Original prompt', false);
      expect(result).toContain('anxious about investing');
      expect(result).toContain('Original prompt');
    });
  });

  describe('addConfidenceBuildingElements', () => {
    it('日本語で初心者向けプレフィックスを追加する', () => {
      const result = service.addConfidenceBuildingElements('元のプロンプト', true);
      expect(result).toContain('投資初心者');
      expect(result).toContain('元のプロンプト');
    });

    it('英語で初心者向けプレフィックスを追加する', () => {
      const result = service.addConfidenceBuildingElements('Original prompt', false);
      expect(result).toContain('new to investing');
      expect(result).toContain('Original prompt');
    });
  });

  // ─── exportUserProfile タイムスタンプ ──────────────────

  describe('exportUserProfile（詳細）', () => {
    it('successPatterns が userContext のものと一致する', () => {
      service.userContext.successPatterns = [
        { promptType: 'test', emotionalContext: { confidence: 5, urgency: 5, optimism: 5, needsSupport: false }, aiUsed: 'claude', successFactors: [] },
      ];
      const profile = service.exportUserProfile();
      expect(profile.successPatterns).toHaveLength(1);
      expect(profile.successPatterns[0].aiUsed).toBe('claude');
    });
  });

  // ─── saveUserContext ──────────────────────────────────

  describe('saveUserContext', () => {
    it('userContext を localStorage に保存する', () => {
      service.userContext.age = 99;
      service.saveUserContext();
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'userContext',
        expect.stringContaining('"age":99'),
      );
    });
  });

  // ─── metadata 検証 ───────────────────────────────────

  describe('generatePersonalizedPrompt metadata', () => {
    it('metadata に正しい aiPreference が含まれる', () => {
      service.aiPreferences.preferredAI = 'gemini';
      service.updateUserContext({ age: 30, occupation: 'Test', primaryGoal: 'Test' });

      const prompt = service.generatePersonalizedPrompt('portfolio_analysis');
      expect(prompt.metadata.aiPreference).toBe('gemini');
      expect(prompt.metadata.generatedAt).toBeTruthy();
    });
  });

  // ─── P&L マイナスパーセント表示 ───────────────────────

  describe('P&L 負のパーセント表示', () => {
    it('マイナスの P&L が正しくフォーマットされる（日本語）', () => {
      service.aiPreferences.languagePreference = 'ja';
      const data = createMockEnrichedData();
      data.pnl.totalPnLPercent = -5.3;
      const result = service.generatePerspectivePrompt('risk_analysis', data, { age: 30 });
      expect(result.content).toContain('-5.3%');
      expect(result.content).not.toContain('+-5.3%');
    });
  });
});
