/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/services/PromptOrchestrationService.ts
 *
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 *
 * 説明:
 * プロンプトオーケストレーションサービス
 * ユーザーの状況・感情・目標に完全適合したプロンプトを動的生成し、
 * 複数AIサービス間での効率的な情報連携をサポートする
 */

import { INVESTMENT_MARKETS } from '../components/settings/MarketSelectionWizard';
import type { EnrichedPortfolioData } from '../utils/portfolioDataEnricher';

export type AnalysisPerspective = 'risk_analysis' | 'cost_optimization' | 'growth_strategy';

interface UserContext {
  // 基本情報
  age: number | null;
  occupation: string;
  familyStatus: string;

  // 目標と感情
  primaryGoal: string;
  emotionalState: string;
  motivationLevel: number; // 1-10
  anxietyLevel: number; // 1-10

  // 投資プロファイル
  investmentExperience: string;
  riskTolerance: string;
  targetMarkets: string[];
  monthlyBudget: number;

  // 学習履歴
  previousResults: PreviousResult[];
  successPatterns: SuccessPattern[];
  preferredPromptStyle: 'detailed' | 'concise' | 'encouraging' | 'analytical';

  // 時間的文脈
  lastUpdate: string | null;
  sessionCount: number;
  totalInteractions: number;

  // ユーザー価値観・関心
  values?: string[];
  concerns?: string[];

  // セッション情報
  currentSession?: {
    type: string;
    startTime: string;
    prompts: any[];
  };
  emotional?: EmotionalProfile;
}

interface PreviousResult {
  outcome: string;
  date: string;
  [key: string]: any;
}

interface SuccessPattern {
  promptType: any;
  emotionalContext: EmotionalProfile;
  aiUsed: string;
  successFactors: string[];
}

interface EmotionalProfile {
  confidence: number;
  urgency: number;
  optimism: number;
  needsSupport: boolean;
}

interface AIPreferences {
  preferredAI: 'claude' | 'gemini' | 'chatgpt';
  communicationStyle: 'collaborative' | 'directive' | 'supportive';
  detailLevel: 'brief' | 'comprehensive' | 'exhaustive';
  languagePreference: 'ja' | 'en';
}

interface PromptTemplate {
  title: string;
  structure: string[];
}

interface GeneratedPrompt {
  id?: string;
  title: string;
  content: string;
  metadata: {
    promptType: string[];
    userContext: any;
    generatedAt: string;
    aiPreference: string;
  };
}

interface DataImportPrompt {
  title: string;
  content: string;
  type: string;
  language: string;
}

interface PromptRecord {
  id: string;
  prompt: any;
  result: any;
  timestamp: string;
  userContext: UserContext;
  aiResponse?: any;
  userFeedback?: UserFeedback;
}

interface UserFeedback {
  rating: number;
  successFactors?: string[];
  [key: string]: any;
}

interface UserProfile {
  userContext: UserContext;
  aiPreferences: AIPreferences;
  successPatterns: SuccessPattern[];
  timestamp: string;
  version: string;
}

class PromptOrchestrationService {
  userContext: UserContext;
  promptHistory: PromptRecord[];
  aiPreferences: AIPreferences;

  constructor() {
    this.userContext = this.loadUserContext();
    this.promptHistory = this.loadPromptHistory();
    this.aiPreferences = this.loadAIPreferences();
  }

  /**
   * ユーザーコンテキストの読み込み
   */
  loadUserContext(): UserContext {
    const stored = localStorage.getItem('userContext');
    if (stored) {
      try { return JSON.parse(stored); } catch { localStorage.removeItem('userContext'); }
    }
    return {
      // 基本情報
      age: null,
      occupation: '',
      familyStatus: '',

      // 目標と感情
      primaryGoal: '',
      emotionalState: '',
      motivationLevel: 5, // 1-10
      anxietyLevel: 5, // 1-10

      // 投資プロファイル
      investmentExperience: '',
      riskTolerance: '',
      targetMarkets: [],
      monthlyBudget: 0,

      // 学習履歴
      previousResults: [],
      successPatterns: [],
      preferredPromptStyle: 'detailed', // detailed, concise, encouraging, analytical

      // 時間的文脈
      lastUpdate: null,
      sessionCount: 0,
      totalInteractions: 0
    };
  }

  /**
   * プロンプト履歴の読み込み
   */
  loadPromptHistory(): PromptRecord[] {
    const stored = localStorage.getItem('promptHistory');
    if (stored) {
      try { return JSON.parse(stored); } catch { localStorage.removeItem('promptHistory'); }
    }
    return [];
  }

