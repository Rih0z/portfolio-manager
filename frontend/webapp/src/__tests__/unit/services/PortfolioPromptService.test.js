import portfolioPromptService from '../../../services/PortfolioPromptService';

describe('PortfolioPromptService', () => {
  describe('generatePortfolioDataPrompt', () => {
    test('日本語プロンプトを正しく生成する', () => {
      const result = portfolioPromptService.generatePortfolioDataPrompt('ja');
      
      expect(result).toHaveProperty('title', 'ポートフォリオデータ取得プロンプト');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('expectedFormat');
      expect(result).toHaveProperty('language', 'ja');
      
      // 日本語コンテンツが含まれているか確認
      expect(result.content).toContain('ポートフォリオデータ収集アシスタント');
      expect(result.content).toContain('Portfolio Wise');
      expect(result.content).toContain('準備完了');
      expect(result.content).toContain('入力完了');
    });

    test('英語プロンプトを正しく生成する', () => {
      const result = portfolioPromptService.generatePortfolioDataPrompt('en');
      
      expect(result).toHaveProperty('title', 'Portfolio Data Collection Prompt');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('instructions');
      expect(result).toHaveProperty('expectedFormat');
      expect(result).toHaveProperty('language', 'en');
      
      // 英語コンテンツが含まれているか確認
      expect(result.content).toContain('Portfolio Data Collection Assistant');
      expect(result.content).toContain('Portfolio Wise');
      expect(result.content).toContain('Ready to start');
      expect(result.content).toContain('Input complete');
    });

    test('デフォルト言語は日本語', () => {
      const result = portfolioPromptService.generatePortfolioDataPrompt();
      
      expect(result.language).toBe('ja');
      expect(result.title).toBe('ポートフォリオデータ取得プロンプト');
    });

    test('オプションパラメータを受け付ける', () => {
      const options = { someOption: 'value' };
      const result = portfolioPromptService.generatePortfolioDataPrompt('ja', options);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('getInstructions', () => {
    test('日本語の使用方法を返す', () => {
      const instructions = portfolioPromptService.getInstructions('ja');
      
      expect(instructions.title).toBe('使い方');
      expect(instructions.steps).toHaveLength(5);
      expect(instructions.steps[0]).toContain('プロンプトをコピー');
      expect(instructions.steps[1]).toContain('Claude');
      expect(instructions.steps[1]).toContain('Gemini');
      expect(instructions.steps[4]).toContain('データ取り込み');
    });

    test('英語の使用方法を返す', () => {
      const instructions = portfolioPromptService.getInstructions('en');
      
      expect(instructions.title).toBe('How to Use');
      expect(instructions.steps).toHaveLength(5);
      expect(instructions.steps[0]).toContain('Copy the prompt');
      expect(instructions.steps[1]).toContain('Claude');
      expect(instructions.steps[1]).toContain('Gemini');
      expect(instructions.steps[4]).toContain('Data Import');
    });
  });

  describe('getExpectedJSONFormat', () => {
    test('期待されるJSONフォーマットを返す', () => {
      const format = portfolioPromptService.getExpectedJSONFormat();
      
      expect(format).toHaveProperty('portfolio');
      expect(format.portfolio).toHaveProperty('assets');
      expect(Array.isArray(format.portfolio.assets)).toBe(true);
      expect(format.portfolio.assets[0]).toHaveProperty('name');
      expect(format.portfolio.assets[0]).toHaveProperty('ticker');
      expect(format.portfolio.assets[0]).toHaveProperty('type');
      expect(format.portfolio.assets[0]).toHaveProperty('quantity');
      expect(format.portfolio.assets[0]).toHaveProperty('currency');
      expect(format.portfolio).toHaveProperty('totalValue');
      expect(format.portfolio).toHaveProperty('lastUpdated');
      expect(format.portfolio).toHaveProperty('baseCurrency');
    });
  });

  describe('validatePortfolioJSON', () => {
    test('有効なJSONデータを検証する', () => {
      const validData = {
        portfolio: {
          assets: [
            {
              name: 'Apple Inc.',
              ticker: 'AAPL',
              type: 'stock',
              quantity: 100,
              averagePrice: 150,
              currentPrice: 170,
              currency: 'USD',
              market: 'US',
              sector: 'Technology'
            }
          ],
          totalValue: 17000,
          lastUpdated: '2025-01-06T12:00:00Z',
          baseCurrency: 'USD'
        }
      };

      const result = portfolioPromptService.validatePortfolioJSON(validData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.assetsCount).toBe(1);
      expect(result.totalValue).toBe(17000);
    });

    test('portfolioオブジェクトがない場合エラーを返す', () => {
      const invalidData = { data: [] };
      
      const result = portfolioPromptService.validatePortfolioJSON(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing "portfolio" object');
    });

    test('assetsが配列でない場合エラーを返す', () => {
      const invalidData = {
        portfolio: {
          assets: 'not an array'
        }
      };
      
      const result = portfolioPromptService.validatePortfolioJSON(invalidData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Portfolio assets must be an array');
    });

    test('資産に名前がない場合エラーを追加', () => {
      const dataWithoutName = {
        portfolio: {
          assets: [
            {
              ticker: 'AAPL',
              type: 'stock',
              quantity: 100
            }
          ]
        }
      };
      
      const result = portfolioPromptService.validatePortfolioJSON(dataWithoutName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Asset 1: Missing name');
    });

    test('資産にタイプがない場合警告を追加', () => {
      const dataWithoutType = {
        portfolio: {
          assets: [
            {
              name: 'Apple Inc.',
              quantity: 100
            }
          ]
        }
      };
      
      const result = portfolioPromptService.validatePortfolioJSON(dataWithoutType);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Asset 1: Missing type');
    });

    test('不明な資産タイプの場合警告を追加', () => {
      const dataWithUnknownType = {
        portfolio: {
          assets: [
            {
              name: 'Unknown Asset',
              type: 'unknown',
              quantity: 100
            }
          ]
        }
      };
      
      const result = portfolioPromptService.validatePortfolioJSON(dataWithUnknownType);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Asset 1: Unknown type "unknown"');
    });

    test('数量が数値でない場合警告を追加', () => {
      const dataWithStringQuantity = {
        portfolio: {
          assets: [
            {
              name: 'Apple Inc.',
              type: 'stock',
              quantity: '100'
            }
          ]
        }
      };
      
      const result = portfolioPromptService.validatePortfolioJSON(dataWithStringQuantity);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Asset 1: Quantity should be a number');
    });

    test('不明な通貨の場合警告を追加', () => {
      const dataWithUnknownCurrency = {
        portfolio: {
          assets: [
            {
              name: 'Apple Inc.',
              type: 'stock',
              quantity: 100,
              currency: 'XYZ'
            }
          ]
        }
      };
      
      const result = portfolioPromptService.validatePortfolioJSON(dataWithUnknownCurrency);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Asset 1: Unknown currency "XYZ"');
    });

    test('複数の資産を検証する', () => {
      const multiAssetData = {
        portfolio: {
          assets: [
            {
              name: 'Apple Inc.',
              type: 'stock',
              quantity: 100
            },
            {
              // 名前なし
              type: 'etf',
              quantity: 50
            },
            {
              name: 'Bitcoin',
              type: 'crypto',
              quantity: 'invalid'
            }
          ]
        }
      };
      
      const result = portfolioPromptService.validatePortfolioJSON(multiAssetData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Asset 2: Missing name');
      expect(result.warnings).toContain('Asset 3: Quantity should be a number');
      expect(result.assetsCount).toBe(3);
    });

    test('totalValueがない場合デフォルト値0を返す', () => {
      const dataWithoutTotal = {
        portfolio: {
          assets: [
            {
              name: 'Apple Inc.',
              type: 'stock',
              quantity: 100
            }
          ]
        }
      };
      
      const result = portfolioPromptService.validatePortfolioJSON(dataWithoutTotal);
      
      expect(result.totalValue).toBe(0);
    });

    test('JSON解析エラーをキャッチする', () => {
      const invalidJSON = null;
      
      const result = portfolioPromptService.validatePortfolioJSON(invalidJSON);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('JSON parsing error');
    });
  });

  describe('getAvailablePromptTypes', () => {
    test('利用可能なプロンプトタイプを返す', () => {
      const types = portfolioPromptService.getAvailablePromptTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types).toHaveLength(3);
      
      // フルポートフォリオ収集タイプ
      expect(types[0]).toEqual({
        id: 'full_portfolio',
        name: 'フルポートフォリオ収集',
        nameEn: 'Full Portfolio Collection',
        description: '全ての保有資産を詳細に収集',
        descriptionEn: 'Collect all holdings in detail'
      });
      
      // 株式のみタイプ
      expect(types[1]).toEqual({
        id: 'stocks_only',
        name: '株式のみ',
        nameEn: 'Stocks Only',
        description: '株式・ETFのみを収集',
        descriptionEn: 'Collect stocks and ETFs only'
      });
      
      // 価格更新タイプ
      expect(types[2]).toEqual({
        id: 'update_prices',
        name: '価格更新',
        nameEn: 'Price Update',
        description: '既存資産の価格情報のみ更新',
        descriptionEn: 'Update prices for existing assets'
      });
    });

    test('各プロンプトタイプに必要なプロパティが含まれている', () => {
      const types = portfolioPromptService.getAvailablePromptTypes();
      
      types.forEach(type => {
        expect(type).toHaveProperty('id');
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('nameEn');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('descriptionEn');
      });
    });
  });

  describe('プロンプト内容の詳細検証', () => {
    test('日本語プロンプトに必要な要素が全て含まれている', () => {
      const result = portfolioPromptService.generatePortfolioDataPrompt('ja');
      const content = result.content;
      
      // ヘッダー
      expect(content).toContain('# ポートフォリオデータ収集アシスタント');
      
      // セクション
      expect(content).toContain('## 📋 収集する情報');
      expect(content).toContain('## 🔄 データ入力プロセス');
      expect(content).toContain('## ⚠️ 重要な注意事項');
      expect(content).toContain('## 📊 出力形式');
      
      // 収集項目
      expect(content).toContain('保有株式・ETF・投資信託');
      expect(content).toContain('現金・預金');
      expect(content).toContain('その他の投資商品');
      
      // JSON形式の例
      expect(content).toContain('```json');
      expect(content).toContain('"portfolio"');
      expect(content).toContain('"assets"');
    });

    test('英語プロンプトに必要な要素が全て含まれている', () => {
      const result = portfolioPromptService.generatePortfolioDataPrompt('en');
      const content = result.content;
      
      // ヘッダー
      expect(content).toContain('# Portfolio Data Collection Assistant');
      
      // セクション
      expect(content).toContain('## 📋 Information to Collect');
      expect(content).toContain('## 🔄 Data Input Process');
      expect(content).toContain('## ⚠️ Important Notes');
      expect(content).toContain('## 📊 Output Format');
      
      // 収集項目
      expect(content).toContain('Stocks, ETFs, Mutual Funds');
      expect(content).toContain('Cash & Deposits');
      expect(content).toContain('Other Investment Products');
      
      // JSON形式の例
      expect(content).toContain('```json');
      expect(content).toContain('"portfolio"');
      expect(content).toContain('"assets"');
    });
  });
});