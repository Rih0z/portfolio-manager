/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/services/PortfolioPromptService.js
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-06
 * 
 * 説明:
 * ユーザーのポートフォリオデータを外部AI（Claude/Gemini）で取得・整理するための
 * プロンプト生成サービス。ユーザーが保有資産を入力し、AIがJSON形式で整理。
 */

class PortfolioPromptService {
  /**
   * ポートフォリオデータ取得用のプロンプトを生成
   * @param {string} language - 言語設定 ('ja' | 'en')
   * @param {Object} options - オプション設定
   * @returns {Object} プロンプト情報
   */
  generatePortfolioDataPrompt(language = 'ja', options = {}) {
    const isJapanese = language === 'ja';
    
    const promptContent = isJapanese ? this.generateJapanesePrompt(options) : this.generateEnglishPrompt(options);
    
    return {
      title: isJapanese ? 'ポートフォリオデータ取得プロンプト' : 'Portfolio Data Collection Prompt',
      content: promptContent,
      instructions: this.getInstructions(language),
      expectedFormat: this.getExpectedJSONFormat(),
      language
    };
  }

  /**
   * 日本語版プロンプト生成
   */
  generateJapanesePrompt(options) {
    return `# ポートフォリオデータ収集アシスタント

こんにちは！あなたのポートフォリオ管理アプリ「Portfolio Wise」のデータ収集をお手伝いします。

## 📋 収集する情報

以下の情報を順番に入力してください：

### 1. 保有株式・ETF・投資信託
- **銘柄名** または **ティッカーシンボル**
- **保有数量** （株数・口数）
- **取得価格** （平均取得単価）
- **現在価格** （分かる場合）
- **通貨** （JPY, USD など）

### 2. 現金・預金
- **金額**
- **通貨**
- **口座の種類** （普通預金、定期預金、外貨預金など）

### 3. その他の投資商品
- **債券、REIT、コモディティ、仮想通貨** など
- **種類、銘柄名、数量、評価額**

## 🔄 データ入力プロセス

**ステップ1**: 「準備完了」と入力して開始してください
**ステップ2**: 上記の情報を1つずつ入力してください
**ステップ3**: 全ての入力が完了したら「入力完了」と入力してください
**ステップ4**: 私が内容を確認し、JSON形式で出力します

## ⚠️ 重要な注意事項

- **個人情報保護**: 口座番号や個人を特定できる情報は入力しないでください
- **概算値でOK**: 正確な数値が分からない場合は概算で構いません
- **日本円換算**: 外貨資産は可能であれば日本円換算額も教えてください
- **スクリーンショット**: 証券会社の画面があれば一緒に添付してください

## 📊 出力形式

最終的に以下のJSON形式でデータを整理します：

\`\`\`json
{
  "portfolio": {
    "assets": [
      {
        "name": "銘柄名",
        "ticker": "ティッカー",
        "type": "stock|etf|fund|bond|reit|crypto|cash",
        "quantity": 100,
        "averagePrice": 1500,
        "currentPrice": 1600,
        "currency": "JPY",
        "market": "Japan|US|Global",
        "sector": "セクター名"
      }
    ],
    "totalValue": 総評価額,
    "lastUpdated": "更新日時",
    "baseCurrency": "JPY"
  }
}
\`\`\`

準備ができましたら「準備完了」と入力してデータ収集を開始してください！`;
  }

  /**
   * 英語版プロンプト生成
   */
  generateEnglishPrompt(options) {
    return `# Portfolio Data Collection Assistant

Hello! I'm here to help collect your portfolio data for the "Portfolio Wise" portfolio management app.

## 📋 Information to Collect

Please provide the following information in order:

### 1. Stocks, ETFs, Mutual Funds
- **Company name** or **Ticker symbol**
- **Quantity** (shares/units held)
- **Purchase price** (average cost basis)
- **Current price** (if known)
- **Currency** (JPY, USD, etc.)

### 2. Cash & Deposits
- **Amount**
- **Currency**
- **Account type** (savings, time deposit, foreign currency deposit, etc.)

### 3. Other Investment Products
- **Bonds, REITs, Commodities, Cryptocurrencies**, etc.
- **Type, name, quantity, current value**

## 🔄 Data Input Process

**Step 1**: Type "Ready to start" to begin
**Step 2**: Enter the above information one by one
**Step 3**: Type "Input complete" when all data is entered
**Step 4**: I will review and output in JSON format

## ⚠️ Important Notes

- **Privacy Protection**: Do not enter account numbers or personally identifiable information
- **Estimates OK**: Approximate values are fine if exact numbers are unknown
- **JPY Conversion**: For foreign assets, please provide JPY equivalent if possible
- **Screenshots**: Feel free to attach brokerage account screenshots if available

## 📊 Output Format

Finally, I will organize the data in this JSON format:

\`\`\`json
{
  "portfolio": {
    "assets": [
      {
        "name": "Asset Name",
        "ticker": "TICKER",
        "type": "stock|etf|fund|bond|reit|crypto|cash",
        "quantity": 100,
        "averagePrice": 1500,
        "currentPrice": 1600,
        "currency": "JPY",
        "market": "Japan|US|Global",
        "sector": "Sector Name"
      }
    ],
    "totalValue": "Total Portfolio Value",
    "lastUpdated": "Update Date",
    "baseCurrency": "JPY"
  }
}
\`\`\`

When you're ready, type "Ready to start" to begin data collection!`;
  }