  /**
   * AI設定の読み込み
   */
  loadAIPreferences(): AIPreferences {
    const stored = localStorage.getItem('aiPreferences');
    if (stored) {
      try { return JSON.parse(stored); } catch { localStorage.removeItem('aiPreferences'); }
    }
    return {
      preferredAI: 'claude', // claude, gemini, chatgpt
      communicationStyle: 'collaborative', // collaborative, directive, supportive
      detailLevel: 'comprehensive', // brief, comprehensive, exhaustive
      languagePreference: 'ja' // ja, en
    };
  }

  /**
   * ユーザーコンテキストの更新
   */
  updateUserContext(updates: Partial<UserContext>): void {
    this.userContext = {
      ...this.userContext,
      ...updates,
      lastUpdate: new Date().toISOString(),
      totalInteractions: this.userContext.totalInteractions + 1
    };
    localStorage.setItem('userContext', JSON.stringify(this.userContext));
  }

  /**
   * セッション開始
   */
  startSession(sessionType: string = 'general'): void {
    this.userContext.sessionCount++;
    this.userContext.currentSession = {
      type: sessionType,
      startTime: new Date().toISOString(),
      prompts: []
    };
    this.saveUserContext();
  }

  /**
   * コンテキストに基づく感情分析
   */
  analyzeEmotionalContext(): EmotionalProfile {
    const { anxietyLevel, motivationLevel, previousResults } = this.userContext;

    let emotionalProfile: EmotionalProfile = {
      confidence: 5,
      urgency: 5,
      optimism: 5,
      needsSupport: false
    };

    // 不安レベルに基づく調整
    if (anxietyLevel > 7) {
      emotionalProfile.needsSupport = true;
      emotionalProfile.confidence = Math.max(1, emotionalProfile.confidence - 2);
    }

    // やる気レベルに基づく調整
    if (motivationLevel > 7) {
      emotionalProfile.urgency = Math.min(10, emotionalProfile.urgency + 2);
      emotionalProfile.optimism = Math.min(10, emotionalProfile.optimism + 1);
    }

    // 過去の結果に基づく調整
    const recentSuccesses = previousResults.filter(r =>
      r.outcome === 'positive' &&
      new Date(r.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    if (recentSuccesses > 0) {
      emotionalProfile.confidence = Math.min(10, emotionalProfile.confidence + recentSuccesses);
    }

    return emotionalProfile;
  }

  /**
   * パーソナライズされたプロンプト生成
   */
  generatePersonalizedPrompt(promptType: string, additionalContext: Record<string, any> = {}): GeneratedPrompt {
    const emotionalContext = this.analyzeEmotionalContext();
    const basePrompt = this.getBasePrompt(promptType);

    return this.customizePrompt(basePrompt, {
      ...this.userContext,
      ...additionalContext,
      emotional: emotionalContext
    });
  }

  /**
   * 基本プロンプトテンプレートの取得
   */
  getBasePrompt(promptType: string): PromptTemplate {
    const templates: Record<string, PromptTemplate> = {
      portfolio_analysis: {
        title: 'ポートフォリオ分析とアドバイス',
        structure: [
          'user_introduction',
          'current_situation',
          'goals_and_concerns',
          'market_preferences',
          'request_specific_advice'
        ]
      },
      data_import_screenshot: {
        title: 'スクリーンショット分析によるデータ取り込み',
        structure: [
          'analysis_request',
          'data_format_specification',
          'extraction_guidelines',
          'output_format'
        ]
      },
      market_analysis: {
        title: '市場分析とタイミング判断',
        structure: [
          'user_context',
          'market_focus',
          'timing_concerns',
          'analysis_request'
        ]
      },
      goal_setting: {
        title: '目標設定と戦略立案',
        structure: [
          'current_status',
          'aspirations',
          'constraints',
          'action_planning'
        ]
      },
      emotional_support: {
        title: '投資不安の解消とメンタルサポート',
        structure: [
          'emotional_state',
          'specific_concerns',
          'reassurance_request',
          'action_guidance'
        ]
      }
    };

    return templates[promptType] || templates.portfolio_analysis;
  }

  /**
   * プロンプトのカスタマイズ
   */
  customizePrompt(basePrompt: PromptTemplate, context: any): GeneratedPrompt {
    const { preferredPromptStyle } = context;
    const { emotional } = context;
    const isJapanese: boolean = this.aiPreferences.languagePreference === 'ja';

    let prompt: string = '';

    if (isJapanese) {
      prompt = this.generateJapanesePrompt(basePrompt, context);
    } else {
      prompt = this.generateEnglishPrompt(basePrompt, context);
    }

    // 感情的コンテキストに基づく調整
    if (emotional.needsSupport) {
      prompt = this.addSupportiveElements(prompt, isJapanese);
    }

    if (emotional.confidence < 4) {
      prompt = this.addConfidenceBuildingElements(prompt, isJapanese);
    }

    return {
      title: basePrompt.title,
      content: prompt,
      metadata: {
        promptType: basePrompt.structure,
        userContext: context,
        generatedAt: new Date().toISOString(),
        aiPreference: this.aiPreferences.preferredAI
      }
    };
  }

  /**
   * 日本語プロンプト生成
   */
  generateJapanesePrompt(basePrompt: PromptTemplate, context: any): string {
    const { age, occupation, familyStatus, primaryGoal, targetMarkets, monthlyBudget } = context;

    let prompt: string = `私は${age}歳の${occupation}です。\n`;

    if (familyStatus) {
      prompt += `家族構成は${familyStatus}で、`;
    }

    prompt += `${primaryGoal}を実現したいと考えています。\n\n`;

    // 投資対象市場の追加
    if (targetMarkets && targetMarkets.length > 0) {
      const marketNames: string = targetMarkets.map((marketId: string) =>
        (INVESTMENT_MARKETS as any)[marketId]?.name || marketId
      ).join('、');
      prompt += `【投資対象への関心】\n興味のある市場: ${marketNames}\n\n`;
    }

    // 予算情報
    if (monthlyBudget > 0) {
      prompt += `【投資予算】\n毎月の投資可能額: ${monthlyBudget.toLocaleString()}円\n\n`;
    }

    // プロンプトタイプ別の具体的な要求
    if (basePrompt.structure.includes('current_situation')) {
      prompt += `【現在の状況について教えてください】\n`;
      prompt += `私の年齢と状況を考慮して、以下の点についてアドバイスをお願いします：\n\n`;
    }

    prompt += `1. 私に最適な投資戦略は何でしょうか？\n`;
    prompt += `2. リスクとリターンのバランスをどう取るべきでしょうか？\n`;
    prompt += `3. 今後注意すべき点や準備しておくべきことはありますか？\n`;
    prompt += `4. 具体的な次のアクションを教えてください。\n\n`;

    prompt += `※日本在住のため、日本で購入可能な商品での提案をお願いします。\n`;
    prompt += `※できるだけ具体的で実行可能なアドバイスをお願いします。`;

    return prompt;
  }

  /**
   * 英語プロンプト生成
   */
  generateEnglishPrompt(basePrompt: PromptTemplate, context: any): string {
    const { age, occupation, familyStatus, primaryGoal, targetMarkets, monthlyBudget } = context;

    let prompt: string = `I am a ${age}-year-old ${occupation}. `;

    if (familyStatus) {
      prompt += `My family status is ${familyStatus}, and `;
    }

    prompt += `I want to achieve: ${primaryGoal}.\n\n`;

    // Investment market preferences
    if (targetMarkets && targetMarkets.length > 0) {
      const marketNames: string = targetMarkets.map((marketId: string) =>
        (INVESTMENT_MARKETS as any)[marketId]?.nameEn || marketId
      ).join(', ');
      prompt += `【Investment Interests】\nMarkets of interest: ${marketNames}\n\n`;
    }

    // Budget information
    if (monthlyBudget > 0) {
      prompt += `【Investment Budget】\nMonthly investment capacity: ¥${monthlyBudget.toLocaleString()}\n\n`;
    }

    prompt += `Please provide advice on the following points, considering my age and situation:\n\n`;
    prompt += `1. What is the optimal investment strategy for me?\n`;
    prompt += `2. How should I balance risk and returns?\n`;
    prompt += `3. What should I be aware of or prepare for in the future?\n`;
    prompt += `4. What are the specific next actions I should take?\n\n`;

    prompt += `※I live in Japan, so please suggest products available for purchase in Japan.\n`;
    prompt += `※Please provide specific and actionable advice.`;

    return prompt;
  }

  /**
   * サポート要素の追加
   */
  addSupportiveElements(prompt: string, isJapanese: boolean): string {
    const supportivePrefix: string = isJapanese
      ? `投資について不安を感じているので、安心できるような優しいアドバイスをお願いします。\n\n`
      : `I'm feeling anxious about investing, so please provide gentle and reassuring advice.\n\n`;

    return supportivePrefix + prompt;
  }

  /**
   * 自信構築要素の追加
   */
  addConfidenceBuildingElements(prompt: string, isJapanese: boolean): string {
    const confidencePrefix: string = isJapanese
      ? `投資初心者なので、基本的なことから丁寧に教えてください。小さな成功体験も含めて提案してください。\n\n`
      : `I'm new to investing, so please explain things from the basics. Please include suggestions for small wins.\n\n`;

    return confidencePrefix + prompt;
  }

  /**
   * 分析観点別プロンプト生成
   *
   * EnrichedPortfolioData のスコア・P&L・保有データを活用し、
   * 3 つの観点（リスク分析 / コスト最適化 / 成長戦略）ごとに
   * 最適化されたプロンプトを生成する。
   */
  generatePerspectivePrompt(
    perspective: AnalysisPerspective,
    enrichedData: EnrichedPortfolioData,
    userContext: Partial<UserContext>
  ): GeneratedPrompt {
    const isJapanese = this.aiPreferences.languagePreference === 'ja';
    const content = isJapanese
      ? this.buildPerspectiveJa(perspective, enrichedData, userContext)
      : this.buildPerspectiveEn(perspective, enrichedData, userContext);

    const titles: Record<AnalysisPerspective, { ja: string; en: string }> = {
      risk_analysis: { ja: 'リスク分析', en: 'Risk Analysis' },
      cost_optimization: { ja: 'コスト最適化', en: 'Cost Optimization' },
      growth_strategy: { ja: '成長戦略', en: 'Growth Strategy' },
    };

    return {
      title: isJapanese ? titles[perspective].ja : titles[perspective].en,
      content,
      metadata: {
        promptType: [perspective],
        userContext,
        generatedAt: new Date().toISOString(),
        aiPreference: this.aiPreferences.preferredAI,
      },
    };
  }

  // ── Perspective builders (Japanese) ──────────────────

  private buildPerspectiveJa(
    perspective: AnalysisPerspective,
    data: EnrichedPortfolioData,
    ctx: Partial<UserContext>
  ): string {
    const base = this.buildPortfolioContextJa(data, ctx);

    switch (perspective) {
      case 'risk_analysis':
        return this.buildRiskAnalysisJa(data, ctx, base);
      case 'cost_optimization':
        return this.buildCostOptimizationJa(data, ctx, base);
      case 'growth_strategy':
        return this.buildGrowthStrategyJa(data, ctx, base);
    }
  }

  private buildPortfolioContextJa(
    data: EnrichedPortfolioData,
    ctx: Partial<UserContext>
  ): string {
    const lines: string[] = [];

    if (ctx.age) lines.push(`年齢: ${ctx.age}歳`);
    if (ctx.occupation) lines.push(`職業: ${ctx.occupation}`);
    if (ctx.familyStatus) lines.push(`家族構成: ${ctx.familyStatus}`);

    lines.push('');
    lines.push('【ポートフォリオ概要】');
    lines.push(`保有銘柄数: ${data.holdings.count}`);

    const cur = data.holdings.baseCurrency;
    const fmt = (v: number) =>
      cur === 'JPY'
        ? `¥${Math.round(v).toLocaleString()}`
        : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    lines.push(`総資産評価額: ${fmt(data.holdings.totalValue)}`);

    if (data.holdings.topHoldings.length > 0) {
      lines.push('上位保有:');
      data.holdings.topHoldings.slice(0, 3).forEach((h) => {
        lines.push(`  - ${h.name} (${h.ticker}): ${h.percentage.toFixed(1)}%`);
      });
    }

    lines.push('');
    lines.push('【ポートフォリオスコア】');
    lines.push(`総合スコア: ${data.score.totalScore}/100 (${data.score.grade}ランク)`);
    lines.push(`強み: ${data.strengthLine}`);
    lines.push(`弱み: ${data.weaknessLine}`);

    if (data.pnl.available) {
      lines.push('');
      lines.push('【参考損益（yahoo-finance2基準）】');
      lines.push(`総投資額: ${fmt(data.pnl.totalInvestment)}`);
      lines.push(`参考評価額: ${fmt(data.pnl.totalCurrentValue)}`);
      lines.push(`参考損益: ${data.pnl.totalPnLPercent >= 0 ? '+' : ''}${data.pnl.totalPnLPercent.toFixed(1)}%`);
      if (data.pnl.topGainers.length > 0) {
        lines.push(`上位利益銘柄: ${data.pnl.topGainers.map((g) => `${g.ticker}(+${g.pnlPercent.toFixed(1)}%)`).join(', ')}`);
      }
      if (data.pnl.topLosers.length > 0) {
        lines.push(`下位損失銘柄: ${data.pnl.topLosers.map((l) => `${l.ticker}(${l.pnlPercent.toFixed(1)}%)`).join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  private buildRiskAnalysisJa(
    data: EnrichedPortfolioData,
    _ctx: Partial<UserContext>,
    base: string
  ): string {
    const lines: string[] = [base, ''];
    lines.push('【リスク分析の依頼】');

    // 集中度
    const divMetric = data.score.metrics.find((m) => m.id === 'diversification');
    if (divMetric) lines.push(`分散度スコア: ${divMetric.score}/100 (${divMetric.grade})`);

    const curMetric = data.score.metrics.find((m) => m.id === 'currency_diversification');
    if (curMetric) lines.push(`通貨分散スコア: ${curMetric.score}/100 (${curMetric.grade})`);

    // 通貨集中
    const currencies = Object.entries(data.holdings.currencyBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${Math.round(v)}%`);
    if (currencies.length > 0) lines.push(`通貨配分: ${currencies.join(', ')}`);

    lines.push('');
    lines.push('以下について分析してください：');
    lines.push('1. ドローダウンリスク: 市場急落時の想定損失額');
    lines.push('2. 集中リスク: 特定銘柄・通貨への過度な依存');
    lines.push('3. 相関リスク: 保有銘柄間の相関度とリスク分散の改善案');
    lines.push('4. ストレステスト: リーマンショック級の下落時のシミュレーション');
    lines.push('5. リスク低減のための具体的なアクション');
    lines.push('');
    lines.push('※日本在住・日本で購入可能な商品で提案してください。');

    return lines.join('\n');
  }

  private buildCostOptimizationJa(
    data: EnrichedPortfolioData,
    _ctx: Partial<UserContext>,
    base: string
  ): string {
    const lines: string[] = [base, ''];
    lines.push('【コスト最適化の依頼】');

    const costMetric = data.score.metrics.find((m) => m.id === 'cost_efficiency');
    if (costMetric) lines.push(`コスト効率スコア: ${costMetric.score}/100 (${costMetric.grade})`);

    const divMetric = data.score.metrics.find((m) => m.id === 'dividend_health');
    if (divMetric) lines.push(`配当効率スコア: ${divMetric.score}/100 (${divMetric.grade})`);

    lines.push('');
    lines.push('以下について分析してください：');
    lines.push('1. コスト分析: 保有銘柄の信託報酬比較と低コスト代替ファンドの提案');
    lines.push('2. 配当最適化: 配当利回りの質と税効率を考慮した最適化');
    lines.push('3. 税効率: NISA/iDeCo枠の最適活用、損益通算の戦略');
    lines.push('4. 取引コスト: 売買頻度と手数料の最適化');
    lines.push('5. 年間コスト削減額の試算と具体的な乗り換え提案');
    lines.push('');
    lines.push('※日本在住・日本で購入可能な商品で提案してください。');

    return lines.join('\n');
  }

  private buildGrowthStrategyJa(
    data: EnrichedPortfolioData,
    _ctx: Partial<UserContext>,
    base: string
  ): string {
    const lines: string[] = [base, ''];
    lines.push('【成長戦略の依頼】');

    const alignMetric = data.score.metrics.find((m) => m.id === 'target_alignment');
    if (alignMetric) lines.push(`目標適合度スコア: ${alignMetric.score}/100 (${alignMetric.grade})`);

    const rebMetric = data.score.metrics.find((m) => m.id === 'rebalance_health');
    if (rebMetric) lines.push(`リバランス健全度: ${rebMetric.score}/100 (${rebMetric.grade})`);

    if (data.targets.hasTargets) {
      lines.push(`目標配分平均乖離: ${data.targets.avgDeviation.toFixed(1)}%`);
      if (data.targets.deviations.length > 0) {
        lines.push('乖離状況:');
        data.targets.deviations
          .sort((a, b) => b.deviation - a.deviation)
          .slice(0, 5)
          .forEach((d) => {
            lines.push(`  - ${d.ticker}: 現在${d.currentPct.toFixed(1)}% → 目標${d.targetPct.toFixed(1)}% (乖離${d.deviation.toFixed(1)}%)`);
          });
      }
    }

    lines.push('');
    lines.push('以下について分析してください：');
    lines.push('1. リバランス計画: 具体的な売買銘柄と数量の提案');
    lines.push('2. 新規配分推奨: 追加投資先の提案とその理由');
    lines.push('3. 成長ポテンシャル: 現在のポートフォリオの成長見通し');
    lines.push('4. ゴール進捗: 資産目標に対する達成度と加速策');
    lines.push('5. 時間軸を考慮した段階的なアクションプラン');
    lines.push('');
    lines.push('※日本在住・日本で購入可能な商品で提案してください。');

    return lines.join('\n');
  }

  // ── Perspective builders (English) ───────────────────

  private buildPerspectiveEn(
    perspective: AnalysisPerspective,
    data: EnrichedPortfolioData,
    ctx: Partial<UserContext>
  ): string {
    const base = this.buildPortfolioContextEn(data, ctx);

    switch (perspective) {
      case 'risk_analysis':
        return this.buildRiskAnalysisEn(data, base);
      case 'cost_optimization':
        return this.buildCostOptimizationEn(data, base);
      case 'growth_strategy':
        return this.buildGrowthStrategyEn(data, base);
    }
  }

  private buildPortfolioContextEn(
    data: EnrichedPortfolioData,
    ctx: Partial<UserContext>
  ): string {
    const lines: string[] = [];
    if (ctx.age) lines.push(`Age: ${ctx.age}`);
    if (ctx.occupation) lines.push(`Occupation: ${ctx.occupation}`);
    if (ctx.familyStatus) lines.push(`Family: ${ctx.familyStatus}`);

    lines.push('');
    lines.push('[Portfolio Overview]');
    lines.push(`Holdings: ${data.holdings.count} assets`);
    const cur = data.holdings.baseCurrency;
    const fmt = (v: number) =>
      cur === 'JPY'
        ? `¥${Math.round(v).toLocaleString()}`
        : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    lines.push(`Total Value: ${fmt(data.holdings.totalValue)}`);

    if (data.holdings.topHoldings.length > 0) {
      lines.push('Top Holdings:');
      data.holdings.topHoldings.slice(0, 3).forEach((h) => {
        lines.push(`  - ${h.name} (${h.ticker}): ${h.percentage.toFixed(1)}%`);
      });
    }

    lines.push('');
    lines.push('[Portfolio Score]');
    lines.push(`Overall: ${data.score.totalScore}/100 (Grade ${data.score.grade})`);
    lines.push(`Strength: ${data.strengthLine}`);
    lines.push(`Weakness: ${data.weaknessLine}`);

    if (data.pnl.available) {
      lines.push('');
      lines.push('[Reference P&L]');
      lines.push(`Total Investment: ${fmt(data.pnl.totalInvestment)}`);
      lines.push(`Current Value: ${fmt(data.pnl.totalCurrentValue)}`);
      lines.push(`P&L: ${data.pnl.totalPnLPercent >= 0 ? '+' : ''}${data.pnl.totalPnLPercent.toFixed(1)}%`);
    }

    return lines.join('\n');
  }

  private buildRiskAnalysisEn(data: EnrichedPortfolioData, base: string): string {
    const lines: string[] = [base, '', '[Risk Analysis Request]'];
    const divM = data.score.metrics.find((m) => m.id === 'diversification');
    if (divM) lines.push(`Diversification Score: ${divM.score}/100`);
    const curM = data.score.metrics.find((m) => m.id === 'currency_diversification');
    if (curM) lines.push(`Currency Diversification: ${curM.score}/100`);

    lines.push('');
    lines.push('Please analyze:');
    lines.push('1. Drawdown Risk: Expected loss in a market downturn');
    lines.push('2. Concentration Risk: Over-reliance on specific assets/currencies');
    lines.push('3. Correlation Risk: Correlation between holdings and diversification improvements');
    lines.push('4. Stress Test: Simulation of a 2008-level downturn');
    lines.push('5. Specific actions to reduce risk');
    lines.push('');
    lines.push('*I live in Japan—please suggest products available for purchase in Japan.');
    return lines.join('\n');
  }

  private buildCostOptimizationEn(data: EnrichedPortfolioData, base: string): string {
    const lines: string[] = [base, '', '[Cost Optimization Request]'];
    const costM = data.score.metrics.find((m) => m.id === 'cost_efficiency');
    if (costM) lines.push(`Cost Efficiency Score: ${costM.score}/100`);

    lines.push('');
    lines.push('Please analyze:');
    lines.push('1. Cost Analysis: Compare expense ratios and suggest low-cost alternatives');
    lines.push('2. Dividend Optimization: Tax-efficient dividend strategy');
    lines.push('3. Tax Efficiency: Optimal use of NISA/iDeCo tax-advantaged accounts');
    lines.push('4. Trading Costs: Frequency and fee optimization');
    lines.push('5. Estimated annual cost savings and specific switch proposals');
    lines.push('');
    lines.push('*I live in Japan—please suggest products available for purchase in Japan.');
    return lines.join('\n');
  }

  private buildGrowthStrategyEn(data: EnrichedPortfolioData, base: string): string {
    const lines: string[] = [base, '', '[Growth Strategy Request]'];
    const alignM = data.score.metrics.find((m) => m.id === 'target_alignment');
    if (alignM) lines.push(`Target Alignment Score: ${alignM.score}/100`);

    if (data.targets.hasTargets) {
      lines.push(`Avg Target Deviation: ${data.targets.avgDeviation.toFixed(1)}%`);
    }

    lines.push('');
    lines.push('Please analyze:');
    lines.push('1. Rebalancing Plan: Specific buy/sell recommendations');
    lines.push('2. New Allocation: Additional investment suggestions');
    lines.push('3. Growth Potential: Portfolio growth outlook');
    lines.push('4. Goal Progress: Progress toward financial goals and acceleration strategies');
    lines.push('5. Phased action plan with timeline');
    lines.push('');
    lines.push('*I live in Japan—please suggest products available for purchase in Japan.');
    return lines.join('\n');
  }

  /**
   * データインポート用プロンプト生成
   */
  generateDataImportPrompt(importType: string, userInstructions: string = ''): DataImportPrompt {
    const basePrompts: Record<string, Record<string, string>> = {
      screenshot_portfolio: {
        ja: `この画像は私の投資ポートフォリオの画面です。以下の形式でデータを抽出してください：

【分析してほしい内容】
- 保有銘柄名（正式名称）
- 銘柄コード（ある場合）
- 保有数量
- 現在価格
- 評価額
- 取得価格（ある場合）
- 損益（ある場合）

【出力形式】
JSON形式で以下のように出力してください：
\`\`\`json
{
  "portfolioData": {
    "assets": [
      {
        "name": "銘柄名",
        "ticker": "銘柄コード",
        "quantity": 数量,
        "currentPrice": 現在価格,
        "totalValue": 評価額,
        "costBasis": 取得価格,
        "unrealizedGain": 含み損益
      }
    ],
    "totalValue": 総評価額,
    "extractedAt": "抽出日時"
  }
}
\`\`\`

【注意事項】
- 数値は数字のみで出力（カンマや通貨記号なし）
- 銘柄名は正式名称で
- 不明な場合はnullを設定
- 日本円ベースで統一`,

        en: `This image shows my investment portfolio screen. Please extract data in the following format:

【Content to Analyze】
- Holding names (official names)
- Ticker symbols (if available)
- Quantities held
- Current prices
- Market values
- Cost basis (if available)
- Gains/losses (if available)

【Output Format】
Please output in JSON format as follows:
\`\`\`json
{
  "portfolioData": {
    "assets": [
      {
        "name": "Asset name",
        "ticker": "Ticker code",
        "quantity": quantity,
        "currentPrice": current_price,
        "totalValue": market_value,
        "costBasis": cost_basis,
        "unrealizedGain": unrealized_gain
      }
    ],
    "totalValue": total_portfolio_value,
    "extractedAt": "extraction_datetime"
  }
}
\`\`\`

【Notes】
- Output numbers only (no commas or currency symbols)
- Use official asset names
- Set null for unknown values
- Standardize in Japanese Yen`
      },

      market_data_screenshot: {
        ja: `この画像は株価や市場データの画面です。以下の情報を抽出してください：

【分析してほしい内容】
- 銘柄名・コード
- 現在価格
- 前日比・変動率
- 出来高
- 市場（東証、NASDAQ等）
- データ取得時刻

【出力形式】
\`\`\`json
{
  "marketData": [
    {
      "name": "銘柄名",
      "ticker": "コード",
      "price": 現在価格,
      "change": 前日比,
      "changePercent": 変動率,
      "volume": 出来高,
      "market": "市場名",
      "timestamp": "取得時刻"
    }
  ]
}
\`\`\``,

        en: `This image shows stock prices or market data. Please extract the following information:

【Content to Analyze】
- Stock names and codes
- Current prices
- Daily changes and percentages
- Trading volumes
- Markets (TSE, NASDAQ, etc.)
- Data timestamp

【Output Format】
\`\`\`json
{
  "marketData": [
    {
      "name": "Stock name",
      "ticker": "Code",
      "price": current_price,
      "change": daily_change,
      "changePercent": change_percentage,
      "volume": trading_volume,
      "market": "Market name",
      "timestamp": "data_timestamp"
    }
  ]
}
\`\`\``
      },

      transaction_history: {
        ja: `この画像は取引履歴の画面です。以下の取引情報を抽出してください：

【分析してほしい内容】
- 取引日
- 取引種別（買い・売り）
- 銘柄名・コード
- 数量
- 単価
- 手数料
- 約定金額

【出力形式】
\`\`\`json
{
  "transactions": [
    {
      "date": "取引日",
      "type": "buy/sell",
      "name": "銘柄名",
      "ticker": "コード",
      "quantity": 数量,
      "price": 単価,
      "fee": 手数料,
      "totalAmount": 約定金額
    }
  ]
}
\`\`\``,

        en: `This image shows transaction history. Please extract the following transaction information:

【Content to Analyze】
- Transaction dates
- Transaction types (buy/sell)
- Asset names and codes
- Quantities
- Unit prices
- Fees
- Total amounts

【Output Format】
\`\`\`json
{
  "transactions": [
    {
      "date": "transaction_date",
      "type": "buy/sell",
      "name": "asset_name",
      "ticker": "code",
      "quantity": quantity,
      "price": unit_price,
      "fee": transaction_fee,
      "totalAmount": total_amount
    }
  ]
}
\`\`\``
      }
    };

    const isJapanese: boolean = this.aiPreferences.languagePreference === 'ja';
    const selectedPrompt = basePrompts[importType] || basePrompts.screenshot_portfolio;
    let prompt: string = selectedPrompt[isJapanese ? 'ja' : 'en'];

    if (userInstructions) {
      const instructionsLabel: string = isJapanese ? '【追加の指示】\n' : '【Additional Instructions】\n';
      prompt += '\n\n' + instructionsLabel + userInstructions;
    }

    return {
      title: isJapanese ? 'データインポート分析' : 'Data Import Analysis',
      content: prompt,
      type: importType,
      language: isJapanese ? 'ja' : 'en'
    };
  }

  /**
   * プロンプト履歴への記録
   */
  recordPrompt(prompt: any, result: any = null): string {
    const record: PromptRecord = {
      id: Date.now().toString(),
      prompt,
      result,
      timestamp: new Date().toISOString(),
      userContext: { ...this.userContext }
    };

    this.promptHistory.unshift(record);

    // 履歴は最新100件まで保持
    if (this.promptHistory.length > 100) {
      this.promptHistory = this.promptHistory.slice(0, 100);
    }

    localStorage.setItem('promptHistory', JSON.stringify(this.promptHistory));

    return record.id;
  }

  /**
   * AI応答の学習と改善
   */
  learnFromResponse(promptId: string, aiResponse: any, userFeedback: UserFeedback): void {
    const promptRecord = this.promptHistory.find(p => p.id === promptId);
    if (!promptRecord) return;

    promptRecord.aiResponse = aiResponse;
    promptRecord.userFeedback = userFeedback;

    // 成功パターンの抽出
    if (userFeedback.rating >= 4) {
      this.userContext.successPatterns.push({
        promptType: promptRecord.prompt.metadata?.promptType,
        emotionalContext: promptRecord.userContext.emotional as EmotionalProfile,
        aiUsed: aiResponse.aiProvider,
        successFactors: userFeedback.successFactors || []
      });
    }

    this.saveUserContext();
    localStorage.setItem('promptHistory', JSON.stringify(this.promptHistory));
  }

  /**
   * 状態の保存
   */
  saveUserContext(): void {
    localStorage.setItem('userContext', JSON.stringify(this.userContext));
  }

  /**
   * データのエクスポート（他のアプリとの連携用）
   */
  exportUserProfile(): UserProfile {
    return {
      userContext: this.userContext,
      aiPreferences: this.aiPreferences,
      successPatterns: this.userContext.successPatterns,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * データのインポート（他のアプリとの連携用）
   */
  importUserProfile(profileData: UserProfile): boolean {
    if (profileData.version === '1.0') {
      this.userContext = { ...this.userContext, ...profileData.userContext };
      this.aiPreferences = { ...this.aiPreferences, ...profileData.aiPreferences };
      this.saveUserContext();
      localStorage.setItem('aiPreferences', JSON.stringify(this.aiPreferences));
      return true;
    }
    return false;
  }

  /**
   * リセット機能
   */
  reset(): void {
    localStorage.removeItem('userContext');
    localStorage.removeItem('promptHistory');
    localStorage.removeItem('aiPreferences');
    this.userContext = this.loadUserContext();
    this.promptHistory = this.loadPromptHistory();
    this.aiPreferences = this.loadAIPreferences();
  }
}

// シングルトンインスタンス
const promptOrchestrationService = new PromptOrchestrationService();

export default promptOrchestrationService;
