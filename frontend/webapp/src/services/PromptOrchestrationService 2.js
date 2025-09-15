/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/services/PromptOrchestrationService.js
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * AI投資戦略プロンプトの統合管理サービス。
 * プロンプト生成、YAML処理、データ変換を統合的に行う。
 */

class PromptOrchestrationService {
  constructor() {
    this.promptTemplates = {
      japanese: {
        title: 'AI投資戦略コンサルティング依頼',
        sections: [
          'investor_profile',
          'request_content', 
          'risk_management',
          'implementation_plan',
          'important_notes'
        ]
      },
      english: {
        title: 'AI Investment Strategy Consultation Request',
        sections: [
          'investor_profile',
          'request_content',
          'risk_management', 
          'implementation_plan',
          'important_notes'
        ]
      }
    };
  }

  /**
   * ユーザープロフィールに基づいてプロンプトを生成
   */
  generatePrompt(userProfile, selectedMarkets, budget, language = 'japanese') {
    const template = this.promptTemplates[language];
    
    const marketDescriptions = this.getMarketDescriptions(selectedMarkets, language);
    const budgetText = budget ? `${budget.toLocaleString()}円` : '未設定';
    
    if (language === 'japanese') {
      return this.generateJapanesePrompt(userProfile, marketDescriptions, budgetText);
    } else {
      return this.generateEnglishPrompt(userProfile, marketDescriptions, budgetText);
    }
  }

  generateJapanesePrompt(userProfile, marketDescriptions, budgetText) {
    return `# AI投資戦略コンサルティング依頼

## 投資家プロフィール
- **投資予算**: ${budgetText}
- **関心市場**: ${marketDescriptions}
- **投資経験**: ${userProfile?.experience || '初心者'}
- **リスク許容度**: ${userProfile?.riskTolerance || '低'}
- **投資目的**: ${userProfile?.investmentGoal || '長期資産形成'}
- **投資期間**: ${userProfile?.timeHorizon || '5年程度'}

## 依頼内容
以下の条件に基づいて、パーソナライズされた投資戦略を提案してください：

### 1. ポートフォリオ構成案
- 各アセットクラスの推奨配分比率
- 具体的な投資商品（ETF、投資信託等）の提案
- 地域・セクター分散の考え方
- リバランシングの頻度とタイミング

### 2. リスク管理戦略
- 最大損失許容額の設定
- 分散投資によるリスク軽減方法
- 市場下落時の対応策
- ポートフォリオ保険の考え方

### 3. 投資実行プラン
- 段階的な投資開始方法（ドルコスト平均法等）
- 定期積立の推奨金額と頻度
- 投資開始に必要な準備事項
- 証券会社・投資プラットフォームの選択指針

### 4. パフォーマンス評価
- 期待リターンとリスクの目安
- ベンチマークの設定
- パフォーマンス評価の頻度と方法

## 回答形式の要望
可能であれば、以下のYAML形式で具体的な資産配分案を含めていただけると助かります：

\`\`\`yaml
portfolio_allocation:
  assets:
    - symbol: "VTI"
      name: "バンガード・トータル・ストック・マーケット"
      allocation: 40
      asset_class: "US_EQUITY"
    - symbol: "VXUS" 
      name: "バンガード・トータル・インターナショナル・ストック"
      allocation: 30
      asset_class: "INTERNATIONAL_EQUITY"
  # 他の資産も同様に...
\`\`\`

## 重要事項
- 投資は自己責任であることを理解しています
- 提案内容は教育目的であり、投資アドバイスではありません
- 最終的な投資判断は投資家自身が行います
- 投資にはリスクが伴うことを理解しています

よろしくお願いします。`;
  }

  generateEnglishPrompt(userProfile, marketDescriptions, budgetText) {
    return `# AI Investment Strategy Consultation Request

## Investor Profile
- **Investment Budget**: ${budgetText}
- **Markets of Interest**: ${marketDescriptions}
- **Investment Experience**: ${userProfile?.experience || 'Beginner'}
- **Risk Tolerance**: ${userProfile?.riskTolerance || 'Low'}
- **Investment Goal**: ${userProfile?.investmentGoal || 'Long-term Growth'}
- **Time Horizon**: ${userProfile?.timeHorizon || '5 years'}

## Request Content
Please provide a personalized investment strategy based on the following conditions:

### 1. Portfolio Composition
- Recommended allocation ratios for each asset class
- Specific investment products (ETFs, mutual funds, etc.)
- Geographic and sector diversification approach
- Rebalancing frequency and timing

### 2. Risk Management Strategy
- Maximum loss tolerance setting
- Risk reduction through diversification
- Response strategies during market downturns
- Portfolio insurance concepts

### 3. Investment Implementation Plan
- Phased investment approach (Dollar-Cost Averaging, etc.)
- Recommended regular contribution amounts and frequency
- Prerequisites for starting investments
- Guidance for choosing brokers/investment platforms

### 4. Performance Evaluation
- Expected return and risk guidelines
- Benchmark setting
- Performance evaluation frequency and methods

## Preferred Response Format
If possible, please include a specific asset allocation plan in YAML format:

\`\`\`yaml
portfolio_allocation:
  assets:
    - symbol: "VTI"
      name: "Vanguard Total Stock Market"
      allocation: 40
      asset_class: "US_EQUITY"
    - symbol: "VXUS"
      name: "Vanguard Total International Stock"
      allocation: 30
      asset_class: "INTERNATIONAL_EQUITY"
  # Other assets similarly...
\`\`\`

## Important Disclaimers
- I understand that investments are made at my own risk
- The proposed content is for educational purposes and not investment advice
- Final investment decisions will be made by the investor
- I understand that investments carry inherent risks

Thank you for your assistance.`;
  }