  /**
   * 使用方法の説明を取得
   */
  getInstructions(language) {
    const isJapanese = language === 'ja';
    
    return {
      title: isJapanese ? '使い方' : 'How to Use',
      steps: isJapanese ? [
        '1. 上記プロンプトをコピーしてください',
        '2. Claude（claude.ai）またはGemini（gemini.google.com）を開いてください',
        '3. プロンプトを貼り付けて、保有資産の情報を入力してください',
        '4. AIがJSON形式で出力したデータをコピーしてください',
        '5. このアプリの「データ取り込み」タブでJSONを貼り付けてください'
      ] : [
        '1. Copy the prompt above',
        '2. Open Claude (claude.ai) or Gemini (gemini.google.com)',
        '3. Paste the prompt and enter your portfolio information',
        '4. Copy the JSON data output by the AI',
        '5. Paste the JSON in the "Data Import" tab of this app'
      ]
    };
  }

  /**
   * 期待されるJSONフォーマットを取得
   */
  getExpectedJSONFormat() {
    return {
      portfolio: {
        assets: [
          {
            name: "Asset Name (String)",
            ticker: "Ticker Symbol (String, Optional)",
            type: "Asset Type (stock|etf|fund|bond|reit|crypto|cash)",
            quantity: "Quantity (Number)",
            averagePrice: "Average Purchase Price (Number, Optional)",
            currentPrice: "Current Price (Number, Optional)",
            currency: "Currency (String, default: JPY)",
            market: "Market (Japan|US|Global|Other, Optional)",
            sector: "Sector Name (String, Optional)",
            totalValue: "Total Value (Number, Optional)"
          }
        ],
        totalValue: "Total Portfolio Value (Number)",
        lastUpdated: "Last Update Date (ISO String)",
        baseCurrency: "Base Currency (String, default: JPY)"
      }
    };
  }

  /**
   * JSONデータの検証
   * @param {Object} jsonData - 検証するJSONデータ
   * @returns {Object} 検証結果
   */
  validatePortfolioJSON(jsonData) {
    const errors = [];
    const warnings = [];

    try {
      // 基本構造の検証
      if (!jsonData.portfolio) {
        errors.push('Missing "portfolio" object');
        return { isValid: false, errors, warnings };
      }

      if (!Array.isArray(jsonData.portfolio.assets)) {
        errors.push('Portfolio assets must be an array');
        return { isValid: false, errors, warnings };
      }

      // 各資産の検証
      jsonData.portfolio.assets.forEach((asset, index) => {
        if (!asset.name) {
          errors.push(`Asset ${index + 1}: Missing name`);
        }

        if (!asset.type) {
          warnings.push(`Asset ${index + 1}: Missing type`);
        } else if (!['stock', 'etf', 'fund', 'bond', 'reit', 'crypto', 'cash'].includes(asset.type)) {
          warnings.push(`Asset ${index + 1}: Unknown type "${asset.type}"`);
        }

        if (typeof asset.quantity !== 'number') {
          warnings.push(`Asset ${index + 1}: Quantity should be a number`);
        }

        if (asset.currency && !['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'].includes(asset.currency)) {
          warnings.push(`Asset ${index + 1}: Unknown currency "${asset.currency}"`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        assetsCount: jsonData.portfolio.assets.length,
        totalValue: jsonData.portfolio.totalValue || 0
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`JSON parsing error: ${error.message}`],
        warnings
      };
    }
  }

  /**
   * プロンプトのテンプレートタイプを取得
   */
  getAvailablePromptTypes() {
    return [
      {
        id: 'full_portfolio',
        name: 'フルポートフォリオ収集',
        nameEn: 'Full Portfolio Collection',
        description: '全ての保有資産を詳細に収集',
        descriptionEn: 'Collect all holdings in detail'
      },
      {
        id: 'stocks_only',
        name: '株式のみ',
        nameEn: 'Stocks Only',
        description: '株式・ETFのみを収集',
        descriptionEn: 'Collect stocks and ETFs only'
      },
      {
        id: 'update_prices',
        name: '価格更新',
        nameEn: 'Price Update',
        description: '既存資産の価格情報のみ更新',
        descriptionEn: 'Update prices for existing assets'
      }
    ];
  }
}

const portfolioPromptService = new PortfolioPromptService();
export default portfolioPromptService;