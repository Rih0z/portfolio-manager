/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/services/PromptOrchestrationService.js
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

class PromptOrchestrationService {
  constructor() {
    this.userContext = this.loadUserContext();
    this.promptHistory = this.loadPromptHistory();
    this.aiPreferences = this.loadAIPreferences();
  }

  /**
   * ユーザーコンテキストの読み込み
   */
  loadUserContext() {
    const stored = localStorage.getItem('userContext');
    return stored ? JSON.parse(stored) : {
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
  loadPromptHistory() {
    const stored = localStorage.getItem('promptHistory');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * AI設定の読み込み
   */
  loadAIPreferences() {
    const stored = localStorage.getItem('aiPreferences');
    return stored ? JSON.parse(stored) : {
      preferredAI: 'claude', // claude, gemini, chatgpt
      communicationStyle: 'collaborative', // collaborative, directive, supportive
      detailLevel: 'comprehensive', // brief, comprehensive, exhaustive
      languagePreference: 'ja' // ja, en
    };
  }

  /**
   * ユーザーコンテキストの更新
   */
  updateUserContext(updates) {
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
  startSession(sessionType = 'general') {
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
  analyzeEmotionalContext() {
    const { anxietyLevel, motivationLevel, previousResults } = this.userContext;
    
    let emotionalProfile = {
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
  generatePersonalizedPrompt(promptType, additionalContext = {}) {
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
  getBasePrompt(promptType) {
    const templates = {
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
  customizePrompt(basePrompt, context) {
    const { preferredPromptStyle } = context;
    const { emotional } = context;
    const isJapanese = this.aiPreferences.languagePreference === 'ja';

    let prompt = '';

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
  generateJapanesePrompt(basePrompt, context) {
    const { age, occupation, familyStatus, primaryGoal, targetMarkets, monthlyBudget } = context;
    
    let prompt = `私は${age}歳の${occupation}です。\n`;
    
    if (familyStatus) {
      prompt += `家族構成は${familyStatus}で、`;
    }
    
    prompt += `${primaryGoal}を実現したいと考えています。\n\n`;

    // 投資対象市場の追加
    if (targetMarkets && targetMarkets.length > 0) {
      const marketNames = targetMarkets.map(marketId => 
        INVESTMENT_MARKETS[marketId]?.name || marketId
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
  generateEnglishPrompt(basePrompt, context) {
    const { age, occupation, familyStatus, primaryGoal, targetMarkets, monthlyBudget } = context;
    
    let prompt = `I am a ${age}-year-old ${occupation}. `;
    
    if (familyStatus) {
      prompt += `My family status is ${familyStatus}, and `;
    }
    
    prompt += `I want to achieve: ${primaryGoal}.\n\n`;

    // Investment market preferences
    if (targetMarkets && targetMarkets.length > 0) {
      const marketNames = targetMarkets.map(marketId => 
        INVESTMENT_MARKETS[marketId]?.nameEn || marketId
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
  addSupportiveElements(prompt, isJapanese) {
    const supportivePrefix = isJapanese 
      ? `投資について不安を感じているので、安心できるような優しいアドバイスをお願いします。\n\n`
      : `I'm feeling anxious about investing, so please provide gentle and reassuring advice.\n\n`;
    
    return supportivePrefix + prompt;
  }

  /**
   * 自信構築要素の追加
   */
  addConfidenceBuildingElements(prompt, isJapanese) {
    const confidencePrefix = isJapanese 
      ? `投資初心者なので、基本的なことから丁寧に教えてください。小さな成功体験も含めて提案してください。\n\n`
      : `I'm new to investing, so please explain things from the basics. Please include suggestions for small wins.\n\n`;
    
    return confidencePrefix + prompt;
  }

  /**
   * データインポート用プロンプト生成
   */
  generateDataImportPrompt(importType, userInstructions = '') {
    const basePrompts = {
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

    const isJapanese = this.aiPreferences.languagePreference === 'ja';
    const selectedPrompt = basePrompts[importType] || basePrompts.screenshot_portfolio;
    let prompt = selectedPrompt[isJapanese ? 'ja' : 'en'];

    if (userInstructions) {
      const instructionsLabel = isJapanese ? '【追加の指示】\n' : '【Additional Instructions】\n';
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
  recordPrompt(prompt, result = null) {
    const record = {
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
  learnFromResponse(promptId, aiResponse, userFeedback) {
    const promptRecord = this.promptHistory.find(p => p.id === promptId);
    if (!promptRecord) return;

    promptRecord.aiResponse = aiResponse;
    promptRecord.userFeedback = userFeedback;

    // 成功パターンの抽出
    if (userFeedback.rating >= 4) {
      this.userContext.successPatterns.push({
        promptType: promptRecord.prompt.metadata?.promptType,
        emotionalContext: promptRecord.userContext.emotional,
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
  saveUserContext() {
    localStorage.setItem('userContext', JSON.stringify(this.userContext));
  }

  /**
   * データのエクスポート（他のアプリとの連携用）
   */
  exportUserProfile() {
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
  importUserProfile(profileData) {
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
  reset() {
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