  getMarketDescriptions(selectedMarkets, language = 'japanese') {
    if (!selectedMarkets || selectedMarkets.length === 0) {
      return language === 'japanese' ? '未設定' : 'Not specified';
    }

    const marketNames = language === 'japanese' ? {
      us: '米国市場',
      japan: '日本市場',
      global: '全世界市場', 
      reit: 'REIT（不動産投資信託）',
      crypto: '仮想通貨',
      bonds: '債券'
    } : {
      us: 'US Market',
      japan: 'Japanese Market',
      global: 'Global Market',
      reit: 'REITs',
      crypto: 'Cryptocurrency', 
      bonds: 'Bonds'
    };

    return selectedMarkets.map(market => marketNames[market] || market).join('、');
  }

  /**
   * YAML処理の統合戦略
   */
  async processYAMLData(yamlText) {
    const strategies = [
      () => this.parseStandardYAML(yamlText),
      () => this.parseWithCleanup(yamlText),
      () => this.parseAsJSON(yamlText),
      () => this.parseCustomFormat(yamlText)
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result && result.assets && result.assets.length > 0) {
          return { success: true, data: result };
        }
      } catch (error) {
        console.log(`YAML解析戦略失敗: ${error.message}`);
      }
    }

    return {
      success: false,
      error: 'すべてのYAML解析戦略が失敗しました。形式を確認してください。'
    };
  }

  parseStandardYAML(text) {
    // 簡易YAML解析（本来はjs-yamlライブラリを使用）
    const result = { assets: [] };
    const lines = text.split('\n');
    let currentAsset = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // アセット検出
      const symbolMatch = trimmed.match(/symbol:\s*["']?([A-Z0-9.]+)["']?/i);
      if (symbolMatch) {
        if (currentAsset) result.assets.push(currentAsset);
        currentAsset = { symbol: symbolMatch[1] };
        continue;
      }
      
      // 配分検出
      const allocationMatch = trimmed.match(/allocation:\s*(\d+(?:\.\d+)?)/);
      if (allocationMatch && currentAsset) {
        currentAsset.allocation = parseFloat(allocationMatch[1]);
      }
      
      // 名前検出
      const nameMatch = trimmed.match(/name:\s*["']?([^"'\n]+)["']?/);
      if (nameMatch && currentAsset) {
        currentAsset.name = nameMatch[1].trim();
      }
    }
    
    if (currentAsset) result.assets.push(currentAsset);
    return result;
  }

  parseWithCleanup(text) {
    // AI説明文を除去してから解析
    const cleanedText = text
      .replace(/^[^:]*?(?=\w+:)/gm, '') // 説明文除去
      .replace(/```yaml|```/g, '') // コードブロック除去
      .replace(/^\s*[-*]\s*/gm, ''); // リスト記号除去
    
    return this.parseStandardYAML(cleanedText);
  }

  parseAsJSON(text) {
    try {
      const data = JSON.parse(text);
      return this.normalizeDataStructure(data);
    } catch (e) {
      throw new Error('JSON解析に失敗');
    }
  }

  parseCustomFormat(text) {
    const result = { assets: [] };
    
    // パターン1: "Symbol: Percentage" 形式
    const pattern1 = text.match(/([A-Z]{2,5}):\s*(\d+(?:\.\d+)?)%?/gi);
    if (pattern1) {
      pattern1.forEach(match => {
        const [, symbol, allocation] = match.match(/([A-Z]{2,5}):\s*(\d+(?:\.\d+)?)%?/i);
        result.assets.push({
          symbol: symbol.toUpperCase(),
          allocation: parseFloat(allocation)
        });
      });
      return result;
    }
    
    // パターン2: "Symbol (Name) - Percentage" 形式
    const pattern2 = text.match(/([A-Z]{2,5})\s*\([^)]+\)\s*[-–]\s*(\d+(?:\.\d+)?)%?/gi);
    if (pattern2) {
      pattern2.forEach(match => {
        const parts = match.match(/([A-Z]{2,5})\s*\(([^)]+)\)\s*[-–]\s*(\d+(?:\.\d+)?)%?/i);
        if (parts) {
          result.assets.push({
            symbol: parts[1].toUpperCase(),
            name: parts[2].trim(),
            allocation: parseFloat(parts[3])
          });
        }
      });
      return result;
    }
    
    throw new Error('カスタム形式の解析に失敗');
  }

  normalizeDataStructure(data) {
    // 様々なデータ構造を標準形式に正規化
    const result = { assets: [] };
    
    if (data.assets) {
      result.assets = Array.isArray(data.assets) ? data.assets : [data.assets];
    } else if (data.portfolio) {
      result.assets = Array.isArray(data.portfolio) ? data.portfolio : [data.portfolio];
    } else if (data.allocation) {
      result.assets = Array.isArray(data.allocation) ? data.allocation : [data.allocation];
    }
    
    return result;
  }

  /**
   * プロンプト生成のメタデータ
   */
  getPromptMetadata() {
    return {
      version: '2.0',
      supportedLanguages: ['japanese', 'english'],
      supportedMarkets: ['us', 'japan', 'global', 'reit', 'crypto', 'bonds'],
      yamlParsingStrategies: 4,
      lastUpdated: new Date().toISOString()
    };
  }
}

export default new PromptOrchestrationService();