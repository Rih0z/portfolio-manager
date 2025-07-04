/**
 * yamlIntegrationService.js のユニットテスト
 * YAML統合サービスのテスト
 */

import yamlIntegrationService, { YAMLIntegrationError } from '../../../services/yamlIntegrationService';

// yamlValidatorsをモック
jest.mock('../../../utils/yamlValidators', () => ({
  validateYAMLData: jest.fn()
}));

import { validateYAMLData } from '../../../utils/yamlValidators';

describe('yamlIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('integrateYAMLData', () => {
    const mockPortfolioData = {
      portfolio_data: {
        metadata: {
          total_assets: 1000000,
          currency: 'JPY',
          monthly_investment: 50000,
          exchange_rate_usd_jpy: 150.0
        },
        holdings: [
          {
            symbol: 'VTI',
            name: 'Vanguard Total Stock Market ETF',
            type: 'ETF',
            market: 'US',
            quantity: 10,
            average_cost: 200.0,
            current_price: 210.0,
            currency: 'USD',
            current_value: 2100.0,
            allocation_percentage: 30.0,
            target_percentage: 35.0
          }
        ],
        target_allocation: [
          {
            asset_class: 'US_Stocks',
            target_percentage: 50.0
          },
          {
            asset_class: 'Bonds',
            target_percentage: 50.0
          }
        ]
      }
    };

    const mockCurrentContext = {
      portfolioContext: {
        currentAssets: [],
        targetPortfolio: [],
        additionalBudget: { amount: 0 }
      }
    };

    it('有効なポートフォリオデータを正常に統合する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const result = await yamlIntegrationService.integrateYAMLData(
        mockPortfolioData,
        'portfolio',
        mockCurrentContext
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.appliedChanges.length).toBeGreaterThan(0);
      expect(result.metadata).toBeDefined();
    });

    it('バリデーションエラーがある場合統合を停止する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: false,
        errors: [{ message: 'テストエラー', field: 'test_field', value: 'test_value' }],
        warnings: []
      });

      const result = await yamlIntegrationService.integrateYAMLData(
        mockPortfolioData,
        'portfolio',
        mockCurrentContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('バリデーションエラー');
    });

    it('バリデーション警告を適切に記録する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [{ message: 'テスト警告', field: 'test_field', value: 'test_value' }]
      });

      const result = await yamlIntegrationService.integrateYAMLData(
        mockPortfolioData,
        'portfolio',
        mockCurrentContext
      );

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('バリデーション警告');
    });

    it('未対応のデータタイプでエラーを返す', async () => {
      const result = await yamlIntegrationService.integrateYAMLData(
        mockPortfolioData,
        'unknown_type',
        mockCurrentContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('未対応のデータタイプです'))).toBe(true);
    });

    it('処理中の例外を適切にハンドリングする', async () => {
      validateYAMLData.mockImplementation(() => {
        throw new Error('テスト例外');
      });

      const result = await yamlIntegrationService.integrateYAMLData(
        mockPortfolioData,
        'portfolio',
        mockCurrentContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('統合処理中にエラー'))).toBe(true);
    });
  });

  describe('transformHoldingToAppFormat', () => {
    it('YAML保有資産データをアプリ形式に変換する', () => {
      const yamlHolding = {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        type: 'ETF',
        market: 'US',
        quantity: 10,
        average_cost: 200.0,
        current_price: 210.0,
        currency: 'USD',
        current_value: 2100.0,
        allocation_percentage: 30.0,
        target_percentage: 35.0
      };

      const transformed = yamlIntegrationService.transformHoldingToAppFormat(yamlHolding);

      expect(transformed).toMatchObject({
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        type: 'ETF',
        market: 'US',
        quantity: 10,
        averageCost: 200.0,
        currentPrice: 210.0,
        currency: 'USD',
        currentValue: 2100.0,
        allocationPercentage: 30.0,
        targetPercentage: 35.0
      });

      expect(transformed.id).toBeDefined();
      expect(transformed.importedAt).toBeDefined();
    });
  });

  describe('mergeHoldings', () => {
    it('既存の保有資産と新しい保有資産をマージする', () => {
      const currentHoldings = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          quantity: 5
        }
      ];

      const newHoldings = [
        {
          symbol: 'VTI',
          name: 'Vanguard Total Stock Market ETF',
          quantity: 10
        },
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          quantity: 8 // 既存の保有と重複
        }
      ];

      const merged = yamlIntegrationService.mergeHoldings(currentHoldings, newHoldings);

      expect(merged).toHaveLength(2);
      expect(merged.find(h => h.symbol === 'VTI')).toBeDefined();
      expect(merged.find(h => h.symbol === 'AAPL').quantity).toBe(8); // 新しい値で更新
      expect(merged.find(h => h.symbol === 'AAPL').mergedAt).toBeDefined();
    });
  });

  describe('integratePortfolioData', () => {
    it('ポートフォリオメタデータを正しく統合する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const yamlData = {
        portfolio_data: {
          metadata: {
            total_assets: 2000000,
            currency: 'USD',
            monthly_investment: 100000
          }
        }
      };

      const context = {
        portfolioContext: {
          portfolio: { totalAssets: 1000000 },
          additionalBudget: { amount: 50000 }
        }
      };

      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData,
        'portfolio',
        context,
        { portfolioContext: context.portfolioContext }
      );

      expect(result.success).toBe(true);
      expect(result.metadata.portfolioMetadata).toBeDefined();
      expect(result.metadata.portfolioMetadata.some(
        change => change.field === 'totalAssets' && change.newValue === 2000000
      )).toBe(true);
    });

    it('保有資産を正しく統合する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const yamlData = {
        portfolio_data: {
          holdings: [
            {
              symbol: 'VTI',
              name: 'Vanguard ETF',
              type: 'ETF',
              market: 'US',
              quantity: 10,
              average_cost: 200,
              current_price: 210,
              currency: 'USD',
              current_value: 2100
            }
          ]
        }
      };

      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData,
        'portfolio',
        { portfolioContext: { currentAssets: [] } }
      );

      expect(result.success).toBe(true);
      expect(result.metadata.transformedHoldings).toBeDefined();
      expect(result.metadata.transformedHoldings).toHaveLength(1);
      expect(result.metadata.transformedHoldings[0].symbol).toBe('VTI');
    });

    it('目標配分を正しく統合する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const yamlData = {
        portfolio_data: {
          target_allocation: [
            {
              asset_class: 'US_Stocks',
              target_percentage: 60.0
            },
            {
              asset_class: 'Bonds',
              target_percentage: 40.0
            }
          ]
        }
      };

      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData,
        'portfolio',
        { portfolioContext: { targetPortfolio: [] } }
      );

      expect(result.success).toBe(true);
      expect(result.metadata.transformedTargetAllocation).toBeDefined();
      expect(result.metadata.transformedTargetAllocation).toHaveLength(2);
    });
  });

  describe('integrateUserProfile', () => {
    it('ユーザープロファイルデータを正しく統合する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const yamlData = {
        user_profile: {
          basic_info: {
            age_group: '30-40',
            experience_level: 'intermediate'
          },
          risk_assessment: {
            risk_tolerance: 'moderate'
          }
        }
      };

      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData,
        'user_profile',
        {}
      );

      expect(result.success).toBe(true);
      expect(result.metadata.transformedUserProfile).toBeDefined();
      expect(result.appliedChanges.some(c => c.type === 'user_profile_update')).toBe(true);
    });

    it('user_profile セクションが無い場合エラーを返す', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const yamlData = { other_data: {} };

      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData,
        'user_profile',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('user_profile セクション'))).toBe(true);
    });
  });

  describe('integrateCompositeData', () => {
    it('複合データを正しく統合する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const yamlData = {
        portfolio_data: {
          metadata: { total_assets: 1000000, currency: 'JPY' },
          holdings: []
        },
        user_profile: {
          basic_info: { age_group: '30-40' }
        }
      };

      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData,
        'composite',
        { portfolioContext: {} },
        { portfolioContext: {} }
      );

      expect(result.success).toBe(true);
      expect(result.appliedChanges.length).toBeGreaterThan(0);
    });
  });

  describe('generateHoldingId と generateAssetClassId', () => {
    it('ユニークなIDを生成する', () => {
      const id1 = yamlIntegrationService.generateHoldingId('VTI');
      const id2 = yamlIntegrationService.generateHoldingId('VTI');
      
      expect(id1).not.toBe(id2);
      expect(id1).toContain('holding_VTI_');
      expect(id2).toContain('holding_VTI_');

      const classId1 = yamlIntegrationService.generateAssetClassId('US_Stocks');
      const classId2 = yamlIntegrationService.generateAssetClassId('US_Stocks');
      
      expect(classId1).not.toBe(classId2);
      expect(classId1).toContain('asset_class_US_Stocks_');
    });
  });

  describe('エラーハンドリング', () => {
    it('YAMLIntegrationError が適切なプロパティを持つ', () => {
      const error = new YAMLIntegrationError('Test message', 'TEST_TYPE', { detail: 'test' });
      
      expect(error.name).toBe('YAMLIntegrationError');
      expect(error.message).toBe('Test message');
      expect(error.type).toBe('TEST_TYPE');
      expect(error.details).toEqual({ detail: 'test' });
    });

    it('デフォルト値が正しく設定される', () => {
      const error = new YAMLIntegrationError('Test message');
      
      expect(error.type).toBe('INTEGRATION_ERROR');
      expect(error.details).toBe(null);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のデータを効率的に処理する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const largeYamlData = {
        portfolio_data: {
          metadata: { total_assets: 1000000, currency: 'JPY' },
          holdings: Array.from({ length: 500 }, (_, i) => ({
            symbol: `STOCK${i}`,
            name: `Stock ${i}`,
            type: 'Stock',
            market: 'US',
            quantity: 10,
            average_cost: 100,
            current_price: 110,
            currency: 'USD',
            current_value: 1100
          }))
        }
      };

      const startTime = Date.now();
      const result = await yamlIntegrationService.integrateYAMLData(
        largeYamlData,
        'portfolio',
        { portfolioContext: { currentAssets: [] } }
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // 3秒以内
      expect(result.success).toBe(true);
      expect(result.metadata.transformedHoldings).toHaveLength(500);
    });
  });

  describe('統合オプション', () => {
    it('replace戦略を正しく適用する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const yamlData = {
        portfolio_data: {
          holdings: [{ symbol: 'VTI', name: 'New ETF', quantity: 5 }]
        }
      };

      const options = {
        portfolioContext: { currentAssets: [{ symbol: 'AAPL', name: 'Apple', quantity: 10 }] },
        mergeStrategy: 'replace'
      };

      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData,
        'portfolio',
        {},
        options
      );

      expect(result.success).toBe(true);
      expect(result.metadata.transformedHoldings).toHaveLength(1);
      expect(result.metadata.transformedHoldings[0].symbol).toBe('VTI');
    });

    it('merge戦略を正しく適用する', async () => {
      validateYAMLData.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const yamlData = {
        portfolio_data: {
          holdings: [{ symbol: 'VTI', name: 'New ETF', quantity: 5 }]
        }
      };

      const options = {
        portfolioContext: { currentAssets: [{ symbol: 'AAPL', name: 'Apple', quantity: 10 }] },
        mergeStrategy: 'merge'
      };

      const result = await yamlIntegrationService.integrateYAMLData(
        yamlData,
        'portfolio',
        {},
        options
      );

      expect(result.success).toBe(true);
      expect(result.metadata.transformedHoldings).toHaveLength(2); // マージされて2つ
    });
  });
});